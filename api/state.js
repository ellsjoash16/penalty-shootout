import { loadState, saveState } from './_lib/db.js';
import { evaluateState } from './_lib/match.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const state = await loadState();
  const evaluated = evaluateState(state);

  if (evaluated !== state) await saveState(evaluated);

  res.json(evaluated);
}
