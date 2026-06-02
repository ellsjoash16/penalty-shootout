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

// Atomic read-modify-write using a version counter stored inside the JSON.
// fn(state) returns the new state to write, or throws { status, error } for API errors.
// Retries automatically if another write landed between our read and our write.
export async function atomicUpdate(fn) {
  await ensureTable();
  for (let attempt = 0; attempt < 10; attempt++) {
    const rows = await sql`SELECT data FROM app_state WHERE id = 'main'`;
    const state = rows[0]?.data ?? { bracket: null, activeMatch: null };
    const version = typeof state._v === 'number' ? state._v : 0;

    const newState = await fn(state); // may throw { status, error }
    const toWrite = { ...newState, _v: version + 1 };

    let written;
    if (rows[0]) {
      written = await sql`
        UPDATE app_state
        SET data = ${JSON.stringify(toWrite)}::jsonb, updated_at = NOW()
        WHERE id = 'main' AND COALESCE((data->>'_v')::int, 0) = ${version}
        RETURNING id
      `;
    } else {
      written = await sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES ('main', ${JSON.stringify(toWrite)}::jsonb, NOW())
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
    }

    if (written.length > 0) return newState;

    // Another write landed first — wait briefly and retry
    await new Promise(r => setTimeout(r, 20 + Math.random() * 60));
  }
  throw new Error('State update conflict — please try again');
}
