// =============================================================================
// TAB / TOP SCORERS — Ranking global achatado: todos os times de todas as
// séries da temporada, ordenados por pontos. Top 3 ganha medalha quando a
// temporada está finalizada.
// Lê: appState.rosterData, appState.season, getFinalizedSeasons()
// Depende de: js/config.js, js/sanitize.js, js/icons.js, js/data.js
// =============================================================================

/**
 * Renderiza a tabela global de pontuação (tab Top Scorers).
 *
 * Layout:
 *   - Caption acima do card (target/trophy + texto contextual).
 *   - Card com header `# / TIME / LIGA / PTS` e body rows ordenados por pts desc.
 *   - Finalizada → top 3 com medalhas SVG (gold/silver/bronze).
 *   - Ativa → rank numérico simples para todas as linhas.
 *   - #1 row recebe gradiente pódio.
 *   - ≤420px esconde a coluna "Liga".
 *
 * Cada nome de time é embrulhado em `.player-link[data-user]` para o drawer
 * de Phase 4 (handlers globais não são adicionados aqui).
 */
function renderGlobalStandings() {
    const container = document.getElementById(DOM_IDS.GLOBAL);
    const allTeams = [...appState.rosterData].sort((a, b) => b.fpts - a.fpts);

    if (allTeams.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    // Detecta se a temporada atual está finalizada (fonte: data.js)
    const isFinalized = isSeasonFinalized(appState.season);

    // Caption contextual — só renderiza pra finalizada (ativa não tem week
    // tracking ao vivo, então mostrar "parcial" é pouco informativo)
    const captionIcon = isFinalized
        ? (IconRegistry.trophy ? IconRegistry.trophy({ size: 14 }) : '')
        : '';
    const captionText = isFinalized
        ? 'Pontuação total — todos os times de todas as séries'
        : '';

    // Medal helper para top 3 em finalizadas
    const medalFor = (i) => {
        if (!isFinalized) return null;
        if (i === 0) return IconRegistry.medalGold({ size: 18 });
        if (i === 1) return IconRegistry.medalSilver({ size: 18 });
        if (i === 2) return IconRegistry.medalBronze({ size: 18 });
        return null;
    };

    let rowsHtml = '';
    allTeams.forEach((t, i) => {
        const isElite = t.leagueTier === 'elite';
        const eliteClass = isElite ? 'is-elite' : '';
        const safeTeamName = escapeHtml(t.teamName);
        const safeLeagueName = escapeHtml(t.leagueName);
        const safeUser = escapeHtml(t.ownerName || t.teamId || '');
        const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

        const podiumClass = i === 0 ? 'top-1' : '';
        const medal = medalFor(i);
        const rankCell = medal
            ? `<div role="cell" class="global-rank medal" aria-label="${i + 1}º lugar">${medal}</div>`
            : `<div role="cell" class="global-rank">${i + 1}</div>`;

        const ariaLabel = `${i + 1}º lugar: ${safeTeamName} da ${safeLeagueName} com ${safePts} pontos`;
        const delay = i * STAGGER_DELAY_MS;

        rowsHtml += `
            <div class="global-row ${podiumClass} stagger-item" role="row" aria-label="${ariaLabel}" style="animation-delay: ${delay}ms">
                ${rankCell}
                <div role="cell" class="global-team-name" title="${safeTeamName}">
                    ${playerLinkHTML({ user: t.ownerName || t.teamId || '', displayName: safeTeamName })}
                </div>
                <div role="cell"><span class="global-league-tag ${eliteClass}">${safeLeagueName}</span></div>
                <div role="cell" class="global-pts">${safePts}</div>
            </div>
        `;
    });

    const captionHtml = captionText
        ? `<div class="global-caption" role="note">${captionIcon}<span>${captionText}</span></div>`
        : '';

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
