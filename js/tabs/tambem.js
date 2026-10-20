// =============================================================================
// TAB / TAMBÉM NA KHC — ligas da turma fora da NFL (#/premier, #/nba).
//
//   - Fora do menu: entra pelo atalho no topo, por Regras e pelo cartão da
//     entressafra na aba Ligas.
//   - Abas com os escudos (Premier League | NBA), como as abas das séries.
//   - NBA: National Burgundy Association, liga nova em 2026/27. Sem ID no
//     Sleeper ainda (NBA_LEAGUE.id = null): mostra "Em breve".
//
// Depende de: config, ui/helpers, tabs/premier (backToNflHTML)
// =============================================================================

/** Abas Premier League | NBA. */
function alsoTabsHTML(active) {
    const tabs = [
        { id: 'premier', league: 'epl', name: 'Premier League', img: `<img class="crest crest--round" src="${CREST_PATH}${PREMIER_LEAGUE.crest}" alt="" width="28" height="28">` },
        { id: 'nba', league: 'nba', name: NBA_LEAGUE.short, img: `<img class="crest" src="${CREST_PATH}${NBA_LEAGUE.crest}" alt="" width="25" height="28">` }
    ];
    return `<nav class="series-tabs also-tabs" aria-label="Também na KHC">${tabs.map(t =>
        `<a href="#/${t.id}" data-league="${t.league}"${t.id === active ? ' aria-current="page"' : ''}>${t.img}<span>${escapeHtml(t.name)}</span></a>`).join('')}</nav>`;
}

/**
 * Página #/nba.
 * @returns {string} HTML
 */
function renderNba() {
    return `${backToNflHTML()}
        ${alsoTabsHTML('nba')}
        <section class="card nba" data-league="nba" aria-labelledby="nba-title">
            <header class="card__hd">
                <img class="crest" src="${CREST_PATH}${NBA_LEAGUE.crest}" alt="" width="49" height="56">
                <div class="grow">
                    <h2 class="display" id="nba-title">${escapeHtml(NBA_LEAGUE.name)}</h2>
                    <p>Fantasy de basquete no Sleeper · ${escapeHtml(NBA_LEAGUE.season)}</p>
                </div>
            </header>
            ${stateHTML({
                icon: 'calendar',
                title: 'Em breve',
                text: 'Liga nova da turma da KHC, na temporada 2026/27 da NBA. Assim que ela estiver no Sleeper, a tabela, as rodadas e o chaveamento aparecem aqui.'
            })}
        </section>`;
}
