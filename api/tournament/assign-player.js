import { atomicUpdate } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { slotCode, playerName } = req.body;
  if (!slotCode?.trim()) return res.status(400).json({ error: 'slotCode required' });

  let found = false;
  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));

      const assign = slot => {
        if (slot?.code === slotCode.trim()) {
          slot.player = playerName?.trim() || null;
          found = true;
        }
      };
      const processMatch = m => m && (assign(m.p1), assign(m.p2));

      [b.r32, b.r16, b.qf, b.sf].forEach(arr => (arr || []).forEach(processMatch));
      if (b.final) processMatch(b.final);

      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }

  if (!found) return res.status(404).json({ error: 'slot not found' });
  res.json({ ok: true });
}
