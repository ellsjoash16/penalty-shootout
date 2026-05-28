import { loadState, saveState } from '../_lib/db.js';
import { evaluateState, resolveChoices } from '../_lib/match.js';

const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, zone } = req.body;
  if (!ZONES.includes(zone)) return res.status(400).json({ error: 'invalid zone' });

  let state = await loadState();
  state = evaluateState(state); // apply any elapsed timeouts first

  const am = state.activeMatch;
  if (!am || am.phase !== 'picking') return res.status(400).json({ error: 'no active pick phase' });

  const key = am.p1.code === code ? 'p1' : am.p2.code === code ? 'p2' : null;
  if (!key) return res.status(403).json({ error: 'you are not in this match' });
  if (am.choicesSubmitted[key]) return res.status(400).json({ error: 'already submitted' });

  const newChoices = { ...am.choices, [key]: zone };
  const newSubmitted = { ...am.choicesSubmitted, [key]: true };
  const updatedAm = { ...am, choices: newChoices, choicesSubmitted: newSubmitted };

  let newState;
  if (newSubmitted.p1 && newSubmitted.p2) {
    newState = resolveChoices({ ...state, activeMatch: updatedAm }, newChoices);
  } else {
    newState = { ...state, activeMatch: updatedAm };
  }

  await saveState(newState);
  res.json({ ok: true });
}
