// Top 32 FIFA-ranked nations that qualified for the 2026 World Cup (April 2026 rankings)
const FIFA_TOP_32 = [
  'France', 'Spain', 'Argentina', 'England', 'Portugal', 'Brazil',
  'Netherlands', 'Morocco', 'Belgium', 'Germany', 'Croatia', 'Colombia',
  'Senegal', 'Mexico', 'United States', 'Uruguay', 'Japan', 'Switzerland',
  'Iran', 'Austria', 'Ecuador', 'South Korea', 'Australia', 'Egypt',
  'Canada', 'Ivory Coast', 'Qatar', 'Algeria', 'Sweden', 'Tunisia',
  'Czechia', 'Türkiye',
];

export const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const buildRound = (players, prefix) => {
  const next = [];
  for (let i = 0; i < players.length; i += 2)
    next.push({ id: `${prefix}${i / 2}`, p1: { ...players[i] }, p2: { ...players[i + 1] }, winner: null, played: false });
  return next;
};

export const genBracket = () => {
  // Seed 32 FIFA nations: 1v32, 2v31, … 16v17
  const slots = FIFA_TOP_32.map((name, i) => ({ code: genCode(), name, seed: i + 1 }));
  const pairs = [];
  for (let i = 0; i < 16; i++) pairs.push(slots[i], slots[31 - i]);
  const r32 = buildRound(pairs, 'r32_');
  return { r32, r16: [], qf: [], sf: [], final: null, champion: null, stage: 'r32' };
};

export const recordWin = (bracket, matchId, winner) => {
  const b = JSON.parse(JSON.stringify(bracket));
  const all = [
    ...(b.r32  || []),
    ...(b.r16  || []),
    ...(b.qf   || []),
    ...(b.sf   || []),
    ...(b.final ? [b.final] : []),
  ];
  const m = all.find(x => x.id === matchId);
  if (m) { m.winner = { ...winner }; m.played = true; }

  // Strip player claims — carry only team identity (name + seed), fresh code each round
  const freshSlots = winners => winners.map(w => ({ code: genCode(), name: w.name, seed: w.seed }));

  const done = arr => arr && arr.length > 0 && arr.every(x => x.played);
  if      (b.stage === 'r32'   && done(b.r32))     { b.r16     = buildRound(freshSlots(b.r32.map(x => x.winner)), 'r16_'); b.stage = 'r16'; }
  else if (b.stage === 'r16'   && done(b.r16))     { b.qf      = buildRound(freshSlots(b.r16.map(x => x.winner)), 'qf_');  b.stage = 'qf'; }
  else if (b.stage === 'qf'    && done(b.qf))      { b.sf      = buildRound(freshSlots(b.qf.map(x => x.winner)),  'sf_');  b.stage = 'sf'; }
  else if (b.stage === 'sf'    && done(b.sf))      { const f   = buildRound(freshSlots(b.sf.map(x => x.winner)), 'f'); b.final = { ...f[0], id: 'final' }; b.stage = 'final'; }
  else if (b.stage === 'final' && b.final?.played) { b.champion = b.final.winner; b.stage = 'champion'; }

  return b;
};
