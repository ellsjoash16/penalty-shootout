import { loadState, saveState } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const state = await loadState();
  if (!state.bracket) return res.status(404).json({ error: 'no tournament yet' });

  const b = JSON.parse(JSON.stringify(state.bracket));

  // Collect every slot that has a code but no name yet
  const available = [];
  b.wc.forEach(m => {
    if (m.p1?.code && !m.p1.name) available.push(m.p1);
    if (m.p2?.code && !m.p2.name) available.push(m.p2);
  });
  b.r32.forEach(m => {
    if (m.p1?.code && !m.p1.name) available.push(m.p1);
  });

  if (!available.length) return res.status(409).json({ error: 'tournament is full — all 48 slots taken' });

  const slot = available[Math.floor(Math.random() * available.length)];
  slot.name = name.trim();

  await saveState({ ...state, bracket: b });
  res.json({ ok: true, code: slot.code });
}
