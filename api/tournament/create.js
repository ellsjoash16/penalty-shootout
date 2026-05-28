import { loadState, saveState } from '../_lib/db.js';
import { genBracket } from '../_lib/bracket.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name required' });

  const state = await loadState();
  if (state.bracket) return res.status(409).json({ error: 'tournament already exists — ask the organiser for your code' });

  const bracket = genBracket(name);
  const mySlot = [
    ...bracket.wc.flatMap(m => [m.p1, m.p2]),
    ...bracket.r32.map(m => m.p1),
  ].find(s => s.name === name);

  await saveState({ bracket, activeMatch: null });
  res.json({ ok: true, code: mySlot?.code });
}
