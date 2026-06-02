import { atomicUpdate } from '../_lib/db.js';
import { resolveMatch } from '../_lib/match.js';
import { recordWin } from '../_lib/bracket.js';

const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];

function findMatch(bracket, matchId) {
  for (const g of bracket.groups || [])
    for (const m of g.matches)
      if (m.id === matchId) return m;
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

      let newBracket = b;
      if (match.submissions.p1 && match.submissions.p2) {
        const { kicks, p1Score, p2Score, winnerKey } = resolveMatch({
          p1Sub: match.submissions.p1,
          p2Sub: match.submissions.p2,
        });
        match.kicks = kicks;
        match.p1Score = p1Score;
        match.p2Score = p2Score;
        const winnerSlot = winnerKey === 'p1' ? match.p1 : match.p2;
        newBracket = recordWin(b, matchId, winnerSlot);

        const resolvedMatch = findMatch(newBracket, matchId);
        if (resolvedMatch) {
          resolvedMatch.submissions = match.submissions;
          resolvedMatch.kicks = kicks;
          resolvedMatch.p1Score = p1Score;
          resolvedMatch.p2Score = p2Score;
        }
      }

      return { ...state, bracket: newBracket, activeMatch: null };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true });
}
