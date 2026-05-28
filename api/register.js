import { loadState, saveState } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, name } = req.body;
  if (!code || !name?.trim()) return res.status(400).json({ error: 'code and name required' });

  const state = await loadState();
  if (!state.bracket) return res.status(404).json({ error: 'no tournament yet' });

  const b = JSON.parse(JSON.stringify(state.bracket));
  let found = false;
  const upd = s => { if (s?.code === code) { s.name = name.trim(); found = true; } };
  const updM = m => m && (upd(m.p1), upd(m.p2));
  [b.wc, b.r32, b.r16, b.qf, b.sf].forEach(arr => arr.forEach(updM));
  if (b.final) updM(b.final);

  if (!found) return res.status(404).json({ error: 'code not found — check with the organiser' });

  await saveState({ ...state, bracket: b });
  res.json({ ok: true });
}
