import { loadState, saveState } from './_lib/db.js';
import { evaluateState } from './_lib/match.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let state = await loadState();
  const evaluated = evaluateState(state);
  if (evaluated !== state) await saveState(evaluated);
  state = evaluated;

  // Migrate single sweepstake → sweepstakes array
  if (!Array.isArray(state.sweepstakes)) {
    const migrated = {
      ...state,
      sweepstakes: state.sweepstake
        ? [{ id: 'default', name: 'Sweepstake', ...(state.sweepstake) }]
        : [],
    };
    delete migrated.sweepstake;
    await saveState(migrated);
    return res.json(migrated);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10');
  res.json(state);
}
