import { atomicUpdate } from './_lib/db.js';

// ESPN unofficial API — no key needed
const ESPN_STANDINGS   = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const ESPN_MATCHES     = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260601-20260719';
const ESPN_TOP_SCORERS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/statistics/players?limit=1&sort=goals:desc';

// Maps ESPN team names → our app names
const NAME_MAP = {
  "Turkey":                    "Türkiye",
  "Turkiye":                   "Türkiye",
  "Côte d'Ivoire":             "Ivory Coast",
  "Cote d'Ivoire":             "Ivory Coast",
  "United States":             "United States",
  "USA":                       "United States",
  "Democratic Republic of Congo": "DR Congo",
  "DR Congo":                  "DR Congo",
  "Congo DR":                  "DR Congo",
  "Congo, DR":                 "DR Congo",
  "Congo":                     "DR Congo",
  "Rep. of Congo":             "DR Congo",
  "Bosnia and Herzegovina":    "Bosnia & Herzegovina",
  "Bosnia & Herzegovina":      "Bosnia & Herzegovina",
  "Bosnia-Herzegovina":        "Bosnia & Herzegovina",
  "Bosnia Herzegovina":        "Bosnia & Herzegovina",
  "Korea Republic":            "South Korea",
  "Republic of Korea":         "South Korea",
  "Curacao":                   "Curaçao",
  "Curaçao":                   "Curaçao",
};

function norm(name) {
  if (!name) return '';
  return NAME_MAP[name] || name;
}

// stat value from ESPN stats array
function stat(stats, name) {
  return stats?.find(s => s.name === name || s.shortDisplayName === name)?.value ?? 0;
}

const STAGE_ORDER = ['r32','r16','qf','sf','runner_up','winner'];
function higher(a, b) {
  return !a ? b : !b ? a : STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b) ? a : b;
}

// FIFA rankings (June 2026) for all 48 WC teams
const FIFA_RANK = {
  'Argentina':          1,
  'France':             2,
  'Spain':              3,
  'England':            4,
  'Brazil':             5,
  'Belgium':            6,
  'Portugal':           7,
  'Netherlands':        8,
  'Colombia':           9,
  'Germany':           10,
  'Croatia':           11,
  'Morocco':           12,
  'Japan':             13,
  'United States':     14,
  'Mexico':            15,
  'Switzerland':       16,
  'Uruguay':           17,
  'Senegal':           18,
  'Austria':           19,
  'Ecuador':           20,
  'Australia':         21,
  'South Korea':       22,
  'Iran':              23,
  'Norway':            24,
  'Türkiye':           25,
  'Canada':            26,
  'Sweden':            27,
  'Tunisia':           28,
  'Algeria':           29,
  'Czechia':           30,
  'Scotland':          31,
  'Egypt':             32,
  'Paraguay':          33,
  'Ivory Coast':       34,
  'Qatar':             35,
  'DR Congo':          36,
  'Uzbekistan':        37,
  'South Africa':      38,
  'Iraq':              39,
  'Saudi Arabia':      40,
  'Panama':            41,
  'Haiti':             42,
  'Ghana':             43,
  'Bosnia & Herzegovina': 44,
  'Jordan':            45,
  'Cape Verde':        46,
  'Curaçao':           47,
  'New Zealand':       48,
};

const UPSET_THRESHOLD = 25; // team ranked > 25 beating a team ranked ≤ 25

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  try {
    const groupStats   = {};  // teamName → { groupPlayed, groupGF, groupGA, groupPts }
    const gamesPlayed  = {};  // teamName → completed group stage matches (counted from events)
    const reached      = {};  // teamName → highest knockout round
    const wins         = {};  // teamName → total wins across all matches
    const draws        = {};  // teamName → total draws (group stage)
    const cleanSheets  = {};  // teamName → total clean sheets across all matches
    const upsets       = {};  // teamName → upset wins (ranked >25 beating a team ranked ≤25)
    const groupWinners = new Set(); // teams that finished top of their group
    let   topScorerTeam = null; // only set after tournament is complete

    // ── 1. Group standings from ESPN ──────────────────────────────
    const sRes  = await fetch(ESPN_STANDINGS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const sData = await sRes.json();

    // WC standings: try top-level children first, then one level deeper (48-team WC nests under a conference)
    const topGroups = sData.children || [];
    const groups = (topGroups[0]?.children?.length ? topGroups.flatMap(c => c.children || []) : topGroups);
    const debugGroups = [];
    for (const group of groups) {
      const entries = group.standings?.entries || group.entries || [];
      let validIdx = 0; // track position among entries with a valid name
      const debugEntry = { groupName: group.name || group.abbreviation || '?', leader: null, played: null };
      for (const entry of entries) {
        const name  = norm(entry.team?.displayName || entry.team?.name || '');
        if (!name) continue;
        const stats = entry.stats || [];
        // Try multiple ESPN stat name variants for each field
        const played = stat(stats, 'gamesPlayed') || stat(stats, 'GP') || stat(stats, 'played') || stat(stats, 'GamesPlayed');
        const gf     = stat(stats, 'pointsFor')   || stat(stats, 'GF') || stat(stats, 'goalsFor');
        const ga     = stat(stats, 'pointsAgainst')|| stat(stats, 'GA') || stat(stats, 'goalsAgainst');
        const pts    = stat(stats, 'points')       || stat(stats, 'PTS')|| stat(stats, 'pts');
        groupStats[name] = { groupPlayed: played, groupGF: gf, groupGA: ga, groupPts: pts };
        // First valid entry is the group leader (ESPN returns in standings order)
        if (validIdx === 0) {
          debugEntry.leader = name;
          debugEntry.played = played;
          debugEntry.pts = pts;
          debugEntry.rawStatNames = stats.slice(0, 5).map(s => s.name || s.shortDisplayName);
          if (played >= 3) groupWinners.add(name);
        }
        validIdx++;
      }
      debugGroups.push(debugEntry);
    }

    // ── 2. Knockout results + bracket structure from ESPN scoreboard ──
    const mRes  = await fetch(ESPN_MATCHES, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const mData = await mRes.json();

    // Bail if any match is live — avoids syncing partial/mid-game scores
    const liveMatch = (mData.events || []).find(e => e.competitions?.[0]?.status?.type?.state === 'in');
    if (liveMatch) {
      return res.json({ ok: false, skipped: true, reason: 'match in progress', match: liveMatch.name });
    }

    const ROUND_MAP = {
      'Round of 32':    'r32',
      'Round of 16':    'r16',
      'Quarterfinals':  'qf',
      'Semifinals':     'sf',
      'Third Place':    null,
      'Final':          null,
    };

    const wcBracket = { r32: [], r16: [], qf: [], sf: [], final: null };

    for (const event of (mData.events || [])) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const roundText = comp.type?.text || comp.notes?.[0]?.headline || '';
      const round = ROUND_MAP[roundText];
      const isFinal = roundText === 'Final';

      const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
      const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
      const home = norm(homeComp?.team?.displayName || '');
      const away = norm(awayComp?.team?.displayName || '');
      const completed = comp.status?.type?.completed === true;
      const homeWon   = completed && homeComp?.winner === true;
      const awayWon   = completed && awayComp?.winner === true;
      const s1 = completed && homeComp?.score != null ? parseInt(homeComp.score) : null;
      const s2 = completed && awayComp?.score != null ? parseInt(awayComp.score) : null;
      const winner = completed ? (homeWon ? home : awayWon ? away : null) : null;

      // Count wins + draws + clean sheets + upsets for every completed match
      if (completed && winner) {
        const loser = winner === home ? away : home;
        wins[winner] = (wins[winner] || 0) + 1;
        const goalsConceded = homeWon ? s2 : s1;
        if (goalsConceded === 0) cleanSheets[winner] = (cleanSheets[winner] || 0) + 1;
        // Upset: winner ranked >25, loser ranked ≤25
        const winnerRank = FIFA_RANK[winner] ?? 999;
        const loserRank  = FIFA_RANK[loser]  ?? 999;
        if (winnerRank > UPSET_THRESHOLD && loserRank <= UPSET_THRESHOLD) {
          upsets[winner] = (upsets[winner] || 0) + 1;
        }
      } else if (completed && !winner && home && away) {
        draws[home] = (draws[home] || 0) + 1;
        draws[away] = (draws[away] || 0) + 1;
        if (s2 === 0) cleanSheets[home] = (cleanSheets[home] || 0) + 1;
        if (s1 === 0) cleanSheets[away] = (cleanSheets[away] || 0) + 1;
      }

      // Count completed group stage matches (not knockout)
      if (!isFinal && round === undefined) {
        if (completed && home) gamesPlayed[home] = (gamesPlayed[home] || 0) + 1;
        if (completed && away) gamesPlayed[away] = (gamesPlayed[away] || 0) + 1;
        continue;
      }

      const match = { t1: home || null, t2: away || null, s1, s2, winner };

      if (isFinal) {
        wcBracket.final = match;
        if (completed) {
          reached[homeWon ? home : away] = higher(reached[homeWon ? home : away], 'winner');
          reached[homeWon ? away : home] = higher(reached[homeWon ? away : home], 'runner_up');
        }
      } else if (round) {
        wcBracket[round].push(match);
        if (completed) {
          if (home) reached[home] = higher(reached[home], round);
          if (away) reached[away] = higher(reached[away], round);
        }
      }
    }

    // ── 3. Re-detect group winners using match-counted gamesPlayed ──
    // Sort by groupPts ourselves — do NOT trust ESPN array order (it can be wrong)
    groupWinners.clear();
    for (const group of groups) {
      const entries = (group.standings?.entries || group.entries || [])
        .map(e => norm(e.team?.displayName || e.team?.name || ''))
        .filter(Boolean);
      // Sort by groupPts desc, then goal difference desc
      const sorted = entries.sort((a, b) => {
        const ptsDiff = (groupStats[b]?.groupPts || 0) - (groupStats[a]?.groupPts || 0);
        if (ptsDiff !== 0) return ptsDiff;
        const gdA = (groupStats[a]?.groupGF || 0) - (groupStats[a]?.groupGA || 0);
        const gdB = (groupStats[b]?.groupGF || 0) - (groupStats[b]?.groupGA || 0);
        return gdB - gdA;
      });
      const leader = sorted[0];
      if (leader && (gamesPlayed[leader] || 0) >= 3) groupWinners.add(leader);
    }
    // Store accurate gamesPlayed in groupStats
    for (const [name, played] of Object.entries(gamesPlayed)) {
      if (groupStats[name]) groupStats[name].groupPlayed = played;
    }

    // ── 4. Top scorer — only once tournament is complete ─────────
    if (wcBracket.final?.winner) {
      try {
        const tsRes  = await fetch(ESPN_TOP_SCORERS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const tsData = await tsRes.json();
        // ESPN returns athletes[] or leaders[].leaders[].athlete depending on endpoint shape
        const athlete = tsData.athletes?.[0]
          || tsData.leaders?.[0]?.leaders?.[0]?.athlete;
        const teamName = norm(athlete?.team?.displayName || athlete?.team?.name || '');
        if (teamName) topScorerTeam = teamName;
      } catch (_) {
        // non-fatal — leave topScorerTeam as null, manual checkbox still works
      }
    }

    // ── 5. Write to state ─────────────────────────────────────────
    await atomicUpdate(state => {
      const sweepstakes = (state.sweepstakes || []).map(sw => {
        const td = { ...(sw.teamData || {}) };
        for (const [t, s] of Object.entries(groupStats)) {
          td[t] = { ...(td[t] || {}), ...s };
        }
        for (const [t, r] of Object.entries(reached)) {
          td[t] = { ...(td[t] || {}), reached: r };
        }
        // Reset computed match stats for all teams so stale values don't persist
        for (const t of Object.keys(td)) {
          td[t] = { ...(td[t] || {}), wins: wins[t] || 0, draws: draws[t] || 0, cleanSheets: cleanSheets[t] || 0, upsets: upsets[t] || 0, groupWinner: groupWinners.has(t) };
        }
        // Set topScorer only after tournament ends; clears any previous auto-set value
        if (topScorerTeam) {
          for (const t of Object.keys(td)) {
            td[t] = { ...(td[t] || {}), topScorer: t === topScorerTeam };
          }
        }
        return { ...sw, teamData: td };
      });
      return { ...state, sweepstakes, wcBracket, lastSync: new Date().toISOString() };
    });

    res.json({
      ok:              true,
      groupsUpdated:   Object.keys(groupStats).length,
      knockoutUpdated: Object.keys(reached).length,
      winsUpdated:        Object.keys(wins).length,
      cleanSheetsUpdated: Object.keys(cleanSheets).length,
      upsetsDetected:     Object.keys(upsets).length,
      topScorerTeam:      topScorerTeam || 'tournament not complete',
      syncedAt:           new Date().toISOString(),
      debug: {
        groupsParsed:   debugGroups.length,
        groupWinners:   [...groupWinners],
        gamesPlayedSample: Object.fromEntries(Object.entries(gamesPlayed).slice(0, 12)),
        groups:         debugGroups,
      },
    });

  } catch (e) {
    console.error('[sync-standings]', e);
    res.status(500).json({ error: e.message });
  }
}
