// Fecha uma temporada: grava a classificação final em data/<ano>.json.
// Uso: node scripts/derive-season.mjs <ano> [--saida caminho.json]
//
// Lê as ligas do próprio site (js/config.js: KHC_CONFIG[ano]) e, de cada
// uma, usuários, elencos e o chaveamento do Sleeper:
//   - Séries e Elite: 1º–4º pelos playoffs (final e disputa do 3º no
//     winners_bracket), 5º+ pela temporada regular (vitórias, depois pontos).
//     Troféus gold / silver / bronze / fourth para o top 4.
//   - Guilhotina (kind: 'guillotine'): o último sobrevivente em 1º, depois
//     quem caiu mais tarde (settings.eliminated). Top 4 com troféu (o
//     sobrevivente leva o título, conta nas Lendas com os Pontos KHC da
//     Guilhotina); sem V–D; `cut` = rodada do corte (0 = sobrevivente).
//     Premier League e NBA não entram aqui.
// Para se a temporada não acabou (final ou 3º lugar sem vencedor).
//
// Saída: { id, status: 'final', series: [ { id, name, kind?, teams: [
//   { rank, user, team, avatarId, w, l, t?, pts, ptsAgainst, ppts, trophy?, cut? } ] } ] }

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.sleeper.app/v1/league';

// --- Config do site (scripts globais, sem módulos) ---
const ctx = vm.createContext({ console });
vm.runInContext((await readFile(resolve(ROOT, 'js/config.js'), 'utf8'))
    + '\n;globalThis.__khc = { KHC_CONFIG, SERIES_META, TIER_ORDER, isGuillotine, VALIDATION };', ctx);
const { KHC_CONFIG, SERIES_META, TIER_ORDER, isGuillotine, VALIDATION } = ctx.__khc;

async function fetchJson(url) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(url);
        if (res.ok) return res.json();
        if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status} em ${url}`);
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw new Error(`Sleeper falhou: ${url}`);
}

function teamNameOf(user) {
    const custom = user?.metadata?.team_name;
    return (custom && custom.trim()) || user.display_name;
}

// Sleeper guarda pontos como (inteiro, decimal) com decimal inteiro (4 → .04, 74 → .74).
const combinePts = (whole, dec) => (whole ?? 0) + (dec ?? 0) / 100;
const round2 = n => Math.round(n * 100) / 100;

const TROPHIES = ['gold', 'silver', 'bronze', 'fourth'];

/** Linha base de um elenco. */
function rowOf(r, userById) {
    const user = userById.get(r.owner_id);
    const s = r.settings || {};
    const row = {
        rosterId: r.roster_id,
        user: user?.display_name ?? 'unknown',
        team: user ? teamNameOf(user) : 'unknown',
        // logo do time na liga (metadata.avatar); sem ele, a foto da conta
        avatarId: (VALIDATION.LEAGUE_AVATAR_PATTERN.test(user?.metadata?.avatar || '') ? user.metadata.avatar : null) ?? user?.avatar ?? null,
        w: s.wins ?? 0,
        l: s.losses ?? 0,
        pts: round2(combinePts(s.fpts, s.fpts_decimal)),
        ptsAgainst: round2(combinePts(s.fpts_against, s.fpts_against_decimal)),
        ppts: round2(combinePts(s.ppts, s.ppts_decimal)),
        eliminated: s.eliminated ?? 0
    };
    if (s.ties) row.t = s.ties;
    return row;
}

/** Top 4 pelos playoffs: [ouro, prata, bronze, 4º] em rosterIds. */
function podiumFromBracket(bracket, name) {
    const game = p => bracket.find(g => g.p === p);
    const fin = game(1), third = game(3);
    if (!fin || !Number.isInteger(fin.w) || !Number.isInteger(fin.l)) throw new Error(`${name}: a final ainda não tem vencedor no Sleeper`);
    if (!third || !Number.isInteger(third.w) || !Number.isInteger(third.l)) throw new Error(`${name}: a disputa do 3º lugar ainda não tem vencedor no Sleeper`);
    return [fin.w, fin.l, third.w, third.l];
}

/** Uma liga da temporada → série do snapshot. */
async function deriveLeague(league) {
    const meta = SERIES_META[league.tier];
    if (!meta) throw new Error(`Tier desconhecido em js/config.js: ${league.tier}`);
    const base = `${API}/${league.id}`;
    const [users, rosters, bracket] = await Promise.all([
        fetchJson(`${base}/users`), fetchJson(`${base}/rosters`), fetchJson(`${base}/winners_bracket`)
    ]);
    const userById = new Map(users.map(u => [u.user_id, u]));
    const rows = rosters.map(r => rowOf(r, userById));
    const clean = ({ rosterId, eliminated, ...rest }) => rest;

    if (isGuillotine(league.tier)) {
        const alive = rows.filter(r => !r.eliminated);
        if (alive.length !== 1) throw new Error(`${league.name}: ${alive.length} times vivos (esperado 1 sobrevivente)`);
        const ranked = rows.slice().sort((a, b) => ((b.eliminated || 99) - (a.eliminated || 99)) || (b.pts - a.pts));
        return {
            id: meta.id, name: league.name, kind: 'guillotine',
            teams: ranked.map((r, i) => {
                const { w, l, t, ...rest } = clean(r);
                const row = { rank: i + 1, ...rest, cut: r.eliminated || 0 };
                if (i < 4) row.trophy = TROPHIES[i];   // sobrevivente e os 3 últimos cortados
                return row;
            })
        };
    }

    const podium = podiumFromBracket(bracket, league.name);
    const byRoster = new Map(rows.map(r => [r.rosterId, r]));
    const top = podium.map((rid, i) => {
        const row = byRoster.get(rid);
        if (!row) throw new Error(`${league.name}: roster ${rid} do chaveamento não está nos elencos`);
        return { rank: i + 1, ...clean(row), trophy: TROPHIES[i] };
    });
    const rest = rows
        .filter(r => !podium.includes(r.rosterId))
        .sort((a, b) => (b.w - a.w) || (b.pts - a.pts))
        .map((r, i) => ({ rank: 5 + i, ...clean(r) }));
    return { id: meta.id, name: league.name, teams: [...top, ...rest] };
}

async function main() {
    const args = process.argv.slice(2);
    const year = args.find(a => /^\d{4}$/.test(a));
    const outArg = args.indexOf('--saida');
    const cfg = year && KHC_CONFIG[year];
    if (!cfg) {
        console.error(`Uso: node scripts/derive-season.mjs <ano> [--saida caminho.json]\nAnos em js/config.js: ${Object.keys(KHC_CONFIG).join(', ')}`);
        process.exit(1);
    }

    console.log(`Fechando a temporada ${year}…`);
    const leagues = cfg.leagues.slice().sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
    const series = [];
    for (const league of leagues) {
        console.log(`  → ${league.name} (${league.id})`);
        series.push(await deriveLeague(league));
    }

    const snapshot = { id: Number(year), status: 'final', series };
    const outPath = outArg >= 0 ? resolve(args[outArg + 1]) : resolve(ROOT, 'data', `${year}.json`);
    await writeFile(outPath, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`\nSalvo em ${outPath}`);

    for (const s of series) {
        console.log(`\n${s.name}:`);
        for (const t of s.teams) {
            const cut = s.kind ? (t.cut ? ` [cortado R${t.cut}]` : ' [sobrevivente]') : '';
            const tag = `${cut}${t.trophy ? ` [${t.trophy}]` : ''}`;
            const rec = s.kind ? '     ' : `${String(t.w).padStart(2)}-${String(t.l).padStart(2)}`;
            console.log(`  ${String(t.rank).padStart(2)}. ${t.user.padEnd(18)} ${rec}  ${t.pts.toFixed(2).padStart(8)}${tag}`);
        }
    }
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
