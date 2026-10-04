import { Pool, type PoolClient, type QueryResultRow } from 'pg';

export type DatabaseActor = {
  userId: string | null;
  workspaceId: string | null;
  role: 'moc_app' | 'moc_public' | 'moc_worker';
};

const poolConfig = {
  max: 4,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
  allowExitOnIdle: true,
  application_name: 'moc-backend',
} as const;
const allowedRoles = ['moc_app', 'moc_public', 'moc_worker'] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let database: Pool | undefined;

function connectionString(): string {
  const value = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!value) throw new Error('Database connection is not configured');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Database connection configuration is invalid');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('Database connection configuration is invalid');
  }
  const sslMode = parsed.searchParams.get('sslmode');
  if (parsed.hostname.endsWith('.neon.tech') && !['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '')) {
    throw new Error('Neon database connections must require TLS');
  }
  return value;
}

export function getDatabase(): Pool {
  database ??= new Pool({ connectionString: connectionString(), ...poolConfig });
  return database;
}

function validateActor(actor: DatabaseActor): void {
  if (!allowedRoles.includes(actor.role)) throw new Error('Database actor role is invalid');
  if (actor.userId && !uuidPattern.test(actor.userId)) throw new Error('Database actor user id is invalid');
  if (actor.workspaceId && !uuidPattern.test(actor.workspaceId)) throw new Error('Database actor workspace id is invalid');
  if (actor.role === 'moc_app' && !actor.userId) {
    throw new Error('Application database actors require a user id');
  }
  if (actor.role === 'moc_public' && actor.userId) {
    throw new Error('Public database actors cannot set a user id');
  }
}

export async function withActor<T>(actor: DatabaseActor, work: (client: PoolClient) => Promise<T>): Promise<T> {
  validateActor(actor);
  const client = await getDatabase().connect();
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${actor.role}`);
    await client.query("SELECT set_config('moc.user_id', $1, true), set_config('moc.workspace_id', $2, true)", [actor.userId ?? '', actor.workspaceId ?? '']);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Preserve the operation error; release below discards a broken connection.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error('Database rollback failed');
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export async function queryRows<Row extends QueryResultRow>(text: string, values: readonly unknown[] = [], client?: PoolClient): Promise<Row[]> {
  if (client) {
    const result = await client.query<Row>(text, [...values]);
    return result.rows;
  }
  return withActor({ userId: null, workspaceId: null, role: 'moc_worker' }, async (workerClient) => {
    const result = await workerClient.query<Row>(text, [...values]);
    return result.rows;
  });
}
