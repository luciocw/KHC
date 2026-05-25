// =============================================================================
// TAB / TOP SCORERS — Ranking global achatado: todos os times de todas as
// séries da temporada, ordenados por pontos. Top 3 ganha medalha.
// Lê: appState.rosterData (populado por loadData em js/app.js)
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

function renderGlobalStandings() {
    const container = document.getElementById(DOM_IDS.GLOBAL);
    const allTeams = [...appState.rosterData].sort((a, b) => b.fpts - a.fpts);

    if (allTeams.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    let html = '';
    allTeams.forEach((t, i) => {
        const isElite = t.leagueTier === 'elite' ? 'is-elite' : '';
        const safeTeamName = escapeHtml(t.teamName);
        const safeLeagueName = escapeHtml(t.leagueName);
        const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

        // Classes e display para top 3
        let topClass = '';
        let rankDisplay = i + 1;
        if (i === 0) {
            topClass = 'top-1';
            rankDisplay = '🥇';
        } else if (i === 1) {
            topClass = 'top-2';
            rankDisplay = '🥈';
        } else if (i === 2) {
            topClass = 'top-3';
            rankDisplay = '🥉';
        }

        // ARIA label descritivo
        const ariaLabel = `${i + 1}º lugar: ${safeTeamName} da ${safeLeagueName} com ${safePts} pontos`;

        html += `
            <div class="global-row ${isElite} ${topClass} stagger-item" role="row" aria-label="${ariaLabel}" style="animation-delay: ${i * 30}ms">
                <div role="cell" class="global-rank">${rankDisplay}</div>
                <div role="cell" class="team-name" title="${safeTeamName}">${safeTeamName}</div>
                <div role="cell"><span class="global-league-tag">${safeLeagueName}</span></div>
                <div role="cell" style="text-align:right; font-weight:700">${safePts}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}
