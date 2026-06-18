import { atomicUpdate } from '../_lib/db.js';

// ── helpers ────────────────────────────────────────────────────
function getSweepstakes(state) {
  if (Array.isArray(state.sweepstakes)) return state.sweepstakes;
  // migrate from old single-sweepstake format
  if (state.sweepstake) {
    return [{ id: 'default', name: 'Sweepstake', ...(state.sweepstake) }];
  }
  return [];
}

function patchState(state, sweepstakes) {
  const next = { ...state, sweepstakes };
  delete next.sweepstake; // remove legacy key
  return next;
}

function findSw(sweepstakes, id) {
  return sweepstakes.find(s => s.id === id);
}

function mapSw(sweepstakes, id, fn) {
  return sweepstakes.map(s => s.id === id ? fn(s) : s);
}

// ── handlers ───────────────────────────────────────────────────
async function handleCreate(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const id = 'sw_' + Date.now();
  await atomicUpdate(state => {
    const sweepstakes = [...getSweepstakes(state), { id, name: name.trim(), participants: [], teamData: {} }];
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true, id });
}

async function handleDeleteSweepstake(req, res) {
  const { sweepstakeId } = req.body;
  if (!sweepstakeId) return res.status(400).json({ error: 'sweepstakeId required' });
  await atomicUpdate(state => {
    const sweepstakes = getSweepstakes(state).filter(s => s.id !== sweepstakeId);
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

async function handleRename(req, res) {
  const { sweepstakeId, name } = req.body;
  if (!sweepstakeId || !name?.trim()) return res.status(400).json({ error: 'sweepstakeId and name required' });
  await atomicUpdate(state => {
    const sweepstakes = mapSw(getSweepstakes(state), sweepstakeId, s => ({ ...s, name: name.trim() }));
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

async function handleAssign(req, res) {
  const { sweepstakeId, participantName, teams } = req.body;
  if (!participantName?.trim()) return res.status(400).json({ error: 'participantName required' });
  if (!sweepstakeId) return res.status(400).json({ error: 'sweepstakeId required' });

  await atomicUpdate(state => {
    const all = getSweepstakes(state);
    if (!findSw(all, sweepstakeId)) throw { status: 404, error: 'sweepstake not found' };
    const sweepstakes = mapSw(all, sweepstakeId, sw => {
      const participants = [...(sw.participants || [])];
      const idx = participants.findIndex(p => p.name === participantName.trim());
      if (idx >= 0) {
        participants[idx] = { ...participants[idx], teams: teams || [] };
      } else {
        participants.push({ name: participantName.trim(), teams: teams || [] });
      }
      return { ...sw, participants };
    });
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

async function handleUpdateTeam(req, res) {
  const { sweepstakeId, team, ...updates } = req.body;
  if (!team) return res.status(400).json({ error: 'team required' });
  if (!sweepstakeId) return res.status(400).json({ error: 'sweepstakeId required' });

  await atomicUpdate(state => {
    const all = getSweepstakes(state);
    if (!findSw(all, sweepstakeId)) throw { status: 404, error: 'sweepstake not found' };
    const sweepstakes = mapSw(all, sweepstakeId, sw => {
      const teamData = { ...(sw.teamData || {}) };
      teamData[team] = { ...(teamData[team] || {}), ...updates };
      return { ...sw, teamData };
    });
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

async function handleRemoveParticipant(req, res) {
  const { sweepstakeId, participantName } = req.body;
  if (!participantName) return res.status(400).json({ error: 'participantName required' });
  if (!sweepstakeId) return res.status(400).json({ error: 'sweepstakeId required' });

  await atomicUpdate(state => {
    const all = getSweepstakes(state);
    if (!findSw(all, sweepstakeId)) throw { status: 404, error: 'sweepstake not found' };
    const sweepstakes = mapSw(all, sweepstakeId, sw => ({
      ...sw,
      participants: (sw.participants || []).filter(p => p.name !== participantName),
    }));
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

async function handleRenameParticipant(req, res) {
  const { sweepstakeId, oldName, newName } = req.body;
  if (!sweepstakeId) return res.status(400).json({ error: 'sweepstakeId required' });
  if (!oldName || !newName?.trim()) return res.status(400).json({ error: 'oldName and newName required' });

  await atomicUpdate(state => {
    const all = getSweepstakes(state);
    if (!findSw(all, sweepstakeId)) throw { status: 404, error: 'sweepstake not found' };
    const sweepstakes = mapSw(all, sweepstakeId, sw => {
      const participants = (sw.participants || []).map(p =>
        p.name === oldName ? { ...p, name: newName.trim() } : p
      );
      return { ...sw, participants };
    });
    return patchState(state, sweepstakes);
  });
  res.json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const action = req.query.action;
  if (action === 'create')             return handleCreate(req, res);
  if (action === 'delete-sweepstake')  return handleDeleteSweepstake(req, res);
  if (action === 'rename')             return handleRename(req, res);
  if (action === 'assign')             return handleAssign(req, res);
  if (action === 'update-team')        return handleUpdateTeam(req, res);
  if (action === 'remove-participant') return handleRemoveParticipant(req, res);
  if (action === 'rename-participant') return handleRenameParticipant(req, res);
  return res.status(404).json({ error: 'unknown action' });
}
