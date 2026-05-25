// =============================================================================
// API — Camada de rede e cache.
// Fetch com retry/backoff, cache em localStorage com TTL, e o fetchLeagueData
// que combina /rosters + /users do Sleeper em objetos normalizados.
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

// --- UTILITY ---

/**
 * Aguarda um tempo em milissegundos
 * @param {number} ms - Tempo em milissegundos
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch com retry e exponential backoff
 * Retenta em caso de falha de rede ou erro 429 (rate limit)
 * @param {string} url - URL para fetch
 * @param {number} maxRetries - Número máximo de tentativas
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, maxRetries = MAX_RETRIES) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url);

            // Se rate limited, aguarda e tenta novamente
            if (response.status === 429) {
                const waitTime = RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(`Rate limited. Aguardando ${waitTime}ms antes de retry ${attempt + 1}/${maxRetries}`);
                await sleep(waitTime);
                continue;
            }

            // Retorna resposta (mesmo se erro HTTP, para tratamento específico)
            return response;

        } catch (error) {
            lastError = error;

            // Erro de rede - tenta novamente com backoff
            if (attempt < maxRetries - 1) {
                const waitTime = RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(`Erro de rede. Retry ${attempt + 1}/${maxRetries} em ${waitTime}ms`);
                await sleep(waitTime);
            }
        }
    }

    // Todas tentativas falharam
    throw lastError || new Error('Falha após múltiplas tentativas');
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// --- CACHE ---

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

/**
 * Remove caches de temporadas antigas que não existem mais na configuração
 * Previne acúmulo indefinido no localStorage
 */
function cleanOldCache() {
    try {
        const validSeasons = Object.keys(KHC_CONFIG);
        const validKeys = validSeasons.map(s => getCacheKey(s));

        // Encontra e remove chaves de cache obsoletas
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_KEY) && !validKeys.includes(key)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.info(`Cache obsoleto removido: ${key}`);
        });

        if (keysToRemove.length > 0) {
            console.info(`Limpeza de cache: ${keysToRemove.length} entrada(s) removida(s)`);
        }
    } catch (e) {
        console.warn('Falha ao limpar cache antigo:', e);
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

// --- SLEEPER FETCHERS ---

async function fetchLeagueData(leagueInfo) {
    const baseUrl = 'https://api.sleeper.app/v1/league';

    const [rostersRes, usersRes] = await Promise.all([
        fetchWithRetry(`${baseUrl}/${leagueInfo.id}/rosters`),
        fetchWithRetry(`${baseUrl}/${leagueInfo.id}/users`)
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
