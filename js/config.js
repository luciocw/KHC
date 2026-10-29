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
            { id: '1383129184330579968', name: 'KHC Guilhotina', tier: 'guilhotina' },
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
    // Liga paralela: quem faz menos pontos na semana é cortado (sem V–D)
    'guilhotina': { id: 'G',  name: 'KHC Guilhotina', short: 'Guilhotina', league: 'g', crest: 'escudo-guilhotina.png', kind: 'guillotine' },
};

// Ordem de exibição (abas, filtros, histórico): ligas paralelas (Elite,
// Guilhotina) primeiro, depois as séries A → F.
const TIER_ORDER = ['elite', 'guilhotina', 'serie-a', 'serie-b', 'serie-c', 'serie-d', 'serie-e', 'serie-f'];

/** Guilhotina: liga paralela sem V–D, fora de Power, Top, Rodada e Chances. */
function isGuillotine(tier) {
    return !!(SERIES_META[tier] && SERIES_META[tier].kind === 'guillotine');
}

/** Série regular (A–F): acesso/rebaixamento, Power Ranking e Chances. */
function isRegularSeries(tier) {
    return tier !== 'elite' && !isGuillotine(tier);
}

/**
 * "Séries A–D" (ou "Série A") com as séries regulares da temporada.
 * @param {string} season
 * @returns {string}
 */
function regularSeriesLabel(season) {
    const ids = ((KHC_CONFIG[season] || {}).leagues || []).map(l => l.tier).filter(isRegularSeries)
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
        .map(t => SERIES_META[t].id);
    if (!ids.length) return 'Séries';
    return ids.length === 1 ? `Série ${ids[0]}` : `Séries ${ids[0]}–${ids[ids.length - 1]}`;
}

// --- PREMIER LEAGUE (fantasy de futebol, fora das séries) ---
// Página "Também na KHC" (#/premier), fora da navegação; destaque só na entressafra
// da NFL. O Sleeper não entrega placares por rodada desta liga (só a tabela).
const PREMIER_LEAGUE = {
    id: '1385073177100558336',
    name: 'Cocoricó Premier League',
    season: '2026/27',
    crest: 'escudo-premier.png'   // logo redondo (1:1)
};

// --- NBA (KHC NBA League · National Burgundy Association, basquete) ---
// Liga nova em 2026/27, na página "Também na KHC" (#/nba).
const NBA_LEAGUE = {
    id: '1418094440345620480',
    name: 'National Burgundy Association',
    short: 'NBA',
    season: '2026/27',
    crest: 'escudo-nba.png'
};

const CREST_PATH = 'assets/logo/png/ui/';

// --- CONSTANTES ---
const CACHE_KEY = 'khc_league_cache';
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
    AVATAR_PATTERN: /^[a-zA-Z0-9_-]+$/,                 // foto da conta (id)
    // logo do time na liga (metadata.avatar dos usuários da liga)
    LEAGUE_AVATAR_PATTERN: /^https:\/\/sleepercdn\.com\/uploads\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif)$/i
};

// --- ESTADO DA APLICAÇÃO ---
const appState = {
    // Navegação (espelhada na URL: #/<aba>/<ano>[/<série>[/<semana>]])
    tab: 'ligas',
    season: Object.keys(KHC_CONFIG).sort().pop(),   // temporada mais recente configurada
    series: 'serie-a',        // tier selecionado nas abas Ligas e Rodada
    matchWeek: null,          // semana na aba Rodada (null = atual da liga)
    alsoView: 'tabela',       // Também na KHC: 'tabela' | 'rodada' (#/nba/rodada)
    alsoWeek: null,           // semana escolhida na Rodada de Também na KHC
    ligasViewChosen: false,   // escolheu a visão nesta sessão (vale sobre o padrão dos playoffs)
    ligasView: (() => {       // aba Ligas: 'tabela' | 'chances' | 'chaveamento' (lembrado no aparelho)
        try {
            const v = localStorage.getItem('khc_ligas_view');
            return v === 'chances' || v === 'chaveamento' ? v : 'tabela';
        } catch (e) { return 'tabela'; }
    })(),
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
    nflState: null,           // { season, season_type, display_week } da Sleeper
    pendingPlayer: null       // #/jogador/… aberto direto pelo link: abre após carregar
};
