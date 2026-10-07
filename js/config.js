// =============================================================================
// CONFIG — Constantes globais, estado da aplicação e configuração das ligas.
// Carregado primeiro. Todos os outros módulos dependem deste.
// =============================================================================

// --- CONFIGURAÇÃO CENTRAL DAS LIGAS ---
// Cada entrada lista os IDs das ligas Sleeper e as regras daquela temporada.
// Resultados finalizados vivem em data/<year>.json (carregados via
// preloadFinalizedSeasons() em js/data.js). Para temporada ativa, os times são
// puxados live pela API.
//
// rules:
//   promote / relegate  quantos sobem / descem entre séries vizinhas
//   playoffTeams        classificados aos playoffs nas séries regulares
//   elitePlayoffTeams   classificados aos playoffs da KHC Elite
const KHC_CONFIG = {
    '2025': {
        rules: { promote: 2, relegate: 2, playoffTeams: 6, elitePlayoffTeams: 4 },
        leagues: [
            { id: '1245850693172998144', name: 'KHC Serie A', tier: 'serie-a' },
            { id: '1249749216419397632', name: 'KHC Serie B', tier: 'serie-b' },
        ]
    },
    '2026': {
        rules: { promote: 3, relegate: 3, playoffTeams: 6, elitePlayoffTeams: 4 },
        leagues: [
            { id: '1370091532551487488', name: 'KHC Elite',   tier: 'elite' },
            { id: '1370032392135274496', name: 'KHC Serie A', tier: 'serie-a' },
            { id: '1370034537232355328', name: 'KHC Serie B', tier: 'serie-b' },
            { id: '1370036025006505984', name: 'KHC Serie C', tier: 'serie-c' },
            { id: '1370091129751474176', name: 'KHC Serie D', tier: 'serie-d' },
        ]
    }
};

// --- SÉRIES (identidade visual) ---
// Uma entrada por tier. `league` é o valor de data-league (os tokens em
// styles.css reapontam --accent para a cor da série). E e F já estão prontas
// para 2027: basta configurar as ligas acima.
const SERIES_META = {
    'elite':   { id: 'Elite', name: 'KHC Elite', short: 'Elite',   league: 'elite', crest: 'escudo-elite.png' },
    'serie-a': { id: 'A',     name: 'Série A',   short: 'Série A', league: 'a',     crest: 'escudo-serie-a.png' },
    'serie-b': { id: 'B',     name: 'Série B',   short: 'Série B', league: 'b',     crest: 'escudo-serie-b.png' },
    'serie-c': { id: 'C',     name: 'Série C',   short: 'Série C', league: 'c',     crest: 'escudo-serie-c.png' },
    'serie-d': { id: 'D',     name: 'Série D',   short: 'Série D', league: 'd',     crest: 'escudo-serie-d.png' },
    'serie-e': { id: 'E',     name: 'Série E',   short: 'Série E', league: 'e',     crest: 'escudo-serie-e.png' },
    'serie-f': { id: 'F',     name: 'Série F',   short: 'Série F', league: 'f',     crest: 'escudo-serie-f.png' },
};

// Ordem de exibição (abas, filtros, histórico): Elite primeiro, depois A → F.
const TIER_ORDER = ['elite', 'serie-a', 'serie-b', 'serie-c', 'serie-d', 'serie-e', 'serie-f'];

const CREST_PATH = 'assets/logo/png/ui/';
const DEFAULT_AVATAR = 'https://sleepercdn.com/images/v2/icons/player_default.webp';

// --- CONSTANTES ---
const CACHE_KEY = 'khc_league_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const REGULAR_SEASON_WEEKS = 14; // temporada regular (ver aba Regras)
const STATUS_TICK_MS = 60 * 1000; // atualiza o "há X min" da pílula de status

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s, 2s, 4s (exponential)

// DOM element IDs (centralized for maintainability)
const DOM_IDS = {
    VIEW: 'view',
    STATUS: 'status',
    EYEBROW: 'pageEyebrow',
    TITLE: 'pageTitle',
    SEASON_SELECT: 'seasonSelect',
    TOP_TABS: 'topTabs',
    BOTTOM_NAV: 'bottomNav',
};

// Limites de validação
const VALIDATION = {
    MAX_TEAM_NAME_LENGTH: 50,
    MAX_OWNER_NAME_LENGTH: 30,
    MAX_LEAGUE_NAME_LENGTH: 40,
    MAX_POINTS: 99999,
    MAX_WINS: 50,
    MAX_LOSSES: 50,
    VALID_TIERS: TIER_ORDER,
    AVATAR_PATTERN: /^[a-zA-Z0-9_-]+$/
};

// --- ESTADO DA APLICAÇÃO ---
const appState = {
    // Navegação (espelhada na URL: #/<aba>/<ano>[/<série>])
    tab: 'ligas',
    season: '2026',
    series: 'serie-a',        // tier selecionado na aba Ligas
    topFilter: 'all',         // tier ou 'all' na aba Top Scorers
    includeElite: false,      // Top Scorers: Elite desligada evita time duplicado

    // Dados da temporada selecionada
    leagues: [],              // [{ info: {name, tier, id}, teams: [...] }]
    rosterData: [],           // times de todas as séries (achatado)
    leaguesBySeason: {},      // cópia em memória por ano (Temporadas usa)

    // Status do carregamento
    loadState: 'loading',     // 'loading' | 'ready' | 'error'
    failedLeagues: [],        // nomes das séries que não carregaram
    lastError: null,
    isFromCache: false,
    lastUpdated: null,        // timestamp (ms) dos dados exibidos
    isLoading: false,
    nflState: null,           // { season, season_type, display_week } da Sleeper
    pendingPlayer: null       // #/jogador/… aberto direto pelo link: abre após carregar
};
