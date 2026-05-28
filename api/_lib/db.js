import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

const INIT = sql`
  CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

let initialised = false;
async function ensureTable() {
  if (!initialised) { await INIT; initialised = true; }
}

export async function loadState() {
  await ensureTable();
  const rows = await sql`SELECT data FROM app_state WHERE id = 'main'`;
  if (rows.length === 0) return { bracket: null, activeMatch: null };
  return rows[0].data;
}

export async function saveState(state) {
  await sql`
    INSERT INTO app_state (id, data, updated_at)
    VALUES ('main', ${JSON.stringify(state)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
  `;
}
