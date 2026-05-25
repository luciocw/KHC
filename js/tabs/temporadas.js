// =============================================================================
// TAB / TEMPORADAS — Histórico ano-a-ano, do mais recente ao mais antigo.
//
// FASE 3.E: Port visual completo.
// - Lê de getFinalizedSeasons() (data layer) para temporadas finalizadas.
// - Temporadas não finalizadas (ex: 2026 em andamento) usam KHC_CONFIG[year]
//   como fonte mínima (apenas nomes das séries; sem rosters ainda).
// - Movimentação cards FORAM DROPADOS por decisão do usuário; não renderizamos.
//
// Renderiza em #seasonsContainer (DOM_IDS.SEASONS).
//
// Depende de: js/config.js, js/sanitize.js, js/icons.js, js/data.js
// =============================================================================

/**
 * Mapeia rank top-4 para ícone de medalha + label semântico.
 * @param {number} rank
 * @returns {{icon: string, label: string} | null}
 */
function _medalFor(rank) {
    const size = 20;
    switch (rank) {
        case 1: return { icon: IconRegistry.medalGold({ size }),   label: 'Campeão' };
        case 2: return { icon: IconRegistry.medalSilver({ size }), label: 'Vice' };
        case 3: return { icon: IconRegistry.medalBronze({ size }), label: '3º Lugar' };
        case 4: return { icon: IconRegistry.medalFourth({ size }), label: '4º Lugar' };
        default: return null;
    }
}

/**
 * HTML de uma coluna de podium (uma série finalizada com top 4).
 * @param {{id: string, name: string, teams: Array<{rank:number,user:string,team:string,pts:number}>}} serie
 * @returns {string}
 */
function _renderPodiumColumn(serie) {
    const safeName = escapeHtml(sanitizeString(serie.name, VALIDATION.MAX_LEAGUE_NAME_LENGTH, 'Série'));
    // Pega top 4 já ordenados por rank
    const top4 = (serie.teams || [])
        .filter(t => t.rank >= 1 && t.rank <= 4)
        .sort((a, b) => a.rank - b.rank);

    let rows = '';
    top4.forEach(team => {
        const medal = _medalFor(team.rank);
        if (!medal) return;
        const safeUser = escapeHtml(sanitizeString(team.user, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Jogador'));
        const safeTeam = escapeHtml(sanitizeString(team.team, VALIDATION.MAX_TEAM_NAME_LENGTH, 'Time'));
        const safePts  = (typeof team.pts === 'number') ? team.pts.toFixed(1) : '—';
        const ariaLabel = `${medal.label}: ${safeUser}, ${safeTeam}, ${safePts} pontos`;

        rows += `
            <div class="podium-row" role="listitem" aria-label="${ariaLabel}">
                <span class="podium-icon" aria-hidden="true">${medal.icon}</span>
                <span class="podium-name">
                    ${playerLinkHTML({ user: safeUser, displayName: safeUser, ariaLabel: `Ver perfil de ${safeUser}` })}
                    <span class="podium-team">${safeTeam}</span>
                </span>
                <span class="podium-pts">${safePts}</span>
            </div>
        `;
    });

    return `
        <div class="podium-col" role="list" aria-label="Top 4 de ${safeName}">
            <div class="podium-col-title">${safeName}</div>
            ${rows || '<div class="podium-row podium-empty">Sem dados</div>'}
        </div>
    `;
}

/**
 * HTML de uma season card finalizada (com podiums).
 * @param {{id:number, status:string, series: Array<{id:string,name:string,teams:Array}>}} season
 * @param {number} cardIndex
 * @returns {string}
 */
function _renderFinalizedSeason(season, cardIndex) {
    const safeYear = escapeHtml(String(season.id));
    const cols = (season.series || []).map(_renderPodiumColumn).join('');

    return `
        <article class="season-card stagger-item" style="animation-delay: ${cardIndex * STAGGER_DELAY_MS}ms" aria-label="Temporada ${safeYear} finalizada">
            <header class="season-card-hd">
                <span class="season-year">${safeYear}</span>
                <span class="season-meta">
                    <span class="season-chip is-final" aria-label="Status: finalizada">FINALIZADA</span>
                </span>
            </header>
            <div class="season-podium-grid">
                ${cols || '<div class="podium-empty">Sem séries registradas.</div>'}
            </div>
        </article>
    `;
}

/**
 * HTML de uma season card ativa (em andamento). Usa KHC_CONFIG para listar séries.
 * @param {string} year
 * @param {object} config
 * @param {number} cardIndex
 * @returns {string}
 */
function _renderActiveSeason(year, config, cardIndex) {
    const safeYear = escapeHtml(year);

    // Heurística leve: se week / weeksTotal não estão no data, hardcoda 8 / 14
    // conforme nota do handoff. Isso é cosmético até a Sleeper API ser ligada.
    const week = (config && typeof config.week === 'number') ? config.week : 8;
    const weeksTotal = (config && typeof config.weeksTotal === 'number') ? config.weeksTotal : 14;
    const safeWeek = escapeHtml(String(week));
    const safeTotal = escapeHtml(String(weeksTotal));

    const allLeagues = (config && Array.isArray(config.leagues)) ? config.leagues : [];
    const realLeagues = allLeagues.filter(l => !String(l.id || '').includes('placeholder'));
    const allArePlaceholder = realLeagues.length === 0 && allLeagues.length > 0;

    let seriesRows = '';
    const list = allArePlaceholder ? allLeagues : realLeagues;
    list.forEach(league => {
        const safeName = escapeHtml(sanitizeString(league.name, VALIDATION.MAX_LEAGUE_NAME_LENGTH, 'Série'));
        const meta = allArePlaceholder ? 'Aguardando configuração' : 'Em disputa';
        seriesRows += `
            <div class="season-serie-row" role="listitem">
                <span class="dot live" aria-hidden="true"></span>
                <span class="season-serie-name">${safeName}</span>
                <span class="season-serie-meta">— ${meta}</span>
            </div>
        `;
    });

    if (!seriesRows) {
        seriesRows = '<div class="season-serie-row"><span class="season-serie-meta">Nenhuma série configurada ainda.</span></div>';
    }

    return `
        <article class="season-card stagger-item" style="animation-delay: ${cardIndex * STAGGER_DELAY_MS}ms" aria-label="Temporada ${safeYear} em andamento">
            <header class="season-card-hd">
                <span class="season-year">${safeYear}</span>
                <span class="season-meta">
                    <span class="season-chip" aria-label="Semana atual">Semana ${safeWeek} / ${safeTotal}</span>
                    <span class="season-chip is-active" aria-label="Status: em andamento">EM ANDAMENTO</span>
                </span>
            </header>
            <div class="season-active-msg">
                <span aria-hidden="true">${IconRegistry.hourglass({ size: 14 })}</span>
                <span>Temporada em andamento — resultados finais ao término dos playoffs</span>
            </div>
            <div class="season-series-list" role="list" aria-label="Séries da temporada ${safeYear}">
                ${seriesRows}
            </div>
        </article>
    `;
}

/**
 * Renderiza a tab "Temporadas".
 *
 * Combina temporadas finalizadas (data layer) com anos ativos (KHC_CONFIG),
 * ordenadas do mais recente ao mais antigo. Cada ano vira um season card.
 * Sem cards de movimentação (decisão do usuário).
 */
function renderSeasons() {
    const container = document.getElementById(DOM_IDS.SEASONS);
    if (!container) return;

    const finalized = (typeof getFinalizedSeasons === 'function') ? getFinalizedSeasons() : [];
    const finalizedById = {};
    finalized.forEach(s => { finalizedById[String(s.id)] = s; });

    // Universo de anos = união de anos no config e anos finalizados
    const yearSet = new Set();
    Object.keys(KHC_CONFIG).forEach(y => yearSet.add(String(y)));
    finalized.forEach(s => yearSet.add(String(s.id)));

    // Newest first
    const years = Array.from(yearSet).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

    // Caption
    let html = `
        <div class="seasons-caption" role="presentation">
            <span aria-hidden="true">${IconRegistry.calendar({ size: 14 })}</span>
            <span>Histórico de todas as temporadas</span>
        </div>
        <div class="seasons-container" role="list" aria-label="Lista de temporadas">
    `;

    let cardIndex = 0;
    years.forEach(year => {
        const finalSeason = finalizedById[year];
        if (finalSeason) {
            html += _renderFinalizedSeason(finalSeason, cardIndex);
        } else {
            html += _renderActiveSeason(year, KHC_CONFIG[year], cardIndex);
        }
        cardIndex++;
    });

    if (cardIndex === 0) {
        html += '<div class="seasons-empty" role="status">Nenhuma temporada registrada ainda.</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}
