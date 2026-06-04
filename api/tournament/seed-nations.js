import { atomicUpdate } from '../_lib/db.js';
import { genCode, buildRound } from '../_lib/bracket.js';

// Top 32 FIFA-ranked nations that qualified for the 2026 World Cup (April 2026 rankings)
const FIFA_TOP_32 = [
  'France', 'Spain', 'Argentina', 'England', 'Portugal', 'Brazil',
  'Netherlands', 'Morocco', 'Belgium', 'Germany', 'Croatia', 'Colombia',
  'Senegal', 'Mexico', 'United States', 'Uruguay', 'Japan', 'Switzerland',
  'Iran', 'Austria', 'Ecuador', 'South Korea', 'Australia', 'Egypt',
  'Canada', 'Ivory Coast', 'Qatar', 'Algeria', 'Sweden', 'Tunisia',
  'Czechia', 'Türkiye',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };

      // Build seeded pairs: 1v32, 2v31 … 16v17
      const slots = FIFA_TOP_32.map((name, i) => ({ code: genCode(), name, seed: i + 1 }));
      const pairs = [];
      for (let i = 0; i < 16; i++) pairs.push(slots[i], slots[31 - i]);
      const r32 = buildRound(pairs, 'r32_');

      const bracket = { r32, r16: [], qf: [], sf: [], final: null, champion: null, stage: 'r32' };
      return { ...state, bracket };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true });
}
