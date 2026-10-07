// =============================================================================
// UI / DRAWER — Perfil do jogador.
//
//   - Desktop: lateral direita 420px. Celular: bottom sheet a partir de 8vh.
//   - Fecha com o botão, Esc ou clique no fundo; foco volta para quem abriu.
//   - Trava de scroll compartilhada (lockBodyScroll) + focus trap.
//   - URL: #/jogador/<usuario> (compartilhável). Ao fechar, volta à URL
//     anterior via history.replaceState.
//
// Conteúdo: avatar + nome + séries atuais · Conquistas (4 tiles; zeradas
// apagadas) · Carreira (totais sobre o histórico exibido, 1 casa decimal) ·
// Histórico (escudo + ano · série + time · V–D · pts + medalha/posição ou
// "Em andamento").
//
// Abre a partir de qualquer elemento [data-user] (delegação no document).
// Depende de: config, sanitize, data, derivations, icons, ui/helpers
// =============================================================================

(function () {
    'use strict';

    let _lastFocusedTrigger = null;
    let _hashBeforeOpen = null;
    let _isOpen = false;

    const getDrawer = () => document.getElementById('player-drawer');
    const getScrim = () => document.getElementById('scrim');

    /**
     * Anos em andamento já carregados nesta sessão (não finalizados).
     * @returns {string[]}
     */
    function activeYearsLoaded() {
        return Object.keys(appState.leaguesBySeason).filter(y => !isSeasonFinalized(y));
    }

    /**
     * Linhas do histórico vindas das temporadas em andamento já carregadas.
     * @param {string} username
     * @returns {Array<{season:number, serie:string, team:string, w:number, l:number, pts:number, active:true, avatar:string}>}
     */
    function activeRowsFor(username) {
        const out = [];
        activeYearsLoaded().forEach(year => {
            (appState.leaguesBySeason[year] || []).forEach(league => {
                league.teams.filter(t => t.ownerName === username).forEach(t => {
                    out.push({
                        season: Number(year),
                        serie: tierToSeriesId(league.info.tier),
                        team: t.teamName,
                        w: t.wins,
                        l: t.losses,
                        pts: t.fpts,
                        active: true,
                        avatar: t.avatar
                    });
                });
            });
        });
        return out;
    }

    /**
     * Histórico combinado (finalizadas + em andamento), mais recente primeiro;
     * na mesma temporada, segue TIER_ORDER (Elite primeiro).
     * @param {Career} career
     * @param {Array} activeRows
     * @returns {Array}
     */
    function buildHistory(career, activeRows) {
        const out = career.history.slice();
        activeRows.forEach(r => {
            if (!out.some(h => h.season === r.season && h.serie === r.serie)) out.push(r);
        });
        const order = id => TIER_ORDER.indexOf(seriesIdToTier(id));
        out.sort((a, b) => (b.season - a.season) || (order(a.serie) - order(b.serie)));
        return out;
    }

    /**
     * Totais de carreira sobre o histórico exibido. Elite + série regular na
     * mesma temporada somam jogos, mas contam como uma temporada.
     * @param {Array} history
     * @returns {{seasons:number, wins:number, losses:number, pts:number}}
     */
    function statsFromHistory(history) {
        let wins = 0, losses = 0, pts = 0;
        history.forEach(h => {
            wins += Number(h.w) || 0;
            losses += Number(h.l) || 0;
            pts += Number(h.pts) || 0;
        });
        return { seasons: new Set(history.map(h => h.season)).size, wins, losses, pts };
    }

    /**
     * Avatar mais recente conhecido do jogador.
     * @returns {string|undefined}
     */
    function findAvatarId(username, activeRows) {
        const live = activeRows.find(r => r.avatar);
        if (live) return live.avatar;
        for (const season of getFinalizedSeasons()) {
            for (const s of season.series) {
                const t = s.teams.find(x => x.user === username && x.avatarId);
                if (t) return t.avatarId;
            }
        }
        return undefined;
    }

    /**
     * Linha do histórico.
     * @returns {string}
     */
    function renderHistoryRow(h) {
        const tier = seriesIdToTier(h.serie);
        let badge;
        if (h.active) badge = '<span class="chip chip--live-soft">Em andamento</span>';
        else if (h.rank >= 1 && h.rank <= 4) badge = medalHTML(h.rank);
        else if (h.rank) badge = `<span class="chip chip--final">${h.rank}º</span>`;
        else badge = '';
        return `<div class="history-row">
            ${crestHTML(tier, 34)}
            <span class="grow">
                <b>${h.season} · ${escapeHtml(seriesNameById(h.serie))}</b>
                <span class="team__name history-row__team" dir="auto">${escapeHtml(h.team)} · ${h.w}–${h.l} · ${fmtPts(h.pts)} pts</span>
            </span>
            ${badge}
        </div>`;
    }

    /**
     * HTML do perfil.
     * @param {string} username
     * @returns {string}
     */
    function renderDrawerContent(username) {
        const career = careerForUser(username, getFinalizedSeasons());
        const activeRows = activeRowsFor(username);
        const history = buildHistory(career, activeRows);
        const stats = statsFromHistory(history);
        const games = stats.wins + stats.losses;
        const winRate = games > 0 ? Math.round((stats.wins / games) * 100) + '%' : '—';
        const current = TIER_ORDER.filter(t => activeRows.some(r => r.serie === SERIES_META[t].id));

        const trophyTiles = MEDAL_KEYS.map((k, i) => {
            const v = career.trophies[k] || 0;
            return `<div class="tile tile--medal${v ? '' : ' is-zero'}">
                ${v ? medalHTML(i + 1) : `<span class="medal medal--off">${i + 1}</span>`}
                <span class="num">${v}</span>
                <small>${MEDAL_LABELS[k]}</small>
            </div>`;
        }).join('');

        const statTiles = [
            ['Temporadas', stats.seasons],
            ['V–D', `${stats.wins}–${stats.losses}`],
            ['Aproveitamento', winRate],
            ['Pontos totais', fmtPts(stats.pts)],
        ].map(([k, v]) => `<div class="tile"><div class="eyebrow">${k}</div><div class="num">${v}</div></div>`).join('');

        return `
            <header class="drawer__hd">
                ${avatarHTML({ avatarId: findAvatarId(username, activeRows), name: username, size: 'lg' })}
                <div class="grow">
                    <h2 class="display drawer__title" id="drawer-title" dir="auto">${escapeHtml(sanitizeString(username, 64, 'Jogador'))}</h2>
                    ${current.length ? `<div class="drawer__pills">${current.map(seriesPillHTML).join('')}</div>` : ''}
                </div>
                <button type="button" class="icon-btn drawer__close" data-close-drawer aria-label="Fechar perfil">${IconRegistry.close({ size: 20 })}</button>
            </header>
            <div class="drawer__body">
                <section aria-labelledby="drawer-conq"><h3 class="eyebrow" id="drawer-conq">Conquistas</h3>
                    <div class="tiles tiles--4">${trophyTiles}</div></section>
                <section aria-labelledby="drawer-car"><h3 class="eyebrow" id="drawer-car">Carreira</h3>
                    <div class="tiles">${statTiles}</div></section>
                ${history.length ? `<section aria-labelledby="drawer-hist"><h3 class="eyebrow" id="drawer-hist">Histórico</h3>
                    <div class="history">${history.map(renderHistoryRow).join('')}</div></section>` : ''}
            </div>`;
    }

    // ---------- Focus trap ----------

    function getFocusable(root) {
        const sel = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(root.querySelectorAll(sel));
    }

    function handleKeydown(e) {
        if (!_isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closePlayerDrawer();
            return;
        }
        if (e.key !== 'Tab') return;
        const focusable = getFocusable(getDrawer());
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || !getDrawer().contains(document.activeElement))) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    }

    // ---------- API pública ----------

    /**
     * Abre o perfil de um jogador.
     * @param {string} username
     * @param {{fromHash?: boolean}} [opts] fromHash: a URL já é #/jogador/…
     */
    function openPlayerDrawer(username, opts = {}) {
        const drawer = getDrawer();
        if (!drawer || !username) return;

        if (!_isOpen) {
            _lastFocusedTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            _hashBeforeOpen = opts.fromHash ? null : location.hash;
            lockBodyScroll();
            document.addEventListener('keydown', handleKeydown);
        }

        document.getElementById('drawer-content').innerHTML = renderDrawerContent(username);
        drawer.hidden = false;
        getScrim().hidden = false;
        _isOpen = true;

        const target = '#/jogador/' + encodeURIComponent(username);
        if (location.hash !== target) history.replaceState(null, '', target);

        requestAnimationFrame(() => {
            const btn = drawer.querySelector('.drawer__close');
            if (btn) btn.focus();
        });
    }

    /** Fecha o perfil, restaura foco e URL. */
    function closePlayerDrawer() {
        if (!_isOpen) return;
        getDrawer().hidden = true;
        getScrim().hidden = true;
        _isOpen = false;
        unlockBodyScroll();
        document.removeEventListener('keydown', handleKeydown);

        const back = _hashBeforeOpen || hashFor(appState.tab, appState.season, appState.series);
        history.replaceState(null, '', back);
        _hashBeforeOpen = null;

        if (_lastFocusedTrigger && document.contains(_lastFocusedTrigger)) {
            _lastFocusedTrigger.focus();
        }
        _lastFocusedTrigger = null;
    }

    /** @returns {boolean} */
    function isPlayerDrawerOpen() {
        return _isOpen;
    }

    // ---------- Delegação ----------

    document.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;
        if (target.closest('[data-close-drawer]')) {
            closePlayerDrawer();
            return;
        }
        const trigger = target.closest('[data-user]');
        if (trigger && !getDrawer().contains(trigger)) {
            const user = trigger.getAttribute('data-user');
            if (user) openPlayerDrawer(user);
        }
    });

    window.openPlayerDrawer = openPlayerDrawer;
    window.closePlayerDrawer = closePlayerDrawer;
    window.isPlayerDrawerOpen = isPlayerDrawerOpen;
})();
