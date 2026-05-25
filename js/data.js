// =============================================================================
// DATA — Camada de carregamento híbrida.
//
// Resolve uma temporada (Season) por uma de duas fontes:
//   1) data/<year>.json — snapshot estático de temporada FINALIZADA
//   2) Sleeper API live  — temporada EM ANDAMENTO (deriva pelo /rosters /users)
//
// Em ambos os casos retorna a mesma estrutura (data model do handoff), pra
// que os consumidores (tabs, drawer, derivations) não precisem saber a origem.
//
// Cache em memória durante a sessão: cada temporada só é resolvida uma vez.
// (Cache HTTP-level já existe em api.js para chamadas Sleeper.)
//
// NOTA file://: ao abrir index.html diretamente do disco, fetch('data/...json')
// pode falhar por CORS dependendo do browser. Em produção (GitHub Pages /
// qualquer servidor HTTP) funciona normalmente. Para dev local:
//   python3 -m http.server 8000
//   open http://localhost:8000
//
// Depende de: js/config.js, js/sanitize.js, js/api.js
// =============================================================================

/**
 * Cache de Seasons já resolvidas nesta sessão.
 * @type {Object<string, Season>}
 */
const _seasonCache = {};

/**
 * Resolvido após preloadFinalizedSeasons(). Lista temporadas com JSON estático.
 * @type {Season[]}
 */
let _finalizedSeasons = [];

// --- Mapeamentos entre tier (legacy) e SeriesId (data model) ---

/** @param {string} tier @returns {SeriesId} */
function tierToSeriesId(tier) {
    switch (tier) {
        case 'serie-a': return 'A';
        case 'serie-b': return 'B';
        case 'serie-c': return 'C';
        case 'elite':   return 'Elite';
        default:        return 'A';
    }
}

/** @param {SeriesId} id @returns {string} */
function seriesIdToTier(id) {
    switch (id) {
        case 'A':     return 'serie-a';
        case 'B':     return 'serie-b';
        case 'C':     return 'serie-c';
        case 'Elite': return 'elite';
        default:      return 'serie-a';
    }
}

// --- Loaders ---

/**
 * Tenta carregar a temporada de data/<year>.json.
 * @param {number|string} year
 * @returns {Promise<Season|null>}
 */
async function loadSeasonFromJson(year) {
    try {
        const res = await fetch(`data/${year}.json`);
        if (!res.ok) return null;
        const json = await res.json();
        // Validação mínima de estrutura
        if (!json || typeof json !== 'object' || !Array.isArray(json.series)) {
            console.warn(`data/${year}.json inválido — ignorando`);
            return null;
        }
        return json;
    } catch (e) {
        // file:// pode quebrar aqui; falha silenciosa por design.
        return null;
    }
}

/**
 * Carrega temporada da Sleeper API (ativa). Reutiliza fetchLeagueData (api.js)
 * para manter retry/backoff/cache. Resultado é convertido pro data model novo.
 * @param {number|string} year
 * @returns {Promise<Season>}
 */
async function loadSeasonFromSleeper(year) {
    const config = KHC_CONFIG[year];
    if (!config) {
        return { id: Number(year), status: 'active', series: [] };
    }

    const validLeagues = config.leagues.filter(l => !l.id.includes('placeholder'));
    if (validLeagues.length === 0) {
        return { id: Number(year), status: 'active', series: [] };
    }

    const settled = await Promise.allSettled(
        validLeagues.map(l => fetchLeagueData(l))
    );

    /** @type {Series[]} */
    const series = [];

    settled.forEach((result, idx) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        const league = validLeagues[idx];
        const data = result.value;

        const teams = data.teams.map((t, i) => ({
            rank: i + 1,
            user: t.ownerName,
            team: t.teamName,
            avatarId: t.avatar || null,
            w: t.wins,
            l: t.losses,
            pts: t.fpts
            // ptsAgainst/ppts/trophy não vêm do live atual; fica vazio
        }));

        const seriesEntry = {
            id: tierToSeriesId(league.tier),
            name: league.name,
            teams
        };
        if (league.tier === 'elite') {
            seriesEntry.kind = 'parallel';
        }
        series.push(seriesEntry);
    });

    return {
        id: Number(year),
        status: 'active',
        series
    };
}

/**
 * Resolvedor híbrido. JSON estático tem prioridade (porque indica que a
 * temporada está finalizada e congelada). Fallback é Sleeper live.
 * @param {number|string} year
 * @returns {Promise<Season>}
 */
async function loadSeason(year) {
    const key = String(year);
    if (_seasonCache[key]) return _seasonCache[key];

    const json = await loadSeasonFromJson(year);
    const season = json || await loadSeasonFromSleeper(year);
    _seasonCache[key] = season;
    return season;
}

/**
 * Pré-carrega todas as temporadas com JSON estático. Resultado fica
 * disponível sincronamente via getFinalizedSeasons() depois disso.
 *
 * Chamado uma vez no init. Se algumas falharem, segue com as que carregaram.
 * @returns {Promise<Season[]>}
 */
async function preloadFinalizedSeasons() {
    const years = Object.keys(KHC_CONFIG);
    const results = await Promise.all(years.map(loadSeasonFromJson));
    _finalizedSeasons = results.filter(s => s !== null && s.status === 'final');
    // Mais antiga primeiro? Não — mais recente primeiro (consistente com Temporadas)
    _finalizedSeasons.sort((a, b) => b.id - a.id);
    // Cacheia também no _seasonCache pra evitar refetch
    _finalizedSeasons.forEach(s => { _seasonCache[String(s.id)] = s; });
    return _finalizedSeasons;
}

/**
 * Retorna temporadas finalizadas previamente carregadas (sync).
 * Chame preloadFinalizedSeasons() primeiro.
 * @returns {Season[]}
 */
function getFinalizedSeasons() {
    return _finalizedSeasons;
}

/**
 * Verifica se a temporada informada (default: appState.season) está entre as
 * finalizadas. Fonte única — antes esta lógica era duplicada em 3 tabs.
 *
 * @param {number|string} [seasonId] default: appState.season
 * @returns {boolean}
 */
function isSeasonFinalized(seasonId) {
    const id = String(seasonId != null ? seasonId : (appState && appState.season));
    return _finalizedSeasons.some(s => String(s.id) === id);
}

// --- Adapter para compatibilidade com tabs legacy ---

/**
 * Converte um Season (data model novo) para o formato legacy esperado por
 * appState.rosterData (e portanto pelas funções renderLeagueCard, etc).
 * Removido em Phase 3 quando as tabs forem reescritas.
 *
 * @param {Season} season
 * @returns {Array<{teamId, leagueName, leagueTier, teamName, ownerName, avatar, wins, losses, ties, fpts}>}
 */
function seasonToLegacyRosterData(season) {
    const out = [];
    season.series.forEach(s => {
        const tier = seriesIdToTier(s.id);
        s.teams.forEach(t => {
            out.push({
                teamId: t.user, // username como id estável
                leagueName: s.name,
                leagueTier: tier,
                teamName: t.team,
                ownerName: t.user,
                avatar: t.avatarId,
                wins: t.w,
                losses: t.l,
                ties: 0,
                fpts: t.pts
            });
        });
    });
    return out;
}

/**
 * Converte Season para o formato esperado por renderLeagueCard:
 * { info: {name, tier, id}, teams: [...] } por série.
 * @param {Season} season
 * @returns {Array}
 */
function seasonToLegacyLeagueData(season) {
    return season.series.map(s => ({
        info: {
            name: s.name,
            tier: seriesIdToTier(s.id),
            id: `${season.id}-${s.id}`
        },
        teams: s.teams.map(t => ({
            teamId: t.user,
            leagueName: s.name,
            leagueTier: seriesIdToTier(s.id),
            teamName: t.team,
            ownerName: t.user,
            avatar: t.avatarId,
            wins: t.w,
            losses: t.l,
            ties: 0,
            fpts: t.pts
        }))
    }));
}
