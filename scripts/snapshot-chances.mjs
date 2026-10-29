// Registro semanal das chances (Playoffs % / Queda %) de cada time.
// Uso: node scripts/snapshot-chances.mjs [ano]      (padrão: temporada mais recente)
//
// Refaz exatamente a conta do site: carrega js/config.js e js/derivations.js
// (buildOddsInput + simulateOdds, mesma semente por liga/rodada) e grava em
// data/chances-<ano>.json:
//   - snapshots: uma entrada por série e rodada encerrada ("após a rodada N").
//     Rodadas que o site já tinha passado quando o registro começou entram
//     como backfilled: true (reconstruídas, ninguém as viu no site).
//   - results: classificação final da temporada regular (quem foi aos
//     playoffs e quem caiu), gravada quando a temporada regular fecha.
// Idempotente: só acrescenta o que falta. Rodado pelo GitHub Actions
// (.github/workflows/chances.yml) toda terça e quarta.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.sleeper.app/v1';

// --- Carrega o código do site (scripts globais, sem módulos) ---
const ctx = vm.createContext({ console });
const code = (await readFile(resolve(ROOT, 'js/config.js'), 'utf8'))
    + '\n' + (await readFile(resolve(ROOT, 'js/derivations.js'), 'utf8'))
    + '\n;globalThis.__khc = { KHC_CONFIG, TIER_ORDER, isGuillotine, isRegularSeries, ODDS_PARAMS, simulateOdds, seedFrom, buildOddsInput };';
vm.runInContext(code, ctx);
const { KHC_CONFIG, TIER_ORDER, isGuillotine, isRegularSeries, ODDS_PARAMS, simulateOdds, seedFrom, buildOddsInput } = ctx.__khc;

async function get(path) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(`${API}${path}`);
        if (res.ok) return res.json();
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw new Error(`Sleeper falhou: ${path}`);
}

/** Placares (rosterId → pontos) e confrontos ([a, b]) de uma semana. */
async function week(leagueId, w) {
    const raw = await get(`/league/${leagueId}/matchups/${w}`);
    const scores = {}, groups = {};
    raw.forEach(m => {
        if (!Number.isInteger(m.roster_id)) return;
        scores[m.roster_id] = Math.max(0, Number(m.points) || 0);
        if (Number.isInteger(m.matchup_id)) (groups[m.matchup_id] = groups[m.matchup_id] || []).push(m.roster_id);
    });
    return { scores, pairs: Object.values(groups).filter(g => g.length === 2) };
}

/** Vagas e quedas por série (espelha zonesFor de js/tabs/ligas.js). */
function zones(cfg, tier) {
    const rules = cfg.rules;
    if (tier === 'elite') return { spots: rules.elitePlayoffTeams, relegate: 0 };
    const regular = cfg.leagues.map(l => l.tier).filter(isRegularSeries)
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
    return { spots: rules.playoffTeams, relegate: regular[regular.length - 1] === tier ? 0 : rules.relegate };
}

const round4 = x => Math.round(x * 10000) / 10000;

async function main() {
    const season = process.argv[2] || Object.keys(KHC_CONFIG).sort().pop();
    const cfg = KHC_CONFIG[season];
    if (!cfg) throw new Error(`Temporada ${season} não está em js/config.js`);
    if (existsSync(resolve(ROOT, `data/${season}.json`))) {
        console.log(`${season} já está finalizada (data/${season}.json). Nada a fazer.`);
        return;
    }

    const file = resolve(ROOT, `data/chances-${season}.json`);
    const doc = existsSync(file)
        ? JSON.parse(await readFile(file, 'utf8'))
        : { season, about: 'Chances de playoffs e rebaixamento registradas após cada rodada encerrada (mesma conta do site). results = classificação final da temporada regular, para comparar com as chances.', model: null, snapshots: [], results: {} };
    doc.model = { ...ODDS_PARAMS };
    const has = (tier, k) => doc.snapshots.some(s => s.tier === tier && s.afterWeek === k);
    const takenAt = new Date().toISOString();
    let added = 0;

    for (const league of cfg.leagues) {
        const { id, tier } = league;
        if (isGuillotine(tier)) continue;   // sem playoffs nem queda
        const [info, users, rosters] = await Promise.all([get(`/league/${id}`), get(`/league/${id}/users`), get(`/league/${id}/rosters`)]);
        // antes do draft não há elencos nem calendário para simular
        if (info.status === 'pre_draft' || info.status === 'drafting') {
            console.log(`${tier}: antes do draft, nada a registrar`);
            continue;
        }
        const st = info.settings || {};
        const regWeeks = Math.max(1, (st.playoff_week_start || 15) - 1);
        const scored = Math.max(0, Math.min(st.last_scored_leg || 0, regWeeks));
        const { spots, relegate } = zones(cfg, tier);

        // Mesma ordem de times do site (vitórias, depois pontos): define a semente por time.
        const pts = r => (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100;
        const ordered = rosters.slice().sort((a, b) => ((b.settings?.wins || 0) - (a.settings?.wins || 0)) || (pts(b) - pts(a)));
        const rosterIds = ordered.map(r => r.roster_id);
        const userOf = Object.fromEntries(users.map(u => [u.user_id, u]));
        const who = Object.fromEntries(ordered.map(r => {
            const u = userOf[r.owner_id] || {};
            return [r.roster_id, { user: u.display_name || '', team: u.metadata?.team_name || u.display_name || '' }];
        }));

        const missing = [];
        for (let k = 0; k <= Math.min(scored, regWeeks - 1); k++) if (!has(tier, k)) missing.push(k);
        const needResults = scored >= regWeeks && !doc.results[tier];
        if (!missing.length && !needResults) continue;

        const weeks = await Promise.all(Array.from({ length: regWeeks }, (_, i) => week(id, i + 1)));
        const scores = weeks.map(w => w.scores);
        const pairs = weeks.map(w => w.pairs);

        for (const k of missing) {
            const { teams, schedule } = buildOddsInput(rosterIds, scores, pairs, k);
            const odds = simulateOdds({ teams, schedule, spots, relegate, seed: seedFrom(`${id}|${k}`) });
            doc.snapshots.push({
                tier, afterWeek: k, takenAt, backfilled: k < scored,
                teams: teams.map(t => ({
                    rosterId: t.id, ...who[t.id], w: t.wins, l: k - t.wins, pf: Math.round(t.pf * 10) / 10,
                    playoffs: round4(odds[t.id].playoffs), releg: round4(odds[t.id].releg)
                }))
            });
            added++;
        }

        if (needResults) {
            const { teams } = buildOddsInput(rosterIds, scores, pairs, regWeeks);
            const ranked = teams.slice().sort((a, b) => (b.wins - a.wins) || (b.pf - a.pf));
            doc.results[tier] = {
                afterWeek: regWeeks, spots, relegate,
                teams: ranked.map((t, i) => ({
                    rosterId: t.id, ...who[t.id], rank: i + 1, w: t.wins, l: regWeeks - t.wins,
                    pf: Math.round(t.pf * 10) / 10, playoffs: i < spots, releg: relegate > 0 && i >= ranked.length - relegate
                }))
            };
            added++;
        }
        console.log(`${tier}: rodadas encerradas ${scored}/${regWeeks} · +${missing.length} registro(s)${needResults ? ' · resultado final' : ''}`);
    }

    if (!added) {
        console.log('Nada novo para registrar.');
        return;
    }
    doc.snapshots.sort((a, b) => (TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)) || (a.afterWeek - b.afterWeek));
    doc.updatedAt = takenAt;
    await writeFile(file, JSON.stringify(doc, null, 1) + '\n');
    console.log(`Gravado ${file} (${added} novo(s)).`);
}

main().catch(err => { console.error(err); process.exit(1); });
