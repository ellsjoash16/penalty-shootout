import { recordWin } from './bracket.js';

export const TOTAL_KICKS = 6;
export const KICK_TIMEOUT_MS = 11000;
export const RESULT_DELAY_MS = 3500;

const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];
const rz = () => ZONES[Math.floor(Math.random() * ZONES.length)];

export function resolveKick(kickNum, p1Zone, p2Zone) {
  const p1Shoots = kickNum % 2 === 1;
  const shotZone = p1Shoots ? p1Zone : p2Zone;
  const saveZone = p1Shoots ? p2Zone : p1Zone;
  const isGoal = shotZone !== saveZone;
  return { isGoal, shotZone, saveZone, scorer: isGoal ? (p1Shoots ? 'p1' : 'p2') : null, kickNum };
}

export function resolveChoices(state, choices) {
  const am = state.activeMatch;
  const kr = resolveKick(am.currentKick, choices.p1, choices.p2);
  const p1Score = am.p1Score + (kr.scorer === 'p1' ? 1 : 0);
  const p2Score = am.p2Score + (kr.scorer === 'p2' ? 1 : 0);

  let winner = null;
  if (am.currentKick === TOTAL_KICKS) {
    if (p1Score > p2Score) winner = am.p1.code;
    else if (p2Score > p1Score) winner = am.p2.code;
  } else if (am.currentKick > TOTAL_KICKS && kr.isGoal) {
    winner = kr.scorer === 'p1' ? am.p1.code : am.p2.code;
  }

  return {
    ...state,
    activeMatch: {
      ...am,
      p1Score, p2Score,
      kicks: [...am.kicks, kr],
      choices: { p1: null, p2: null },
      choicesSubmitted: { p1: false, p2: false },
      phase: winner ? 'done' : 'showing_result',
      lastKickResult: kr,
      winner,
      resultShownAt: Date.now(),
    },
  };
}

export function advanceMatch(state) {
  const am = state.activeMatch;
  if (!am) return state;

  if (am.winner) {
    const winnerSlot = am.winner === am.p1.code ? am.p1 : am.p2;
    return { bracket: recordWin(state.bracket, am.matchId, winnerSlot), activeMatch: null };
  }

  return {
    ...state,
    activeMatch: {
      ...am,
      currentKick: am.currentKick + 1,
      choices: { p1: null, p2: null },
      choicesSubmitted: { p1: false, p2: false },
      phase: 'picking',
      lastKickResult: null,
      resultShownAt: null,
      kickStartedAt: Date.now(),
      isSuddenDeath: am.currentKick >= TOTAL_KICKS,
    },
  };
}

// Applies any time-based transitions lazily (called on every GET /api/state)
export function evaluateState(state) {
  if (!state.activeMatch) return state;
  const am = state.activeMatch;
  const now = Date.now();

  if (am.phase === 'picking' && now - am.kickStartedAt >= KICK_TIMEOUT_MS) {
    return resolveChoices(state, {
      p1: am.choices.p1 || rz(),
      p2: am.choices.p2 || rz(),
    });
  }

  if ((am.phase === 'showing_result' || am.phase === 'done') && am.resultShownAt) {
    if (now - am.resultShownAt >= RESULT_DELAY_MS) {
      return advanceMatch(state);
    }
  }

  return state;
}
