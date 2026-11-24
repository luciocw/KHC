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

// --- COPA KHC (mata-mata do site, sorteio livre entre as divisões) ---

/**
 * Sorteio da Copa: embaralha os times com a semente (mesma semente = mesmo
 * sorteio) e monta a chave. Com N times e P = maior potência de 2 ≤ N:
 * N − P jogos na fase preliminar (os primeiros sorteados) e 2P − N folgas;
 * a chave principal de P vagas mistura, também por sorteio, quem folga e
 * os vencedores da preliminar. Ex.: 40 times → 8 jogos preliminares, 24
 * folgas, chave de 32; 60 → 28 jogos, 4 folgas.
 * @param {string[]} keys  ids dos times
 * @param {string} seed
 * @returns {{prelim: Array<[string, string]>, slots: Array<{team?: string, prelim?: number}>}}
 */
function drawCup(keys, seed) {
    const rnd = seededRandom(seedFrom(seed));
    const shuffle = arr => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    const order = shuffle(keys.slice().sort());
    const n = order.length;
    let p = 1;
    while (p * 2 <= n) p *= 2;
    const games = n - p;
    const prelim = [];
    for (let i = 0; i < games; i++) prelim.push([order[2 * i], order[2 * i + 1]]);
    const byes = order.slice(2 * games).map(team => ({ team }));
    const slots = shuffle([...byes, ...prelim.map((_, i) => ({ prelim: i }))]);
    return { prelim, slots };
}

/** Nome da fase pelo número de times que a disputam. */
function cupRoundName(teams, isPrelim) {
    if (isPrelim) return 'Fase preliminar';
    return { 2: 'Final', 4: 'Semifinal', 8: 'Quartas de final', 16: 'Oitavas de final' }[teams] || `${teams / 2} avos de final`;
}

/**
 * Fases da Copa: classificatória + uma fase por semana até a final.
 * @param {{qualifying: number, bracket: number}} cfg
 * @returns {Array<{key: string, name: string, short?: string, week: number, teams?: number}>}
 */
function cupPhases(cfg) {
    const phases = [{ key: 'q', name: 'Classificatória', week: cfg.qualifying }];
    for (let teams = cfg.bracket, w = cfg.qualifying + 1; teams >= 2; teams /= 2, w++) {
        const short = { 2: 'Final', 4: 'Semi', 8: 'Quartas', 16: 'Oitavas' }[teams] || `${teams / 2} avos`;
        phases.push({ key: `r${teams}`, name: cupRoundName(teams), short, week: w, teams });
    }
    return phases;
}

/**
 * Resolve a Copa inteira a partir dos placares (mesma conta no site e no
 * fechamento da temporada). Classificatória: os `bracket` maiores
 * pontuadores da semana. Chave: drawCup com a semente. Fase final: final +
 * disputa do 3º lugar (perdedores das semis). Empate: mais pontos na semana
 * anterior; depois a ordem do sorteio (ou do nome, no corte).
 * @param {{qualifying: number, bracket: number, seed: string}} cfg
 * @param {string[]} keys  todos os participantes
 * @param {Object<number, Object<string, number>>} scores  semana → id → pontos
 * @param {{leg: number, lastScored: number}} settings
 * @returns {{phases: Array, qualifying: Object, rounds: Array, podium: (string[]|null)}}
 */
function resolveCup(cfg, keys, scores, settings) {
    const phases = cupPhases(cfg);
    const status = w => (w <= settings.lastScored ? 'final' : w === settings.leg ? 'live' : 'upcoming');
    const pts = (w, k) => (scores[w] && scores[w][k]) || 0;
    const qw = cfg.qualifying;
    const ranked = keys.slice().sort().sort((a, b) => (pts(qw, b) - pts(qw, a)) || (pts(qw - 1, b) - pts(qw - 1, a)) || a.localeCompare(b));
    const qualifying = { week: qw, status: status(qw), cut: Math.min(cfg.bracket, ranked.length), ranked, points: k => pts(qw, k) };

    const rounds = [];
    let podium = null;
    if (qualifying.status === 'final') {
        let slots = drawCup(ranked.slice(0, cfg.bracket), cfg.seed).slots.map(s => s.team);
        let semiLosers = null;
        phases.slice(1).forEach(ph => {
            const st = status(ph.week);
            const play = (a, b, label) => {
                const g = { a, b, pa: a ? pts(ph.week, a) : 0, pb: b ? pts(ph.week, b) : 0, winner: '', label };
                if (st === 'final' && a && b) {
                    const d = (g.pa - g.pb) || (pts(ph.week - 1, a) - pts(ph.week - 1, b));
                    g.winner = d >= 0 ? 'a' : 'b';
                }
                return g;
            };
            const games = [];
            for (let i = 0; i < slots.length; i += 2) games.push(play(slots[i], slots[i + 1], ph.teams === 2 ? 'Final' : `Jogo ${i / 2 + 1}`));
            if (ph.teams === 2 && semiLosers) games.push(play(semiLosers[0], semiLosers[1], 'Disputa do 3º lugar'));
            rounds.push({ ...ph, status: st, games });
            const winnerOf = g => (g.winner === 'a' ? g.a : g.winner === 'b' ? g.b : null);
            const loserOf = g => (g.winner === 'a' ? g.b : g.winner === 'b' ? g.a : null);
            if (ph.teams === 4) semiLosers = games.map(loserOf);
            slots = games.filter(g => g.label !== 'Disputa do 3º lugar').map(winnerOf);
        });
        const fin = rounds[rounds.length - 1];
        const [f, third] = fin ? fin.games : [];
        if (f && f.winner) {
            const order = [f.winner === 'a' ? f.a : f.b, f.winner === 'a' ? f.b : f.a];
            if (third && third.winner) order.push(third.winner === 'a' ? third.a : third.b, third.winner === 'a' ? third.b : third.a);
            podium = order;
        }
    }
    return { phases, qualifying, rounds, podium };
}

// --- COPA KHC · FORMATO CHAMPIONS (fase de liga + mata-mata em 2 semanas) ---

/**
 * Sorteio da fase de liga, estilo Champions League: potes por divisão
 * (cfg.pots), cada time enfrenta `perPot` adversários de cada pote, nunca
 * da própria divisão nem o mesmo duas vezes, um jogo por semana.
 *
 * Construção (garante as cotas sem tentativa e erro; cada pote com 2
 * divisões de mesmo tamanho):
 *   - jogos dentro do pote: sempre divisão × divisão do mesmo pote;
 *   - 2 potes: perPot semanas internas + perPot semanas pote 1 × pote 2;
 *   - 3 potes (perPot 2): 2 semanas internas + 4 semanas cruzadas com os
 *     potes divididos em metades (P1a×P2a, P1b×P3b, P2b×P3a, …).
 * Cada rodada de pareamento usa deslocamentos distintos sobre listas
 * embaralhadas, então ninguém repete adversário. Mesma semente = mesmo sorteio.
 *
 * @param {Array<{key: string, tier: string}>} teams
 * @param {{pots: string[][], perPot: number, seed: string}} cfg
 * @returns {Array<Array<[string, string]>>} jogos de cada semana da fase de liga
 */
function drawUclLeague(teams, cfg) {
    const rnd = seededRandom(seedFrom(`${cfg.seed}|liga`));
    const shuffle = arr => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    const byTier = t => teams.filter(x => x.tier === t).map(x => x.key).sort();
    // pares a[i] × b[(i + d) % n], com deslocamentos d distintos (sem repetir adversário)
    const pairings = (a, b, rounds) => {
        if (a.length !== b.length) throw new Error('Copa: grupos de tamanhos diferentes no sorteio');
        const n = a.length, A = shuffle(a), B = shuffle(b);
        const offsets = shuffle([...Array(n).keys()]).slice(0, rounds);
        return offsets.map(d => A.map((x, i) => [x, B[(i + d) % n]]));
    };
    const pots = cfg.pots.map(divs => divs.map(byTier));
    // jogos internos do pote: divisão × divisão
    const internal = pots.map(([d1, d2]) => pairings(d1, d2, cfg.perPot));
    let weeks;
    if (pots.length === 2) {
        const p1 = pots[0].flat(), p2 = pots[1].flat();
        const cross = pairings(p1, p2, cfg.perPot);
        weeks = [
            ...internal[0].map((g, i) => [...g, ...internal[1][i]]),
            ...cross
        ];
    } else if (pots.length === 3 && cfg.perPot === 2) {
        // metades de cada pote, misturando as duas divisões
        const halves = pots.map(divs => {
            const all = shuffle(divs.flat());
            return [all.slice(0, all.length / 2), all.slice(all.length / 2)];
        });
        const [[p1a, p1b], [p2a, p2b], [p3a, p3b]] = halves;
        const pick = (x, y) => pairings(x, y, 1)[0];
        weeks = [
            [...internal[0][0], ...internal[1][0], ...internal[2][0]],
            [...internal[0][1], ...internal[1][1], ...internal[2][1]],
            [...pick(p1a, p2a), ...pick(p1b, p3b), ...pick(p2b, p3a)],
            [...pick(p1a, p2b), ...pick(p1b, p3a), ...pick(p2a, p3b)],
            [...pick(p1a, p3a), ...pick(p1b, p2a), ...pick(p2b, p3b)],
            [...pick(p1a, p3b), ...pick(p1b, p2b), ...pick(p2a, p3a)]
        ];
    } else {
        throw new Error('Copa: formato de potes não suportado (2 potes, ou 3 potes com 2 jogos por pote)');
    }
    return shuffle(weeks);
}

/** Classificação da fase de liga: pontos (3/1/0), saldo, pontos feitos, vitórias, ordem do sorteio. */
function uclTable(keys, games) {
    const t = Object.fromEntries(keys.map((k, i) => [k, { key: k, order: i, j: 0, v: 0, e: 0, d: 0, pts: 0, pf: 0, pc: 0 }]));
    games.forEach(g => {
        if (g.status !== 'final') return;
        const a = t[g.a], b = t[g.b];
        a.j++; b.j++;
        a.pf += g.pa; a.pc += g.pb; b.pf += g.pb; b.pc += g.pa;
        if (g.pa > g.pb) { a.v++; b.d++; a.pts += 3; }
        else if (g.pb > g.pa) { b.v++; a.d++; b.pts += 3; }
        else { a.e++; b.e++; a.pts++; b.pts++; }
    });
    return Object.values(t).sort((x, y) =>
        (y.pts - x.pts) || ((y.pf - y.pc) - (x.pf - x.pc)) || (y.pf - x.pf) || (y.v - x.v) || (x.order - y.order));
}

/**
 * Placares da Copa guardados no fechamento (data/<ano>.json → weeklyScores),
 * no formato que resolveCup / resolveUcl recebem. Com eles, a Copa e a
 * Champions KHC de uma temporada fechada não dependem mais do Sleeper.
 * Devolve null se o arquivo não tem os placares ou falta alguma semana
 * (aí o site busca no Sleeper, como antes).
 * @param {Season} season  temporada fechada
 * @param {number} first  primeira semana usada pela Copa
 * @param {number} last   última semana usada pela Copa
 * @returns {{settings: {leg: number, lastScored: number}, scores: Object<number, Object<string, number>>}|null}
 */
function archivedCopaScores(season, first, last) {
    const ws = season && season.weeklyScores;
    if (!ws || !ws.weeks || !ws.settings) return null;
    const scores = {};
    for (let w = Math.max(1, first); w <= last; w++) {
        const wk = ws.weeks[w] || ws.weeks[String(w)];
        if (!wk || typeof wk !== 'object') return null;
        scores[w] = {};
        Object.entries(wk).forEach(([k, p]) => { scores[w][k] = Math.max(0, Number(p) || 0); });
    }
    const leg = Number(ws.settings.leg) || 0;
    const lastScored = Number(ws.settings.lastScored) || 0;
    return { settings: { leg, lastScored }, scores };
}

/**
 * Copa KHC formato Champions, inteira a partir dos placares (mesma conta no
 * site e no fechamento):
 *   - fase de liga (cfg.leagueWeeks): sorteio drawUclLeague, tabela uclTable;
 *   - 1º–8º direto às oitavas; 9º–24º no playoff (9×24, 10×23, …, 16×17);
 *     25º+ fora;
 *   - mata-mata em 2 semanas (soma dos pontos), chave fixa pela posição
 *     (1º e 2º só se cruzam na final); empate no agregado: melhor posição
 *     na fase de liga;
 *   - semana final: final e disputa do 3º lugar (jogo único).
 * @param {Object} cfg  KHC_CONFIG[ano].copa (format 'ucl')
 * @param {Array<{key: string, tier: string}>} teams
 * @param {Object<number, Object<string, number>>} scores  semana → id → pontos
 * @param {{leg: number, lastScored: number}} settings
 */
function resolveUcl(cfg, teams, scores, settings) {
    const status = w => (w <= settings.lastScored ? 'final' : w === settings.leg ? 'live' : 'upcoming');
    const pts = (w, k) => (scores[w] && scores[w][k]) || 0;
    const statusOf = weeks => (weeks.every(w => status(w) === 'final') ? 'final' : weeks.some(w => status(w) !== 'upcoming') ? 'live' : 'upcoming');

    // Fase de liga
    const draw = drawUclLeague(teams, cfg);
    const league = cfg.leagueWeeks.map((week, i) => ({
        week, status: status(week),
        games: draw[i].map(([a, b]) => ({ a, b, pa: pts(week, a), pb: pts(week, b), status: status(week) }))
    }));
    const table = uclTable(teams.map(t => t.key).sort(), league.flatMap(r => r.games));
    const leagueStatus = statusOf(cfg.leagueWeeks);
    const seedOf = k => table.findIndex(r => r.key === k) + 1;

    // Mata-mata (só com a fase de liga encerrada)
    const rounds = [];
    let podium = null;
    if (leagueStatus === 'final') {
        const seeds = table.map(r => r.key);
        const tie = (a, b, weeks, label) => {
            const legsA = weeks.map(w => pts(w, a)), legsB = weeks.map(w => pts(w, b));
            const ta = legsA.reduce((x, y) => x + y, 0), tb = legsB.reduce((x, y) => x + y, 0);
            const st = statusOf(weeks);
            let winner = '';
            if (st === 'final') winner = ta > tb ? 'a' : tb > ta ? 'b' : seedOf(a) < seedOf(b) ? 'a' : 'b';
            return { a, b, legsA, legsB, ta, tb, weeks, status: st, winner, label };
        };
        const won = g => (g.winner === 'a' ? g.a : g.winner === 'b' ? g.b : null);
        const lost = g => (g.winner === 'a' ? g.b : g.winner === 'b' ? g.a : null);
        const ko = cfg.knockout;

        // Playoff: jogo k = (8+k)º × (25−k)º
        const playoff = Array.from({ length: 8 }, (_, i) => tie(seeds[8 + i], seeds[23 - i], ko.playoff, `${9 + i}º × ${24 - i}º`));
        rounds.push({ key: 'playoff', name: 'Playoff', weeks: ko.playoff, status: statusOf(ko.playoff), games: playoff });

        // Oitavas, em ordem de chave: 1º×(16/17), 8º×(9/24), 4º×(13/20), 5º×(12/21), 2º×(15/18), 7º×(10/23), 3º×(14/19), 6º×(11/22)
        const order = [1, 8, 4, 5, 2, 7, 3, 6];
        // o sº enfrenta o vencedor de (17−s)º × (16+s)º, que é o jogo 8−s do playoff
        const r16 = order.map(s => tie(seeds[s - 1], won(playoff[8 - s]), ko.r16, `${s}º × vencedor ${17 - s}º/${16 + s}º`));
        rounds.push({ key: 'r16', name: 'Oitavas de final', weeks: ko.r16, status: statusOf(ko.r16), games: r16 });

        const next = (prev, weeks, name, key, label) => {
            const games = [];
            for (let i = 0; i < prev.length; i += 2) games.push(tie(won(prev[i]), won(prev[i + 1]), weeks, label(i / 2)));
            rounds.push({ key, name, weeks, status: statusOf(weeks), games });
            return games;
        };
        const qf = next(r16, ko.qf, 'Quartas de final', 'qf', i => `Quartas ${i + 1}`);
        const sf = next(qf, ko.sf, 'Semifinal', 'sf', i => `Semifinal ${i + 1}`);
        const fin = [tie(won(sf[0]), won(sf[1]), ko.final, 'Final'), tie(lost(sf[0]), lost(sf[1]), ko.final, 'Disputa do 3º lugar')];
        rounds.push({ key: 'final', name: 'Final', weeks: ko.final, status: statusOf(ko.final), games: fin });
        if (fin[0].winner && fin[1].winner) podium = [won(fin[0]), lost(fin[0]), won(fin[1]), lost(fin[1])];
    }
    return { league, table, leagueStatus, rounds, podium };
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
 * Jogador identificado pelo id do Sleeper (userId), com o nome como reserva:
 * quem trocou de nome soma tudo numa linha só, com o nome mais recente (ou o
 * atual, de `currentNames`).
 *
 * @param {Season[]} seasons
 * @param {Object<string, string>} [currentNames]  userId → nome de exibição atual
 * @returns {LegendEntry[]}
 */
function legendsAggregator(seasons, currentNames = {}) {
    const keyOf = t => (t.userId ? `id:${t.userId}` : t.user);
    const ordered = seasons.slice().sort((a, b) => b.id - a.id);   // mais recente primeiro: nome mais novo
    /** @type {Object<string, LegendEntry>} */
    const byUser = {};
    const record = {};   // user → { w, l } da carreira (desempate)

    ordered.forEach(season => {
        if (season.status !== 'final') return;
        season.series.forEach(s => {
            const kind = pointsKindOf(s);
            if (kind === 'guilhotina') return;   // liga avulsa: fora das Lendas
            s.teams.forEach(t => {
                // aproveitamento: só a temporada regular das divisões (14 jogos
                // por ano para todos; Elite e Copa não entram, playoffs nunca)
                if (kind === 'serie') {
                    const r = record[keyOf(t)] || (record[keyOf(t)] = { w: 0, l: 0 });
                    r.w += t.w || 0;
                    r.l += t.l || 0;
                }
                const pts = pointsFor(kind, t.rank);
                if (!t.trophy && !pts) return;
                const key = keyOf(t);
                if (!byUser[key]) {
                    byUser[key] = {
                        key,
                        user: (t.userId && currentNames[t.userId]) || t.user,
                        avatarId: t.avatarId || null,
                        trophies: { gold: 0, silver: 0, bronze: 0, fourth: 0 },
                        points: 0,
                        lastTitle: 0,
                        best: null
                    };
                }
                const entry = byUser[key];
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
    list.forEach(e => { e.winPct = winPct(e.key); });
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
 * Casa as linhas pelo id permanente do Sleeper (`ids`), para o histórico
 * não se perder se o jogador trocar de nome; o nome é a reserva.
 *
 * @param {string} username
 * @param {Season[]} seasons
 * @param {string[]} [ids]  ids do Sleeper desse jogador
 * @returns {Career}
 */
function careerForUser(username, seasons, ids = []) {
    const isHim = t => (t.userId && ids.includes(String(t.userId))) || t.user === username;
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
            const row = s.teams.find(isHim);
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

            // Guilhotina e Copa: sem V–D próprio, ficam fora dos totais
            if (s.kind !== 'guillotine' && s.kind !== 'cup') {
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
