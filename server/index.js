import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 3001;
const TOTAL_KICKS = 6;
const RESULT_DELAY_MS = 3500;
const KICK_TIMEOUT_MS = 11000;

// ── Bracket helpers ──────────────────────────────────────────────
const ZONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];
const rz = () => ZONES[Math.floor(Math.random() * ZONES.length)];

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const buildRound = (winners, prefix) => {
  const next = [];
  for (let i = 0; i < winners.length; i += 2)
    next.push({ id: `${prefix}${i / 2}`, p1: { ...winners[i] }, p2: { ...winners[i + 1] }, winner: null, played: false });
  return next;
};

const genBracket = (firstName) => {
  const slots = Array.from({ length: 32 }, (_, i) => ({ code: genCode(), name: i === 0 ? firstName : null }));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const r32 = Array.from({ length: 16 }, (_, i) => ({
    id: `r32_${i}`, p1: { ...slots[i * 2] }, p2: { ...slots[i * 2 + 1] }, winner: null, played: false,
  }));
  return { r32, r16: [], qf: [], sf: [], final: null, champion: null, stage: 'r32' };
};

const recordWin = (bracket, matchId, winner) => {
  const b = JSON.parse(JSON.stringify(bracket));
  const all = [...b.r32, ...b.r16, ...b.qf, ...b.sf, ...(b.final ? [b.final] : [])];
  const m = all.find(x => x.id === matchId);
  if (m) { m.winner = { ...winner }; m.played = true; }
  const done = arr => arr.length > 0 && arr.every(x => x.played);
  if (b.stage === 'r32' && done(b.r32)) { b.r16 = buildRound(b.r32.map(x => x.winner), 'r16_'); b.stage = 'r16'; }
  else if (b.stage === 'r16' && done(b.r16)) { b.qf = buildRound(b.r16.map(x => x.winner), 'qf'); b.stage = 'qf'; }
  else if (b.stage === 'qf' && done(b.qf)) { b.sf = buildRound(b.qf.map(x => x.winner), 'sf'); b.stage = 'sf'; }
  else if (b.stage === 'sf' && done(b.sf)) { const f = buildRound(b.sf.map(x => x.winner), 'f'); b.final = { ...f[0], id: 'final' }; b.stage = 'final'; }
  else if (b.stage === 'final' && b.final?.played) { b.champion = b.final.winner; b.stage = 'champion'; }
  return b;
};

// ── In-memory state ──────────────────────────────────────────────
let state = { bracket: null, activeMatch: null };
const clients = new Set();
let kickTimer = null;
let resultTimer = null;

// ── Neon DB ──────────────────────────────────────────────────────
let db = null;
if (process.env.NEON_DATABASE_URL) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    db = neon(process.env.NEON_DATABASE_URL);
    await db`CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    const rows = await db`SELECT data FROM app_state WHERE id = 'main'`;
    if (rows.length > 0) {
      state = rows[0].data;
      console.log('State restored from Neon');
    }
    console.log('Neon connected');
  } catch (e) {
    console.warn('Neon unavailable:', e.message, '— using in-memory only');
    db = null;
  }
} else {
  console.log('No NEON_DATABASE_URL — using in-memory state (not persisted)');
}

function persist() {
  if (!db) return;
  db`INSERT INTO app_state (id, data, updated_at) VALUES ('main', ${JSON.stringify(state)}::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`
    .catch(e => console.error('DB persist error:', e.message));
}

// ── SSE broadcast ────────────────────────────────────────────────
function broadcast() {
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(res => { try { res.write(msg); } catch (_) { clients.delete(res); } });
}

function setState(s) {
  state = s;
  persist();
  broadcast();
}

// ── Match logic ──────────────────────────────────────────────────
function resolveKick(kickNum, p1Zone, p2Zone) {
  const p1Shoots = kickNum % 2 === 1;
  const shotZone = p1Shoots ? p1Zone : p2Zone;
  const saveZone = p1Shoots ? p2Zone : p1Zone;
  const isGoal = shotZone !== saveZone;
  return { isGoal, shotZone, saveZone, scorer: isGoal ? (p1Shoots ? 'p1' : 'p2') : null, kickNum };
}

function clearTimers() {
  if (kickTimer) { clearTimeout(kickTimer); kickTimer = null; }
  if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
}

function scheduleResultAdvance() {
  if (resultTimer) clearTimeout(resultTimer);
  resultTimer = setTimeout(() => {
    const am = state.activeMatch;
    if (!am) return;
    if (am.winner) {
      // Record win in bracket and clear active match
      const winnerSlot = am.winner === am.p1.code ? am.p1 : am.p2;
      setState({ bracket: recordWin(state.bracket, am.matchId, winnerSlot), activeMatch: null });
    } else {
      // Advance to next kick
      setState({
        ...state,
        activeMatch: {
          ...am,
          currentKick: am.currentKick + 1,
          choices: { p1: null, p2: null },
          choicesSubmitted: { p1: false, p2: false },
          phase: 'picking',
          lastKickResult: null,
          kickStartedAt: Date.now(),
          isSuddenDeath: am.currentKick >= TOTAL_KICKS,
        },
      });
      scheduleKickTimeout();
    }
  }, RESULT_DELAY_MS);
}

function scheduleKickTimeout() {
  if (kickTimer) clearTimeout(kickTimer);
  kickTimer = setTimeout(() => {
    const am = state.activeMatch;
    if (!am || am.phase !== 'picking') return;
    resolveChoices({ p1: am.choices.p1 || rz(), p2: am.choices.p2 || rz() });
  }, KICK_TIMEOUT_MS);
}

function resolveChoices(choices) {
  clearTimers();
  const am = state.activeMatch;
  const kr = resolveKick(am.currentKick, choices.p1, choices.p2);
  const p1Score = am.p1Score + (kr.scorer === 'p1' ? 1 : 0);
  const p2Score = am.p2Score + (kr.scorer === 'p2' ? 1 : 0);

  let winner = null;
  if (am.currentKick === TOTAL_KICKS) {
    if (p1Score > p2Score) winner = am.p1.code;
    else if (p2Score > p1Score) winner = am.p2.code;
    // Tied after 6 → sudden death continues
  } else if (am.currentKick > TOTAL_KICKS && kr.isGoal) {
    winner = kr.scorer === 'p1' ? am.p1.code : am.p2.code;
  }

  setState({
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
    },
  });
  scheduleResultAdvance();
}

// ── Express ──────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// SSE
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  try { res.write(`data: ${JSON.stringify(state)}\n\n`); } catch (_) {}
  req.on('close', () => clients.delete(res));
});

app.get('/api/state', (_req, res) => res.json(state));

// Create tournament
app.post('/api/tournament/create', (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  if (state.bracket) return res.status(409).json({ error: 'tournament already exists — ask the organiser for your code' });
  const bracket = genBracket(name);
  const mySlot = bracket.r32.flatMap(m => [m.p1, m.p2]).find(s => s.name === name);
  setState({ bracket, activeMatch: null });
  res.json({ ok: true, code: mySlot?.code });
});

// Reset (admin)
app.post('/api/tournament/reset', (_req, res) => {
  clearTimers();
  setState({ bracket: null, activeMatch: null });
  res.json({ ok: true });
});

// Register player
app.post('/api/register', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name?.trim()) return res.status(400).json({ error: 'code and name required' });
  if (!state.bracket) return res.status(404).json({ error: 'no tournament yet' });

  const b = JSON.parse(JSON.stringify(state.bracket));
  let found = false;
  const upd = s => { if (s?.code === code) { s.name = name.trim(); found = true; } };
  const updM = m => m && (upd(m.p1), upd(m.p2));
  [b.r32, b.r16, b.qf, b.sf].forEach(arr => arr.forEach(updM));
  if (b.final) updM(b.final);

  if (!found) return res.status(404).json({ error: 'code not found — check with the organiser' });
  setState({ ...state, bracket: b });
  res.json({ ok: true });
});

// Start match
app.post('/api/match/start', (req, res) => {
  const { matchId } = req.body;
  if (state.activeMatch) return res.status(409).json({ error: 'a match is already in progress' });
  if (!state.bracket) return res.status(404).json({ error: 'no tournament' });

  const all = [
    ...state.bracket.r32, ...state.bracket.r16,
    ...state.bracket.qf, ...state.bracket.sf,
    ...(state.bracket.final ? [state.bracket.final] : []),
  ];
  const match = all.find(m => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.played) return res.status(400).json({ error: 'match already played' });
  if (!match.p1?.name || !match.p2?.name) return res.status(400).json({ error: 'both players must register first' });

  setState({
    ...state,
    activeMatch: {
      matchId,
      p1: { code: match.p1.code, name: match.p1.name },
      p2: { code: match.p2.code, name: match.p2.name },
      currentKick: 1,
      p1Score: 0,
      p2Score: 0,
      kicks: [],
      choices: { p1: null, p2: null },
      choicesSubmitted: { p1: false, p2: false },
      phase: 'picking',
      lastKickResult: null,
      winner: null,
      kickStartedAt: Date.now(),
      isSuddenDeath: false,
    },
  });
  scheduleKickTimeout();
  res.json({ ok: true });
});

// Submit zone choice
app.post('/api/match/choice', (req, res) => {
  const { code, zone } = req.body;
  const am = state.activeMatch;
  if (!am || am.phase !== 'picking') return res.status(400).json({ error: 'no active pick phase' });
  if (!ZONES.includes(zone)) return res.status(400).json({ error: 'invalid zone' });

  const key = am.p1.code === code ? 'p1' : am.p2.code === code ? 'p2' : null;
  if (!key) return res.status(403).json({ error: 'you are not in this match' });
  if (am.choicesSubmitted[key]) return res.status(400).json({ error: 'already submitted' });

  const newChoices = { ...am.choices, [key]: zone };
  const newSubmitted = { ...am.choicesSubmitted, [key]: true };

  // Partial update — broadcast without persisting
  state = { ...state, activeMatch: { ...am, choices: newChoices, choicesSubmitted: newSubmitted } };
  broadcast();

  if (newSubmitted.p1 && newSubmitted.p2) resolveChoices(newChoices);

  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`⚽  Server on :${PORT}  (Neon: ${db ? 'connected' : 'off'})`));
