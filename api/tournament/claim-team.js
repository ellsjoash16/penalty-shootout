import { atomicUpdate } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { playerName, slotCode } = req.body;
  if (!playerName?.trim() || !slotCode?.trim())
    return res.status(400).json({ error: 'playerName and slotCode required' });

  let returnCode;

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));
      const stage = b.stage;

      const matches = stage === 'final'
        ? (b.final ? [b.final] : [])
        : (b[stage] || []);

      // Make sure player hasn't already claimed a slot this round
      for (const m of matches) {
        if (m.p1?.player === playerName.trim()) throw { status: 409, error: 'already claimed a team this round' };
        if (m.p2?.player === playerName.trim()) throw { status: 409, error: 'already claimed a team this round' };
      }

      let found = false;
      for (const m of matches) {
        for (const side of ['p1', 'p2']) {
          if (m[side]?.code === slotCode.trim() && !m[side].player) {
            m[side].player = playerName.trim();
            returnCode = m[side].code;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) throw { status: 409, error: 'team not available' };

      // Write final back if needed
      if (stage === 'final' && b.final) {
        b.final = matches[0];
      }

      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  res.json({ ok: true, code: returnCode });
}
