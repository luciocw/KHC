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
//   • simulateOdds   — chance de playoffs / rebaixamento (Monte Carlo calibrado)
//   • legendsAggregator — Agrega trofeus cross-season para a aba Lendas
//   • careerForUser  — Histórico cross-season de um jogador para o Drawer
//
// Depende de: nada — usa apenas o data model puro.
// =============================================================================

// --- POWER SCORE ---

/**
 * Pesos do Power Score (0–100):
 *   força         50% — all-play: em cada semana, de quantos times da liga
 *                       inteira (séries regulares) a pontuação venceria. Tira a
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

// --- CHANCES (playoffs / rebaixamento) ---

/**
 * Parâmetros da simulação, calibrados com o histórico de ligas encerradas
 * do Sleeper (estudo "Chance de playoffs por formato de liga", redraft
 * 10/6 após a rodada 4: erro médio de 1,4 ponto; em 12/6, 12/8, 14/6, 16/6
 * e 16/8 o erro fica entre 0,5 e 3,2 pontos). Placares da KHC 2025:
 *   σ  variação semanal de um time ......................... 23 pts
 *   τ  diferença real de força entre os times ................ 8 pts
 *   drift  quanto a força muda por semana (trocas, lesões) ... 4 pts
 */
const ODDS_PARAMS = Object.freeze({ sigma: 23, tau: 8, drift: 4, sims: 10000 });

/** PRNG determinístico (mulberry32): mesma rodada → mesmos números. */
function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Semente a partir de um texto (FNV-1a). */
function seedFrom(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

/**
 * Simula o resto da temporada regular (Monte Carlo) e devolve a chance de
 * cada time terminar entre os `spots` primeiros (playoffs) e entre os
 * `relegate` últimos (rebaixamento). Classificação: vitórias, depois pontos.
 *
 * Força de cada time = média dos placares puxada para a média da liga
 * (com poucos jogos, uma semana boa ou ruim engana) + incerteza; a força
 * ainda muda um pouco a cada semana.
 *
 * @param {Object} input
 * @param {Array<{id: (string|number), wins: number, pf: number, scores: number[]}>} input.teams
 * @param {Array<Array<[(string|number), (string|number)]>>} input.schedule  confrontos das semanas restantes
 * @param {number} input.spots
 * @param {number} input.relegate
 * @param {number} input.seed
 * @param {number} [input.sims]
 * @returns {Object<string, {playoffs: number, releg: number}>} id → [0, 1]
 */
function simulateOdds({ teams, schedule, spots, relegate, seed, sims = ODDS_PARAMS.sims }) {
    const { sigma, tau, drift } = ODDS_PARAMS;
    const n = teams.length;
    const rand = seededRandom(seed);
    let spare = null;
    const normal = () => {
        if (spare !== null) { const v = spare; spare = null; return v; }
        let u = 0;
        while (u === 0) u = rand();
        const r = Math.sqrt(-2 * Math.log(u));
        const th = 2 * Math.PI * rand();
        spare = r * Math.sin(th);
        return r * Math.cos(th);
    };

    const idx = {};
    teams.forEach((t, i) => { idx[t.id] = i; });
    const all = teams.flatMap(t => t.scores);
    const leagueMean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
    const post = teams.map(t => {
        const g = t.scores.length;
        if (!g) return { m: leagueMean, sd: tau };
        const mean = t.scores.reduce((a, b) => a + b, 0) / g;
        const k = (tau * tau) / (tau * tau + (sigma * sigma) / g);
        return { m: leagueMean + (mean - leagueMean) * k, sd: Math.sqrt(1 / (1 / (tau * tau) + g / (sigma * sigma))) };
    });
    const pairs = schedule.map(week => week
        .map(([a, b]) => [idx[a], idx[b]])
        .filter(([a, b]) => a !== undefined && b !== undefined));

    const po = new Float64Array(n), rl = new Float64Array(n);
    const mu = new Float64Array(n), w = new Float64Array(n), pf = new Float64Array(n), x = new Float64Array(n);
    const order = Array.from({ length: n }, (_, i) => i);
    for (let s = 0; s < sims; s++) {
        for (let i = 0; i < n; i++) {
            mu[i] = post[i].m + post[i].sd * normal();
            w[i] = teams[i].wins;
            pf[i] = teams[i].pf;
        }
        for (const week of pairs) {
            for (let i = 0; i < n; i++) {
                mu[i] += drift * normal();
                x[i] = mu[i] + sigma * normal();
                pf[i] += x[i];
            }
            for (const [a, b] of week) {
                if (x[a] > x[b]) w[a] += 1; else w[b] += 1;
            }
        }
        order.sort((i, j) => (w[j] - w[i]) || (pf[j] - pf[i]));
        for (let r = 0; r < n; r++) {
            if (r < spots) po[order[r]] += 1;
            if (relegate && r >= n - relegate) rl[order[r]] += 1;
        }
    }
    const out = {};
    teams.forEach((t, i) => { out[t.id] = { playoffs: po[i] / sims, releg: rl[i] / sims }; });
    return out;
}

/**
 * Monta a entrada de simulateOdds() a partir das rodadas encerradas:
 * vitórias e pontos de cada time recalculados dos placares (empate = ½) e
 * os confrontos das semanas restantes. Usado pelo site (tabs/chances.js) e
 * pelo registro semanal (scripts/snapshot-chances.mjs) — mesma conta.
 *
 * @param {number[]} rosterIds  ordem dos times (define a semente por time)
 * @param {Array<Object<number, number>>} scores  por semana encerrada: rosterId → pontos
 * @param {Array<Array<[number, number]>>} pairs  confrontos de todas as semanas da temporada regular
 * @param {number} scored  nº de semanas encerradas
 * @returns {{teams: Array<{id: number, wins: number, pf: number, scores: number[]}>, schedule: Array}}
 */
function buildOddsInput(rosterIds, scores, pairs, scored) {
    const teams = rosterIds.map(id => ({ id, wins: 0, pf: 0, scores: [] }));
    const byId = Object.fromEntries(teams.map(t => [t.id, t]));
    scores.slice(0, scored).forEach((byRoster, wi) => {
        teams.forEach(t => {
            const p = byRoster[t.id];
            if (typeof p === 'number') { t.scores.push(p); t.pf += p; }
        });
        (pairs[wi] || []).forEach(([a, b]) => {
            const pa = byRoster[a], pb = byRoster[b];
            if (!byId[a] || !byId[b] || typeof pa !== 'number' || typeof pb !== 'number') return;
            if (pa > pb) byId[a].wins += 1;
            else if (pb > pa) byId[b].wins += 1;
            else { byId[a].wins += 0.5; byId[b].wins += 0.5; }
        });
    });
    return { teams, schedule: pairs.slice(scored) };
}

// --- LENDAS (cross-season trophy aggregation) ---

/**
 * Hall da Fama: Pontos KHC somados de todas as temporadas finalizadas
 * (temporadas ativas ficam de fora, ainda sem campeão).
 *
 * Pontos por colocação final e tipo de competição em KHC_POINTS
 * (config.js); a Guilhotina não entra. Ordem: mais pontos → mais títulos
 * (ouros) → melhor aproveitamento V–D na temporada regular das divisões →
 * título mais recente → nome.
 *
 * `best` guarda o resultado que mais vale (empate → mais recente), usado no
 * rótulo "Campeão Série A 2025" / "5º Série B 2025".
 *
 * @param {Season[]} seasons
 * @returns {LegendEntry[]}
 */
function legendsAggregator(seasons) {
    /** @type {Object<string, LegendEntry>} */
    const byUser = {};
    const record = {};   // user → { w, l } da carreira (desempate)

    seasons.forEach(season => {
        if (season.status !== 'final') return;
        season.series.forEach(s => {
            const kind = pointsKindOf(s);
            if (kind === 'guilhotina') return;   // liga avulsa: fora das Lendas
            s.teams.forEach(t => {
                // aproveitamento: só a temporada regular das divisões (14 jogos
                // por ano para todos; Elite e Copa não entram, playoffs nunca)
                if (kind === 'serie') {
                    const r = record[t.user] || (record[t.user] = { w: 0, l: 0 });
                    r.w += t.w || 0;
                    r.l += t.l || 0;
                }
                const pts = pointsFor(kind, t.rank);
                if (!t.trophy && !pts) return;
                if (!byUser[t.user]) {
                    byUser[t.user] = {
                        user: t.user,
                        avatarId: t.avatarId || null,
                        trophies: { gold: 0, silver: 0, bronze: 0, fourth: 0 },
                        points: 0,
                        lastTitle: 0,
                        best: null
                    };
                }
                const entry = byUser[t.user];
                if (t.trophy) entry.trophies[t.trophy]++;
                entry.points += pts;
                if (t.trophy === 'gold') entry.lastTitle = Math.max(entry.lastTitle, season.id);
                const cand = { rank: t.rank, seriesId: s.id, season: season.id, points: pts };
                if (!entry.best || pts > entry.best.points || (pts === entry.best.points && cand.season > entry.best.season)) {
                    entry.best = cand;
                }
            });
        });
    });

    const winPct = u => {
        const r = record[u];
        return r && r.w + r.l ? r.w / (r.w + r.l) : 0;
    };
    const list = Object.values(byUser);
    list.forEach(e => { e.winPct = winPct(e.user); });
    list.sort((a, b) =>
        (b.points - a.points) ||
        (b.trophies.gold - a.trophies.gold) ||
        (b.winPct - a.winPct) ||
        (b.lastTitle - a.lastTitle) ||
        a.user.localeCompare(b.user));
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
            // Guilhotina fechada: sem V–D, fica fora dos totais de carreira
            if (s.kind === 'guillotine') {
                entry.guillotine = true;
                entry.alive = !row.cut;
                entry.cut = row.cut || 0;
            }
            history.push(entry);

            if (row.trophy) {
                trophies[row.trophy]++;
                if (row.trophy === 'gold' && !bestCampaign) {
                    bestCampaign = `Campeão ${s.name} (${season.id})`;
                }
            }

            if (s.kind !== 'guillotine') {
                totalW += row.w || 0;
                totalL += row.l || 0;
                totalPts += row.pts;
            }

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
