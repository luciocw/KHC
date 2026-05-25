// =============================================================================
// UI / DRAWER — Player profile side-sheet.
//
// Comportamento (handoff "Player Profile Drawer"):
//   • Slide-in da direita (300ms cubic-bezier(.2,.7,.2,1)).
//   • Backdrop semi-transparente + blur; click fecha.
//   • ESC fecha; foco volta para o player-link que abriu.
//   • Body scroll lock enquanto aberto.
//   • Focus trap (Tab / Shift+Tab ciclam dentro do drawer).
//
// Conteúdo (gerado por `careerForUser(username, getFinalizedSeasons())`):
//   1. Header: avatar 64px + username + pills da temporada atual.
//   2. Conquistas: grid 4-col (ouro/prata/bronze/4º).
//   3. Estatísticas de carreira: 2-col (Temporadas, V/D, %, Pts) + best campaign.
//   4. Histórico: lista de temporadas (year+serie · team+stats · trophy).
//
// Self-bootstrap: instala delegação no body que abre o drawer ao clicar
// (ou pressionar Enter / Space) em qualquer `.player-link[data-user]`.
//
// Helpers consumidos (globais): escapeHtml, sanitizeAvatarUrl, sanitizeString,
// IconRegistry, careerForUser, getFinalizedSeasons, appState.
// =============================================================================

/* eslint-disable no-unused-vars */

(function () {
    'use strict';

    // ---------- Constantes ----------

    /** Mapa de id de série → nome legível. Mantemos local para evitar cross-file coupling. */
    const SERIES_NAMES = {
        A: 'Serie A',
        B: 'Serie B',
        C: 'Serie C',
        Elite: 'KHC Elite'
    };

    const MEDAL_ICONS = {
        gold: 'medalGold',
        silver: 'medalSilver',
        bronze: 'medalBronze',
        fourth: 'medalFourth'
    };

    const MEDAL_LABELS = {
        gold: 'Ouro',
        silver: 'Prata',
        bronze: 'Bronze',
        fourth: '4º Lugar'
    };

    // ---------- Estado interno ----------

    /** @type {HTMLElement|null} Elemento que tinha o foco antes do drawer abrir. */
    let _lastFocusedTrigger = null;

    /** @type {(e: KeyboardEvent) => void | null} */
    let _keydownHandler = null;

    /** @type {string} Valor original de body.style.overflow para restaurar ao fechar. */
    let _prevBodyOverflow = '';

    // ---------- Helpers ----------

    /** @returns {HTMLElement|null} */
    function getDrawer() {
        return document.getElementById('player-drawer');
    }

    /**
     * Tenta encontrar um avatarId para um usuário, primeiro no histórico finalizado,
     * depois em appState.rosterData (temporada ativa).
     * @param {string} username
     * @param {Season[]} seasons
     * @returns {string|undefined}
     */
    function findAvatarId(username, seasons) {
        // Histórico finalizado: ordem mais recente primeiro
        for (let i = 0; i < seasons.length; i++) {
            const season = seasons[i];
            for (let j = 0; j < season.series.length; j++) {
                const t = season.series[j].teams.find(x => x.user === username);
                if (t && t.avatarId) return t.avatarId;
            }
        }
        // Temporada ativa via rosterData (legacy adapter)
        const roster = (typeof appState !== 'undefined' && Array.isArray(appState.rosterData))
            ? appState.rosterData : [];
        const hit = roster.find(r => r.ownerName === username && r.avatar);
        return hit ? hit.avatar : undefined;
    }

    /**
     * Procura no rosterData entries da temporada ativa para o usuário.
     * Retorna linhas no mesmo formato de Career.history (active: true).
     * @param {string} username
     * @returns {Array<{season:number, serie:string, team:string, w:number, l:number, pts:number, active:true}>}
     */
    function activeRosterRowsFor(username) {
        const roster = (typeof appState !== 'undefined' && Array.isArray(appState.rosterData))
            ? appState.rosterData : [];
        const seasonId = (typeof appState !== 'undefined' && appState.season)
            ? parseInt(appState.season, 10) : NaN;
        if (!Number.isFinite(seasonId)) return [];
        return roster
            .filter(r => r.ownerName === username)
            .map(r => {
                // Reverte leagueName/tier para um id de série A/B/C/Elite quando possível.
                const name = r.leagueName || '';
                let serie = 'A';
                if (/elite/i.test(name)) serie = 'Elite';
                else if (/serie\s*b/i.test(name)) serie = 'B';
                else if (/serie\s*c/i.test(name)) serie = 'C';
                else if (/serie\s*a/i.test(name)) serie = 'A';
                return {
                    season: seasonId,
                    serie,
                    team: r.teamName,
                    w: r.wins,
                    l: r.losses,
                    pts: r.fpts,
                    active: true
                };
            });
    }

    /**
     * Compõe a lista de currentSeries pills a exibir no header:
     * usa career.currentSeries quando preenchida (temporada ativa carregada via JSON),
     * senão tenta inferir a partir de rosterData.
     * @param {Career} career
     * @returns {string[]} array de ids de série (A/B/C/Elite)
     */
    function resolveCurrentSeries(career) {
        if (career.currentSeries && career.currentSeries.length) {
            return career.currentSeries.slice();
        }
        const rows = activeRosterRowsFor(career.user);
        const set = new Set();
        rows.forEach(r => set.add(r.serie));
        return Array.from(set);
    }

    /**
     * Constrói lista combinada de histórico (finalized + active rosterData),
     * evitando duplicar entradas já presentes no career.history.
     * @param {Career} career
     * @returns {Array} linhas de history, mais recente primeiro
     */
    function buildHistory(career) {
        const out = career.history ? career.history.slice() : [];
        // Adiciona linhas da temporada ativa (rosterData) que não estejam no history.
        const activeRows = activeRosterRowsFor(career.user);
        activeRows.forEach(r => {
            const dup = out.find(h => h.season === r.season && h.serie === r.serie);
            if (!dup) out.push(r);
        });
        out.sort((a, b) => b.season - a.season || (a.serie === 'Elite' ? -1 : 1));
        return out;
    }

    // ---------- Renderização ----------

    /**
     * @param {Career} career
     * @returns {string} HTML do conteúdo do drawer
     */
    function renderDrawerContent(career) {
        const username = sanitizeString(career.user, 64, 'Jogador');
        const avatarId = findAvatarId(career.user,
            typeof getFinalizedSeasons === 'function' ? getFinalizedSeasons() : []);
        const avatarUrl = sanitizeAvatarUrl(avatarId);

        const currentSeries = resolveCurrentSeries(career);
        const history = buildHistory(career);

        // Aproveitamento (%) — só faz sentido com jogos.
        const totalGames = career.totalWins + career.totalLosses;
        const winRate = totalGames > 0
            ? ((career.totalWins / totalGames) * 100).toFixed(1) + '%'
            : '—';

        return `
            <div class="drawer-header">
                <img class="drawer-avatar" src="${avatarUrl}" alt=""
                     onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                <div class="drawer-user-info">
                    <h2 class="drawer-title" id="drawer-title">${escapeHtml(username)}</h2>
                    ${currentSeries.length ? `
                        <div class="drawer-current">
                            <span>Atualmente em:</span>
                            <div class="drawer-current-pills">
                                ${currentSeries.map(id => `
                                    <span class="serie-pill${id === 'Elite' ? ' elite' : ''}">${escapeHtml(SERIES_NAMES[id] || id)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <section class="drawer-section" aria-labelledby="drawer-conq-title">
                <h3 class="drawer-section-title" id="drawer-conq-title">Conquistas</h3>
                <div class="conquistas-grid">
                    ${['gold', 'silver', 'bronze', 'fourth'].map(k => `
                        <div class="conquista-cell ${k}">
                            <div class="conquista-medal">${IconRegistry[MEDAL_ICONS[k]]({ size: 22 })}</div>
                            <div class="conquista-count">${career.trophies[k] || 0}</div>
                            <div class="conquista-label">${MEDAL_LABELS[k]}</div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section class="drawer-section" aria-labelledby="drawer-stats-title">
                <h3 class="drawer-section-title" id="drawer-stats-title">Estatísticas de Carreira</h3>
                <div class="stats-grid">
                    <div class="stat-tile">
                        <div class="stat-label">Temporadas</div>
                        <div class="stat-value">${career.totalSeasons}</div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-label">Vitórias / Derrotas</div>
                        <div class="stat-value">${career.totalWins}–${career.totalLosses}</div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-label">Aproveitamento</div>
                        <div class="stat-value">${winRate}</div>
                    </div>
                    <div class="stat-tile">
                        <div class="stat-label">Pontos totais</div>
                        <div class="stat-value">${career.totalPts.toFixed(2)}</div>
                    </div>
                    ${career.bestCampaign ? `
                        <div class="stat-tile full">
                            <div class="stat-label">Melhor campanha</div>
                            <div class="stat-value bestcampaign">${escapeHtml(career.bestCampaign)}</div>
                        </div>
                    ` : ''}
                </div>
            </section>

            ${history.length ? `
                <section class="drawer-section" aria-labelledby="drawer-hist-title">
                    <h3 class="drawer-section-title" id="drawer-hist-title">Histórico</h3>
                    <div class="history-list">
                        ${history.map(h => renderHistoryRow(h)).join('')}
                    </div>
                </section>
            ` : ''}
        `;
    }

    /**
     * Renderiza uma linha do histórico (3 colunas: year+serie · team+stats · trophy/active).
     * @param {{season:number, serie:string, team:string, w:number, l:number, pts:number, trophy?:string, active?:boolean}} row
     * @returns {string}
     */
    function renderHistoryRow(row) {
        const serieName = SERIES_NAMES[row.serie] || row.serie;
        const trophyBadge = row.trophy
            ? `<span class="history-trophy" aria-label="${MEDAL_LABELS[row.trophy]}">${IconRegistry[MEDAL_ICONS[row.trophy]]({ size: 22 })}</span>`
            : '';
        const activePill = row.active
            ? '<span class="history-active-pill">Em andamento</span>'
            : '';

        return `
            <div class="history-row">
                <div>
                    <div class="history-year">${row.season}</div>
                    <div class="history-serie">${escapeHtml(serieName)}</div>
                </div>
                <div>
                    <div class="history-team">${escapeHtml(sanitizeString(row.team, 60, '—'))}</div>
                    <div class="history-stats">${row.w}–${row.l} · ${row.pts.toFixed(1)} pts</div>
                </div>
                <div>${activePill || trophyBadge}</div>
            </div>
        `;
    }

    // ---------- Focus trap ----------

    /**
     * Retorna todos os elementos focáveis dentro do drawer.
     * @param {HTMLElement} root
     * @returns {HTMLElement[]}
     */
    function getFocusable(root) {
        const sel = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(root.querySelectorAll(sel)).filter(el => !el.hasAttribute('hidden'));
    }

    /**
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
        const drawer = getDrawer();
        if (!drawer || drawer.hasAttribute('hidden')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closePlayerDrawer();
            return;
        }

        if (e.key === 'Tab') {
            const focusable = getFocusable(drawer);
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || !drawer.contains(active))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    // ---------- API pública ----------

    /**
     * Abre o player drawer para um determinado username.
     * @param {string} username
     */
    function openPlayerDrawer(username) {
        const drawer = getDrawer();
        if (!drawer) {
            console.warn('[drawer] #player-drawer não encontrado no DOM');
            return;
        }
        if (typeof careerForUser !== 'function') {
            console.warn('[drawer] careerForUser indisponível');
            return;
        }

        const seasons = typeof getFinalizedSeasons === 'function' ? getFinalizedSeasons() : [];
        const career = careerForUser(username, seasons);

        // Guarda o elemento focado para devolver o foco depois
        _lastFocusedTrigger = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        // Render conteúdo
        const content = drawer.querySelector('#drawer-content');
        if (content) content.innerHTML = renderDrawerContent(career);

        // Botão de fechar — renderiza ícone X
        const closeBtn = drawer.querySelector('.drawer-close');
        if (closeBtn) closeBtn.innerHTML = IconRegistry.close({ size: 20 });

        // Mostra o drawer
        drawer.removeAttribute('hidden');

        // Lock body scroll
        _prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';

        // Listener global de teclado (ESC + focus trap)
        _keydownHandler = handleKeydown;
        document.addEventListener('keydown', _keydownHandler);

        // Foca o primeiro focável (geralmente o botão de fechar)
        requestAnimationFrame(() => {
            const focusable = getFocusable(drawer);
            if (focusable.length > 0) focusable[0].focus();
        });
    }

    /** Fecha o drawer e restaura foco. */
    function closePlayerDrawer() {
        const drawer = getDrawer();
        if (!drawer) return;
        if (drawer.hasAttribute('hidden')) return;

        drawer.setAttribute('hidden', '');

        // Restaura scroll do body
        document.body.style.overflow = _prevBodyOverflow;
        _prevBodyOverflow = '';

        // Remove listener
        if (_keydownHandler) {
            document.removeEventListener('keydown', _keydownHandler);
            _keydownHandler = null;
        }

        // Limpa conteúdo (evita ficar com dados desatualizados)
        const content = drawer.querySelector('#drawer-content');
        if (content) content.innerHTML = '';

        // Devolve foco ao trigger
        if (_lastFocusedTrigger && typeof _lastFocusedTrigger.focus === 'function') {
            try { _lastFocusedTrigger.focus(); } catch (_) { /* ignore */ }
        }
        _lastFocusedTrigger = null;
    }

    // ---------- Delegação de eventos ----------

    /**
     * Trata click ou Enter/Space em um .player-link → abre drawer.
     * @param {Event} e
     */
    function handlePlayerLinkActivation(e) {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const link = target.closest('.player-link[data-user]');
        if (!link) return;

        // Para teclado, aceitamos apenas Enter/Space.
        if (e.type === 'keydown') {
            const key = /** @type {KeyboardEvent} */ (e).key;
            if (key !== 'Enter' && key !== ' ') return;
            e.preventDefault();
        }

        const user = link.getAttribute('data-user');
        if (user) openPlayerDrawer(user);
    }

    /**
     * Trata clicks em elementos com data-close-drawer (backdrop + botão X).
     * @param {Event} e
     */
    function handleDrawerCloseClick(e) {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-close-drawer]')) {
            closePlayerDrawer();
        }
    }

    function bootstrap() {
        document.body.addEventListener('click', handlePlayerLinkActivation);
        document.body.addEventListener('keydown', handlePlayerLinkActivation);

        const drawer = getDrawer();
        if (drawer) {
            drawer.addEventListener('click', handleDrawerCloseClick);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Expor API global
    window.openPlayerDrawer = openPlayerDrawer;
    window.closePlayerDrawer = closePlayerDrawer;
})();

/* eslint-enable no-unused-vars */
