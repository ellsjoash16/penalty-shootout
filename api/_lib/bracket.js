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

const sortStandings = (players) =>
  [...players].sort((a, b) =>
    b.points !== a.points ? b.points - a.points :
    (b.gd || 0) !== (a.gd || 0) ? (b.gd || 0) - (a.gd || 0) :
    (b.gf || 0) - (a.gf || 0)
  );

export const genBracket = (firstName) => {
  // 48 players → 12 groups of 4, 6 round-robin matches each
  // top 2 per group (24) + best 8 third-place (8) = 32 → R32
  const players = Array.from({ length: 48 }, (_, i) => ({ code: genCode(), name: i === 0 ? firstName : null }));
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }

  const GROUP_LABELS = 'ABCDEFGHIJKL'.split('');
  const groups = Array.from({ length: 12 }, (_, g) => {
    const gp = players.slice(g * 4, g * 4 + 4).map(p => ({ ...p, points: 0, gf: 0, ga: 0, gd: 0 }));
    return {
      id: `g${g}`,
      label: GROUP_LABELS[g],
      players: gp,
      matches: [
        { id: `g${g}_m0`, p1:{code:gp[0].code,name:gp[0].name}, p2:{code:gp[1].code,name:gp[1].name}, winner:null, played:false },
        { id: `g${g}_m1`, p1:{code:gp[0].code,name:gp[0].name}, p2:{code:gp[2].code,name:gp[2].name}, winner:null, played:false },
        { id: `g${g}_m2`, p1:{code:gp[0].code,name:gp[0].name}, p2:{code:gp[3].code,name:gp[3].name}, winner:null, played:false },
        { id: `g${g}_m3`, p1:{code:gp[1].code,name:gp[1].name}, p2:{code:gp[2].code,name:gp[2].name}, winner:null, played:false },
        { id: `g${g}_m4`, p1:{code:gp[1].code,name:gp[1].name}, p2:{code:gp[3].code,name:gp[3].name}, winner:null, played:false },
        { id: `g${g}_m5`, p1:{code:gp[2].code,name:gp[2].name}, p2:{code:gp[3].code,name:gp[3].name}, winner:null, played:false },
      ],
      winner: null,
      runnerUp: null,
      third: null,
    };
  });

  return { groups, r32: [], r16: [], qf: [], sf: [], final: null, champion: null, stage: 'groups' };
};

const recordGroupWin = (bracket, matchId, winner) => {
  const b = JSON.parse(JSON.stringify(bracket));
  const group = b.groups.find(g => g.matches.some(m => m.id === matchId));
  if (!group) return b;
  const match = group.matches.find(m => m.id === matchId);
  if (!match) return b;

  match.winner = { ...winner };
  match.played = true;

  const isP1Win = winner.code === match.p1.code;
  const s1 = match.p1Score || 0;
  const s2 = match.p2Score || 0;
  const p1 = group.players.find(p => p.code === match.p1.code);
  const p2 = group.players.find(p => p.code === match.p2.code);
  if (p1) { p1.points += isP1Win ? 3 : 0; p1.gf += s1; p1.ga += s2; p1.gd = p1.gf - p1.ga; }
  if (p2) { p2.points += isP1Win ? 0 : 3; p2.gf += s2; p2.ga += s1; p2.gd = p2.gf - p2.ga; }

  if (group.matches.every(m => m.played)) {
    const sorted = sortStandings(group.players);
    group.winner   = { code: sorted[0].code, name: sorted[0].name };
    group.runnerUp = { code: sorted[1].code, name: sorted[1].name };
    group.third    = { code: sorted[2].code, name: sorted[2].name, points: sorted[2].points, gd: sorted[2].gd, gf: sorted[2].gf };
  }

  // All 12 groups done → seed R32
  if (b.groups.every(g => g.winner)) {
    const winners  = b.groups.map(g => g.winner);    // 12 group winners
    const runners  = b.groups.map(g => g.runnerUp);  // 12 runners-up
    const thirds   = b.groups.map(g => g.third);     // 12 third-place candidates

    // Best 8 third-place teams by points → gd → gf
    const wildcardCodes = new Set(
      sortStandings(thirds).slice(0, 8).map(t => t.code)
    );
    const wildcards = sortStandings(thirds).slice(0, 8);

    // Mark which thirds made wild card cut
    b.groups.forEach(g => { if (g.third) g.third.qualified = wildcardCodes.has(g.third.code); });

    const mk = (id, p1, p2) => ({ id, p1: { ...p1 }, p2: { ...p2 }, winner: null, played: false });

    // Cross-seed: winners[0..5] vs runners[6..11], wildcards[0,1] vs wildcards[2,3]  (left half)
    //             winners[6..11] vs runners[0..5], wildcards[4,5] vs wildcards[6,7]  (right half)
    b.r32 = [
      mk('r32_0',  winners[0],   runners[6]),
      mk('r32_1',  winners[1],   runners[7]),
      mk('r32_2',  winners[2],   runners[8]),
      mk('r32_3',  winners[3],   runners[9]),
      mk('r32_4',  winners[4],   runners[10]),
      mk('r32_5',  winners[5],   runners[11]),
      mk('r32_6',  wildcards[0], wildcards[1]),
      mk('r32_7',  wildcards[2], wildcards[3]),
      mk('r32_8',  winners[6],   runners[0]),
      mk('r32_9',  winners[7],   runners[1]),
      mk('r32_10', winners[8],   runners[2]),
      mk('r32_11', winners[9],   runners[3]),
      mk('r32_12', winners[10],  runners[4]),
      mk('r32_13', winners[11],  runners[5]),
      mk('r32_14', wildcards[4], wildcards[5]),
      mk('r32_15', wildcards[6], wildcards[7]),
    ];
    b.stage = 'r32';
  }

  return b;
};

export const recordWin = (bracket, matchId, winner) => {
  if (matchId.startsWith('g')) return recordGroupWin(bracket, matchId, winner);

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

  const done = arr => arr && arr.length > 0 && arr.every(x => x.played);
  if      (b.stage === 'r32'   && done(b.r32))     { b.r16     = buildRound(b.r32.map(x => x.winner), 'r16_'); b.stage = 'r16'; }
  else if (b.stage === 'r16'   && done(b.r16))     { b.qf      = buildRound(b.r16.map(x => x.winner), 'qf_');  b.stage = 'qf'; }
  else if (b.stage === 'qf'    && done(b.qf))      { b.sf      = buildRound(b.qf.map(x => x.winner),  'sf_');  b.stage = 'sf'; }
  else if (b.stage === 'sf'    && done(b.sf))      { const f   = buildRound(b.sf.map(x => x.winner), 'f'); b.final = { ...f[0], id: 'final' }; b.stage = 'final'; }
  else if (b.stage === 'final' && b.final?.played) { b.champion = b.final.winner; b.stage = 'champion'; }

  return b;
};
