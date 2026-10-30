import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, optionalUuidField, PlatformInputError, stringField, uuidField } from "./input.js"

type QuoteRow = {
  id: string
  text: string
  attribution: string | null
  active: boolean
  created_at: string
  updated_at: string
}

const fields = "id, text, attribution, active, created_at, updated_at"
type QuoteSelectionRow = { quote: QuoteRow | null; date: string; timezone: string; overridden: boolean }

function mapQuote(row: QuoteRow | undefined) {
  if (!row) throw Object.assign(new Error("Quote not found"), { status: 404, code: "not_found" })
  return { id: row.id, text: row.text, attribution: row.attribution, active: row.active, createdAt: row.created_at, updatedAt: row.updated_at }
}

async function getDaily(context: PlatformContext) {
  const result = await context.db.query<QuoteSelectionRow>(
    `WITH available AS (
       SELECT ${fields}, row_number() OVER (ORDER BY created_at, id) - 1 AS position, count(*) OVER () AS total
       FROM public.daily_quotes WHERE workspace_id = $1 AND active
     ), local_day AS (
       SELECT (CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone($1))::date AS date, public.workspace_timezone($1) AS timezone
     ), today_override AS (
       SELECT q.id FROM public.daily_quote_overrides o
       JOIN public.daily_quotes q ON q.workspace_id = o.workspace_id AND q.id = o.quote_id AND q.active
       JOIN local_day ON o.quote_date = local_day.date WHERE o.workspace_id = $1
     )
     SELECT local_day.date::text AS date, timezone, EXISTS (SELECT 1 FROM today_override) AS overridden,
       (SELECT row_to_json(selected) FROM (
         SELECT ${fields} FROM available
         ORDER BY (id = (SELECT id FROM today_override)) DESC NULLS LAST,
           (position = mod(mod(local_day.date - DATE '2020-01-01', total) + total, total)) DESC
         LIMIT 1
       ) selected) AS quote
     FROM local_day`,
    [context.workspaceId],
  )
  const selection = result.rows[0]
  return { quote: selection.quote ? mapQuote(selection.quote) : null, date: selection.date, timezone: selection.timezone, overridden: selection.overridden }
}

export const operations: Record<string, PlatformOperation> = {
  list: {
    permission: "can_manage_roles",
    async run(context, input) {
      objectInput(input ?? {}, [])
      const result = await context.db.query<QuoteRow>(`SELECT ${fields} FROM public.daily_quotes WHERE workspace_id = $1 ORDER BY active DESC, created_at DESC, id`, [context.workspaceId])
      return result.rows.map(mapQuote)
    },
  },
  getDaily: {
    permission: "can_read",
    async run(context, input) {
      objectInput(input ?? {}, [])
      return getDaily(context)
    },
  },
  setToday: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["id"])
      const id = record.id === null ? null : uuidField(record, "id")
      const result = await context.db.query(
        `INSERT INTO public.daily_quote_overrides (workspace_id, quote_date, quote_id)
         SELECT $1, (CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone($1))::date, $2::uuid
         WHERE $2::uuid IS NULL OR EXISTS (SELECT 1 FROM public.daily_quotes WHERE workspace_id = $1 AND id = $2 AND active)
         ON CONFLICT (workspace_id, quote_date) DO UPDATE SET quote_id = EXCLUDED.quote_id, updated_at = now()
         RETURNING workspace_id`,
        [context.workspaceId, id],
      )
      if (result.rowCount === 0) throw new PlatformInputError("Choose an active quote from this workspace")
      return getDaily(context)
    },
  },
  save: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["id", "text", "attribution", "active"])
      const id = optionalUuidField(record, "id")
      const text = stringField(record, "text").trim()
      const attribution = record.attribution == null ? null : stringField(record, "attribution").trim() || null
      const active = record.active ?? null
      if (text.length < 1 || text.length > 1000) throw new PlatformInputError("Quote must contain 1 to 1000 characters")
      if (attribution && attribution.length > 200) throw new PlatformInputError("Attribution must contain at most 200 characters")
      if (record.active !== undefined && typeof record.active !== "boolean") throw new PlatformInputError("Invalid active")
      const result = id
        ? await context.db.query<QuoteRow>(`UPDATE public.daily_quotes SET text = $3, attribution = $4, active = coalesce($5, active) WHERE workspace_id = $1 AND id = $2 RETURNING ${fields}`, [context.workspaceId, id, text, attribution, active])
        : await context.db.query<QuoteRow>(`INSERT INTO public.daily_quotes (workspace_id, text, attribution, active) VALUES ($1, $2, $3, coalesce($4, true)) RETURNING ${fields}`, [context.workspaceId, text, attribution, active])
      return mapQuote(result.rows[0])
    },
  },
  setActive: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["id", "active"])
      if (typeof record.active !== "boolean") throw new PlatformInputError("Invalid active")
      const result = await context.db.query<QuoteRow>(`UPDATE public.daily_quotes SET active = $3 WHERE workspace_id = $1 AND id = $2 RETURNING ${fields}`, [context.workspaceId, uuidField(record, "id"), record.active])
      return mapQuote(result.rows[0])
    },
  },
}
