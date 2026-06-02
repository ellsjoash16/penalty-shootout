import { loadState, saveState } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId } = req.body;
  const state = await loadState();

  if (state.activeMatch) return res.status(409).json({ error: 'a match is already in progress' });
  if (!state.bracket) return res.status(404).json({ error: 'no tournament' });

  const b = state.bracket;
  const all = [
    ...(b.r32 || []), ...(b.r16 || []), ...(b.qf || []), ...(b.sf || []),
    ...(b.final ? [b.final] : []),
  ];
  const match = all.find(m => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.played) return res.status(400).json({ error: 'already played' });
  if (!match.p1?.name || !match.p2?.name) return res.status(400).json({ error: 'both players must register first' });

  await saveState({
    ...state,
    activeMatch: {
      matchId,
      p1: { code: match.p1.code, name: match.p1.name },
      p2: { code: match.p2.code, name: match.p2.name },
      currentKick: 1,
      p1Score: 0, p2Score: 0,
      kicks: [],
      choices: { p1: null, p2: null },
      choicesSubmitted: { p1: false, p2: false },
      phase: 'picking',
      lastKickResult: null,
      winner: null,
      kickStartedAt: Date.now(),
      resultShownAt: null,
      isSuddenDeath: false,
    },
  });

  res.json({ ok: true });
}
