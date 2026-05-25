// =============================================================================
// APP — Bootstrap. Orquestra a inicialização, faz o fetch das ligas configuradas
// para a temporada atual, e dispara o render de cada aba.
// Carregado por último (depois de todos os módulos de tab e UI).
// Depende de: TODOS os outros módulos.
// =============================================================================

async function init() {
    // Limpa caches de temporadas antigas na inicialização
    cleanOldCache();

    const selector = document.getElementById(DOM_IDS.SEASON_SELECTOR);
    appState.season = selector.value;

    const debouncedLoad = debounce(() => {
        appState.season = selector.value;
        loadData();
    }, DEBOUNCE_DELAY_MS);

    selector.addEventListener('change', debouncedLoad);

    // Pré-carrega temporadas finalizadas (JSON estático). Não bloqueia o
    // render se falhar — Lendas e Drawer só não terão dados históricos.
    // Mantemos o await para que o primeiro render de Lendas já tenha o dado.
    try {
        await preloadFinalizedSeasons();
    } catch (e) {
        console.warn('Falha ao preload de temporadas finalizadas:', e);
    }

    loadData();
}

async function loadData() {
    if (appState.isLoading) return;
    appState.isLoading = true;

    const container = document.getElementById(DOM_IDS.LEAGUES);

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
        renderLegends();
        renderSeasons();
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
            renderLegends();
            renderSeasons();
            appState.isLoading = false;
            return;
        }

        // Sem cache, mostra erro
        const errorMsg = appState.lastError
            ? getErrorMessage(appState.lastError)
            : 'Não foi possível carregar os dados. Verifique sua conexão.';

        container.innerHTML = `<div class="error-message fade-in">${escapeHtml('❌ ' + errorMsg)}</div>`;
        clearSecondaryContainers();
        renderLegends();
        renderSeasons();
        appState.isLoading = false;
        return;
    }

    // Sucesso: renderiza dados e salva no cache
    container.innerHTML = '';

    // Popula rosterData a partir dos resultados (responsabilidade centralizada)
    successfulResults.forEach(res => {
        appState.rosterData.push(...res.teams);
    });

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
    renderLegends();
    renderSeasons();
    appState.isLoading = false;
}

function clearSecondaryContainers() {
    document.getElementById(DOM_IDS.GLOBAL).innerHTML = '<div style="padding:1rem; text-align:center">Sem dados</div>';
    document.getElementById(DOM_IDS.POWER).innerHTML = '<div style="padding:1rem; text-align:center">Sem dados</div>';
}

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Hidrata <span data-icon="..."> com SVGs do IconRegistry (icons.js).
    // Roda antes de init() para que os ícones já apareçam mesmo enquanto
    // os dados estão sendo carregados.
    if (typeof renderIcons === 'function') {
        renderIcons();
    }
    init();
    setupTabKeyboardNavigation();
});
