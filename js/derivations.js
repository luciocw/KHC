// =============================================================================
// DERIVATIONS — Cálculos derivados a partir do data model.
//
// Funções puras, sem side-effect e sem dependência de DOM. Recebem dados,
// devolvem dados. Facilita teste, reuso entre tabs, e composição.
//
// Conceitos:
//   • powerRanking   — Power Score 0-100 (força all-play + V–D + fase) e
//                      tiers S/A/B/C/D por posição (allPlayRates, percentiles,
//                      tierForRank)
//   • legendsAggregator — Agrega trofeus cross-season para a aba Lendas
//   • careerForUser  — Histórico cross-season de um jogador para o Drawer
//
// Depende de: nada — usa apenas o data model puro.
// =============================================================================

// --- POWER SCORE ---

/**
 * Pesos do Power Score (0–100):
 *   força         50% — all-play: em cada semana, de quantos times da liga
 *                       inteira (Séries A–D) a pontuação venceria. Tira a
 *                       sorte do adversário e compara séries de forma justa.
 *   aproveitamento 30% — V–D real (é o que leva aos playoffs).
 *   fase          20% — média das últimas 3 semanas, em percentil.
 */
const PWR_WEIGHTS = Object.freeze({ strength: 0.5, winRate: 0.3, form: 0.2 });
const PWR_FORM_WEEKS = 3;

/**
 * All-play por time: fração dos confrontos possíveis, semana a semana,
 * contra todos os outros times, que a pontuação venceria (empate = ½).
 * @param {Object<string, number[]>} weekly  chave do time → pontos por semana
 * @returns {Object<string, number>} chave → [0, 1]
 */
function allPlayRates(weekly) {
    const keys = Object.keys(weekly);
    const weeks = Math.max(0, ...keys.map(k => weekly[k].length));
    const wins = {}, games = {};
    keys.forEach(k => { wins[k] = 0; games[k] = 0; });
    for (let w = 0; w < weeks; w++) {
        const played = keys.filter(k => typeof weekly[k][w] === 'number');
        played.forEach(k => {
            const pts = weekly[k][w];
            played.forEach(o => {
                if (o === k) return;
                const op = weekly[o][w];
                wins[k] += pts > op ? 1 : pts === op ? 0.5 : 0;
                games[k] += 1;
            });
        });
    }
    const out = {};
    keys.forEach(k => { out[k] = games[k] ? wins[k] / games[k] : 0; });
    return out;
}

/**
 * Percentil de cada valor dentro da lista: fração dos outros valores
 * menores (empate = ½). Robusto a uma semana fora da curva.
 * @param {Object<string, number>} values
 * @returns {Object<string, number>} [0, 1]
 */
function percentiles(values) {
    const keys = Object.keys(values);
    const out = {};
    keys.forEach(k => {
        if (keys.length < 2) { out[k] = 0.5; return; }
        let below = 0;
        keys.forEach(o => {
            if (o === k) return;
            below += values[o] < values[k] ? 1 : values[o] === values[k] ? 0.5 : 0;
        });
        out[k] = below / (keys.length - 1);
    });
    return out;
}

/**
 * Tiers por posição: 10% S · 20% A · 40% B · 20% C · 10% D
 * (40 times → 4 · 8 · 16 · 8 · 4).
 * @param {number} rank 1-based
 * @param {number} n total de times
 * @returns {Tier}
 */
function tierForRank(rank, n) {
    const s = Math.max(1, Math.round(n * 0.1));
    const a = Math.round(n * 0.2);
    const d = Math.max(1, Math.round(n * 0.1));
    const c = Math.round(n * 0.2);
    if (rank <= s) return 'S';
    if (rank <= s + a) return 'A';
    if (rank > n - d) return 'D';
    if (rank > n - d - c) return 'C';
    return 'B';
}

/**
 * Power Ranking. Cada time traz `key` e, quando disponíveis, os pontos por
 * semana em `weekly` (chave → pontos). Sem placares semanais, força e fase
 * usam o percentil dos pontos da temporada (prévia).
 * @param {Team[]} teams  { key, w, l, pts, ... }
 * @param {Object<string, number[]>|null} weekly
 * @returns {PowerRow[]} ordenadas por pwr desc, com rank e tier
 */
function powerRanking(teams, weekly) {
    if (teams.length === 0) return [];
    const hasWeekly = !!weekly && teams.every(t => weekly[t.key] && weekly[t.key].length);

    let strength, form;
    if (hasWeekly) {
        const pool = {};
        teams.forEach(t => { pool[t.key] = weekly[t.key]; });
        strength = allPlayRates(pool);
        const recent = {};
        teams.forEach(t => {
            const last = weekly[t.key].slice(-PWR_FORM_WEEKS);
            recent[t.key] = last.reduce((x, y) => x + y, 0) / last.length;
        });
        form = percentiles(recent);
    } else {
        const season = {};
        teams.forEach(t => { season[t.key] = t.pts; });
        strength = form = percentiles(season);
    }

    const rows = teams.map(team => {
        const games = team.w + team.l;
        const winRate = games > 0 ? team.w / games : 0;
        const raw = (strength[team.key] * PWR_WEIGHTS.strength
            + winRate * PWR_WEIGHTS.winRate
            + form[team.key] * PWR_WEIGHTS.form) * 100;
        return {
            team,
            pwr: Math.round(raw * 10) / 10,
            strength: strength[team.key],
            tier: /** @type {Tier} */ ('B'),
            rank: 0
        };
    });

    rows.sort((x, y) => (y.pwr - x.pwr) || (y.team.pts - x.team.pts));
    rows.forEach((row, i) => {
        row.rank = i + 1;
        row.tier = tierForRank(row.rank, rows.length);
    });
    return rows;
}

// --- LENDAS (cross-season trophy aggregation) ---

const TROPHY_ORDER = ['gold', 'silver', 'bronze', 'fourth'];

/**
 * Agrega troféus de todas as temporadas finalizadas. Temporadas ativas
 * são ignoradas (ainda sem campeão definido).
 *
 * Ordenação: títulos sempre na frente — mais ouros; empate → mais pratas;
 * depois bronzes; depois 4ºs (decisão da liga).
 *
 * `best` guarda o melhor resultado do jogador (maior troféu; empate → mais
 * recente), usado no rótulo "Campeão Série A 2025".
 *
 * @param {Season[]} seasons
 * @returns {LegendEntry[]}
 */
function legendsAggregator(seasons) {
    /** @type {Object<string, LegendEntry>} */
    const byUser = {};

    seasons.forEach(season => {
        if (season.status !== 'final') return;
        season.series.forEach(s => {
            s.teams.forEach(t => {
                if (!t.trophy) return;
                if (!byUser[t.user]) {
                    byUser[t.user] = {
                        user: t.user,
                        avatarId: t.avatarId || null,
                        trophies: { gold: 0, silver: 0, bronze: 0, fourth: 0 },
                        best: null
                    };
                }
                const entry = byUser[t.user];
                entry.trophies[t.trophy]++;
                const cand = { trophy: t.trophy, seriesId: s.id, season: season.id };
                const rank = TROPHY_ORDER.indexOf(t.trophy);
                if (!entry.best ||
                    rank < TROPHY_ORDER.indexOf(entry.best.trophy) ||
                    (rank === TROPHY_ORDER.indexOf(entry.best.trophy) && cand.season > entry.best.season)) {
                    entry.best = cand;
                }
            });
        });
    });

    const list = Object.values(byUser);
    list.sort((a, b) => {
        for (const k of TROPHY_ORDER) {
            if (b.trophies[k] !== a.trophies[k]) return b.trophies[k] - a.trophies[k];
        }
        return a.user.localeCompare(b.user);
    });
    return list;
}

// --- CAREER (per-player history para o Drawer) ---

/**
 * Constrói o histórico completo de um jogador. Alimenta o Player Drawer.
 *
 * Cruza todas as temporadas (ativas e finalizadas) procurando o username
 * em qualquer série. Um mesmo jogador pode aparecer duas vezes numa
 * temporada (sua série regular + Elite); ambas as linhas entram no history.
 *
 * @param {string} username
 * @param {Season[]} seasons
 * @returns {Career}
 */
function careerForUser(username, seasons) {
    const trophies = { gold: 0, silver: 0, bronze: 0, fourth: 0 };
    /** @type {CareerSeasonRow[]} */
    const history = [];
    /** @type {Set<SeriesId>} */
    const currentSeriesSet = new Set();

    let totalW = 0;
    let totalL = 0;
    let totalPts = 0;
    /** @type {string|null} */
    let bestCampaign = null;

    seasons.forEach(season => {
        season.series.forEach(s => {
            const row = s.teams.find(t => t.user === username);
            if (!row) return;

            /** @type {CareerSeasonRow} */
            const entry = {
                season: season.id,
                serie: s.id,
                team: row.team,
                rank: row.rank,
                w: row.w,
                l: row.l,
                pts: row.pts
            };
            if (row.trophy) entry.trophy = row.trophy;
            if (season.status === 'active') entry.active = true;
            history.push(entry);

            if (row.trophy) {
                trophies[row.trophy]++;
                if (row.trophy === 'gold' && !bestCampaign) {
                    bestCampaign = `Campeão ${s.name} (${season.id})`;
                }
            }

            totalW += row.w;
            totalL += row.l;
            totalPts += row.pts;

            if (season.status === 'active') {
                currentSeriesSet.add(s.id);
            }
        });
    });

    // Mais recente primeiro
    history.sort((a, b) => b.season - a.season);

    // Contagem de temporadas distintas (ignora duplicidade Elite + regular)
    const totalSeasons = new Set(history.map(h => h.season)).size;

    /** @type {Career} */
    const result = {
        user: username,
        currentSeries: Array.from(currentSeriesSet),
        trophies,
        totalSeasons,
        totalWins: totalW,
        totalLosses: totalL,
        totalPts: Math.round(totalPts * 100) / 100,
        history
    };
    if (bestCampaign) result.bestCampaign = bestCampaign;
    return result;
}
