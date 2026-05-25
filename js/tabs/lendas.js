// =============================================================================
// TAB / LENDAS KHC — Ranking acumulado de conquistas (campeonatos, vices, 3º,
// 4º) somando todas as temporadas finalizadas.
//
// FASE 1: Migrado para ler do data layer (js/data.js + js/derivations.js).
// Fonte primária: data/<year>.json carregado em preloadFinalizedSeasons().
// Fallback: KHC_CONFIG.standings (caso o JSON não carregue, ex: file:// CORS).
//
// O fallback será removido na Fase 6 (cleanup), uma vez que todo deploy
// passar por HTTP. A redação visual desta tab será reescrita na Fase 3.
//
// Depende de: js/config.js, js/sanitize.js, js/data.js, js/derivations.js
// =============================================================================

/**
 * Adapta o output do legendsAggregator (data model novo) para o shape legacy
 * usado por renderLegends. Mantém a UI desta fase intocada.
 * @param {LegendEntry[]} entries
 * @returns {Array<{name, titles, vices, thirds, fourths}>}
 */
function _legendsToLegacyShape(entries) {
    return entries.map(e => ({
        name: e.user,
        titles:  e.trophies.gold,
        vices:   e.trophies.silver,
        thirds:  e.trophies.bronze,
        fourths: e.trophies.fourth
    }));
}

/**
 * Fallback: derivação legacy de KHC_CONFIG.standings (mesma lógica de antes
 * da Fase 1). Usado quando data/<year>.json não está disponível.
 * @returns {Array<{name, titles, vices, thirds, fourths}>}
 */
function _legendsFromConfig() {
    const playerStats = {};

    Object.keys(KHC_CONFIG).forEach(year => {
        const config = KHC_CONFIG[year];
        const standings = config.standings || {};

        Object.keys(standings).forEach(leagueName => {
            const leagueStandings = standings[leagueName] || [];

            leagueStandings.forEach(entry => {
                const owner = entry.owner;
                if (!owner) return;

                if (!playerStats[owner]) {
                    playerStats[owner] = {
                        name: owner,
                        titles: 0, vices: 0, thirds: 0, fourths: 0
                    };
                }

                switch (entry.position) {
                    case 1: playerStats[owner].titles++; break;
                    case 2: playerStats[owner].vices++; break;
                    case 3: playerStats[owner].thirds++; break;
                    case 4: playerStats[owner].fourths++; break;
                }
            });
        });
    });

    return Object.values(playerStats).sort((a, b) => {
        if (b.titles !== a.titles) return b.titles - a.titles;
        if (b.vices !== a.vices) return b.vices - a.vices;
        if (b.thirds !== a.thirds) return b.thirds - a.thirds;
        return b.fourths - a.fourths;
    });
}

/**
 * Calcula conquistas acumuladas de cada jogador.
 * Prefere data layer (JSON); cai para KHC_CONFIG se data não carregou.
 * @returns {Array<{name, titles, vices, thirds, fourths}>}
 */
function calculatePlayerAchievements() {
    const finalizedSeasons = getFinalizedSeasons();
    if (finalizedSeasons.length > 0) {
        return _legendsToLegacyShape(legendsAggregator(finalizedSeasons));
    }
    // Fallback: nenhuma temporada finalizada carregou (ex: file://, fetch falhou)
    console.info('Lendas: usando KHC_CONFIG.standings (data/*.json não disponível)');
    return _legendsFromConfig();
}

/**
 * Renderiza a aba "Lendas KHC" - Ranking cumulativo de jogadores
 */
function renderLegends() {
    const container = document.getElementById(DOM_IDS.LEGENDS);
    const players = calculatePlayerAchievements();

    if (players.length === 0) {
        container.innerHTML = '<div class="legends-empty" role="status">As lendas serão reveladas ao fim das temporadas.</div>';
        return;
    }

    let html = `
        <div class="legends-intro">
            <span class="legends-intro-icon" aria-hidden="true">🏛️</span>
            <span>Ranking cumulativo de conquistas - todas as ligas valem igual</span>
        </div>
        <div class="legends-table" role="table" aria-label="Ranking de lendas por conquistas">
            <div class="legends-header" role="row">
                <div class="legends-col-rank" role="columnheader">#</div>
                <div class="legends-col-name" role="columnheader">Jogador</div>
                <div class="legends-col-trophy" role="columnheader" title="Títulos">🏆</div>
                <div class="legends-col-trophy" role="columnheader" title="Vice-campeonatos">🥈</div>
                <div class="legends-col-trophy" role="columnheader" title="Terceiros lugares">🥉</div>
                <div class="legends-col-trophy" role="columnheader" title="Quartos lugares">4º</div>
            </div>
    `;

    players.forEach((player, index) => {
        const safeName = escapeHtml(sanitizeString(player.name, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Jogador'));
        const rank = index + 1;

        // Classe especial para top 3
        let rowClass = 'legends-row stagger-item';
        if (rank === 1) rowClass += ' legends-gold';
        else if (rank === 2) rowClass += ' legends-silver';
        else if (rank === 3) rowClass += ' legends-bronze';

        const ariaLabel = `${rank}º lugar: ${safeName}, ${player.titles} títulos, ${player.vices} vices, ${player.thirds} terceiros, ${player.fourths} quartos`;

        html += `
            <div class="${rowClass}" role="row" aria-label="${ariaLabel}" style="animation-delay: ${index * 50}ms">
                <div class="legends-col-rank" role="cell">${rank}</div>
                <div class="legends-col-name" role="cell">${safeName}</div>
                <div class="legends-col-trophy legends-count-title" role="cell">${player.titles || '-'}</div>
                <div class="legends-col-trophy legends-count-vice" role="cell">${player.vices || '-'}</div>
                <div class="legends-col-trophy legends-count-third" role="cell">${player.thirds || '-'}</div>
                <div class="legends-col-trophy legends-count-fourth" role="cell">${player.fourths || '-'}</div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}
