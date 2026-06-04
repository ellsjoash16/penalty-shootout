import { atomicUpdate } from '../_lib/db.js';
import { genBracket, genCode } from '../_lib/bracket.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const name = req.body.name?.trim();
  const tournamentName = req.body.tournamentName?.trim() || 'Tournament';
  if (!name) return res.status(400).json({ error: 'name required' });

  const isAdmin = name.toLowerCase() === 'thehub@dialaflight.co.uk';
  let result;

  try {
    await atomicUpdate(state => {
      if (state.bracket) throw { status: 409, error: 'tournament already exists — ask the organiser for your code' };

      const bracket = genBracket();
      const tournamentCode = genCode();

      result = { code: null, tournamentCode, tournamentName };
      return { bracket, activeMatch: null, tournamentCode, tournamentName };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true, ...result });
}
