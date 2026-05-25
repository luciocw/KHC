// =============================================================================
// TAB / LENDAS KHC — Ranking acumulado de conquistas (campeonatos, vices, 3º,
// 4º) somando todas as temporadas finalizadas. Não depende de dados live.
// Lê: KHC_CONFIG (standings)
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

/**
 * Calcula conquistas acumuladas de cada jogador
 * Retorna array ordenado por: títulos > vices > 3º > 4º
 */
function calculatePlayerAchievements() {
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
                        titles: 0,      // 1º lugar
                        vices: 0,       // 2º lugar
                        thirds: 0,      // 3º lugar
                        fourths: 0      // 4º lugar
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

    // Converte para array e ordena
    return Object.values(playerStats).sort((a, b) => {
        // Ordena por: títulos > vices > 3º > 4º
        if (b.titles !== a.titles) return b.titles - a.titles;
        if (b.vices !== a.vices) return b.vices - a.vices;
        if (b.thirds !== a.thirds) return b.thirds - a.thirds;
        return b.fourths - a.fourths;
    });
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
