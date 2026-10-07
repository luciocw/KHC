// =============================================================================
// DERIVATIONS — Cálculos derivados a partir do data model.
//
// Funções puras, sem side-effect e sem dependência de DOM. Recebem dados,
// devolvem dados. Facilita teste, reuso entre tabs, e composição.
//
// Conceitos:
//   • pwrScore       — Power Score 0-100 de um time, dado contexto (max/min pts)
//   • tierForPwr     — Mapeia score → tier S/A/B/C/D (limites do handoff)
//   • legendsAggregator — Agrega trofeus cross-season para a aba Lendas
//   • careerForUser  — Histórico cross-season de um jogador para o Drawer
//
// Depende de: nada — usa apenas o data model puro.
// =============================================================================

// --- POWER SCORE ---

/**
 * Pesos do Power Score. Documentados em handoff:
 *   pwr = winRate*60 + ptsNormalizado*40
 * Win rate puxa mais que pontos para refletir que vitórias decidem playoffs.
 */
const PWR_WEIGHTS = Object.freeze({ winRate: 0.6, ptsNorm: 0.4 });

/**
 * Calcula o Power Score de um time.
 * @param {Team} team
 * @param {{maxPts: number, minPts: number}} ctx
 * @returns {number} Score arredondado a 1 casa decimal, no intervalo [0, 100]
 */
function pwrScore(team, ctx) {
    const games = team.w + team.l;
    const winRate = games > 0 ? team.w / games : 0;

    const range = ctx.maxPts - ctx.minPts;
    const ptsNorm = range > 0 ? (team.pts - ctx.minPts) / range : 0;

    const raw = (winRate * PWR_WEIGHTS.winRate + ptsNorm * PWR_WEIGHTS.ptsNorm) * 100;
    return Math.round(raw * 10) / 10;
}

/**
 * Mapa de tier por score (handoff do redesign):
 *   S Favoritos ≥ 80 · A Candidatos 65–79 · B Meio de tabela 50–64 ·
 *   C Pressionados 35–49 · D Lanternas < 35
 * @param {number} score
 * @returns {Tier}
 */
function tierForPwr(score) {
    if (score >= 80) return 'S';
    if (score >= 65) return 'A';
    if (score >= 50) return 'B';
    if (score >= 35) return 'C';
    return 'D';
}

/**
 * Aplica pwr + tier a uma lista de times. Retorna nova lista ordenada por pwr desc.
 * @param {Team[]} teams
 * @returns {PowerRow[]}
 */
function powerRanking(teams) {
    if (teams.length === 0) return [];

    const allPts = teams.map(t => t.pts);
    const ctx = {
        maxPts: Math.max(...allPts),
        minPts: Math.min(...allPts)
    };

    const scored = teams.map(team => ({
        team,
        pwr: pwrScore(team, ctx),
        tier: /** @type {Tier} */ ('D'), // placeholder, sobrescrito abaixo
        rank: 0
    }));

    scored.sort((a, b) => b.pwr - a.pwr);
    scored.forEach((row, i) => {
        row.rank = i + 1;
        row.tier = tierForPwr(row.pwr);
    });

    return scored;
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
