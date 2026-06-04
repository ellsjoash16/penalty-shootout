import { atomicUpdate } from '../_lib/db.js';

// POST { team: 'France', groupPts?: 7, reached?: 'qf', topScorer?: false,
//        cleanSheetFinal?: false, upsets?: 0, firstGoals?: 2 }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { team, ...updates } = req.body;
  if (!team) return res.status(400).json({ error: 'team required' });

  await atomicUpdate(state => {
    const sw = state.sweepstake || { participants: [], teamData: {} };
    const teamData = { ...(sw.teamData || {}) };
    teamData[team] = { ...(teamData[team] || {}), ...updates };
    return { ...state, sweepstake: { ...sw, teamData } };
  });

  res.json({ ok: true });
}
