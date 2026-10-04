import { createServer } from "node:net"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Pool } from "pg"

export function createFakeSmtpServer() {
  const messages: string[] = []
  const server = createServer((socket) => {
    socket.write("220 localhost ESMTP\r\n")
    let buffer = ""
    let collectingData = false
    let message = ""
    socket.on("data", (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split("\r\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (collectingData) {
          if (line === ".") {
            collectingData = false
            messages.push(message)
            message = ""
            socket.write("250 queued\r\n")
          } else message += `${line}\n`
        } else if (line.startsWith("EHLO") || line.startsWith("HELO")) socket.write("250 localhost\r\n")
        else if (line === "DATA") {
          collectingData = true
          socket.write("354 continue\r\n")
        } else if (line === "QUIT") socket.write("221 bye\r\n")
        else socket.write("250 ok\r\n")
      }
    })
  })
  return { server, messages }
}

export function extractEmailLink(message: string): URL {
  const normalizedMessage = message.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
  const link = normalizedMessage.match(/https?:\/\/[^\s<>]+/)?.[0]
  if (!link) throw new Error("Auth email did not contain a link")
  return new URL(link.replaceAll("&amp;", "&"))
}

export async function seedAuthTestSchema(pool: Pool): Promise<void> {
  const authDdl = await readFile(join(process.cwd(), "neon/database/00-auth-schema.sql"), "utf8")
  await pool.query(authDdl)
  await pool.query(`DO $$ BEGIN CREATE ROLE moc_worker; EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.workspaces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY REFERENCES moc_auth."user" (id) ON DELETE CASCADE,
      name text NOT NULL, surname text NOT NULL, email text NOT NULL, telegram_chat_id text
    );
    CREATE TABLE IF NOT EXISTS public.workspace_join_requests (
      workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
      user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      UNIQUE (workspace_id, user_id)
    );
    GRANT USAGE ON SCHEMA public TO moc_worker;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces, public.users, public.workspace_join_requests TO moc_worker;
    GRANT USAGE ON SCHEMA moc_auth TO moc_worker;
    GRANT SELECT, INSERT, DELETE ON moc_auth.internal_request_nonce TO moc_worker;
  `)
  await pool.query("INSERT INTO public.workspaces (slug) VALUES ('default-workspace') ON CONFLICT (slug) DO NOTHING")
}
