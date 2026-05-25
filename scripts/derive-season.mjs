// Deriva um snapshot JSON de uma temporada finalizada do Sleeper.
// Uso: node scripts/derive-season.mjs <ano>
// Lê a config de ligas inline (espelha KHC_CONFIG do app.js) e escreve em data/<ano>.json.
//
// Saída segue o data model do design handoff:
//   { id, status: 'final', series: [ { id, name, kind?, teams: [ {rank, team, user, w, l, pts, trophy?} ] } ] }

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config das temporadas a derivar ---
// Top-4 oficial (playoff result) vem do app.js — fonte da verdade pra trofeus.
const SEASONS = {
  2025: {
    series: [
      {
        id: 'A',
        name: 'KHC Serie A',
        leagueId: '1245850693172998144',
        top4: [
          { trophy: 'gold',   user: 'Khrstxn' },
          { trophy: 'silver', user: 'RobsonF90' },
          { trophy: 'bronze', user: 'markinhosfc11' },
          { trophy: 'fourth', user: 'LucioWagner' },
        ],
      },
      {
        id: 'B',
        name: 'KHC Serie B',
        leagueId: '1249749216419397632',
        top4: [
          { trophy: 'gold',   user: 'timbu2001' },
          { trophy: 'silver', user: 'Diogoashura' },
          { trophy: 'bronze', user: 'Dedi' },
          { trophy: 'fourth', user: 'Caofarejador' },
        ],
      },
    ],
  },
};

// --- Helpers ---
const API = 'https://api.sleeper.app/v1/league';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

function teamNameOf(user) {
  const custom = user?.metadata?.team_name;
  return (custom && custom.trim()) || user.display_name;
}

// Sleeper armazena pontos como (inteiro, decimal) onde decimal é inteiro (4 → .04, 74 → .74).
function combinePts(whole, dec) {
  return (whole ?? 0) + (dec ?? 0) / 100;
}
const round2 = n => Math.round(n * 100) / 100;

// --- Derivação de uma série ---
async function deriveSeries(series) {
  const [users, rosters] = await Promise.all([
    fetchJson(`${API}/${series.leagueId}/users`),
    fetchJson(`${API}/${series.leagueId}/rosters`),
  ]);

  const userById = new Map(users.map(u => [u.user_id, u]));

  // Constrói linha por roster
  const rows = rosters.map(r => {
    const user = userById.get(r.owner_id);
    const s = r.settings || {};
    return {
      user: user?.display_name ?? 'unknown',
      team: user ? teamNameOf(user) : 'unknown',
      avatarId: user?.avatar ?? null,
      w: s.wins ?? 0,
      l: s.losses ?? 0,
      pts: round2(combinePts(s.fpts, s.fpts_decimal)),
      ptsAgainst: round2(combinePts(s.fpts_against, s.fpts_against_decimal)),
      ppts: round2(combinePts(s.ppts, s.ppts_decimal)),
    };
  });

  // Top 4 pela ordem oficial de playoff
  const top4Users = new Set(series.top4.map(t => t.user));
  const trophyByUser = new Map(series.top4.map(t => [t.user, t.trophy]));

  const top = series.top4
    .map((t, i) => {
      const row = rows.find(r => r.user === t.user);
      if (!row) throw new Error(`User ${t.user} (${series.name} top4 #${i+1}) not in rosters`);
      return { rank: i + 1, ...row, trophy: t.trophy };
    });

  // Resto: ordena por wins desc, depois pts desc (regular season tiebreaker)
  const rest = rows
    .filter(r => !top4Users.has(r.user))
    .sort((a, b) => (b.w - a.w) || (b.pts - a.pts))
    .map((r, i) => ({ rank: 5 + i, ...r }));

  return {
    id: series.id,
    name: series.name,
    teams: [...top, ...rest],
  };
}

// --- Main ---
async function main() {
  const year = process.argv[2];
  if (!year || !SEASONS[year]) {
    console.error(`Uso: node scripts/derive-season.mjs <ano>\nAnos disponíveis: ${Object.keys(SEASONS).join(', ')}`);
    process.exit(1);
  }

  const cfg = SEASONS[year];
  console.log(`Derivando temporada ${year}…`);

  const series = [];
  for (const s of cfg.series) {
    console.log(`  → ${s.name} (${s.leagueId})`);
    series.push(await deriveSeries(s));
  }

  const snapshot = {
    id: Number(year),
    status: 'final',
    series,
  };

  const outPath = resolve(__dirname, '..', 'data', `${year}.json`);
  await writeFile(outPath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\nSalvo em ${outPath}`);

  // Resumo
  for (const s of series) {
    console.log(`\n${s.name}:`);
    for (const t of s.teams) {
      const trophy = t.trophy ? ` [${t.trophy}]` : '';
      console.log(`  ${String(t.rank).padStart(2)}. ${t.user.padEnd(18)} ${String(t.w).padStart(2)}-${String(t.l).padStart(2)}  ${t.pts.toFixed(2).padStart(8)}${trophy}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
