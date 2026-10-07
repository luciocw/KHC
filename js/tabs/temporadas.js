// =============================================================================
// TAB / TEMPORADAS — Um card por ano, do mais recente ao mais antigo.
//
//   - Finalizada (data/<ano>.json): pódio top 4 por série, com medalha e
//     pontos rotulados ("2198.0 · pontos · 10–4").
//   - Em andamento: líderes (top 2) de cada série, se a temporada já foi
//     carregada nesta sessão (appState.leaguesBySeason); senão, só a lista.
//
// Depende de: config, sanitize, data, ui/helpers
// =============================================================================

/**
 * "Semana 4 de 14" para a temporada informada (estado da NFL na Sleeper).
 * Vazio se o estado não carregou, é de outra temporada ou fora de época.
 * @param {string|number} [year] default: appState.season
 * @returns {string}
 */
function weekLabel(year) {
    const state = appState.nflState;
    const y = String(year != null ? year : appState.season);
    if (!state || String(state.season) !== y || state.season_type !== 'regular') return '';
    const week = sanitizeNumber(state.display_week, 0, 30, 0);
    if (week < 1) return '';
    if (week > REGULAR_SEASON_WEEKS) return 'Playoffs';
    return `Semana ${week} de ${REGULAR_SEASON_WEEKS}`;
}

/**
 * Nomes das séries em sequência legível: "Série A e Série B".
 * @param {string[]} tiers
 * @returns {string}
 */
function seriesListLabel(tiers) {
    const names = tiers.map(t => (SERIES_META[t] ? SERIES_META[t].short : t));
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

/**
 * Cabeçalho de uma coluna de série.
 * @returns {string}
 */
function seasonColHead(tier, label) {
    const meta = SERIES_META[tier];
    return `<div class="season-col__hd" data-league="${meta.league}">
        ${crestHTML(tier, 32)}
        <b class="display text-accent">${escapeHtml(meta.short)}</b>
        <span class="spacer"></span>
        <small class="eyebrow">${label}</small>
    </div>`;
}

/**
 * Linha de pódio / líder.
 * @returns {string}
 */
function seasonRow({ user, team, badge, main, sub }) {
    const safeUser = escapeHtml(user);
    return `<button type="button" class="season-row" data-user="${safeUser}" aria-label="${safeUser}, ${escapeHtml(team)}. Abrir perfil">
        ${badge}
        <span class="grow">
            <b dir="auto">${safeUser}</b>
            <span class="team__name season-row__team" dir="auto">${escapeHtml(team)}</span>
        </span>
        <span class="season-row__val"><b>${main}</b><small>${sub}</small></span>
    </button>`;
}

/**
 * Card de temporada finalizada.
 * @param {Season} season
 * @returns {string}
 */
function renderFinalizedSeason(season) {
    const series = season.series.slice().sort((a, b) =>
        TIER_ORDER.indexOf(seriesIdToTier(a.id)) - TIER_ORDER.indexOf(seriesIdToTier(b.id)));
    const tiers = series.map(s => seriesIdToTier(s.id));

    const cols = series.map(s => {
        const top4 = s.teams.filter(t => t.rank >= 1 && t.rank <= 4).sort((a, b) => a.rank - b.rank);
        return `<div class="season-col">
            ${seasonColHead(seriesIdToTier(s.id), 'Pódio final')}
            ${top4.map(t => seasonRow({
                user: t.user, team: t.team,
                badge: medalHTML(t.rank),
                main: fmtPts(t.pts),
                sub: `pontos · ${t.w}–${t.l}`
            })).join('')}
        </div>`;
    }).join('');

    return `<article class="card season" aria-label="Temporada ${season.id}">
        <header class="season__hd">
            <span class="num season__year">${season.id}</span>
            <span class="chip chip--final">Finalizada</span>
            <span class="spacer"></span>
            <small class="season__meta">${escapeHtml(seriesListLabel(tiers))}</small>
        </header>
        <div class="season__cols">${cols}</div>
    </article>`;
}

/**
 * Card de temporada em andamento.
 * @param {string} year
 * @returns {string}
 */
function renderActiveSeason(year) {
    const cfg = KHC_CONFIG[year] || { leagues: [] };
    const loaded = appState.leaguesBySeason[year] || [];
    const tiers = cfg.leagues.map(l => l.tier)
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));

    const cols = tiers.map(tier => {
        const league = loaded.find(l => l.info.tier === tier);
        const leaders = league ? league.teams.slice(0, 2) : [];
        const body = leaders.length
            ? leaders.map((t, i) => seasonRow({
                user: t.ownerName, team: t.teamName,
                badge: `<span class="medal medal--plain">${i + 1}</span>`,
                main: `${t.wins}–${t.losses}`,
                sub: `${fmtPts(t.fpts)} pts`
            })).join('')
            : '<p class="season-col__empty">Em disputa</p>';
        return `<div class="season-col">${seasonColHead(tier, 'Líderes')}${body}</div>`;
    }).join('');

    const week = weekLabel(year);
    return `<article class="card season" aria-label="Temporada ${escapeHtml(year)} em andamento">
        <header class="season__hd">
            <span class="num season__year">${escapeHtml(year)}</span>
            <span class="chip chip--live">Em andamento</span>
            <span class="spacer"></span>
            <small class="season__meta">${escapeHtml(week || seriesListLabel(tiers))}</small>
        </header>
        <div class="season__cols">${cols}</div>
    </article>`;
}

/**
 * Renderiza a aba Temporadas.
 * @returns {string} HTML
 */
function renderSeasons() {
    const years = new Set(Object.keys(KHC_CONFIG));
    getFinalizedSeasons().forEach(s => years.add(String(s.id)));
    const sorted = Array.from(years).sort((a, b) => Number(b) - Number(a));
    if (!sorted.length) {
        return stateHTML({ icon: 'calendar', title: 'Nenhuma temporada registrada ainda.' });
    }
    return `<div class="seasons">${sorted.map(y => {
        const final = getFinalizedSeason(y);
        return final ? renderFinalizedSeason(final) : renderActiveSeason(y);
    }).join('')}</div>`;
}
