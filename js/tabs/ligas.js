// =============================================================================
// TAB / LIGAS — Classificação de uma série por vez.
//
//   - Abas por série (escudo + nome, borda na cor da liga).
//   - Tabela # · Time · V–D · PF · PC (PC some < 1024px).
//   - Zonas por temporada (KHC_CONFIG[ano].rules): acesso, playoffs,
//     rebaixamento. A série mais alta não tem acesso; a mais baixa não tem
//     rebaixamento; a Elite é paralela (só playoffs).
//   - Temporada finalizada: ordem e medalhas pela classificação final
//     (data/<ano>.json — 1º–4º pelos playoffs, 5º+ pela temporada regular).
//   - Lateral: líderes (ou campeões) das outras séries.
//
// Lê: appState.leagues, appState.season, appState.series, appState.failedLeagues
// Depende de: config, sanitize, data, ui/helpers
// =============================================================================

let _finalIndexCache = null;
let _finalIndexCacheSeason = null;

/**
 * Índice da classificação final da temporada selecionada:
 * `{ seriesName: { user: { rank, trophy } } }`. Vazio se não finalizada.
 * Chave por usuário (display_name), igual no JSON e na Sleeper — o nome do
 * time pode mudar. Memoizado por temporada.
 * @returns {Object<string, Object<string, {rank: number, trophy: (string|null)}>>}
 */
function getFinalStandingsIndex() {
    const currentSeason = appState.season;
    if (_finalIndexCacheSeason === currentSeason && _finalIndexCache) {
        return _finalIndexCache;
    }
    const idx = {};
    const season = getFinalizedSeason(currentSeason);
    if (season) {
        season.series.forEach(srs => {
            idx[srs.name] = {};
            (srs.teams || []).forEach(t => {
                idx[srs.name][t.user] = { rank: t.rank, trophy: t.trophy || null };
            });
        });
    }
    _finalIndexCache = idx;
    _finalIndexCacheSeason = currentSeason;
    return idx;
}

/**
 * Ordena os times pela classificação final quando houver. Times sem
 * entrada no snapshot vão para o fim, mantendo a ordem original.
 * @param {Array} teams
 * @param {Object<string, {rank: number}>|undefined} seriesIdx
 * @returns {Array}
 */
function sortByFinalStandings(teams, seriesIdx) {
    if (!seriesIdx) return teams;
    const rankOf = t => (seriesIdx[t.ownerName] ? seriesIdx[t.ownerName].rank : Infinity);
    return teams
        .map((t, i) => ({ t, i }))
        .sort((a, b) => (rankOf(a.t) - rankOf(b.t)) || (a.i - b.i))
        .map(x => x.t);
}

/**
 * Ligas da temporada ordenadas por TIER_ORDER (Elite, A, B, …).
 * @param {Array} leagues
 * @returns {Array}
 */
function sortLeagues(leagues) {
    return leagues.slice().sort((a, b) =>
        TIER_ORDER.indexOf(a.info.tier) - TIER_ORDER.indexOf(b.info.tier));
}

/**
 * Tier efetivo da aba Ligas: o selecionado, ou Série A, ou a primeira.
 * @param {Array} leagues já ordenadas
 * @returns {string|null}
 */
function resolveSeriesTier(leagues) {
    if (!leagues.length) return null;
    if (leagues.some(l => l.info.tier === appState.series)) return appState.series;
    return leagues.some(l => l.info.tier === 'serie-a') ? 'serie-a' : leagues[0].info.tier;
}

/**
 * Quantos sobem / descem / vão aos playoffs nesta série.
 * As séries regulares da temporada vêm da config (não só das que
 * carregaram), para a mais baixa ser identificada corretamente.
 * @param {string} tier
 * @returns {{up: number, down: number, playoff: number, isElite: boolean}}
 */
function zonesFor(tier) {
    const cfg = KHC_CONFIG[appState.season] || {};
    const rules = cfg.rules || { promote: 0, relegate: 0, playoffTeams: 6, elitePlayoffTeams: 4 };
    if (tier === 'elite') {
        return { up: 0, down: 0, playoff: rules.elitePlayoffTeams, isElite: true };
    }
    const regular = (cfg.leagues || [])
        .map(l => l.tier)
        .filter(t => t !== 'elite')
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
    const isTop = regular[0] === tier;
    const isLowest = regular[regular.length - 1] === tier;
    return {
        up: isTop ? 0 : rules.promote,
        down: isLowest ? 0 : rules.relegate,
        playoff: rules.playoffTeams,
        isElite: false
    };
}

/**
 * Linha da tabela de classificação.
 * @returns {string}
 */
function buildStandingsRow(t, i, n, z, finalEntry) {
    const pos = i + 1;
    let zone = '';
    if (i < z.up) zone = 'z-promo';
    else if (z.down && i >= n - z.down) zone = 'z-releg';
    else if (i < z.playoff) zone = 'z-playoff';

    let cut = '';
    if (z.up && i === z.up - 1) cut = 'cut-promo';
    else if (z.down && i === n - z.down - 1) cut = 'cut-releg';
    else if (i === z.playoff - 1 && z.playoff < n) cut = 'cut-playoff';

    const trophy = finalEntry && finalEntry.trophy;
    const posCell = trophy ? medalHTML(pos) : `<span class="pos">${pos}</span>`;
    const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
    const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);

    return `<tr class="${zone} ${cut}">
        <td>${posCell}</td>
        <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
        <td class="rec">${wins}–${losses}</td>
        <td>${fmtPts(t.fpts)}</td>
        <td class="hide-mobile">${fmtPts(t.fptsAgainst)}</td>
    </tr>`;
}

/**
 * Legenda das zonas.
 * @returns {string}
 */
function buildZoneLegend(z, finalized) {
    const items = [];
    if (finalized) items.push('<span><i class="legend__medal"></i>Top 4 pelos playoffs</span>');
    if (z.up) items.push(`<span><i style="background:var(--zone-promo)"></i>${finalized ? 'Subiram' : 'Zona de acesso (projeção)'} · ${z.up}</span>`);
    items.push(`<span><i style="background:var(--zone-playoff)"></i>Playoffs · top ${z.playoff}</span>`);
    if (z.down) items.push(`<span><i style="background:var(--zone-releg)"></i>${finalized ? 'Caíram' : 'Rebaixamento'} · ${z.down}</span>`);
    if (z.isElite) items.push('<span>Liga paralela: não rebaixa</span>');
    return `<div class="legend">${items.join('')}</div>`;
}

/**
 * Card lateral "líder / campeão" de outra série (link para a série).
 * @returns {string}
 */
function buildLeaderLink(league, finalized, finalIdx) {
    const meta = SERIES_META[league.info.tier];
    const seriesIdx = finalized ? finalIdx[league.info.name] : undefined;
    const first = sortByFinalStandings(league.teams, seriesIdx)[0];
    if (!meta || !first) return '';
    return `<a class="leader card" data-league="${meta.league}" href="${hashFor('ligas', appState.season, league.info.tier)}">
        ${crestHTML(league.info.tier, 40)}
        <span class="grow">
            <span class="eyebrow eyebrow--accent">${escapeHtml(meta.name)}</span>
            <span class="team__name" dir="auto">${escapeHtml(first.teamName)}</span>
        </span>
        <span class="num leader__rec">${first.wins}–${first.losses}</span>
    </a>`;
}

/**
 * Renderiza a aba Ligas.
 * @returns {string} HTML
 */
function renderLigas() {
    const leagues = sortLeagues(appState.leagues);
    const tier = resolveSeriesTier(leagues);
    if (!tier) {
        return stateHTML({ icon: 'trophy', title: 'Nada por aqui ainda', text: 'Nenhuma série desta temporada carregou.' });
    }
    appState.series = tier;

    const league = leagues.find(l => l.info.tier === tier);
    const meta = SERIES_META[tier];
    const finalized = isSeasonFinalized();
    const finalIdx = finalized ? getFinalStandingsIndex() : {};
    const seriesIdx = finalized ? finalIdx[league.info.name] : undefined;
    const teams = sortByFinalStandings(league.teams, seriesIdx);
    const z = zonesFor(tier);
    const n = teams.length;

    const tabs = leagues.map(l => {
        const m = SERIES_META[l.info.tier];
        const current = l.info.tier === tier;
        return `<a href="${hashFor('ligas', appState.season, l.info.tier)}" data-league="${m.league}"${current ? ' aria-current="page"' : ''}>
            ${crestHTML(l.info.tier, 28)}<span>${escapeHtml(m.short)}</span></a>`;
    }).join('');

    const rows = teams.map((t, i) =>
        buildStandingsRow(t, i, n, z, seriesIdx ? seriesIdx[t.ownerName] : null)).join('');

    const subtitle = finalized
        ? `${n} times · classificação final ${escapeHtml(appState.season)}`
        : `${n} times · ${escapeHtml(weekLabel() || 'Temporada em andamento')} · PPR`;

    const others = leagues.filter(l => l.info.tier !== tier)
        .map(l => buildLeaderLink(l, finalized, finalIdx)).join('');

    return `
        ${partialWarningHTML()}
        <nav class="series-tabs" aria-label="Séries">${tabs}</nav>
        <div class="grid-2">
            <section class="card" data-league="${meta.league}" aria-labelledby="series-title">
                <header class="card__hd">
                    ${crestHTML(tier, 56)}
                    <div>
                        <h2 class="display" id="series-title">${escapeHtml(meta.name)}</h2>
                        <p>${subtitle}</p>
                    </div>
                </header>
                <div class="table-wrap">
                    <table class="standings">
                        <caption class="sr-only">Classificação da ${escapeHtml(meta.name)}</caption>
                        <thead><tr>
                            <th scope="col">#</th>
                            <th scope="col">Time</th>
                            <th scope="col"><abbr title="Vitórias e derrotas">V–D</abbr></th>
                            <th scope="col"><abbr title="Pontos feitos">PF</abbr></th>
                            <th scope="col" class="hide-mobile"><abbr title="Pontos contra">PC</abbr></th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${buildZoneLegend(z, finalized)}
            </section>
            ${others ? `<aside class="leaders" aria-label="Outras séries">
                <div class="eyebrow">${finalized ? 'Campeões das outras séries' : 'Líderes das outras séries'}</div>
                ${others}
            </aside>` : ''}
        </div>`;
}

/**
 * Aviso de falha parcial ("Algumas ligas não carregaram · Série C").
 * @returns {string}
 */
function partialWarningHTML() {
    if (!appState.failedLeagues.length) return '';
    const names = appState.failedLeagues
        .map(tier => (SERIES_META[tier] ? SERIES_META[tier].short : tier))
        .map(escapeHtml).join(' e ');
    return `<div class="state-inline" role="status">
        <span data-icon="alert" data-size="18"></span>
        <span>Algumas ligas não carregaram · ${names}</span>
    </div>`;
}
