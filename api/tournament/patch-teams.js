import { atomicUpdate } from '../_lib/db.js';

const NEW_FIFA_TOP_32 = [
  'France', 'Spain', 'Argentina', 'England', 'Portugal', 'Brazil',
  'Netherlands', 'Morocco', 'Belgium', 'Germany', 'Croatia', 'Colombia',
  'Senegal', 'Mexico', 'United States', 'Uruguay', 'Japan', 'Switzerland',
  'Iran', 'Austria', 'Ecuador', 'South Korea', 'Australia', 'Egypt',
  'Canada', 'Ivory Coast', 'Qatar', 'Algeria', 'Sweden', 'Tunisia',
  'Czechia', 'Türkiye',
];

const REPLACEMENTS = {
  'Italy':   'Egypt',
  'Denmark': 'Sweden',
  'Serbia':  'Algeria',
  'Turkey':  'Türkiye',
  'Poland':  'Tunisia',
  'Hungary': 'Ivory Coast',
  'Ukraine': 'Canada',
  'Romania': 'Qatar',
};

const newSeedMap = Object.fromEntries(NEW_FIFA_TOP_32.map((name, i) => [name, i + 1]));

function patchTeam(team) {
  if (!team) return team;
  const newName = REPLACEMENTS[team.name] ?? team.name;
  const newSeed = newSeedMap[newName] ?? team.seed;
  return { ...team, name: newName, seed: newSeed };
}

function patchMatch(match) {
  if (!match) return match;
  return {
    ...match,
    p1:     patchTeam(match.p1),
    p2:     patchTeam(match.p2),
    winner: patchTeam(match.winner),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  await atomicUpdate(state => {
    if (!state.bracket) return state;
    const b = state.bracket;
    return {
      ...state,
      bracket: {
        ...b,
        r32:      b.r32?.map(patchMatch),
        r16:      b.r16?.map(patchMatch),
        qf:       b.qf?.map(patchMatch),
        sf:       b.sf?.map(patchMatch),
        final:    patchMatch(b.final),
        champion: patchTeam(b.champion),
      },
    };
  });

  res.json({ ok: true });
}
