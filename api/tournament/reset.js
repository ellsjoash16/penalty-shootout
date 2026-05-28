import { saveState } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await saveState({ bracket: null, activeMatch: null });
  res.json({ ok: true });
}
