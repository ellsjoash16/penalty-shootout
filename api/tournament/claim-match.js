import { atomicUpdate } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId, playerName } = req.body;
  if (!matchId?.trim()) return res.status(400).json({ error: 'matchId required' });
  if (!playerName?.trim()) return res.status(400).json({ error: 'playerName required' });

  const name = playerName.trim();
  let assignedCode = null;

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));

      const stage = b.stage;
      const isFinal = stage === 'final';
      const matches = isFinal ? (b.final ? [b.final] : []) : (b[stage] || []);

      // Don't let the same player claim twice in the same round
      if (matches.some(m => m.p1?.player === name || m.p2?.player === name)) {
        throw { status: 409, error: 'You already have a team this round' };
      }

      const match = matches.find(m => m.id === matchId);
      if (!match) throw { status: 404, error: 'match not found' };

      const p1Free = !match.p1?.player;
      const p2Free = !match.p2?.player;
      if (!p1Free && !p2Free) throw { status: 409, error: 'This match is full — pick another' };

      // Randomly assign to whichever slot is free (or random if both free)
      let side;
      if (p1Free && p2Free) side = Math.random() < 0.5 ? 'p1' : 'p2';
      else side = p1Free ? 'p1' : 'p2';

      match[side].player = name;
      assignedCode = match[side].code;

      if (isFinal) {
        b.final = match;
      } else {
        const idx = b[stage].findIndex(m => m.id === matchId);
        if (idx >= 0) b[stage][idx] = match;
      }

      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true, code: assignedCode });
}
