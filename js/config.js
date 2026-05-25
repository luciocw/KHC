// =============================================================================
// CONFIG — Constantes globais, estado da aplicação e configuração das ligas.
// Carregado primeiro. Todos os outros módulos dependem deste.
// =============================================================================

// --- CONFIGURAÇÃO CENTRAL DAS LIGAS ---
// NOTA: 2025 standings ainda vivem aqui por compatibilidade. Migração para
// data/2025.json acontece na Fase 1 (camada de dados híbrida).
const KHC_CONFIG = {
    '2025': {
        leagues: [
            { id: '1245850693172998144', name: 'KHC Serie A', tier: 'serie-a' },
            { id: '1249749216419397632', name: 'KHC Serie B', tier: 'serie-b' },
        ],
        // Estrutura expandida: 1º, 2º, 3º, 4º lugar de cada liga (playoffs)
        standings: {
            'KHC Serie A': [
                { position: 1, team: 'Dark Side - Satanás!!', owner: 'Khrstxn' },
                { position: 2, team: 'Gold and Run', owner: 'RobsonF90' },
                { position: 3, team: 'markinhosfc11', owner: 'markinhosfc11' },
                { position: 4, team: 'Los Pollos Hermanos', owner: 'LucioWagner' }
            ],
            'KHC Serie B': [
                { position: 1, team: 'timbu2001', owner: 'timbu2001' },
                { position: 2, team: 'Diogoashura', owner: 'Diogoashura' },
                { position: 3, team: 'GORDINHAS AJEITADAS', owner: 'Dedi' },
                { position: 4, team: 'Cão Farejador', owner: 'Caofarejador' }
            ]
        },
        champions: [
            { tier: 'KHC Serie A', team: 'Dark Side - Satanás!!', owner: 'Khrstxn' },
            { tier: 'KHC Serie B', team: 'timbu2001', owner: 'timbu2001' }
        ]
    },
    '2026': {
        leagues: [
            // Coloque os IDs REAIS aqui quando a liga for renovada
            { id: 'placeholder_a', name: 'KHC Serie A', tier: 'serie-a' },
            { id: 'placeholder_b', name: 'KHC Serie B', tier: 'serie-b' },
            { id: 'placeholder_c', name: 'KHC Serie C', tier: 'serie-c' },
            { id: 'placeholder_elite', name: 'KHC Elite', tier: 'elite' }
        ],
        champions: []
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
    VALID_TIERS: ['serie-a', 'serie-b', 'serie-c', 'elite'],
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
