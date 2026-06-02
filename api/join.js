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
      for (const group of b.groups) {
        for (const player of group.players) {
          if (player.code && !player.name) {
            found = { group, player };
            break;
          }
        }
        if (found) break;
      }

      if (!found) throw { status: 409, error: 'tournament is full — all 48 slots taken' };

      const { group, player } = found;
      player.name = name.trim();
      playerCode = player.code;

      for (const match of group.matches) {
        if (match.p1.code === player.code) match.p1.name = player.name;
        if (match.p2.code === player.code) match.p2.name = player.name;
      }

      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true, code: playerCode });
}
