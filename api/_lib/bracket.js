export const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const buildRound = (winners, prefix) => {
  const next = [];
  for (let i = 0; i < winners.length; i += 2)
    next.push({ id: `${prefix}${i / 2}`, p1: { ...winners[i] }, p2: { ...winners[i + 1] }, winner: null, played: false });
  return next;
};

export const genBracket = (firstName) => {
  // 48 slots: 16 seeded (direct to R32) + 32 unseeded (play Wild Card)
  const slots = Array.from({ length: 48 }, (_, i) => ({ code: genCode(), name: i === 0 ? firstName : null }));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const seeded   = slots.slice(0, 16);
  const unseeded = slots.slice(16, 48);

  const wc = Array.from({ length: 16 }, (_, i) => ({
    id: `wc_${i}`,
    p1: { ...unseeded[i * 2] },
    p2: { ...unseeded[i * 2 + 1] },
    winner: null, played: false,
  }));

  // seeded team is p1; p2 filled when wc_i completes
  const r32 = Array.from({ length: 16 }, (_, i) => ({
    id: `r32_${i}`,
    p1: { ...seeded[i] },
    p2: null,
    winner: null, played: false,
  }));

  return { wc, r32, r16: [], qf: [], sf: [], final: null, champion: null, stage: 'wc' };
};

export const recordWin = (bracket, matchId, winner) => {
  const b = JSON.parse(JSON.stringify(bracket));
  const all = [...b.wc, ...b.r32, ...b.r16, ...b.qf, ...b.sf, ...(b.final ? [b.final] : [])];
  const m = all.find(x => x.id === matchId);
  if (m) { m.winner = { ...winner }; m.played = true; }

  // Slot WC winner into the matching R32 match as p2
  if (matchId.startsWith('wc_')) {
    const idx = parseInt(matchId.split('_')[1]);
    b.r32[idx].p2 = { ...winner };
  }

  const done = arr => arr.length > 0 && arr.every(x => x.played);
  if      (b.stage === 'wc'    && done(b.wc))    { b.stage = 'r32'; }
  else if (b.stage === 'r32'   && done(b.r32))   { b.r16 = buildRound(b.r32.map(x => x.winner), 'r16_'); b.stage = 'r16'; }
  else if (b.stage === 'r16'   && done(b.r16))   { b.qf  = buildRound(b.r16.map(x => x.winner), 'qf_');  b.stage = 'qf'; }
  else if (b.stage === 'qf'    && done(b.qf))    { b.sf  = buildRound(b.qf.map(x => x.winner),  'sf_');  b.stage = 'sf'; }
  else if (b.stage === 'sf'    && done(b.sf))    { const f = buildRound(b.sf.map(x => x.winner), 'f'); b.final = { ...f[0], id: 'final' }; b.stage = 'final'; }
  else if (b.stage === 'final' && b.final?.played) { b.champion = b.final.winner; b.stage = 'champion'; }

  return b;
};
