import { atomicUpdate } from '../_lib/db.js';
import { resolveMatch } from '../_lib/match.js';
import { recordWin } from '../_lib/bracket.js';

function findMatch(bracket, matchId) {
  for (const arr of [bracket.r32, bracket.r16, bracket.qf, bracket.sf])
    for (const m of (arr || []))
      if (m.id === matchId) return m;
  if (bracket.final?.id === matchId) return bracket.final;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId, winnerCode } = req.body;
  if (!matchId || !winnerCode) return res.status(400).json({ error: 'matchId and winnerCode required' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };

      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (match.played) throw { status: 400, error: 'already played' };

      const winnerSlot = match.p1.code === winnerCode ? match.p1
                       : match.p2.code === winnerCode ? match.p2
                       : null;
      if (!winnerSlot) throw { status: 400, error: 'winner not in this match' };

      // Compute kicks for the record if both players submitted
      if (match.submissions?.p1 && match.submissions?.p2) {
        const { kicks, p1Score, p2Score } = resolveMatch({
          p1Sub: match.submissions.p1,
          p2Sub: match.submissions.p2,
        });
        match.kicks = kicks;
        match.p1Score = p1Score;
        match.p2Score = p2Score;
      }

      const newBracket = recordWin(b, matchId, winnerSlot);
      const resolved = findMatch(newBracket, matchId);
      if (resolved) {
        resolved.submissions = match.submissions;
        if (match.kicks) {
          resolved.kicks = match.kicks;
          resolved.p1Score = match.p1Score;
          resolved.p2Score = match.p2Score;
        }
      }

      return { ...state, bracket: newBracket };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true });
}
