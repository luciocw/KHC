// =============================================================================
// TAB / TOP SCORERS — Todos os times da temporada ordenados por pontos.
//
//   - Filtro por série (chips) + "Incluir Elite" desligado por padrão: quem
//     joga a Elite também está numa série regular, então ligar a Elite
//     duplica o time (com outra pontuação).
//   - Linha: posição | avatar | time + pill da série + dono · V–D | pontos.
//   - Sem animação em cascata.
//   - Botões Baixar / Compartilhar: a lista filtrada vira PNG (ui/export.js).
//
// Lê: appState.rosterData, appState.topFilter, appState.includeElite
// Depende de: config, sanitize, ui/helpers
// =============================================================================

/**
 * Linha do ranking (botão que abre o perfil do dono).
 * @returns {string}
 */
function buildTopRow(t, i) {
    const safeUser = escapeHtml(t.ownerName);
    const safeTeam = escapeHtml(t.teamName);
    return `<button type="button" class="list-row" data-user="${safeUser}" aria-label="${i + 1}º: ${safeTeam}, de ${safeUser}, ${fmtPts(t.fpts)} pontos. Abrir perfil">
        <span class="pos list-row__pos">${i + 1}</span>
        ${avatarHTML({ avatarId: t.avatar, name: t.teamName })}
        <span class="grow">
            <span class="team__name" dir="auto">${safeTeam}</span>
            <span class="meta">${seriesPillHTML(t.leagueTier)}<span dir="auto">${safeUser}</span> · ${t.wins}–${t.losses}</span>
        </span>
        <span class="num list-row__num">${fmtPts(t.fpts)}</span>
    </button>`;
}

/**
 * Lista da aba com o filtro atual (usada pela aba e pela exportação).
 * @returns {{list: Array, tiers: Array<string>, hasElite: boolean, title: string, subtitle: string}}
 */
function topScorersModel() {
    const tiers = TIER_ORDER.filter(tier =>
        !isGuillotine(tier) &&
        appState.rosterData.some(t => t.leagueTier === tier) &&
        (appState.includeElite || tier !== 'elite'));
    const hasElite = appState.rosterData.some(t => t.leagueTier === 'elite');

    if (!tiers.includes(appState.topFilter)) appState.topFilter = 'all';

    const list = appState.rosterData
        .filter(t => !isGuillotine(t.leagueTier))
        .filter(t => appState.includeElite || t.leagueTier !== 'elite')
        .filter(t => appState.topFilter === 'all' || t.leagueTier === appState.topFilter)
        .slice()
        .sort((a, b) => b.fpts - a.fpts);

    const series = appState.topFilter === 'all' ? null : SERIES_META[appState.topFilter];
    const when = isSeasonFinalized() ? `temporada ${appState.season}` : (weekLabel() || `temporada ${appState.season}`);
    const scope = series ? series.name : appState.includeElite ? 'Todas as séries, com Elite' : 'Todas as séries';
    return {
        list, tiers, hasElite,
        title: 'Top Scorers',
        subtitle: `${scope} · ${list.length} times · ${when}`
    };
}

/**
 * Renderiza a aba Top Scorers.
 * @returns {string} HTML
 */
function renderTopScorers() {
    const { list, tiers, hasElite } = topScorersModel();

    const chips = [['all', 'Todas'], ...tiers.map(t => [t, SERIES_META[t].short])]
        .map(([k, label]) => `<button type="button" data-top-filter="${k}" aria-pressed="${appState.topFilter === k}">${escapeHtml(label)}</button>`)
        .join('');

    const toggle = hasElite
        ? `<label class="toggle"><input type="checkbox" id="incElite"${appState.includeElite ? ' checked' : ''}> Incluir Elite</label>`
        : '';

    const body = list.length
        ? `<div class="card">${list.map(buildTopRow).join('')}</div>`
        : stateHTML({ icon: 'chart', title: 'Nada por aqui ainda' });

    const actions = list.length ? `<div class="export-actions" role="group" aria-label="Exportar Top Scorers como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar Top Scorers como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar Top Scorers como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>` : '';

    return `
        ${partialWarningHTML()}
        <div class="chips" role="group" aria-label="Filtrar por série">${chips}<span class="spacer"></span>${toggle}${actions}</div>
        ${body}`;
}
