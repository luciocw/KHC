// =============================================================================
// TAB / LIGAS — Renderiza um card por liga com standings dos times.
// É a aba default. Os outros tabs leem de appState.rosterData, que esta aba
// indiretamente alimenta via loadData (em js/app.js).
// Depende de: js/config.js, js/sanitize.js, js/icons.js, js/data.js
// =============================================================================

// isSeasonFinalized() agora vive em data.js (fonte única).

// -----------------------------------------------------------------------------
// Trophy index — memoizado por temporada
// -----------------------------------------------------------------------------
//
// Antes: findTeamTrophy() fazia 3 .find() lineares por chamada, chamado dentro
// do forEach de times. Para 4 séries × 12 times = 48 chamadas, ~144 buscas
// lineares por render. Agora indexamos uma vez ({seriesName → {teamName → trophy}})
// e o lookup vira O(1). Cache invalida quando appState.season muda.
// -----------------------------------------------------------------------------

let _trophyIndexCache = null;
let _trophyIndexCacheSeason = null;

/**
 * Retorna `{ seriesName: { teamName: trophy } }` para a temporada atual.
 * Vazio se temporada não finalizada ou ausente do snapshot.
 * @returns {Object<string, Object<string, string>>}
 */
function getTrophyIndex() {
    const currentSeason = appState.season;
    if (_trophyIndexCacheSeason === currentSeason && _trophyIndexCache) {
        return _trophyIndexCache;
    }
    const idx = {};
    try {
        const finals = (typeof getFinalizedSeasons === 'function' ? getFinalizedSeasons() : []) || [];
        const season = finals.find(s => String(s.id) === String(currentSeason));
        if (season && Array.isArray(season.series)) {
            season.series.forEach(srs => {
                idx[srs.name] = {};
                (srs.teams || []).forEach(t => {
                    if (t.trophy) idx[srs.name][t.team] = t.trophy;
                });
            });
        }
    } catch (e) {
        // mantém idx vazio
    }
    _trophyIndexCache = idx;
    _trophyIndexCacheSeason = currentSeason;
    return idx;
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

// -----------------------------------------------------------------------------
// Builders de pedaços do card — pequenos, testáveis, retornam string HTML
// -----------------------------------------------------------------------------

/**
 * Constrói o cell do rank: medalha SVG se houver trophy, número caso contrário.
 * @param {string|null} trophy
 * @param {number} rankNum
 * @returns {string}
 */
function buildRankCell(trophy, rankNum) {
    if (trophy) {
        return `<div class="rank-medal" aria-hidden="true">${trophyToMedalSvg(trophy)}</div>`;
    }
    return `<div class="rank-num" aria-hidden="true">${rankNum}</div>`;
}

/**
 * Constrói uma linha (.team-row) de standings.
 * @param {object} t Team registro do rosterData (legacy shape)
 * @param {number} index 0-based
 * @param {{ trophyForTeam: function(string): string|null, leagueName: string }} ctx
 * @returns {string} HTML
 */
function buildTeamRow(t, index, ctx) {
    const avatarUrl = sanitizeAvatarUrl(t.avatar);
    const safeTeamName = escapeHtml(t.teamName);
    const safeOwnerName = escapeHtml(t.ownerName);
    const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
    const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);
    const safePts = sanitizeNumber(t.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);
    const rankNum = index + 1;

    const trophy = ctx.trophyForTeam(t.teamName);
    const rankCell = buildRankCell(trophy, rankNum);
    const ariaLabel = `${rankNum}º lugar: ${safeTeamName}, dono ${safeOwnerName}, ${wins} vitórias e ${losses} derrotas, ${safePts} pontos`;

    return `
        <div class="team-row" role="listitem" aria-label="${ariaLabel}">
            ${rankCell}
            <img src="${avatarUrl}" class="team-avatar" alt="" loading="lazy" aria-hidden="true" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
            <div class="team-info">
                <div class="team-name-row">
                    ${playerLinkHTML({ user: t.ownerName, displayName: safeTeamName, ariaLabel: `Ver perfil de ${safeOwnerName}`, extraClass: 'team-name' })}
                </div>
                <div class="team-owner">${safeOwnerName}</div>
            </div>
            <div class="team-record" aria-label="${wins} vitórias, ${losses} derrotas"><span class="w">${wins}</span><span class="dash">–</span><span class="l">${losses}</span></div>
            <div class="form-chips-placeholder" aria-hidden="true"></div>
            <div class="team-fpts" aria-label="${safePts} pontos">${safePts}</div>
        </div>
    `;
}

/**
 * Header do card (dot de status + título + badge de contagem).
 * @param {string} leagueName  já escapado
 * @param {number} teamCount   sanitizado
 * @param {boolean} finalized
 * @returns {string} HTML
 */
function buildLeagueHeader(leagueName, teamCount, finalized) {
    const dotClass = finalized ? 'dot dim' : 'dot active';
    const dotAriaLabel = finalized ? 'Temporada finalizada' : 'Temporada em andamento';
    return `
        <div class="league-header">
            <span class="${dotClass}" role="img" aria-label="${dotAriaLabel}"></span>
            <h3 class="league-title">${leagueName}</h3>
            <div class="league-badge" aria-label="${teamCount} times na liga">${teamCount} Times</div>
        </div>
    `;
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
    renderLigasCaption(container);

    const safeTier = sanitizeTier(leagueData.info.tier);
    const safeLeagueName = escapeHtml(leagueData.info.name);
    const finalized = isSeasonFinalized();
    const teamCount = sanitizeNumber(leagueData.teams.length, 0, 100);

    // Closure de lookup O(1) para trophy, com early-exit se temporada ativa
    const trophyIdx = finalized ? getTrophyIndex() : null;
    const trophyForTeam = (teamName) => {
        if (!trophyIdx) return null;
        const seriesIdx = trophyIdx[leagueData.info.name];
        return seriesIdx ? (seriesIdx[teamName] || null) : null;
    };

    const rowsHtml = leagueData.teams
        .map((t, i) => buildTeamRow(t, i, { trophyForTeam, leagueName: leagueData.info.name }))
        .join('');

    const card = document.createElement('article');
    card.className = `league-card ${safeTier} stagger-item`;
    card.style.animationDelay = `${staggerIndex * STAGGER_DELAY_MS}ms`;
    card.setAttribute('aria-label', `Classificação da ${safeLeagueName}`);
    card.innerHTML = `
        ${buildLeagueHeader(safeLeagueName, teamCount, finalized)}
        <div class="standings-list" role="list" aria-label="Classificação dos times">
            ${rowsHtml}
        </div>
    `;
    container.appendChild(card);
}
