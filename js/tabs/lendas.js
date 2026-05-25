// =============================================================================
// TAB / LENDAS KHC — Ranking acumulado de conquistas (campeonatos, vices, 3º,
// 4º) somando todas as temporadas finalizadas.
//
// FASE 1: Migrado para ler do data layer (js/data.js + js/derivations.js).
//   Fonte primária: data/<year>.json carregado em preloadFinalizedSeasons().
//   Fallback: KHC_CONFIG.standings (caso o JSON não carregue, ex: file:// CORS).
//
// FASE 3.D: Visual port — caption com ícone de colunas, card com gradiente
// laranja no header, chips outlined nos cabeçalhos de medalha, linhas com
// contagens coloridas pelo metal, e stagger fade-in. Username é wrapped em
// .player-link para o Drawer (Fase 4) — sem handler ainda.
//
// Depende de: js/config.js, js/sanitize.js, js/data.js, js/derivations.js,
//             js/icons.js
// =============================================================================

/**
 * Shape unificado interno usado pelo renderer. Ambos data-layer e fallback
 * legacy são normalizados para este formato antes de renderizar.
 * @typedef {Object} LegendRow
 * @property {string} user      Nome do jogador
 * @property {number} gold      # de 1ºs lugares
 * @property {number} silver    # de 2ºs lugares
 * @property {number} bronze    # de 3ºs lugares
 * @property {number} fourth    # de 4ºs lugares
 */

/**
 * Adapta o output do `legendsAggregator` (data model novo) para `LegendRow[]`.
 * Já vem ordenado por weighted desc do aggregator.
 * @param {LegendEntry[]} entries
 * @returns {LegendRow[]}
 */
function _legendsFromAggregator(entries) {
    return entries.map(e => ({
        user:   e.user,
        gold:   e.trophies.gold,
        silver: e.trophies.silver,
        bronze: e.trophies.bronze,
        fourth: e.trophies.fourth
    }));
}

/**
 * Fallback: derivação legacy de `KHC_CONFIG.standings` (mesma lógica de antes
 * da Fase 1). Usado quando `data/<year>.json` não está disponível
 * (ex: abertura via file:// onde fetch CORS falha).
 *
 * Ordena pelo mesmo critério ponderado do `legendsAggregator`:
 *   weighted = gold*10 + silver*5 + bronze*3 + fourth*1
 *
 * @returns {LegendRow[]}
 */
function _legendsFromConfig() {
    /** @type {Record<string, LegendRow>} */
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
                        user: owner,
                        gold: 0, silver: 0, bronze: 0, fourth: 0
                    };
                }

                switch (entry.position) {
                    case 1: playerStats[owner].gold++;   break;
                    case 2: playerStats[owner].silver++; break;
                    case 3: playerStats[owner].bronze++; break;
                    case 4: playerStats[owner].fourth++; break;
                }
            });
        });
    });

    const weight = (r) => r.gold * 10 + r.silver * 5 + r.bronze * 3 + r.fourth;
    return Object.values(playerStats).sort((a, b) => weight(b) - weight(a));
}

/**
 * Calcula conquistas acumuladas de cada jogador.
 * Prefere data layer (JSON via legendsAggregator); cai para KHC_CONFIG se
 * nenhuma season finalizada carregou.
 * @returns {LegendRow[]}
 */
function calculatePlayerAchievements() {
    const finalizedSeasons = getFinalizedSeasons();
    if (finalizedSeasons.length > 0) {
        return _legendsFromAggregator(legendsAggregator(finalizedSeasons));
    }
    // Fallback: nenhuma temporada finalizada carregou (ex: file://, fetch falhou)
    console.info('Lendas: usando KHC_CONFIG.standings (data/*.json não disponível)');
    return _legendsFromConfig();
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
