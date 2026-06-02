import { atomicUpdate } from '../_lib/db.js';

const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];

function findMatch(bracket, matchId) {
  for (const arr of [bracket.r32, bracket.r16, bracket.qf, bracket.sf])
    for (const m of (arr || []))
      if (m.id === matchId) return m;
  if (bracket.final?.id === matchId) return bracket.final;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, matchId, shots, saves } = req.body;
  if (!Array.isArray(shots) || shots.length !== 5 || !Array.isArray(saves) || saves.length !== 5)
    return res.status(400).json({ error: 'must provide exactly 5 shots and 5 saves' });
  if (!shots.every(z => ZONES.includes(z)) || !saves.every(z => ZONES.includes(z)))
    return res.status(400).json({ error: 'invalid zone' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };

      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (match.played) throw { status: 400, error: 'already played' };

      const key = match.p1.code === code ? 'p1' : match.p2.code === code ? 'p2' : null;
      if (!key) throw { status: 403, error: 'you are not in this match' };
      if (!match.p1?.name || !match.p2?.name) throw { status: 400, error: 'both players must join first' };

      if (!match.submissions) match.submissions = {};
      if (match.submissions[key]) throw { status: 400, error: 'already submitted' };

      match.submissions[key] = { shots, saves };

      return { ...state, bracket: b, activeMatch: null };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true });
}
