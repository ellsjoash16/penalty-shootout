import { atomicUpdate } from '../_lib/db.js';

// POST { participantName }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { participantName } = req.body;
  if (!participantName) return res.status(400).json({ error: 'participantName required' });

  await atomicUpdate(state => {
    const sw = state.sweepstake || { participants: [], teamData: {} };
    return {
      ...state,
      sweepstake: {
        ...sw,
        participants: (sw.participants || []).filter(p => p.name !== participantName),
      },
    };
  });

  res.json({ ok: true });
}
