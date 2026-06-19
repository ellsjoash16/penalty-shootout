import { loadState, saveState, atomicUpdate } from '../_lib/db.js';
import { evaluateState, resolveMatch } from '../_lib/match.js';
import { recordWin } from '../_lib/bracket.js';

const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];

function findMatch(bracket, matchId) {
  for (const arr of [bracket.r32, bracket.r16, bracket.qf, bracket.sf])
    for (const m of (arr || []))
      if (m.id === matchId) return m;
  if (bracket.final?.id === matchId) return bracket.final;
  return null;
}

async function handleChoice(req, res) {
  const { code, zone } = req.body;
  if (!ZONES.includes(zone)) return res.status(400).json({ error: 'invalid zone' });

  let state = await loadState();
  state = evaluateState(state);

  const am = state.activeMatch;
  if (!am || am.phase !== 'picking') return res.status(400).json({ error: 'no active pick phase' });

  const key = am.p1.code === code ? 'p1' : am.p2.code === code ? 'p2' : null;
  if (!key) return res.status(403).json({ error: 'you are not in this match' });
  if (am.choicesSubmitted[key]) return res.status(400).json({ error: 'already submitted' });

  const newChoices = { ...am.choices, [key]: zone };
  const newSubmitted = { ...am.choicesSubmitted, [key]: true };
  const updatedAm = { ...am, choices: newChoices, choicesSubmitted: newSubmitted };

  const newState = { ...state, activeMatch: updatedAm };

  await saveState(newState);
  res.json({ ok: true });
}

async function handleSubmit(req, res) {
  const { code, matchId, shots, saves } = req.body;
  if (!Array.isArray(shots) || shots.length !== 5 || !Array.isArray(saves) || saves.length !== 5)
    return res.status(400).json({ error: 'must provide exactly 5 shots and 5 saves' });
  if (!shots.every(z => ZONES.includes(z)) || !saves.every(z => ZONES.includes(z)))
    return res.status(400).json({ error: 'invalid zone' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (match.played) throw { status: 400, error: 'already played' };
      const key = match.p1.code === code ? 'p1' : match.p2.code === code ? 'p2' : null;
      if (!key) throw { status: 403, error: 'you are not in this match' };
      if (!match.p1?.name || !match.p2?.name) throw { status: 400, error: 'both players must join first' };
      if (!match.submissions) match.submissions = {};
      if (match.submissions[key]) throw { status: 400, error: 'already submitted' };
      match.submissions[key] = { shots, saves };
      return { ...state, bracket: b, activeMatch: null };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }
  res.json({ ok: true });
}

async function handleResolve(req, res) {
  const { matchId, winnerCode } = req.body;
  if (!matchId || !winnerCode) return res.status(400).json({ error: 'matchId and winnerCode required' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (match.played) throw { status: 400, error: 'already played' };
      const winnerSlot = match.p1.code === winnerCode ? match.p1
                       : match.p2.code === winnerCode ? match.p2
                       : null;
      if (!winnerSlot) throw { status: 400, error: 'winner not in this match' };
      if (match.submissions?.p1 && match.submissions?.p2) {
        const { kicks, p1Score, p2Score } = resolveMatch({
          p1Sub: match.submissions.p1,
          p2Sub: match.submissions.p2,
        });
        match.kicks = kicks;
        match.p1Score = p1Score;
        match.p2Score = p2Score;
      }
      const newBracket = recordWin(b, matchId, winnerSlot);
      const resolved = findMatch(newBracket, matchId);
      if (resolved) {
        resolved.submissions = match.submissions;
        if (match.kicks) {
          resolved.kicks = match.kicks;
          resolved.p1Score = match.p1Score;
          resolved.p2Score = match.p2Score;
        }
      }
      return { ...state, bracket: newBracket };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }
  res.json({ ok: true });
}

async function handleWatchurl(req, res) {
  const { matchId, url } = req.body;
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  try {
    await atomicUpdate(state => {
      if (!state.bracket) throw { status: 404, error: 'no tournament' };
      const b = JSON.parse(JSON.stringify(state.bracket));
      const match = findMatch(b, matchId);
      if (!match) throw { status: 404, error: 'match not found' };
      if (url?.trim()) {
        match.watchUrl = url.trim();
      } else {
        delete match.watchUrl;
      }
      return { ...state, bracket: b };
    });
  } catch (e) {
    if (e?.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }
  res.json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const action = req.query.action;
  if (action === 'choice') return handleChoice(req, res);
  if (action === 'submit') return handleSubmit(req, res);
  if (action === 'resolve') return handleResolve(req, res);
  if (action === 'watchurl') return handleWatchurl(req, res);
  return res.status(404).json({ error: 'unknown action' });
}
