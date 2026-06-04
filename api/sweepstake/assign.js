import { atomicUpdate } from '../_lib/db.js';

// POST { participantName, teams: ['France', 'Iran'] }
// Creates participant if they don't exist; updates teams if they do.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { participantName, teams } = req.body;
  if (!participantName?.trim()) return res.status(400).json({ error: 'participantName required' });

  await atomicUpdate(state => {
    const sw = state.sweepstake || { participants: [], teamData: {} };
    const participants = [...(sw.participants || [])];
    const idx = participants.findIndex(p => p.name === participantName.trim());
    if (idx >= 0) {
      participants[idx] = { ...participants[idx], teams: teams || [] };
    } else {
      participants.push({ name: participantName.trim(), teams: teams || [] });
    }
    return { ...state, sweepstake: { ...sw, participants } };
  });

  res.json({ ok: true });
}
