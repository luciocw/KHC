// =============================================================================
// CONFIG — Constantes globais, estado da aplicação e configuração das ligas.
// Carregado primeiro. Todos os outros módulos dependem deste.
// =============================================================================

// --- CONFIGURAÇÃO CENTRAL DAS LIGAS ---
// Cada entrada lista apenas os IDs das ligas Sleeper. Resultados finalizados
// vivem em data/<year>.json (carregados via preloadFinalizedSeasons() em
// js/data.js). Para temporada ativa, os times são puxados live pela API.
const KHC_CONFIG = {
    '2025': {
        leagues: [
            { id: '1245850693172998144', name: 'KHC Serie A', tier: 'serie-a' },
            { id: '1249749216419397632', name: 'KHC Serie B', tier: 'serie-b' },
        ]
    },
    '2026': {
        leagues: [
            { id: '1370091532551487488', name: 'KHC Elite',   tier: 'elite' },
            { id: '1370032392135274496', name: 'KHC Serie A', tier: 'serie-a' },
            { id: '1370034537232355328', name: 'KHC Serie B', tier: 'serie-b' },
            { id: '1370036025006505984', name: 'KHC Serie C', tier: 'serie-c' },
            { id: '1370091129751474176', name: 'KHC Serie D', tier: 'serie-d' },
        ]
    }
};

// --- CONSTANTES ---
const CACHE_KEY = 'khc_league_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const DEBOUNCE_DELAY_MS = 300;
const SKELETON_COUNT = 2;
const STAGGER_DELAY_MS = 80;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s, 2s, 4s (exponential)

// DOM element IDs (centralized for maintainability)
const DOM_IDS = {
    LEAGUES: 'leaguesContainer',
    GLOBAL: 'globalContainer',
    POWER: 'powerContainer',
    LEGENDS: 'legendsContainer',
    SEASONS: 'seasonsContainer',
    SEASON_SELECTOR: 'seasonSelector'
};

// Limites de validação
const VALIDATION = {
    MAX_TEAM_NAME_LENGTH: 50,
    MAX_OWNER_NAME_LENGTH: 30,
    MAX_LEAGUE_NAME_LENGTH: 40,
    MAX_POINTS: 99999,
    MAX_WINS: 50,
    MAX_LOSSES: 50,
    VALID_TIERS: ['serie-a', 'serie-b', 'serie-c', 'serie-d', 'elite'],
    AVATAR_PATTERN: /^[a-zA-Z0-9_-]+$/
};

// --- ESTADO DA APLICAÇÃO ---
const appState = {
    season: '2026',
    rosterData: [],
    lastError: null,
    isFromCache: false,
    isLoading: false
};
