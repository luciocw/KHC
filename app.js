// --- CONFIGURAÇÃO CENTRAL ---
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

// --- SECURITY FUNCTIONS ---

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str - String a ser sanitizada
 * @returns {string} - String segura para inserção no DOM
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Valida e sanitiza uma URL de avatar
 * @param {string} avatarId - ID do avatar do Sleeper
 * @returns {string} - URL segura ou URL padrão
 */
function sanitizeAvatarUrl(avatarId) {
    const defaultAvatar = 'https://sleepercdn.com/images/v2/icons/player_default.webp';

    if (!avatarId || typeof avatarId !== 'string') {
        return defaultAvatar;
    }

    // Valida formato do avatar ID (apenas caracteres seguros)
    if (!VALIDATION.AVATAR_PATTERN.test(avatarId)) {
        console.warn('Avatar ID inválido detectado:', avatarId);
        return defaultAvatar;
    }

    return `https://sleepercdn.com/avatars/thumbs/${escapeHtml(avatarId)}`;
}

/**
 * Valida e limita um número dentro de um range
 * @param {*} value - Valor a validar
 * @param {number} min - Mínimo permitido
 * @param {number} max - Máximo permitido
 * @param {number} fallback - Valor padrão se inválido
 * @returns {number}
 */
function sanitizeNumber(value, min, max, fallback = 0) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

/**
 * Valida e trunca uma string
 * @param {*} value - Valor a validar
 * @param {number} maxLength - Tamanho máximo
 * @param {string} fallback - Valor padrão se inválido
 * @returns {string}
 */
function sanitizeString(value, maxLength, fallback = '') {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    if (str.length === 0) return fallback;
    return str.substring(0, maxLength);
}

/**
 * Valida o tier da liga
 * @param {string} tier - Tier a validar
 * @returns {string} - Tier válido ou 'serie-a' como fallback
 */
function sanitizeTier(tier) {
    if (VALIDATION.VALID_TIERS.includes(tier)) {
        return tier;
    }
    return 'serie-a';
}

/**
 * Valida a estrutura de um roster da API
 * @param {object} roster - Objeto roster da API
 * @returns {boolean}
 */
function isValidRoster(roster) {
    return roster &&
           typeof roster === 'object' &&
           roster.roster_id !== undefined &&
           roster.settings !== undefined;
}

/**
 * Valida a estrutura de um user da API
 * @param {object} user - Objeto user da API
 * @returns {boolean}
 */
function isValidUser(user) {
    return user &&
           typeof user === 'object' &&
           user.user_id !== undefined;
}

// --- UTILITY FUNCTIONS ---

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function getCacheKey(season) {
    return `${CACHE_KEY}_${season}`;
}

function saveToCache(season, data) {
    const cacheData = {
        timestamp: Date.now(),
        data: data
    };
    try {
        localStorage.setItem(getCacheKey(season), JSON.stringify(cacheData));
    } catch (e) {
        console.warn('Falha ao salvar cache:', e);
    }
}

function getFromCache(season) {
    try {
        const cached = localStorage.getItem(getCacheKey(season));
        if (!cached) return null;

        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age > CACHE_DURATION_MS) {
            return { data, isExpired: true, age };
        }

        return { data, isExpired: false, age };
    } catch (e) {
        console.warn('Falha ao ler cache:', e);
        return null;
    }
}

function formatTimeAgo(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h atrás`;
}

function getErrorMessage(status) {
    const messages = {
        400: 'Requisição inválida. Verifique os IDs das ligas.',
        404: 'Liga não encontrada. O ID pode estar incorreto.',
        429: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
        500: 'Erro no servidor do Sleeper. Tente novamente em instantes.',
        503: 'Sleeper em manutenção. Tente novamente mais tarde.'
    };
    return messages[status] || `Erro desconhecido (${status})`;
}

// --- LOADING COMPONENTS ---

function createSpinner(size = 'normal') {
    const sizeClass = size === 'small' ? 'spinner-sm' : '';
    return `<div class="spinner ${sizeClass}"></div>`;
}

function createSkeletonCard(rowCount = 6) {
    let rows = '';
    for (let i = 0; i < rowCount; i++) {
        rows += `
            <div class="skeleton-row">
                <div class="skeleton skeleton-rank"></div>
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-name"></div>
                    <div class="skeleton skeleton-owner"></div>
                </div>
                <div class="skeleton skeleton-record"></div>
                <div class="skeleton skeleton-pts"></div>
            </div>
        `;
    }

    return `
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-badge"></div>
            </div>
            ${rows}
        </div>
    `;
}

function createLoadingState(message = 'Carregando dados do Sleeper...') {
    return `
        <div class="loading">
            ${createSpinner()}
            <span>${escapeHtml(message)}</span>
        </div>
    `;
}

function createSkeletonGrid(count = SKELETON_COUNT) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += createSkeletonCard();
    }
    return skeletons;
}

function showGlobalLoading() {
    const container = document.getElementById('globalContainer');
    container.innerHTML = createLoadingState('Calculando ranking global...');
}

function showPowerLoading() {
    const container = document.getElementById('powerContainer');
    container.innerHTML = createLoadingState('Calculando power rankings...');
}

// --- CORE FUNCTIONS ---

async function init() {
    const selector = document.getElementById('seasonSelector');
    appState.season = selector.value;

    const debouncedLoad = debounce(() => {
        appState.season = selector.value;
        loadData();
    }, DEBOUNCE_DELAY_MS);

    selector.addEventListener('change', debouncedLoad);

    loadData();
}

async function loadData() {
    if (appState.isLoading) return;
    appState.isLoading = true;

    const container = document.getElementById('leaguesContainer');

    // Mostra skeleton loading
    container.innerHTML = createSkeletonGrid();
    showGlobalLoading();
    showPowerLoading();

    appState.rosterData = [];
    appState.lastError = null;
    appState.isFromCache = false;

    const config = KHC_CONFIG[appState.season];

    if (!config || !config.leagues.length) {
        container.innerHTML = '<div class="loading">Dados desta temporada ainda não configurados.</div>';
        clearSecondaryContainers();
        appState.isLoading = false;
        return;
    }

    // Filtra placeholders antes de fazer fetch
    const validLeagues = config.leagues.filter(l => !l.id.includes('placeholder'));

    if (validLeagues.length === 0) {
        container.innerHTML = '<div class="loading">IDs das ligas ainda não configurados para esta temporada.</div>';
        clearSecondaryContainers();
        renderHallOfFame();
        appState.isLoading = false;
        return;
    }

    // Tenta buscar dados da API
    const fetchPromises = validLeagues.map(l => fetchLeagueData(l));
    const settledResults = await Promise.allSettled(fetchPromises);

    // Processa resultados (fulfilled ou rejected)
    const successfulResults = [];
    const errors = [];

    settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            successfulResults.push(result.value);
        } else if (result.status === 'rejected') {
            errors.push({ league: validLeagues[index].name, error: result.reason });
        }
    });

    // Se nenhum dado veio da API, tenta cache
    if (successfulResults.length === 0) {
        const cached = getFromCache(appState.season);

        if (cached && cached.data && cached.data.length > 0) {
            appState.isFromCache = true;
            appState.rosterData = cached.data.flatMap(league => league.teams || []);

            container.innerHTML = '';

            const cacheNotice = document.createElement('div');
            cacheNotice.className = 'cache-notice fade-in';
            cacheNotice.textContent = `⚠️ Exibindo dados em cache (${formatTimeAgo(cached.age)}). Não foi possível conectar ao Sleeper.`;
            container.appendChild(cacheNotice);

            cached.data.forEach((leagueData, index) => {
                renderLeagueCard(leagueData, container, index);
            });

            renderGlobalStandings();
            renderPowerRankings();
            renderHallOfFame();
            appState.isLoading = false;
            return;
        }

        // Sem cache, mostra erro
        const errorMsg = appState.lastError
            ? getErrorMessage(appState.lastError)
            : 'Não foi possível carregar os dados. Verifique sua conexão.';

        container.innerHTML = `<div class="error-message fade-in">${escapeHtml('❌ ' + errorMsg)}</div>`;
        clearSecondaryContainers();
        renderHallOfFame();
        appState.isLoading = false;
        return;
    }

    // Sucesso: renderiza dados e salva no cache
    container.innerHTML = '';

    // Mostra aviso se algumas ligas falharam
    if (errors.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'partial-warning fade-in';
        const leagueNames = errors.map(e => escapeHtml(e.league)).join(', ');
        warningDiv.innerHTML = `⚠️ ${errors.length} liga(s) não carregaram: ${leagueNames}`;
        container.appendChild(warningDiv);
    }

    // Renderiza cards com animação stagger
    successfulResults.forEach((res, index) => {
        renderLeagueCard(res, container, index);
    });

    // Salva no cache para uso futuro
    saveToCache(appState.season, successfulResults);

    renderGlobalStandings();
    renderPowerRankings();
    renderHallOfFame();
    appState.isLoading = false;
}

function clearSecondaryContainers() {
    document.getElementById('globalContainer').innerHTML = '<div style="padding:1rem; text-align:center">Sem dados</div>';
    document.getElementById('powerContainer').innerHTML = '<div style="padding:1rem; text-align:center">Sem dados</div>';
}

async function fetchLeagueData(leagueInfo) {
    const baseUrl = 'https://api.sleeper.app/v1/league';

    const [rostersRes, usersRes] = await Promise.all([
        fetch(`${baseUrl}/${leagueInfo.id}/rosters`),
        fetch(`${baseUrl}/${leagueInfo.id}/users`)
    ]);

    // Trata erros HTTP específicos
    if (!rostersRes.ok) {
        appState.lastError = rostersRes.status;
        throw new Error(getErrorMessage(rostersRes.status));
    }

    if (!usersRes.ok) {
        appState.lastError = usersRes.status;
        throw new Error(getErrorMessage(usersRes.status));
    }

    const rosters = await rostersRes.json();
    const users = await usersRes.json();

    // Valida estrutura básica da resposta
    if (!Array.isArray(rosters)) {
        throw new Error('Resposta inválida da API (rosters)');
    }

    // Constrói mapa de usuários com validação
    const userMap = {};
    if (Array.isArray(users)) {
        users.forEach(u => {
            if (isValidUser(u)) {
                userMap[u.user_id] = u;
            }
        });
    }

    // Processa rosters com validação e sanitização completa
    const enrichedRosters = rosters
        .filter(isValidRoster)
        .map(r => {
            const user = userMap[r.owner_id] || {};
            const settings = r.settings || {};

            // Calcula pontos com validação
            const fpts = sanitizeNumber(settings.fpts, 0, VALIDATION.MAX_POINTS, 0);
            const fptsDecimal = sanitizeNumber(settings.fpts_decimal, 0, 99, 0);
            const points = fpts + (fptsDecimal / 100);

            // Extrai e sanitiza nome do time
            const rawTeamName = user.metadata?.team_name || user.display_name || 'Time Sem Nome';
            const teamName = sanitizeString(rawTeamName, VALIDATION.MAX_TEAM_NAME_LENGTH, 'Time Sem Nome');

            // Extrai e sanitiza nome do owner
            const rawOwnerName = user.display_name || 'Desconhecido';
            const ownerName = sanitizeString(rawOwnerName, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Desconhecido');

            const teamObj = {
                teamId: r.roster_id,
                leagueName: sanitizeString(leagueInfo.name, VALIDATION.MAX_LEAGUE_NAME_LENGTH, 'Liga'),
                leagueTier: sanitizeTier(leagueInfo.tier),
                teamName: teamName,
                ownerName: ownerName,
                avatar: user.avatar || null,
                wins: sanitizeNumber(settings.wins, 0, VALIDATION.MAX_WINS, 0),
                losses: sanitizeNumber(settings.losses, 0, VALIDATION.MAX_LOSSES, 0),
                ties: sanitizeNumber(settings.ties, 0, VALIDATION.MAX_WINS, 0),
                fpts: sanitizeNumber(points, 0, VALIDATION.MAX_POINTS, 0)
            };

            appState.rosterData.push(teamObj);
            return teamObj;
        });

    enrichedRosters.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.fpts - a.fpts;
    });

    return {
        info: {
            ...leagueInfo,
            name: sanitizeString(leagueInfo.name, VALIDATION.MAX_LEAGUE_NAME_LENGTH, 'Liga'),
            tier: sanitizeTier(leagueInfo.tier)
        },
        teams: enrichedRosters
    };
}

// --- RENDER FUNCTIONS ---

function renderLeagueCard(leagueData, container, staggerIndex = 0) {
    const card = document.createElement('article');
    const safeTier = sanitizeTier(leagueData.info.tier);
    const safeLeagueName = escapeHtml(leagueData.info.name);

    card.className = `league-card ${safeTier} stagger-item`;
    card.style.animationDelay = `${staggerIndex * STAGGER_DELAY_MS}ms`;
    card.setAttribute('aria-label', `Classificação da ${safeLeagueName}`);

    let rowsHtml = '';
    leagueData.teams.forEach((t, index) => {
        const avatarUrl = sanitizeAvatarUrl(t.avatar);
        const safeTeamName = escapeHtml(t.teamName);
        const safeOwnerName = escapeHtml(t.ownerName);
        const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
        const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);
        const safeRecord = `${wins}-${losses}`;
        const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

        // ARIA label descritivo para leitores de tela
        const ariaLabel = `${index + 1}º lugar: ${safeTeamName}, dono ${safeOwnerName}, ${wins} vitórias e ${losses} derrotas, ${safePts} pontos`;

        rowsHtml += `
            <div class="team-row" role="listitem" aria-label="${ariaLabel}">
                <div class="rank-num" aria-hidden="true">${index + 1}</div>
                <img src="${avatarUrl}" class="team-avatar" alt="" loading="lazy" aria-hidden="true" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                <div class="team-info">
                    <div class="team-name">${safeTeamName}</div>
                    <div class="team-owner">${safeOwnerName}</div>
                </div>
                <div class="team-record" aria-label="${wins} vitórias, ${losses} derrotas">${safeRecord}</div>
                <div class="team-fpts" aria-label="${safePts} pontos">${safePts}</div>
            </div>
        `;
    });

    const teamCount = sanitizeNumber(leagueData.teams.length, 0, 100);

    card.innerHTML = `
        <div class="league-header">
            <h3 class="league-title">
                <span class="pulse-dot" aria-hidden="true"></span>
                ${safeLeagueName}
            </h3>
            <div class="league-badge" aria-label="${teamCount} times na liga">${teamCount} Times</div>
        </div>
        <div class="standings-list" role="list" aria-label="Classificação dos times">
            ${rowsHtml}
        </div>
    `;
    container.appendChild(card);
}

function renderGlobalStandings() {
    const container = document.getElementById('globalContainer');
    const allTeams = [...appState.rosterData].sort((a, b) => b.fpts - a.fpts);

    if (allTeams.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    let html = '';
    allTeams.forEach((t, i) => {
        const isElite = t.leagueTier === 'elite' ? 'is-elite' : '';
        const safeTeamName = escapeHtml(t.teamName);
        const safeLeagueName = escapeHtml(t.leagueName);
        const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

        // ARIA label descritivo
        const ariaLabel = `${i + 1}º lugar: ${safeTeamName} da ${safeLeagueName} com ${safePts} pontos`;

        html += `
            <div class="global-row ${isElite} stagger-item" role="row" aria-label="${ariaLabel}" style="animation-delay: ${i * 30}ms">
                <div role="cell" style="font-weight:bold; color:var(--khc-orange)">${i + 1}</div>
                <div role="cell" class="team-name" title="${safeTeamName}">${safeTeamName}</div>
                <div role="cell"><span class="global-league-tag">${safeLeagueName}</span></div>
                <div role="cell" style="text-align:right; font-weight:700">${safePts}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/**
 * Calcula o Power Score combinando pontos e vitórias
 * Fórmula: (pontos normalizados * 0.6) + (win% * 0.4) * 100
 */
function calculatePowerScore(team, maxPts, minPts, maxGames) {
    const ptsNormalized = maxPts > minPts ? (team.fpts - minPts) / (maxPts - minPts) : 0;
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0;

    // Power Score: 60% pontuação + 40% win rate
    return (ptsNormalized * 0.6 + winPct * 0.4) * 100;
}

/**
 * Calcula média e desvio padrão de um array
 */
function calculateStats(values) {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
}

/**
 * Determina o tier baseado em desvio padrão
 */
function getTierByStdDev(score, mean, stdDev) {
    if (score >= mean + 1.5 * stdDev) return 'S';      // Excepcional (+1.5σ)
    if (score >= mean + 0.5 * stdDev) return 'A';      // Acima da média (+0.5σ)
    if (score >= mean - 0.5 * stdDev) return 'B';      // Média (±0.5σ)
    if (score >= mean - 1.5 * stdDev) return 'C';      // Abaixo da média (-0.5σ a -1.5σ)
    return 'D';                                         // Reconstrução (<-1.5σ)
}

/**
 * Gera badges especiais para um time
 */
function generateBadges(team, allTeams, rank) {
    const badges = [];

    // Líder geral
    if (rank === 1) {
        badges.push({ icon: '👑', label: 'Líder', class: 'badge-leader' });
    }

    // Top scorer (maior pontuação)
    const maxPts = Math.max(...allTeams.map(t => t.fpts));
    if (team.fpts === maxPts) {
        badges.push({ icon: '🎯', label: 'Top Scorer', class: 'badge-scorer' });
    }

    // Melhor record (mais vitórias)
    const maxWins = Math.max(...allTeams.map(t => t.wins));
    if (team.wins === maxWins && team.wins > 0) {
        badges.push({ icon: '🔥', label: 'Hot Streak', class: 'badge-streak' });
    }

    // Invicto ou quase (≤1 derrota)
    if (team.losses <= 1 && team.wins > 5) {
        badges.push({ icon: '🛡️', label: 'Invicto', class: 'badge-undefeated' });
    }

    return badges;
}

/**
 * Gera indicador de movimento (simulado para esta versão)
 * Em produção, compararia com ranking da semana anterior
 */
function getMovementIndicator(rank, previousRank) {
    // Simulação: baseado na diferença entre ranking por pontos vs power score
    const diff = previousRank - rank;

    if (diff > 2) return { icon: '⬆️', class: 'movement-up-big', label: `+${diff}` };
    if (diff > 0) return { icon: '↗️', class: 'movement-up', label: `+${diff}` };
    if (diff < -2) return { icon: '⬇️', class: 'movement-down-big', label: `${diff}` };
    if (diff < 0) return { icon: '↘️', class: 'movement-down', label: `${diff}` };
    return { icon: '➡️', class: 'movement-same', label: '=' };
}

function renderPowerRankings() {
    const container = document.getElementById('powerContainer');

    if (appState.rosterData.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    // Estatísticas base
    const allTeams = [...appState.rosterData];
    const maxPts = Math.max(...allTeams.map(t => t.fpts));
    const minPts = Math.min(...allTeams.map(t => t.fpts));
    const maxGames = Math.max(...allTeams.map(t => t.wins + t.losses));

    // Calcula Power Score para cada time
    const teamsWithScore = allTeams.map((team, originalIndex) => ({
        ...team,
        powerScore: calculatePowerScore(team, maxPts, minPts, maxGames),
        originalRank: originalIndex + 1 // Ranking original por pontos
    }));

    // Ordena por Power Score
    teamsWithScore.sort((a, b) => b.powerScore - a.powerScore);

    // Adiciona ranking atual
    teamsWithScore.forEach((team, index) => {
        team.currentRank = index + 1;
    });

    // Calcula estatísticas para distribuição por desvio padrão
    const scores = teamsWithScore.map(t => t.powerScore);
    const { mean, stdDev } = calculateStats(scores);

    // Agrupa times por tier
    const tiers = { S: [], A: [], B: [], C: [], D: [] };

    teamsWithScore.forEach(team => {
        const tier = getTierByStdDev(team.powerScore, mean, stdDev);
        team.tier = tier;
        tiers[tier].push(team);
    });

    // Configuração visual de cada tier
    const tierConfig = {
        S: { label: 'S', color: 'tier-s', description: 'Elite', emoji: '🏆' },
        A: { label: 'A', color: 'tier-a', description: 'Contenders', emoji: '⭐' },
        B: { label: 'B', color: 'tier-b', description: 'Playoff', emoji: '📈' },
        C: { label: 'C', color: 'tier-c', description: 'Médio', emoji: '📊' },
        D: { label: 'D', color: 'tier-d', description: 'Rebuild', emoji: '🔧' }
    };

    let html = '<div class="tier-list">';
    let tierIndex = 0;

    Object.keys(tiers).forEach(tierKey => {
        const tierTeams = tiers[tierKey];
        const config = tierConfig[tierKey];

        // Só mostra tier se tiver times
        if (tierTeams.length === 0) return;

        const ariaLabel = `Tier ${config.label} - ${config.description}: ${tierTeams.length} times`;

        html += `
            <div class="tier-row stagger-item ${config.color}" role="region" aria-label="${ariaLabel}" style="animation-delay: ${tierIndex * STAGGER_DELAY_MS}ms">
                <div class="tier-label">
                    <span class="tier-emoji">${config.emoji}</span>
                    <span class="tier-letter">${config.label}</span>
                    <span class="tier-desc">${config.description}</span>
                </div>
                <div class="tier-teams">
        `;

        tierTeams.forEach(team => {
            const safeTeamName = escapeHtml(team.teamName);
            const safeLeagueName = escapeHtml(team.leagueName);
            const safePts = sanitizeNumber(team.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);
            const avatarUrl = sanitizeAvatarUrl(team.avatar);
            const powerScore = team.powerScore.toFixed(1);

            // Badges
            const badges = generateBadges(team, teamsWithScore, team.currentRank);
            const badgesHtml = badges.map(b =>
                `<span class="team-badge ${b.class}" title="${b.label}">${b.icon}</span>`
            ).join('');

            // Movimento
            const movement = getMovementIndicator(team.currentRank, team.originalRank);

            // Barra de progresso (percentual relativo ao máximo)
            const progressPct = maxPts > 0 ? (team.fpts / maxPts * 100).toFixed(0) : 0;

            // Record formatado
            const record = `${team.wins}-${team.losses}`;

            html += `
                <div class="tier-team-card" title="${safeTeamName} - Power Score: ${powerScore}">
                    <div class="tier-card-header">
                        <span class="tier-rank">#${team.currentRank}</span>
                        <span class="tier-movement ${movement.class}" title="Variação: ${movement.label}">${movement.icon}</span>
                    </div>
                    <img src="${avatarUrl}" alt="" class="tier-team-avatar" loading="lazy" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                    <div class="tier-team-info">
                        <div class="tier-team-header">
                            <span class="tier-team-name">${safeTeamName}</span>
                            <div class="tier-badges">${badgesHtml}</div>
                        </div>
                        <span class="tier-team-league">${safeLeagueName}</span>
                        <div class="tier-team-stats">
                            <span class="tier-record" title="Record">${record}</span>
                            <span class="tier-pts" title="Pontos totais">${safePts} pts</span>
                        </div>
                        <div class="tier-progress-container">
                            <div class="tier-progress-bar" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                    <div class="tier-power-score">
                        <span class="power-value">${powerScore}</span>
                        <span class="power-label">PWR</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        tierIndex++;
    });

    // Legenda
    html += `
        <div class="tier-legend stagger-item" style="animation-delay: ${tierIndex * STAGGER_DELAY_MS}ms">
            <div class="legend-title">Como funciona o Power Score?</div>
            <div class="legend-content">
                <div class="legend-item">
                    <span class="legend-formula">PWR = (Pontos × 60%) + (Win Rate × 40%)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge badge-leader">👑</span> Líder geral
                    <span class="legend-badge badge-scorer">🎯</span> Top Scorer
                    <span class="legend-badge badge-streak">🔥</span> Mais vitórias
                </div>
            </div>
        </div>
    `;

    html += '</div>';
    container.innerHTML = html;
}

function renderHallOfFame() {
    const container = document.getElementById('hofContainer');
    let html = '';
    let cardIndex = 0;

    // Emojis e cores por posição
    const positionConfig = {
        1: { emoji: '🏆', label: 'Campeão', colorClass: 'hof-gold' },
        2: { emoji: '🥈', label: 'Vice', colorClass: 'hof-silver' },
        3: { emoji: '🥉', label: '3º Lugar', colorClass: 'hof-bronze' },
        4: { emoji: '4️⃣', label: '4º Lugar', colorClass: 'hof-fourth' }
    };

    Object.keys(KHC_CONFIG).reverse().forEach(year => {
        const config = KHC_CONFIG[year];
        const standings = config.standings || {};
        const safeYear = escapeHtml(year);

        // Processa cada liga
        Object.keys(standings).forEach(leagueName => {
            const leagueStandings = standings[leagueName] || [];
            const safeLeagueName = escapeHtml(leagueName);

            // Cria seção para a liga
            html += `
                <div class="hof-league-section stagger-item" style="animation-delay: ${cardIndex * STAGGER_DELAY_MS}ms">
                    <div class="hof-league-header">
                        <span class="hof-league-title">${safeLeagueName}</span>
                        <span class="hof-league-year">${safeYear}</span>
                    </div>
                    <div class="hof-standings">
            `;

            leagueStandings.forEach(entry => {
                const pos = entry.position;
                const config = positionConfig[pos] || positionConfig[4];
                const safeTeam = escapeHtml(sanitizeString(entry.team, VALIDATION.MAX_TEAM_NAME_LENGTH, 'Time'));
                const safeOwner = escapeHtml(sanitizeString(entry.owner, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Dono'));

                const ariaLabel = `${config.label} ${safeYear} ${safeLeagueName}: ${safeTeam}, dono ${safeOwner}`;

                html += `
                    <div class="hof-entry ${config.colorClass}" role="listitem" aria-label="${ariaLabel}">
                        <span class="hof-position" aria-hidden="true">${config.emoji}</span>
                        <div class="hof-entry-info">
                            <span class="hof-team-name">${safeTeam}</span>
                            <span class="hof-owner-name">${safeOwner}</span>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
            cardIndex++;
        });
    });

    if (html === '') {
        html = '<div style="padding:2rem; text-align:center; color:#666; width:100%" role="status">O Hall da Fama será atualizado ao fim da temporada.</div>';
    }
    container.innerHTML = html;
}

function switchTab(event, tabName) {
    // Valida tabName para evitar injeção
    const validTabs = ['leagues', 'global', 'power', 'hof'];
    if (!validTabs.includes(tabName)) {
        console.warn('Tab inválida:', tabName);
        return;
    }

    // Atualiza estado visual e ARIA das tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
    });

    const activeBtn = event.currentTarget;
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
    activeBtn.setAttribute('tabindex', '0');

    // Atualiza painéis
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.setAttribute('hidden', '');
    });

    const activePanel = document.getElementById(`tab-${tabName}`);
    activePanel.classList.add('active');
    activePanel.removeAttribute('hidden');

    // Anuncia mudança para leitores de tela
    announceToScreenReader(`Aba ${getTabLabel(tabName)} selecionada`);
}

/**
 * Retorna o label amigável da tab para leitores de tela
 */
function getTabLabel(tabName) {
    const labels = {
        'leagues': 'Ligas',
        'global': 'Top Scorers',
        'power': 'Power Ranking',
        'hof': 'Hall da Fama'
    };
    return labels[tabName] || tabName;
}

/**
 * Anuncia mensagem para leitores de tela via aria-live region
 */
function announceToScreenReader(message) {
    let announcer = document.getElementById('sr-announcer');

    if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
    }

    // Limpa e adiciona nova mensagem (força releitura)
    announcer.textContent = '';
    setTimeout(() => {
        announcer.textContent = message;
    }, 100);
}

/**
 * Configura navegação por teclado nas tabs (WAI-ARIA pattern)
 */
function setupTabKeyboardNavigation() {
    const tablist = document.querySelector('[role="tablist"]');
    const tabs = tablist.querySelectorAll('[role="tab"]');

    tablist.addEventListener('keydown', (e) => {
        const currentTab = document.activeElement;
        if (!currentTab.matches('[role="tab"]')) return;

        const tabArray = Array.from(tabs);
        const currentIndex = tabArray.indexOf(currentTab);
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabArray.length;
                break;

            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabArray.length) % tabArray.length;
                break;

            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;

            case 'End':
                e.preventDefault();
                newIndex = tabArray.length - 1;
                break;

            default:
                return;
        }

        // Move foco e ativa a nova tab
        tabArray[newIndex].focus();
        tabArray[newIndex].click();
    });
}

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupTabKeyboardNavigation();
});
