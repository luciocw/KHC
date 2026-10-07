// =============================================================================
// TAB / TOP SCORERS — Todos os times da temporada ordenados por pontos.
//
//   - Filtro por série (chips) + "Incluir Elite" desligado por padrão: quem
//     joga a Elite também está numa série regular, então ligar a Elite
//     duplica o time (com outra pontuação).
//   - Linha: posição | avatar | time + pill da série + dono · V–D | pontos.
//   - Sem animação em cascata.
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
 * Renderiza a aba Top Scorers.
 * @returns {string} HTML
 */
function renderTopScorers() {
    const tiers = TIER_ORDER.filter(tier =>
        appState.rosterData.some(t => t.leagueTier === tier) &&
        (appState.includeElite || tier !== 'elite'));
    const hasElite = appState.rosterData.some(t => t.leagueTier === 'elite');

    if (!tiers.includes(appState.topFilter)) appState.topFilter = 'all';

    const list = appState.rosterData
        .filter(t => appState.includeElite || t.leagueTier !== 'elite')
        .filter(t => appState.topFilter === 'all' || t.leagueTier === appState.topFilter)
        .slice()
        .sort((a, b) => b.fpts - a.fpts);

    const chips = [['all', 'Todas'], ...tiers.map(t => [t, SERIES_META[t].short])]
        .map(([k, label]) => `<button type="button" data-top-filter="${k}" aria-pressed="${appState.topFilter === k}">${escapeHtml(label)}</button>`)
        .join('');

    const toggle = hasElite
        ? `<label class="toggle"><input type="checkbox" id="incElite"${appState.includeElite ? ' checked' : ''}> Incluir Elite</label>`
        : '';

    const body = list.length
        ? `<div class="card">${list.map(buildTopRow).join('')}</div>`
        : stateHTML({ icon: 'chart', title: 'Nada por aqui ainda' });

    return `
        ${partialWarningHTML()}
        <div class="chips" role="group" aria-label="Filtrar por série">${chips}<span class="spacer"></span>${toggle}</div>
        ${body}`;
}
