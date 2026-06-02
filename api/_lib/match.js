import { recordWin } from './bracket.js';

export function resolveMatch({ p1Sub, p2Sub }) {
  const kicks = [];
  let p1Score = 0, p2Score = 0;
  for (let i = 0; i < 5; i++) {
    const p1Shot = p1Sub.shots[i], p2Save = p2Sub.saves[i];
    const p1Goal = p1Shot !== p2Save;
    if (p1Goal) p1Score++;
    kicks.push({ round: i + 1, shooter: 'p1', shot: p1Shot, save: p2Save, isGoal: p1Goal });

    const p2Shot = p2Sub.shots[i], p1Save = p1Sub.saves[i];
    const p2Goal = p2Shot !== p1Save;
    if (p2Goal) p2Score++;
    kicks.push({ round: i + 1, shooter: 'p2', shot: p2Shot, save: p1Save, isGoal: p2Goal });
  }
  let winnerKey;
  if (p1Score > p2Score) winnerKey = 'p1';
  else if (p2Score > p1Score) winnerKey = 'p2';
  else winnerKey = Math.random() < 0.5 ? 'p1' : 'p2';
  return { kicks, p1Score, p2Score, winnerKey };
}

// No time-based transitions needed in async mode
export function evaluateState(state) {
  return state;
}
