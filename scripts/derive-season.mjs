// Fecha uma temporada: grava a classificação final em data/<ano>.json.
// Uso: node scripts/derive-season.mjs <ano> [--saida caminho.json]
//
// Lê as ligas do próprio site (js/config.js: KHC_CONFIG[ano]) e, de cada
// uma, usuários, elencos e o chaveamento do Sleeper:
//   - Séries e Elite: 1º–4º pelos playoffs (final e disputa do 3º no
//     winners_bracket), 5º e 6º pela disputa do 5º lugar (se houver), o resto
//     pela temporada regular (vitórias, depois pontos). Troféus gold /
//     silver / bronze / fourth para o top 4.
//   - Guilhotina (kind: 'guillotine'): o último sobrevivente em 1º, depois
//     quem caiu mais tarde (settings.eliminated). Sem troféu nem Pontos KHC
//     (liga avulsa); sem V–D; `cut` = rodada do corte (0 = sobrevivente).
//     Premier League e NBA não entram aqui.
//   - Copa KHC (kind: 'cup', quando KHC_CONFIG[ano].copa não é teste): pódio
//     1º–4º com a mesma conta do site (resolveCup). `--so-copa` só confere a
//     Copa; `--classificatoria N` simula outra semana classificatória.
//   - Confrontos de cada semana, chaveamento e configurações de cada liga
//     (rounds, menos a Guilhotina): com eles, Rodada, Chaveamento, Copa e
//     Champions KHC da temporada fechada saem do arquivo, sem Sleeper.
//     `--so-placares` só acrescenta `rounds` a um data/<ano>.json que já
//     existe (temporada fechada antes desta opção), sem mexer no resto.
// Para se a temporada não acabou (final ou 3º lugar sem vencedor).
//
// Saída: { id, status: 'final', series: [ { id, name, kind?, teams: [
//   { rank, rosterId, userId, user, team, avatarId, w, l, t?, pts, ptsAgainst,
//     ppts, trophy?, cut? } ] } ],
//   rounds: { "<tier>": { settings: { leg, lastScored, playoffStart, playoffTeams },
//     bracket: [ { m, r, p, t1, t2, w, l, t1_from, t2_from } ],
//     weeks: { "<semana>": [ [rosterId, matchupId|null, pontos] ] } } } }
// O arquivo é o registro da temporada: o site mostra a temporada fechada só
// com ele (nomes e números da época), e liga jogador por userId.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.sleeper.app/v1/league';

// --- Config do site (scripts globais, sem módulos) ---
const ctx = vm.createContext({ console });
vm.runInContext((await readFile(resolve(ROOT, 'js/config.js'), 'utf8'))
    + '\n' + (await readFile(resolve(ROOT, 'js/derivations.js'), 'utf8'))
    + '\n;globalThis.__khc = { KHC_CONFIG, SERIES_META, TIER_ORDER, isGuillotine, isRegularSeries, VALIDATION, resolveCup, cupPhases, resolveUcl, REGULAR_SEASON_WEEKS, archivedCopaScores };', ctx);
const { KHC_CONFIG, SERIES_META, TIER_ORDER, isGuillotine, isRegularSeries, VALIDATION, resolveCup, cupPhases, resolveUcl, REGULAR_SEASON_WEEKS, archivedCopaScores } = ctx.__khc;

// última semana de fantasy (final dos playoffs das séries)
const LAST_WEEK = REGULAR_SEASON_WEEKS + 3;

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
        // id permanente do Sleeper: liga o histórico ao jogador mesmo se ele trocar de nome
        userId: r.owner_id ? String(r.owner_id) : null,
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
    // rosterId fica (o site monta a temporada fechada só com este arquivo)
    const clean = ({ eliminated, ...rest }) => rest;

    if (isGuillotine(league.tier)) {
        const alive = rows.filter(r => !r.eliminated);
        if (alive.length !== 1) throw new Error(`${league.name}: ${alive.length} times vivos (esperado 1 sobrevivente)`);
        const ranked = rows.slice().sort((a, b) => ((b.eliminated || 99) - (a.eliminated || 99)) || (b.pts - a.pts));
        return {
            id: meta.id, name: league.name, kind: 'guillotine',
            teams: ranked.map((r, i) => {
                const { w, l, t, ...rest } = clean(r);
                return { rank: i + 1, ...rest, cut: r.eliminated || 0 };
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
    // 5º e 6º pela disputa do 5º lugar (quando o chaveamento tem); o resto
    // pela temporada regular (vitórias, depois pontos)
    const fifth = bracket.find(g => g.p === 5 && Number.isInteger(g.w) && Number.isInteger(g.l));
    const placed = fifth ? [fifth.w, fifth.l] : [];
    const mid = placed.map((rid, i) => ({ rank: 5 + i, ...clean(byRoster.get(rid)) }));
    const rest = rows
        .filter(r => !podium.includes(r.rosterId) && !placed.includes(r.rosterId))
        .sort((a, b) => (b.w - a.w) || (b.pts - a.pts))
        .map((r, i) => ({ rank: 5 + placed.length + i, ...clean(r) }));
    return { id: meta.id, name: league.name, teams: [...top, ...mid, ...rest] };
}

/**
 * Registro de cada liga (menos a Guilhotina): configurações, chaveamento e
 * confrontos de todas as semanas jogadas. Vai para o data/<ano>.json.
 * @param {Object} cfg  KHC_CONFIG[ano]
 * @returns {Promise<Object<string, Object>>} tier → registro
 */
async function fetchRounds(cfg) {
    const rounds = {};
    const int = v => (Number.isInteger(v) ? v : null);
    const from = f => (f && Number.isInteger(f.w) ? { w: f.w } : f && Number.isInteger(f.l) ? { l: f.l } : null);
    for (const l of cfg.leagues.filter(x => !isGuillotine(x.tier))) {
        const base = `${API}/${l.id}`;
        const [info, bracket] = await Promise.all([fetchJson(base), fetchJson(`${base}/winners_bracket`)]);
        const st = info.settings || {};
        const settings = { leg: st.leg ?? 0, lastScored: st.last_scored_leg ?? 0, playoffStart: st.playoff_week_start ?? REGULAR_SEASON_WEEKS + 1, playoffTeams: st.playoff_teams ?? 0 };
        const weeks = {};
        for (let w = 1; w <= Math.min(LAST_WEEK, settings.leg || LAST_WEEK); w++) {
            const raw = await fetchJson(`${base}/matchups/${w}`);
            weeks[w] = raw.filter(m => Number.isInteger(m.roster_id))
                .sort((a, b) => a.roster_id - b.roster_id)
                .map(m => [m.roster_id, int(m.matchup_id), round2(Math.max(0, Number(m.points) || 0))]);
        }
        rounds[l.tier] = {
            settings,
            bracket: (bracket || []).filter(g => Number.isInteger(g.m)).map(g => ({
                m: g.m, r: g.r, p: int(g.p), t1: int(g.t1), t2: int(g.t2), w: int(g.w), l: int(g.l),
                t1_from: from(g.t1_from), t2_from: from(g.t2_from)
            })),
            weeks
        };
    }
    return rounds;
}

/** JSON com 2 espaços, mas cada confronto [rosterId, matchupId, pontos] numa linha só. */
function toJson(obj) {
    return JSON.stringify(obj, null, 2).replace(/\[\s+(-?[\d.]+|null),\s+(-?[\d.]+|null),\s+(-?[\d.]+|null)\s+\]/g, '[$1, $2, $3]') + '\n';
}

/**
 * Copa KHC: pódio (1º–4º) com a mesma conta do site (resolveCup). Só entra
 * no histórico quando a Copa não é teste (soma Pontos KHC).
 * @param {Object} cfg  KHC_CONFIG[ano]
 * @param {Object} copa  cfg.copa (dá para sobrescrever a semana nos testes)
 * @param {Object} rounds  fetchRounds(cfg)
 */
async function deriveCup(cfg, copa, rounds) {
    const leagues = cfg.leagues.filter(l => isRegularSeries(l.tier));
    const ucl = copa.format === 'ucl';   // estilo Champions: fase de liga + mata-mata em 2 semanas
    const first = ucl ? copa.leagueWeeks[0] : copa.qualifying - 1;
    const last = ucl ? copa.knockout.final[copa.knockout.final.length - 1] : copa.qualifying + cupPhases(copa).length - 1;
    // mesma leitura do site para temporada fechada
    const saved = archivedCopaScores({ rounds }, leagues.map(l => l.tier), first, last);
    if (!saved) throw new Error('Copa KHC: faltam semanas da Copa nos confrontos do Sleeper');
    const { settings, scores } = saved;
    const keys = [], rowByKey = {};
    for (const l of leagues) {
        const [users, rosters] = await Promise.all([fetchJson(`${API}/${l.id}/users`), fetchJson(`${API}/${l.id}/rosters`)]);
        const userById = new Map(users.map(u => [u.user_id, u]));
        rosters.forEach(r => {
            const k = `${l.tier}:${r.roster_id}`;
            keys.push(k);
            const { eliminated, w, l: losses, t, ptsAgainst, ppts, ...row } = rowOf(r, userById);
            rowByKey[k] = row;
        });
    }
    const cup = ucl
        ? resolveUcl(copa, keys.map(k => ({ key: k, tier: k.split(':')[0] })), scores, settings)
        : resolveCup(copa, keys, scores, settings);
    if (!cup.podium || cup.podium.length < 4) throw new Error('Copa KHC: a final ou a disputa do 3º lugar ainda não terminou');
    return {
        id: SERIES_META.copa.id, name: SERIES_META.copa.name, kind: 'cup',
        teams: cup.podium.map((k, i) => {
            const { pts, ...row } = rowByKey[k];   // pontos da Copa = só o placar de cada jogo; fica fora
            return { rank: i + 1, ...row, trophy: TROPHIES[i] };
        })
    };
}

async function main() {
    const args = process.argv.slice(2);
    const year = args.find(a => /^\d{4}$/.test(a));
    const outArg = args.indexOf('--saida');
    const onlyCup = args.includes('--so-copa');                 // conferir a Copa sem fechar a temporada
    const onlyScores = args.includes('--so-placares');          // só acrescenta rounds ao arquivo
    const qArg = args.indexOf('--classificatoria');              // teste: outra semana classificatória
    const cfg = year && KHC_CONFIG[year];
    if (!cfg) {
        console.error(`Uso: node scripts/derive-season.mjs <ano> [--saida caminho.json] [--so-copa [--classificatoria N]] [--so-placares]\nAnos em js/config.js: ${Object.keys(KHC_CONFIG).join(', ')}`);
        process.exit(1);
    }

    if (onlyCup) {
        if (!cfg.copa) throw new Error(`${year} não tem Copa em js/config.js`);
        const copa = { ...cfg.copa, ...(qArg >= 0 ? { qualifying: Number(args[qArg + 1]) } : {}) };
        const s = await deriveCup(cfg, copa, await fetchRounds(cfg));
        console.log(`Copa KHC ${year}${copa.test ? ' (teste)' : ''}, classificatória na semana ${copa.qualifying}:`);
        s.teams.forEach(t => console.log(`  ${t.rank}. ${t.user} (${t.team}) [${t.trophy}]`));
        return;
    }

    const outPath = outArg >= 0 ? resolve(args[outArg + 1]) : resolve(ROOT, 'data', `${year}.json`);

    if (onlyScores) {
        const snap = JSON.parse(await readFile(outPath, 'utf8'));
        console.log(`Confrontos semana a semana de ${year}…`);
        snap.rounds = await fetchRounds(cfg);
        await writeFile(outPath, toJson(snap));
        Object.entries(snap.rounds).forEach(([t, r]) => console.log(`  ${t}: ${Object.keys(r.weeks).length} semanas, ${r.bracket.length} jogos no chaveamento`));
        console.log(`Salvo em ${outPath}`);
        return;
    }

    console.log(`Fechando a temporada ${year}…`);
    const leagues = cfg.leagues.slice().sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
    const series = [];
    for (const league of leagues) {
        console.log(`  → ${league.name} (${league.id})`);
        series.push(await deriveLeague(league));
    }
    // confrontos semana a semana: Rodada, Chaveamento, Copa e Champions KHC sem Sleeper
    console.log('  → confrontos semana a semana');
    const rounds = await fetchRounds(cfg);
    if (cfg.copa && !cfg.copa.test) {
        console.log('  → Copa KHC');
        series.push(await deriveCup(cfg, cfg.copa, rounds));
    }

    const snapshot = { id: Number(year), status: 'final', series, rounds };
    await writeFile(outPath, toJson(snapshot));
    console.log(`\nSalvo em ${outPath}`);

    for (const s of series) {
        console.log(`\n${s.name}:`);
        for (const t of s.teams) {
            const cut = s.kind === 'guillotine' ? (t.cut ? ` [cortado R${t.cut}]` : ' [sobrevivente]') : '';
            const tag = `${cut}${t.trophy ? ` [${t.trophy}]` : ''}`;
            const rec = s.kind ? '     ' : `${String(t.w).padStart(2)}-${String(t.l).padStart(2)}`;
            const pts = t.pts === undefined ? '' : t.pts.toFixed(2).padStart(8);
            console.log(`  ${String(t.rank).padStart(2)}. ${t.user.padEnd(18)} ${rec}  ${pts}${tag}`);
        }
    }
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
