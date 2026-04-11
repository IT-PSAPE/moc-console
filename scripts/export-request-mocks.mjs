import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const requestsOutputPath = path.join(projectRoot, "src/data/mock/requests.json");
const requestAssigneesOutputPath = path.join(projectRoot, "src/data/mock/request-assignees.json");

function parseEnvFile(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      env[key] = value;
      return env;
    }, {});
}

async function loadProjectEnv() {
  const envFileNames = [".env.local", ".env"];
  const fileEnv = {};

  for (const fileName of envFileNames) {
    const filePath = path.join(projectRoot, fileName);

    try {
      const content = await readFile(filePath, "utf8");
      Object.assign(fileEnv, parseEnvFile(content));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return { ...fileEnv, ...process.env };
}

function mapRequestRow(row) {
  const request = {
    id: row.id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    requestedBy: row.requested_by ?? "",
    dueDate: row.due_date ?? null,
    who: row.who,
    what: row.what,
    when: row.when,
    where: row.where,
    why: row.why,
    how: row.how,
  };

  if (row.notes != null) {
    request.notes = row.notes;
  }

  if (row.flow != null) {
    request.flow = row.flow;
  }

  if (row.content != null) {
    request.content = row.content;
  }

  return request;
}

function mapRequestAssigneeRow(row) {
  return {
    requestId: row.request_id,
    userId: row.user_id,
    duty: row.duty,
  };
}

function sortByCreatedAtDesc(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortAssignees(a, b) {
  if (a.requestId !== b.requestId) {
    return a.requestId.localeCompare(b.requestId);
  }

  if (a.userId !== b.userId) {
    return a.userId.localeCompare(b.userId);
  }

  return a.duty.localeCompare(b.duty);
}

async function main() {
  const env = await loadProjectEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials. Expected VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: requestRows, error: requestsError }, { data: requestAssigneeRows, error: requestAssigneesError }] = await Promise.all([
    supabase.from("requests").select("*"),
    supabase.from("request_assignees").select("request_id, user_id, duty"),
  ]);

  if (requestsError) {
    throw new Error(`Failed to export requests: ${requestsError.message}`);
  }

  if (requestAssigneesError) {
    throw new Error(`Failed to export request assignees: ${requestAssigneesError.message}`);
  }

  const requests = (requestRows ?? []).map(mapRequestRow).sort(sortByCreatedAtDesc);
  const requestAssignees = (requestAssigneeRows ?? []).map(mapRequestAssigneeRow).sort(sortAssignees);

  await Promise.all([
    writeFile(requestsOutputPath, `${JSON.stringify(requests, null, 2)}\n`, "utf8"),
    writeFile(requestAssigneesOutputPath, `${JSON.stringify(requestAssignees, null, 2)}\n`, "utf8"),
  ]);

  console.log(`Exported ${requests.length} requests to ${path.relative(projectRoot, requestsOutputPath)}`);
  console.log(`Exported ${requestAssignees.length} request assignees to ${path.relative(projectRoot, requestAssigneesOutputPath)}`);

  if (requests.length === 0 && requestAssignees.length === 0 && !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Warning: the export returned no rows. If your requests are protected by RLS, rerun with SUPABASE_SERVICE_ROLE_KEY or another authenticated context.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
