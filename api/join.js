import { atomicUpdate } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, tournamentCode } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  if (!tournamentCode?.trim()) return res.status(400).json({ error: 'tournament code required' });

  let playerCode;

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament yet' };
      if (state.tournamentCode && tournamentCode.trim().toUpperCase() !== state.tournamentCode.toUpperCase())
        throw { status: 403, error: 'invalid tournament code' };

      const b = JSON.parse(JSON.stringify(state.bracket));

      let found = null;
      for (const match of b.r32) {
        if (match.p1.code && !match.p1.name) { found = { slot: 'p1', match }; break; }
        if (match.p2.code && !match.p2.name) { found = { slot: 'p2', match }; break; }
      }

      if (!found) throw { status: 409, error: 'tournament is full — all 32 slots taken' };

      const { slot, match } = found;
      match[slot].name = name.trim();
      playerCode = match[slot].code;

      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true, code: playerCode });
}
