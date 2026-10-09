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
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    return `há ${Math.floor(hours / 24)} d`;
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

/**
 * Estado atual da NFL na Sleeper (temporada, tipo e semana em exibição).
 * Falha silenciosa: retorna null e a UI simplesmente omite a semana.
 * @returns {Promise<{season: string, season_type: string, display_week: number}|null>}
 */
async function fetchNflState() {
    try {
        const res = await fetchWithRetry('https://api.sleeper.app/v1/state/nfl');
        if (!res.ok) return null;
        const state = await res.json();
        return state && typeof state === 'object' ? state : null;
    } catch (e) {
        console.warn('Falha ao buscar estado da NFL:', e);
        return null;
    }
}

/**
 * Configuração da liga que a aba Rodada usa: semana atual / última
 * pontuada (settings.leg / last_scored_leg) e playoffs.
 * @param {string} leagueId
 * @returns {Promise<{leg: number, lastScored: number, playoffStart: number, playoffTeams: number}>}
 */
async function fetchLeagueSettings(leagueId) {
    const res = await fetchWithRetry(`https://api.sleeper.app/v1/league/${leagueId}`);
    if (!res.ok) throw new Error(getErrorMessage(res.status));
    const league = await res.json();
    const st = (league && league.settings) || {};
    const int = (v, max, dflt) => Math.round(sanitizeNumber(v, 0, max, dflt));
    return {
        leg: int(st.leg, 30, 0),
        lastScored: int(st.last_scored_leg, 30, 0),
        playoffStart: int(st.playoff_week_start, 30, REGULAR_SEASON_WEEKS + 1) || REGULAR_SEASON_WEEKS + 1,
        playoffTeams: int(st.playoff_teams, 32, 0)
    };
}

/**
 * Confrontos de uma semana numa liga + chaveamento dos vencedores (para
 * rotular Final, 3º lugar…). Sem cache local: o placar muda na rodada.
 *
 * @param {string} leagueId
 * @param {number} week
 * @returns {Promise<{week: number, fetchedAt: number,
 *   matchups: Array<{rosterId: number, matchupId: (number|null), points: number}>,
 *   bracket: Array<{r: number, t1: number, t2: number, p: (number|null)}>}>}
 */
async function fetchRoundData(leagueId, week) {
    const base = `https://api.sleeper.app/v1/league/${leagueId}`;
    const [matchRes, bracketRes] = await Promise.all([
        fetchWithRetry(`${base}/matchups/${week}`),
        fetchWithRetry(`${base}/winners_bracket`)
    ]);
    if (!matchRes.ok) throw new Error(getErrorMessage(matchRes.status));

    const raw = await matchRes.json();
    const bracketRaw = bracketRes.ok ? await bracketRes.json() : [];

    return {
        week,
        fetchedAt: Date.now(),
        matchups: (Array.isArray(raw) ? raw : [])
            .filter(m => m && Number.isInteger(m.roster_id))
            .map(m => ({
                rosterId: m.roster_id,
                matchupId: Number.isInteger(m.matchup_id) ? m.matchup_id : null,
                points: sanitizeNumber(m.points, 0, VALIDATION.MAX_POINTS, 0)
            })),
        bracket: (Array.isArray(bracketRaw) ? bracketRaw : [])
            .filter(g => g && Number.isInteger(g.r) && Number.isInteger(g.t1) && Number.isInteger(g.t2))
            .map(g => ({ r: g.r, t1: g.t1, t2: g.t2, p: Number.isInteger(g.p) ? g.p : null }))
    };
}

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
            const pa = sanitizeNumber(settings.fpts_against, 0, VALIDATION.MAX_POINTS, 0);
            const paDecimal = sanitizeNumber(settings.fpts_against_decimal, 0, 99, 0);
            const pointsAgainst = pa + (paDecimal / 100);

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
                fpts: sanitizeNumber(points, 0, VALIDATION.MAX_POINTS, 0),
                fptsAgainst: sanitizeNumber(pointsAgainst, 0, VALIDATION.MAX_POINTS, 0)
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
