import { atomicUpdate } from '../_lib/db.js';

function findMatch(bracket, matchId) {
  for (const arr of [bracket.r32, bracket.r16, bracket.qf, bracket.sf])
    for (const m of (arr || []))
      if (m.id === matchId) return m;
  if (bracket.final?.id === matchId) return bracket.final;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId, url } = req.body;
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (url?.trim()) {
        match.watchUrl = url.trim();
      } else {
        delete match.watchUrl;
      }
      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true });
}
