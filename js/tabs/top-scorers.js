// =============================================================================
// TAB / TOP SCORERS — Ranking global achatado: todos os times de todas as
// séries da temporada, ordenados por pontos. Top 3 ganha medalha quando a
// temporada está finalizada.
// Lê: appState.rosterData, appState.season, getFinalizedSeasons()
// Depende de: js/config.js, js/sanitize.js, js/icons.js, js/data.js
// =============================================================================

/**
 * Top-3 medal SVG quando temporada finalizada, null caso contrário.
 * @param {number} index 0-based
 * @param {boolean} isFinalized
 * @returns {string|null}
 */
function topScorersMedalFor(index, isFinalized) {
    if (!isFinalized) return null;
    if (index === 0) return IconRegistry.medalGold({ size: 18 });
    if (index === 1) return IconRegistry.medalSilver({ size: 18 });
    if (index === 2) return IconRegistry.medalBronze({ size: 18 });
    return null;
}

/**
 * Constrói uma linha do ranking global.
 * @param {object} t   Team registro (legacy rosterData shape)
 * @param {number} i   0-based
 * @param {boolean} isFinalized
 * @returns {string} HTML
 */
function buildGlobalRow(t, i, isFinalized) {
    const eliteClass = t.leagueTier === 'elite' ? 'is-elite' : '';
    const safeTeamName = escapeHtml(t.teamName);
    const safeLeagueName = escapeHtml(t.leagueName);
    const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

    const podiumClass = i === 0 ? 'top-1' : '';
    const medal = topScorersMedalFor(i, isFinalized);
    const rankCell = medal
        ? `<div role="cell" class="global-rank medal" aria-label="${i + 1}º lugar">${medal}</div>`
        : `<div role="cell" class="global-rank">${i + 1}</div>`;

    const ariaLabel = `${i + 1}º lugar: ${safeTeamName} da ${safeLeagueName} com ${safePts} pontos`;
    const delay = i * STAGGER_DELAY_MS;

    return `
        <div class="global-row ${podiumClass} stagger-item" role="row" aria-label="${ariaLabel}" style="animation-delay: ${delay}ms">
            ${rankCell}
            <div role="cell" class="global-team-name" title="${safeTeamName}">
                ${playerLinkHTML({ user: t.ownerName || t.teamId || '', displayName: safeTeamName })}
            </div>
            <div role="cell"><span class="global-league-tag ${eliteClass}">${safeLeagueName}</span></div>
            <div role="cell" class="global-pts">${safePts}</div>
        </div>
    `;
}

/**
 * Caption acima do card. Renderizada apenas para temporada finalizada — em
 * temporada ativa ainda não há tracking de semana ao vivo.
 * @param {boolean} isFinalized
 * @returns {string} HTML (pode ser vazio)
 */
function buildTopScorersCaption(isFinalized) {
    if (!isFinalized) return '';
    const icon = IconRegistry.trophy ? IconRegistry.trophy({ size: 14 }) : '';
    const text = 'Pontuação total — todos os times de todas as séries';
    return `<div class="global-caption" role="note">${icon}<span>${text}</span></div>`;
}

/**
 * Renderiza a tabela global de pontuação (tab Top Scorers).
 *
 * Layout:
 *   - Caption acima do card (trophy + texto, apenas finalizada).
 *   - Card com header `# / TIME / LIGA / PTS` e body rows ordenados por pts desc.
 *   - Finalizada → top 3 com medalhas SVG (gold/silver/bronze).
 *   - Ativa → rank numérico simples para todas as linhas.
 *   - #1 row recebe gradiente pódio.
 *   - ≤420px esconde a coluna "Liga".
 *
 * Cada nome de time é embrulhado em `.player-link[data-user]` para o drawer.
 */
function renderGlobalStandings() {
    const container = document.getElementById(DOM_IDS.GLOBAL);
    const allTeams = [...appState.rosterData].sort((a, b) => b.fpts - a.fpts);

    if (allTeams.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    const isFinalized = isSeasonFinalized(appState.season);
    const captionHtml = buildTopScorersCaption(isFinalized);
    const rowsHtml = allTeams.map((t, i) => buildGlobalRow(t, i, isFinalized)).join('');

    container.innerHTML = `
        ${captionHtml}
        <div class="top-scorers-card" role="table" aria-label="Ranking global de pontuação">
            <div class="global-header" role="row">
                <div role="columnheader">#</div>
                <div role="columnheader">Time</div>
                <div role="columnheader">Liga</div>
                <div role="columnheader" style="text-align:right">Pts</div>
            </div>
            ${rowsHtml}
        </div>
    `;
}
