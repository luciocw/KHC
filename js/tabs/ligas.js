// =============================================================================
// TAB / LIGAS — Renderiza um card por liga com standings dos times.
// É a aba default. Os outros tabs leem de appState.rosterData, que esta aba
// indiretamente alimenta via loadData (em js/app.js).
// Depende de: js/config.js, js/sanitize.js, js/icons.js, js/data.js
// =============================================================================

/**
 * Verifica se a temporada selecionada (appState.season) é finalizada.
 * @returns {boolean}
 */
function isSeasonFinalized() {
    try {
        const finals = (typeof getFinalizedSeasons === 'function' ? getFinalizedSeasons() : []) || [];
        return finals.some(s => String(s.id) === String(appState.season));
    } catch (e) {
        return false;
    }
}

/**
 * Procura o trophy (gold/silver/bronze/fourth) de um time em temporadas
 * finalizadas. Casa por nome da série (seriesName) e nome do time (teamName).
 * @param {string} seriesName
 * @param {string} teamName
 * @returns {string|null} 'gold'|'silver'|'bronze'|'fourth'|null
 */
function findTeamTrophy(seriesName, teamName) {
    try {
        const finals = (typeof getFinalizedSeasons === 'function' ? getFinalizedSeasons() : []) || [];
        const season = finals.find(s => String(s.id) === String(appState.season));
        if (!season) return null;
        const series = (season.series || []).find(srs => srs.name === seriesName);
        if (!series) return null;
        const team = (series.teams || []).find(t => t.team === teamName);
        return (team && team.trophy) ? team.trophy : null;
    } catch (e) {
        return null;
    }
}

/**
 * Mapeia trophy id → SVG do IconRegistry.
 * @param {string} trophy
 * @returns {string} SVG string
 */
function trophyToMedalSvg(trophy) {
    if (!window.IconRegistry) return '';
    switch (trophy) {
        case 'gold':   return IconRegistry.medalGold({ size: 20 });
        case 'silver': return IconRegistry.medalSilver({ size: 20 });
        case 'bronze': return IconRegistry.medalBronze({ size: 20 });
        case 'fourth': return IconRegistry.medalFourth({ size: 20 });
        default: return '';
    }
}

/**
 * Renderiza a caption (status da temporada) acima dos cards, dentro do
 * container. Só roda uma vez: se já existir, retorna early.
 * @param {HTMLElement} container
 */
function renderLigasCaption(container) {
    if (container.querySelector('.ligas-caption')) return;
    // Só renderiza caption pra temporada finalizada — pra ativa, o dropdown
    // já comunica o ano e adicionar mensagem só polui sem informação real
    // até termos tracking de semana ao vivo.
    if (!isSeasonFinalized()) return;

    const safeYear = escapeHtml(String(appState.season));
    const iconSvg = window.IconRegistry ? IconRegistry.trophy({ size: 14 }) : '';

    const caption = document.createElement('div');
    caption.className = 'ligas-caption';
    caption.setAttribute('role', 'status');
    caption.innerHTML = `
        <span class="ligas-caption-icon" aria-hidden="true">${iconSvg}</span>
        <span class="ligas-caption-text">${escapeHtml('Classificação final da temporada ' + safeYear)}</span>
    `;
    // Insere antes de qualquer card já presente
    container.insertBefore(caption, container.firstChild);
}

/**
 * Renderiza um card de standings para uma liga (uma série da temporada).
 * Cada chamada anexa um <article.league-card> ao container.
 *
 * @param {{ info: {name: string, tier: string, id: string}, teams: Array }} leagueData
 * @param {HTMLElement} container - #leaguesContainer (.leagues-grid)
 * @param {number} [staggerIndex=0] - usado para calcular animation-delay
 */
function renderLeagueCard(leagueData, container, staggerIndex = 0) {
    // Garante caption na primeira chamada
    renderLigasCaption(container);

    const card = document.createElement('article');
    const safeTier = sanitizeTier(leagueData.info.tier);
    const safeLeagueName = escapeHtml(leagueData.info.name);
    const finalized = isSeasonFinalized();

    card.className = `league-card ${safeTier} stagger-item`;
    card.style.animationDelay = `${staggerIndex * STAGGER_DELAY_MS}ms`;
    card.setAttribute('aria-label', `Classificação da ${safeLeagueName}`);

    // --- Rows ---
    let rowsHtml = '';
    leagueData.teams.forEach((t, index) => {
        const avatarUrl = sanitizeAvatarUrl(t.avatar);
        const safeTeamName = escapeHtml(t.teamName);
        const safeOwnerName = escapeHtml(t.ownerName);
        const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
        const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);
        const ptsNum = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS);
        const safePts = ptsNum.toFixed(1);
        const rankNum = index + 1;

        // Medalha apenas se temporada finalizada E houver trophy registrado.
        const trophy = finalized ? findTeamTrophy(leagueData.info.name, t.teamName) : null;
        const rankCell = trophy
            ? `<div class="rank-medal" aria-hidden="true">${trophyToMedalSvg(trophy)}</div>`
            : `<div class="rank-num" aria-hidden="true">${rankNum}</div>`;

        // ARIA label completo
        const ariaLabel = `${rankNum}º lugar: ${safeTeamName}, dono ${safeOwnerName}, ${wins} vitórias e ${losses} derrotas, ${safePts} pontos`;

        rowsHtml += `
            <div class="team-row" role="listitem" aria-label="${ariaLabel}">
                ${rankCell}
                <img src="${avatarUrl}" class="team-avatar" alt="" loading="lazy" aria-hidden="true" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                <div class="team-info">
                    <div class="team-name-row">
                        <span class="player-link team-name" data-user="${safeOwnerName}" tabindex="0" role="button" aria-label="Ver perfil de ${safeOwnerName}">${safeTeamName}</span>
                    </div>
                    <div class="team-owner">${safeOwnerName}</div>
                </div>
                <div class="team-record" aria-label="${wins} vitórias, ${losses} derrotas"><span class="w">${wins}</span><span class="dash">–</span><span class="l">${losses}</span></div>
                <div class="form-chips-placeholder" aria-hidden="true"></div>
                <div class="team-fpts" aria-label="${safePts} pontos">${safePts}</div>
            </div>
        `;
    });

    const teamCount = sanitizeNumber(leagueData.teams.length, 0, 100);
    const dotClass = finalized ? 'dot dim' : 'dot active';
    const dotAriaLabel = finalized ? 'Temporada finalizada' : 'Temporada em andamento';

    card.innerHTML = `
        <div class="league-header">
            <span class="${dotClass}" role="img" aria-label="${dotAriaLabel}"></span>
            <h3 class="league-title">${safeLeagueName}</h3>
            <div class="league-badge" aria-label="${teamCount} times na liga">${teamCount} Times</div>
        </div>
        <div class="standings-list" role="list" aria-label="Classificação dos times">
            ${rowsHtml}
        </div>
    `;
    container.appendChild(card);
}
