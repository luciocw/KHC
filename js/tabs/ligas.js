// =============================================================================
// TAB / LIGAS — Renderiza um card por liga com standings dos times.
// É a aba default. Os outros tabs leem de appState.rosterData, que esta aba
// indiretamente alimenta via loadData (em js/app.js).
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

function renderLeagueCard(leagueData, container, staggerIndex = 0) {
    const card = document.createElement('article');
    const safeTier = sanitizeTier(leagueData.info.tier);
    const safeLeagueName = escapeHtml(leagueData.info.name);

    card.className = `league-card ${safeTier} stagger-item`;
    card.style.animationDelay = `${staggerIndex * STAGGER_DELAY_MS}ms`;
    card.setAttribute('aria-label', `Classificação da ${safeLeagueName}`);

    let rowsHtml = '';
    leagueData.teams.forEach((t, index) => {
        const avatarUrl = sanitizeAvatarUrl(t.avatar);
        const safeTeamName = escapeHtml(t.teamName);
        const safeOwnerName = escapeHtml(t.ownerName);
        const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
        const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);
        const safeRecord = `${wins}-${losses}`;
        const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);

        // ARIA label descritivo para leitores de tela
        const ariaLabel = `${index + 1}º lugar: ${safeTeamName}, dono ${safeOwnerName}, ${wins} vitórias e ${losses} derrotas, ${safePts} pontos`;

        rowsHtml += `
            <div class="team-row" role="listitem" aria-label="${ariaLabel}">
                <div class="rank-num" aria-hidden="true">${index + 1}</div>
                <img src="${avatarUrl}" class="team-avatar" alt="" loading="lazy" aria-hidden="true" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                <div class="team-info">
                    <div class="team-name">${safeTeamName}</div>
                    <div class="team-owner">${safeOwnerName}</div>
                </div>
                <div class="team-record" aria-label="${wins} vitórias, ${losses} derrotas">${safeRecord}</div>
                <div class="team-fpts" aria-label="${safePts} pontos">${safePts}</div>
            </div>
        `;
    });

    const teamCount = sanitizeNumber(leagueData.teams.length, 0, 100);

    card.innerHTML = `
        <div class="league-header">
            <h3 class="league-title">
                <span class="pulse-dot" aria-hidden="true"></span>
                ${safeLeagueName}
            </h3>
            <div class="league-badge" aria-label="${teamCount} times na liga">${teamCount} Times</div>
        </div>
        <div class="standings-list" role="list" aria-label="Classificação dos times">
            ${rowsHtml}
        </div>
    `;
    container.appendChild(card);
}
