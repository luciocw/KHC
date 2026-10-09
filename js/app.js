// =============================================================================
// APP — Bootstrap, roteamento por hash e render.
//
// URL (compartilhável):  #/<aba>/<ano>[/<série>[/<semana>]]   ·   #/jogador/<usuario>
//   abas: ligas · rodada · top · power · lendas · temporadas · regras
//   série (Ligas e Rodada): elite · a · b · c · d …   ·   semana (só Rodada)
//
// Fluxo: hash → appState → loadData() (se mudou a temporada) → render().
// Cada aba tem um render*() que devolve HTML para #view.
// Carregado por último. Depende de: TODOS os outros módulos.
// =============================================================================

const TABS = [
    { id: 'ligas',      label: 'Ligas',       short: 'Ligas',  title: 'Classificação', icon: 'trophy',   render: () => renderLigas(),         needsData: true },
    { id: 'rodada',     label: 'Rodada',      short: 'Rodada', title: 'Rodada',        icon: 'swords',   render: () => renderRodada(),        needsData: true },
    { id: 'top',        label: 'Top Scorers', short: 'Top',    title: 'Top Scorers',   icon: 'chart',    render: () => renderTopScorers(),    needsData: true },
    { id: 'power',      label: 'Power',       short: 'Power',  title: 'Power Ranking', icon: 'zap',      render: () => renderPowerRankings(), needsData: true },
    { id: 'lendas',     label: 'Lendas',      short: 'Lendas', title: 'Lendas KHC',    icon: 'crown',    render: () => renderLegends() },
    { id: 'temporadas', label: 'Temporadas',  short: 'Anos',   title: 'Temporadas',    icon: 'calendar', render: () => renderSeasons() },
    { id: 'regras',     label: 'Regras',      short: 'Regras', title: 'Regras',        icon: 'bookOpen', render: () => renderRules(), mobileInHeader: true },
];
const TAB_BY_ID = Object.fromEntries(TABS.map(t => [t.id, t]));

// -----------------------------------------------------------------------------
// Roteamento
// -----------------------------------------------------------------------------

/**
 * Monta o hash de uma view.
 * @param {string} tab
 * @param {string} season
 * @param {string} [tier] abas Ligas e Rodada
 * @param {number|null} [week] só aba Rodada
 * @returns {string}
 */
function hashFor(tab, season, tier, week) {
    if (tab === 'regras') return '#/regras';
    let h = `#/${tab}/${season}`;
    if ((tab === 'ligas' || tab === 'rodada') && tier && SERIES_META[tier]) {
        h += '/' + SERIES_META[tier].league;
        if (tab === 'rodada' && week) h += '/' + week;
    }
    return h;
}

/**
 * Lê o hash atual.
 * @returns {{tab: string, season: (string|null), tier: (string|null), week: (number|null), player: (string|null)}}
 */
function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'jogador' && parts[1]) {
        let player = null;
        try { player = decodeURIComponent(parts.slice(1).join('/')); } catch (e) { player = null; }
        return { tab: null, season: null, tier: null, week: null, player };
    }
    const tab = TAB_BY_ID[parts[0]] ? parts[0] : null;
    const season = KHC_CONFIG[parts[1]] ? parts[1] : null;
    const tier = Object.keys(SERIES_META).find(t => SERIES_META[t].league === (parts[2] || '').toLowerCase()) || null;
    const w = parseInt(parts[3], 10);
    const week = w >= 1 && w <= 30 ? w : null;
    return { tab, season, tier, week, player: null };
}

/** Atualiza a URL para refletir o estado atual (sem criar histórico). */
function syncHash() {
    if (isPlayerDrawerOpen()) return;
    const h = hashFor(appState.tab, appState.season, appState.series, appState.matchWeek);
    if (location.hash !== h) history.replaceState(null, '', h);
}

/**
 * Aplica o hash ao estado. Recarrega dados se a temporada mudou.
 * @param {{initial?: boolean}} [opts]
 */
function applyHash(opts = {}) {
    const route = parseHash();

    if (route.player) {
        if (opts.initial) {
            // Perfil aberto direto pelo link: abre depois que os dados chegarem.
            appState.pendingPlayer = route.player;
        } else {
            openPlayerDrawer(route.player, { fromHash: true });
        }
        return;
    }

    if (isPlayerDrawerOpen()) closePlayerDrawer();

    const prevSeason = appState.season;
    const prevTab = appState.tab;
    if (route.tab) appState.tab = route.tab;
    if (route.season) appState.season = route.season;
    if (route.tier) appState.series = route.tier;
    if (route.tab === 'rodada') appState.matchWeek = route.week;

    if (prevTab !== appState.tab) window.scrollTo(0, 0);

    if (opts.initial) return;
    if (prevSeason !== appState.season) {
        loadData();
    } else {
        render();
    }
}

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

/** Abas (topo e inferior), seletor de temporada, título e status. */
function renderShell() {
    const link = (t, label) => {
        const current = t.id === appState.tab;
        return `<a href="${hashFor(t.id, appState.season, appState.series)}"${current ? ' aria-current="page"' : ''}>
            <span data-icon="${t.icon}" data-size="20"></span><span>${label}</span></a>`;
    };
    document.getElementById(DOM_IDS.TOP_TABS).innerHTML = TABS.map(t => link(t, t.label)).join('');
    document.getElementById(DOM_IDS.BOTTOM_NAV).innerHTML = TABS.filter(t => !t.mobileInHeader).map(t => link(t, t.short)).join('');

    const rulesLink = document.getElementById('rulesLink');
    if (rulesLink) {
        if (appState.tab === 'regras') rulesLink.setAttribute('aria-current', 'page');
        else rulesLink.removeAttribute('aria-current');
    }

    const years = Object.keys(KHC_CONFIG).sort();
    document.getElementById(DOM_IDS.SEASON_SELECT).innerHTML = years.map(y => {
        const checked = y === appState.season;
        const live = !isSeasonFinalized(y);
        return `<button type="button" role="radio" aria-checked="${checked}" data-season="${y}"${live ? ' aria-label="' + y + ', em andamento"' : ''}>
            ${live ? '<i class="dot" aria-hidden="true"></i>' : ''}${y}</button>`;
    }).join('');

    const tab = TAB_BY_ID[appState.tab];
    document.getElementById(DOM_IDS.EYEBROW).textContent =
        appState.tab === 'regras' ? 'Como funciona' : `Temporada ${appState.season}`;
    document.getElementById(DOM_IDS.TITLE).textContent = tab.title;
    document.title = `${tab.title} · Ultimate League KHC`;

    renderStatus();
    renderIcons(document.querySelector('.site-header'));
    renderIcons(document.getElementById(DOM_IDS.BOTTOM_NAV));
}

/** Pílula de status: semana / encerrada / cache / erro / carregando. */
function renderStatus() {
    const el = document.getElementById(DOM_IDS.STATUS);
    const finalized = isSeasonFinalized();
    const ago = appState.lastUpdated ? formatTimeAgo(Date.now() - appState.lastUpdated) : '';
    const refresh = `<button type="button" data-action="reload" aria-label="Atualizar dados">${IconRegistry.refresh({ size: 16 })}</button>`;

    let cls = 'status';
    let html;
    if (appState.loadState === 'loading') {
        cls += ' is-loading';
        html = '<i class="dot"></i><b>Carregando…</b>';
    } else if (appState.loadState === 'error') {
        cls += ' is-error';
        html = `<i class="dot"></i><b>Sem conexão com a Sleeper</b>${refresh}`;
    } else if (finalized) {
        cls += ' is-final';
        html = '<i class="dot"></i><b>Temporada encerrada</b>';
    } else if (appState.isFromCache) {
        cls += ' is-stale';
        html = `<i class="dot"></i><b>Dados em cache</b><small>${ago}</small>${refresh}`;
    } else {
        html = `<i class="dot"></i><b>${escapeHtml(weekLabel() || 'Temporada em andamento')}</b><small>${ago}</small>${refresh}`;
    }
    el.className = cls;
    el.innerHTML = html;
}

/** Skeleton no formato da tabela (enquanto carrega). */
function skeletonHTML() {
    const row = '<div class="skeleton-row"><span class="skeleton sk-pos"></span><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
    return `<div class="card" aria-busy="true" aria-label="Carregando">${row.repeat(8)}</div>`;
}

/** Conteúdo da aba atual. */
function renderView() {
    const view = document.getElementById(DOM_IDS.VIEW);
    const tab = TAB_BY_ID[appState.tab];
    let html;

    if (tab.needsData && appState.loadState === 'loading') {
        html = skeletonHTML();
    } else if (tab.needsData && appState.loadState === 'error') {
        const msg = appState.lastError ? getErrorMessage(appState.lastError) : 'Verifique sua conexão e tente de novo.';
        html = stateHTML({
            icon: 'alert',
            title: 'Não deu pra falar com a Sleeper',
            text: msg,
            action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
        });
    } else {
        html = tab.render();
    }

    view.innerHTML = html;
    renderIcons(view);

    // Mantém a série selecionada visível na barra de séries (rola no celular).
    const active = view.querySelector('.series-tabs [aria-current="page"]');
    if (active) {
        const bar = active.parentElement;
        bar.scrollLeft = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
    }
}

/** Render completo (shell + aba) e sincroniza a URL. */
function render() {
    renderShell();
    renderView();
    syncHash();
}

// -----------------------------------------------------------------------------
// Dados
// -----------------------------------------------------------------------------

// Cada loadData() recebe um número; só a mais recente pode aplicar o
// resultado (troca de temporada no meio do fetch não mistura dados).
let _loadSeq = 0;

/**
 * Busca as ligas da temporada selecionada na Sleeper (com cache de reserva)
 * e renderiza.
 */
async function loadData() {
    const seq = ++_loadSeq;
    const season = appState.season;
    const config = KHC_CONFIG[season];

    appState.isLoading = true;
    appState.loadState = 'loading';
    appState.leagues = [];
    appState.rosterData = [];
    appState.failedLeagues = [];
    appState.lastError = null;
    appState.isFromCache = false;
    resetRoundCache();
    render();

    const validLeagues = config ? config.leagues.filter(l => !l.id.includes('placeholder')) : [];
    const settled = await Promise.allSettled(validLeagues.map(l => fetchLeagueData(l)));
    if (seq !== _loadSeq) return;

    const ok = [];
    const failed = [];
    settled.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) ok.push(r.value);
        else failed.push(validLeagues[i].tier);
    });

    let leagues = ok;
    if (ok.length) {
        appState.lastUpdated = Date.now();
        saveToCache(season, ok);
    } else {
        const cached = getFromCache(season);
        if (cached && Array.isArray(cached.data) && cached.data.length) {
            leagues = cached.data;
            appState.isFromCache = true;
            appState.lastUpdated = Date.now() - cached.age;
        }
    }

    appState.leagues = leagues;
    appState.rosterData = leagues.flatMap(l => l.teams || []);
    appState.leaguesBySeason[season] = leagues;
    appState.failedLeagues = leagues.length && !appState.isFromCache ? failed : [];
    appState.loadState = leagues.length ? 'ready' : 'error';
    appState.isLoading = false;
    render();

    if (appState.pendingPlayer) {
        const player = appState.pendingPlayer;
        appState.pendingPlayer = null;
        openPlayerDrawer(player, { fromHash: true });
    }
}

// -----------------------------------------------------------------------------
// Eventos
// -----------------------------------------------------------------------------

function bindEvents() {
    window.addEventListener('hashchange', () => applyHash());

    document.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;

        const seasonBtn = target.closest('[data-season]');
        if (seasonBtn) {
            const year = seasonBtn.getAttribute('data-season');
            if (year !== appState.season && KHC_CONFIG[year]) {
                location.hash = hashFor(appState.tab, year, appState.series);
            }
            return;
        }

        const exportBtn = target.closest('[data-action="export-download"], [data-action="export-share"]');
        if (exportBtn) {
            exportStandings(exportBtn, exportBtn.getAttribute('data-action') === 'export-share' ? 'share' : 'download');
            return;
        }

        if (target.closest('[data-action="reload"]')) {
            loadData();
            return;
        }

        const filter = target.closest('[data-top-filter]');
        if (filter) {
            appState.topFilter = filter.getAttribute('data-top-filter');
            renderView();
        }
    });

    document.addEventListener('pointerdown', (e) => {
        if (e.target instanceof Element && e.target.closest('[data-action="export-share"]')) prefetchExport();
    });

    document.addEventListener('change', (e) => {
        if (e.target && e.target.matches && e.target.matches('[data-week-select]')) {
            location.hash = hashFor('rodada', appState.season, appState.series, Number(e.target.value));
            return;
        }
        if (e.target && e.target.id === 'incElite') {
            appState.includeElite = e.target.checked;
            if (!appState.includeElite && appState.topFilter === 'elite') appState.topFilter = 'all';
            renderView();
        }
    });

    // Setas no seletor de temporada (padrão radiogroup).
    document.getElementById(DOM_IDS.SEASON_SELECT).addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        const years = Object.keys(KHC_CONFIG).sort();
        const i = years.indexOf(appState.season);
        const next = years[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + years.length) % years.length];
        e.preventDefault();
        location.hash = hashFor(appState.tab, next, appState.series);
        requestAnimationFrame(() => {
            const btn = document.querySelector(`[data-season="${next}"]`);
            if (btn) btn.focus();
        });
    });

    // Atualiza o "há X min" da pílula de status.
    setInterval(() => {
        if (appState.loadState === 'ready') renderStatus();
    }, STATUS_TICK_MS);
}

async function init() {
    cleanOldCache();
    applyHash({ initial: true });
    bindEvents();
    render();

    // Semana atual da NFL (Sleeper) — não bloqueia o carregamento.
    fetchNflState().then(state => {
        appState.nflState = state;
        if (appState.loadState !== 'loading') render();
    });

    // Temporadas finalizadas (JSON estático): necessárias para medalhas,
    // Lendas, Temporadas e perfil. Falha não bloqueia o resto.
    try {
        await preloadFinalizedSeasons();
    } catch (e) {
        console.warn('Falha ao carregar temporadas finalizadas:', e);
    }

    loadData();
}

document.addEventListener('DOMContentLoaded', init);
