// =============================================================================
// DATA — Temporadas finalizadas (data/<ano>.json).
//
// Temporadas FINALIZADAS vêm de snapshot estático (data/<ano>.json), com a
// classificação final (rank: 1º–4º pelos playoffs, 5º+ pela temporada
// regular) e os troféus. A temporada EM ANDAMENTO vem da Sleeper ao vivo
// (fetchLeagueData em api.js, orquestrado por loadData em app.js).
//
// NOTA file://: ao abrir index.html direto do disco, fetch('data/...json')
// pode falhar por CORS. Para dev local:
//   python3 -m http.server 8000
//   open http://localhost:8000
//
// Depende de: js/config.js
// =============================================================================

/**
 * Resolvido após preloadFinalizedSeasons(). Mais recente primeiro.
 * @type {Season[]}
 */
let _finalizedSeasons = [];

/**
 * Tier (legacy: 'serie-a', 'elite'…) → SeriesId do data model ('A', 'Elite'…).
 * @param {string} tier
 * @returns {SeriesId}
 */
function tierToSeriesId(tier) {
    const meta = SERIES_META[tier];
    return meta ? meta.id : 'A';
}

/**
 * SeriesId ('A', 'Elite'…) → tier ('serie-a', 'elite'…).
 * @param {SeriesId} id
 * @returns {string}
 */
function seriesIdToTier(id) {
    const tier = Object.keys(SERIES_META).find(t => SERIES_META[t].id === id);
    return tier || 'serie-a';
}

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
 * Pré-carrega todas as temporadas com JSON estático. Resultado fica
 * disponível sincronamente via getFinalizedSeasons() depois disso.
 * @returns {Promise<Season[]>}
 */
async function preloadFinalizedSeasons() {
    const years = Object.keys(KHC_CONFIG);
    const results = await Promise.all(years.map(loadSeasonFromJson));
    _finalizedSeasons = results.filter(s => s !== null && s.status === 'final');
    _finalizedSeasons.sort((a, b) => b.id - a.id);
    return _finalizedSeasons;
}

/**
 * Temporadas finalizadas previamente carregadas (sync), mais recente primeiro.
 * @returns {Season[]}
 */
function getFinalizedSeasons() {
    return _finalizedSeasons;
}

/**
 * A temporada informada (default: appState.season) está finalizada?
 * @param {number|string} [seasonId]
 * @returns {boolean}
 */
function isSeasonFinalized(seasonId) {
    const id = String(seasonId != null ? seasonId : appState.season);
    return _finalizedSeasons.some(s => String(s.id) === id);
}

/** Última semana de fantasy (final dos playoffs das séries). */
const LAST_FANTASY_WEEK = REGULAR_SEASON_WEEKS + 3;

/**
 * A temporada já acabou no campo? Finalizada (data/<ano>.json) ou, antes de
 * rodar scripts/derive-season.mjs, pelo calendário da NFL no Sleeper: já
 * passou da semana 17, a NFL está nos playoffs/entressafra ou já virou o ano.
 * @param {number|string} [seasonId]
 * @returns {boolean}
 */
function isSeasonOver(seasonId) {
    const id = String(seasonId != null ? seasonId : appState.season);
    if (isSeasonFinalized(id)) return true;
    const st = appState.nflState;
    if (!st || !st.season) return false;
    if (Number(st.season) > Number(id)) return true;
    if (String(st.season) !== id) return false;
    const week = sanitizeNumber(st.display_week, 0, 30, 0);
    return st.season_type === 'post' || st.season_type === 'off' || week > LAST_FANTASY_WEEK;
}

/**
 * Season finalizada por ano, ou undefined.
 * @param {number|string} seasonId
 * @returns {Season|undefined}
 */
function getFinalizedSeason(seasonId) {
    return _finalizedSeasons.find(s => String(s.id) === String(seasonId));
}
