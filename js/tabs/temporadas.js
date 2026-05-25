// =============================================================================
// TAB / TEMPORADAS — Histórico ano-a-ano, do mais recente ao mais antigo.
// Temporadas finalizadas mostram podium (1º a 4º); temporadas ativas mostram
// mensagem de "em andamento".
// Lê: KHC_CONFIG (standings)
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

function renderSeasons() {
    const container = document.getElementById(DOM_IDS.SEASONS);
    let html = '';
    let cardIndex = 0;

    // Emojis e cores por posição
    const positionConfig = {
        1: { emoji: '🏆', label: 'Campeão', colorClass: 'hof-gold' },
        2: { emoji: '🥈', label: 'Vice', colorClass: 'hof-silver' },
        3: { emoji: '🥉', label: '3º Lugar', colorClass: 'hof-bronze' },
        4: { emoji: '4️⃣', label: '4º Lugar', colorClass: 'hof-fourth' }
    };

    // Ordena anos do mais recente para o mais antigo
    const years = Object.keys(KHC_CONFIG).sort((a, b) => parseInt(b) - parseInt(a));

    years.forEach(year => {
        const config = KHC_CONFIG[year];
        const standings = config.standings || {};
        const safeYear = escapeHtml(year);
        const hasStandings = Object.keys(standings).length > 0;

        // Se for o ano atual (2026) sem standings, mostra mensagem especial
        if (!hasStandings) {
            html += `
                <div class="season-section stagger-item" style="animation-delay: ${cardIndex * STAGGER_DELAY_MS}ms">
                    <div class="season-header">
                        <span class="season-year">${safeYear}</span>
                        <span class="season-status season-ongoing">Em andamento</span>
                    </div>
                    <div class="season-content">
                        <div class="season-pending">
                            <span class="season-pending-icon" aria-hidden="true">⏳</span>
                            <span>Temporada em andamento - resultados finais ao término dos playoffs</span>
                        </div>
                    </div>
                </div>
            `;
            cardIndex++;
            return;
        }

        // Seção da temporada
        html += `
            <div class="season-section stagger-item" style="animation-delay: ${cardIndex * STAGGER_DELAY_MS}ms">
                <div class="season-header">
                    <span class="season-year">${safeYear}</span>
                    <span class="season-status season-completed">Finalizada</span>
                </div>
                <div class="season-leagues">
        `;

        // Processa cada liga
        Object.keys(standings).forEach(leagueName => {
            const leagueStandings = standings[leagueName] || [];
            const safeLeagueName = escapeHtml(leagueName);

            html += `
                <div class="season-league">
                    <div class="season-league-title">${safeLeagueName}</div>
                    <div class="season-standings">
            `;

            leagueStandings.forEach(entry => {
                const pos = entry.position;
                const posConfig = positionConfig[pos] || positionConfig[4];
                const safeOwner = escapeHtml(sanitizeString(entry.owner, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Dono'));

                const ariaLabel = `${posConfig.label}: ${safeOwner}`;

                html += `
                    <div class="season-entry ${posConfig.colorClass}" role="listitem" aria-label="${ariaLabel}">
                        <span class="season-position" aria-hidden="true">${posConfig.emoji}</span>
                        <span class="season-owner">${safeOwner}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        cardIndex++;
    });

    if (html === '') {
        html = '<div class="seasons-empty" role="status">Nenhuma temporada finalizada ainda.</div>';
    }

    container.innerHTML = html;
}
