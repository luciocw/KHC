// =============================================================================
// CHANCES — Playoffs % e Queda % de cada time (visão "Chances" da aba Ligas).
//
//   - Só temporada em andamento. Usa as rodadas que a Sleeper já encerrou
//     (last_scored_leg): os números mudam sozinhos quando a rodada fecha e
//     ficam parados durante a rodada.
//   - Simulação do resto da temporada regular em simulateOdds()
//     (derivations.js), com o calendário real e semente fixa por rodada.
//   - Placares e confrontos de semanas encerradas vêm do cache do aparelho
//     (fetchWeekScores / fetchWeekPairs), compartilhado com o Power Ranking.
//   - Elite: mesmo modelo; o estudo não tem o formato 8/4, então é estimativa.
//   - Registro semanal: scripts/snapshot-chances.mjs refaz a mesma conta e
//     guarda em data/chances-<ano>.json (GitHub Actions, toda terça/quarta).
//
// Lê: appState.season, appState.lastUpdated
// Depende de: config, api, derivations, tabs/ligas (zonesFor)
// =============================================================================

const _odds = {};   // `${leagueId}|${lastUpdated}` → { status, data }

function resetChancesCache() {
    Object.keys(_odds).forEach(k => delete _odds[k]);
}

/**
 * Busca placares e calendário e roda a simulação de uma série.
 * @param {Object} league  item de appState.leagues
 * @returns {Promise<{active: boolean, afterWeek: number, byId?: Object, spots: number, relegate: number}>}
 */
async function loadLeagueOdds(league) {
    const id = league.info.id;
    const tier = league.info.tier;
    const st = await fetchLeagueSettings(id);
    const regWeeks = Math.max(1, st.playoffStart - 1);
    const scored = Math.max(0, Math.min(st.lastScored, regWeeks));
    const z = zonesFor(tier, false);
    const base = { afterWeek: scored, spots: z.playoff, relegate: z.down };
    if (scored >= regWeeks) return { ...base, active: false };

    const weeks = Array.from({ length: regWeeks }, (_, i) => i + 1);
    const [scores, pairs] = await Promise.all([
        Promise.all(weeks.slice(0, scored).map(w => fetchWeekScores(id, w))),
        Promise.all(weeks.map(w => fetchWeekPairs(id, w)))
    ]);

    const { teams, schedule } = buildOddsInput(league.teams.map(t => t.teamId), scores, pairs, scored);
    const odds = simulateOdds({
        teams,
        schedule,
        spots: z.playoff,
        relegate: z.down,
        seed: seedFrom(`${id}|${scored}`)
    });
    return { ...base, active: true, byId: odds };
}

/**
 * Chances da série (dispara o cálculo na 1ª vez; re-renderiza ao terminar).
 * @param {Object} league
 * @returns {{status: ('off'|'loading'|'ready'|'error'), data?: Object}}
 */
function leagueOdds(league) {
    if (isSeasonFinalized()) return { status: 'off' };
    const key = `${league.info.id}|${appState.lastUpdated || ''}`;
    if (_odds[key]) return _odds[key];
    const entry = _odds[key] = { status: 'loading' };
    loadLeagueOdds(league)
        .then(data => { entry.status = 'ready'; entry.data = data; })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === 'ligas' && appState.loadState === 'ready') renderView();
        });
    return entry;
}

/** "62%", "<1%", ">99%". */
function fmtPct(p) {
    const v = p * 100;
    if (v < 0.5) return '<1%';
    if (v > 99.5) return '>99%';
    return `${Math.round(v)}%`;
}
