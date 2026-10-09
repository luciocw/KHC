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
//   - Botão Exportar: a tabela vira PNG (js/ui/export.js).
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
 *
 * Critérios diferentes (regra da liga):
 *   - rebaixamento: classificação da temporada regular → dá para marcar
 *     os últimos já durante a temporada;
 *   - promoção: campeão, vice e 3º DOS PLAYOFFS → só é marcada na
 *     temporada finalizada (a ordem final já vem dos playoffs). Durante a
 *     temporada não há "zona de acesso": qualquer time dos playoffs pode subir.
 *
 * @param {string} tier
 * @param {boolean} finalized
 * @returns {{up: number, promote: number, down: number, playoff: number, isElite: boolean}}
 *          up: linhas marcadas como acesso · promote: quantos sobem pela regra
 */
function zonesFor(tier, finalized) {
    const cfg = KHC_CONFIG[appState.season] || {};
    const rules = cfg.rules || { promote: 0, relegate: 0, playoffTeams: 6, elitePlayoffTeams: 4 };
    if (tier === 'elite') {
        return { up: 0, promote: 0, down: 0, playoff: rules.elitePlayoffTeams, isElite: true };
    }
    const regular = (cfg.leagues || [])
        .map(l => l.tier)
        .filter(t => t !== 'elite')
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
    const isTop = regular[0] === tier;
    const isLowest = regular[regular.length - 1] === tier;
    const promote = isTop ? 0 : rules.promote;
    return {
        up: finalized ? promote : 0,
        promote,
        down: isLowest ? 0 : rules.relegate,
        playoff: rules.playoffTeams,
        isElite: false
    };
}

/**
 * Zona e linha de corte da posição i (0-based) numa série de n times.
 * Compartilhado pela tabela e pela exportação em imagem.
 * @returns {{zone: (''|'promo'|'playoff'|'releg'), cut: (''|'promo'|'playoff'|'releg')}}
 */
function zoneOf(i, n, z) {
    let zone = '';
    if (i < z.up) zone = 'promo';
    else if (z.down && i >= n - z.down) zone = 'releg';
    else if (i < z.playoff) zone = 'playoff';

    let cut = '';
    if (z.up && i === z.up - 1) cut = 'promo';
    else if (z.down && i === n - z.down - 1) cut = 'releg';
    else if (i === z.playoff - 1 && z.playoff < n) cut = 'playoff';
    return { zone, cut };
}

/**
 * Linha da tabela de classificação.
 * @returns {string}
 */
function buildStandingsRow(t, i, n, z, finalEntry) {
    const pos = i + 1;
    const { zone, cut } = zoneOf(i, n, z);
    const trophy = finalEntry && finalEntry.trophy;
    const posCell = trophy ? medalHTML(pos) : `<span class="pos">${pos}</span>`;
    const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
    const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);

    return `<tr class="${zone ? 'z-' + zone : ''} ${cut ? 'cut-' + cut : ''}">
        <td>${posCell}</td>
        <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
        <td class="rec">${wins}–${losses}</td>
        <td>${fmtPts(t.fpts)}</td>
        <td class="hide-mobile">${fmtPts(t.fptsAgainst)}</td>
    </tr>`;
}

/**
 * "campeão, vice e 3º" para N promovidos pelos playoffs.
 * @param {number} n
 * @returns {string}
 */
function promotedLabel(n) {
    const names = ['campeão', 'vice', '3º', '4º'].slice(0, n);
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

/**
 * Itens da legenda das zonas (texto puro). Compartilhado pela tabela e pela
 * exportação em imagem.
 * @returns {Array<{mark: (''|'medal'|'promo'|'playoff'|'releg'), text: string}>}
 */
function zoneLegendItems(z, finalized) {
    const items = [];
    if (finalized) items.push({ mark: 'medal', text: 'Top 4 pelos playoffs' });
    if (z.up) items.push({ mark: 'promo', text: `Subiram · ${z.up}` });
    const sobem = !finalized && z.promote ? ` · ${promotedLabel(z.promote)} sobem` : '';
    items.push({ mark: 'playoff', text: `Playoffs · top ${z.playoff}${sobem}` });
    if (z.down) items.push({ mark: 'releg', text: `${finalized ? 'Caíram' : 'Rebaixamento'} · ${z.down}` });
    if (z.isElite) items.push({ mark: '', text: 'Liga paralela: não rebaixa' });
    return items;
}

/**
 * Legenda das zonas.
 * @returns {string}
 */
function buildZoneLegend(z, finalized) {
    const items = zoneLegendItems(z, finalized).map(it => {
        let mark = '';
        if (it.mark === 'medal') mark = '<i class="legend__medal"></i>';
        else if (it.mark) mark = `<i style="background:var(--zone-${it.mark})"></i>`;
        return `<span>${mark}${escapeHtml(it.text)}</span>`;
    });
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
 * Dados da classificação de uma série na temporada selecionada (ordem,
 * zonas, subtítulo). Usado pela aba e pela exportação em imagem.
 * @param {Object} league  item de appState.leagues
 * @returns {{tier: string, meta: Object, teams: Array, z: Object, finalized: boolean,
 *            seriesIdx: (Object|undefined), subtitle: string}}
 */
function standingsModel(league) {
    const tier = league.info.tier;
    const finalized = isSeasonFinalized();
    const seriesIdx = finalized ? getFinalStandingsIndex()[league.info.name] : undefined;
    const teams = sortByFinalStandings(league.teams, seriesIdx);
    const subtitle = finalized
        ? `${teams.length} times · classificação final ${appState.season}`
        : `${teams.length} times · ${weekLabel() || 'Temporada em andamento'} · PPR`;
    return { tier, meta: SERIES_META[tier], teams, z: zonesFor(tier, finalized), finalized, seriesIdx, subtitle };
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
    const { meta, teams, z, finalized, seriesIdx, subtitle } = standingsModel(league);
    const finalIdx = finalized ? getFinalStandingsIndex() : {};
    const n = teams.length;

    const tabs = leagues.map(l => {
        const m = SERIES_META[l.info.tier];
        const current = l.info.tier === tier;
        return `<a href="${hashFor('ligas', appState.season, l.info.tier)}" data-league="${m.league}"${current ? ' aria-current="page"' : ''}>
            ${crestHTML(l.info.tier, 28)}<span>${escapeHtml(m.short)}</span></a>`;
    }).join('');

    const rows = teams.map((t, i) =>
        buildStandingsRow(t, i, n, z, seriesIdx ? seriesIdx[t.ownerName] : null)).join('');

    const others = leagues.filter(l => l.info.tier !== tier)
        .map(l => buildLeaderLink(l, finalized, finalIdx)).join('');

    return `
        ${partialWarningHTML()}
        <nav class="series-tabs" aria-label="Séries">${tabs}</nav>
        <div class="grid-2">
            <section class="card" data-league="${meta.league}" aria-labelledby="series-title">
                <header class="card__hd">
                    ${crestHTML(tier, 56)}
                    <div class="grow">
                        <h2 class="display" id="series-title">${escapeHtml(meta.name)}</h2>
                        <p>${escapeHtml(subtitle)}</p>
                    </div>
                    <button type="button" class="export-btn" data-action="export-standings" aria-label="Exportar tabela da ${escapeHtml(meta.name)} como imagem">
                        <span data-icon="download" data-size="18"></span><span class="export-btn__label">Exportar</span>
                    </button>
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
