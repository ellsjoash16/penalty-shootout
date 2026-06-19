import { atomicUpdate } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // Deliberately preserve sweepstakes and wcBracket — only the penalty bracket is reset
  await atomicUpdate(state => ({ ...state, bracket: null, activeMatch: null, tournamentCode: null, tournamentName: null }));
  res.json({ ok: true });
}
