// =============================================================================
// TAB / LENDAS KHC — Ranking acumulado de conquistas (campeonatos, vices, 3º,
// 4º) somando todas as temporadas finalizadas.
//
// Fonte única: data/<year>.json carregado em preloadFinalizedSeasons().
// Agregação via legendsAggregator() em js/derivations.js (ordenação ponderada:
// gold*10 + silver*5 + bronze*3 + fourth*1).
//
// NOTA file://: se aberto direto do disco e os fetch falharem por CORS, esta
// aba mostra estado vazio. Use http://localhost (instruções em js/data.js).
//
// Depende de: js/config.js, js/sanitize.js, js/data.js, js/derivations.js,
//             js/icons.js
// =============================================================================

/**
 * Shape interno usado pelo renderer.
 * @typedef {Object} LegendRow
 * @property {string} user      Nome do jogador
 * @property {number} gold      # de 1ºs lugares
 * @property {number} silver    # de 2ºs lugares
 * @property {number} bronze    # de 3ºs lugares
 * @property {number} fourth    # de 4ºs lugares
 */

/**
 * Calcula conquistas acumuladas de cada jogador a partir do data layer.
 * Vazio se nenhuma temporada finalizada carregou.
 * @returns {LegendRow[]}
 */
function calculatePlayerAchievements() {
    const finalizedSeasons = getFinalizedSeasons();
    if (finalizedSeasons.length === 0) return [];
    return legendsAggregator(finalizedSeasons).map(e => ({
        user:   e.user,
        gold:   e.trophies.gold,
        silver: e.trophies.silver,
        bronze: e.trophies.bronze,
        fourth: e.trophies.fourth
    }));
}

/**
 * Constrói o HTML de um chip de cabeçalho de medalha (1º / 2º / 3º / 4º) com
 * borda colorida e o SVG da medalha embutido.
 * @param {('gold'|'silver'|'bronze'|'fourth')} kind
 * @param {string} label   Texto curto exibido no chip (ex: "1º")
 * @returns {string} HTML string
 */
function _legendsMedalChip(kind, label) {
    const iconFn = {
        gold:   IconRegistry.medalGold,
        silver: IconRegistry.medalSilver,
        bronze: IconRegistry.medalBronze,
        fourth: IconRegistry.medalFourth
    }[kind];
    const icon = iconFn ? iconFn({ size: 12 }) : '';
    return `<span class="legends-medal-chip ${kind}" aria-hidden="true">${icon}<span>${label}</span></span>`;
}

/**
 * Renderiza a aba "Lendas KHC" — ranking cumulativo de jogadores.
 * Espera ler para `#legendsContainer` (DOM_IDS.LEGENDS).
 * Wraps username em .player-link (sem handler — wire-up vem no Player Drawer).
 */
function renderLegends() {
    const container = document.getElementById(DOM_IDS.LEGENDS);
    if (!container) return;

    const players = calculatePlayerAchievements();

    if (players.length === 0) {
        container.innerHTML = '<div class="legends-empty" role="status">As lendas serão reveladas ao fim das temporadas.</div>';
        return;
    }

    const columnsIcon = IconRegistry.columns({ size: 14 });

    const headerRow = `
        <div class="legends-header" role="row">
            <div class="legends-rank" role="columnheader" aria-label="Posição">#</div>
            <div class="legends-user" role="columnheader" aria-label="Jogador">Jogador</div>
            <div class="legends-count" role="columnheader" aria-label="1º lugar">
                ${_legendsMedalChip('gold', '1º')}
            </div>
            <div class="legends-count" role="columnheader" aria-label="2º lugar">
                ${_legendsMedalChip('silver', '2º')}
            </div>
            <div class="legends-count" role="columnheader" aria-label="3º lugar">
                ${_legendsMedalChip('bronze', '3º')}
            </div>
            <div class="legends-count" role="columnheader" aria-label="4º lugar">
                ${_legendsMedalChip('fourth', '4º')}
            </div>
        </div>
    `;

    const cellHtml = (n, kind) => {
        const zero = !n || n === 0;
        const cls = `legends-count ${zero ? 'zero' : kind}`;
        const txt = zero ? '–' : String(n);
        return `<div class="${cls}" role="cell">${txt}</div>`;
    };

    const rowsHtml = players.map((p, index) => {
        const safeName = escapeHtml(sanitizeString(p.user, VALIDATION.MAX_OWNER_NAME_LENGTH, 'Jogador'));
        const rank = index + 1;
        const isLeader = rank === 1;
        const rowClass = `legends-row stagger-item${isLeader ? ' is-leader' : ''}`;
        const delay = index * STAGGER_DELAY_MS;
        const ariaLabel =
            `${rank}º lugar: ${safeName}, ${p.gold} ouros, ${p.silver} pratas, ${p.bronze} bronzes, ${p.fourth} quartos`;

        return `
            <div class="${rowClass}" role="row" aria-label="${ariaLabel}" style="animation-delay: ${delay}ms">
                <div class="legends-rank" role="cell">${rank}</div>
                <div class="legends-user" role="cell">
                    ${playerLinkHTML({ user: safeName, displayName: safeName })}
                </div>
                ${cellHtml(p.gold,   'gold')}
                ${cellHtml(p.silver, 'silver')}
                ${cellHtml(p.bronze, 'bronze')}
                ${cellHtml(p.fourth, 'fourth')}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="legends-caption" role="note">
            <span aria-hidden="true">${columnsIcon}</span>
            <span>Ranking cumulativo de conquistas — todas as ligas valem igual</span>
        </div>
        <div class="legends-card" role="table" aria-label="Ranking de lendas por conquistas">
            ${headerRow}
            ${rowsHtml}
        </div>
    `;
}
