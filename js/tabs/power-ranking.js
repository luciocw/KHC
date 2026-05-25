// =============================================================================
// TAB / POWER RANKING — Tier list S/A/B/C/D usando Power Score (derivações).
//
// Visual port da Phase 3 do redesign:
//   - Caption acima com ícone de gráfico + texto contextual (ativa vs final).
//   - Tier rows com label panel 90px + grid de PWR cards.
//   - PWR card: avatar + nome + série + W-L pts | score grande + barra 3px.
//   - Top-left tab `#rank` com indicador de movimento (↑/↓/—).
//
// Lê: appState.season, appState.rosterData
// Depende de: js/config.js, js/sanitize.js, js/derivations.js, js/data.js
// =============================================================================

/**
 * Mapeia o registro legacy `rosterData` para o formato Team esperado por
 * `powerRanking()`. Carrega também campos auxiliares (`_leagueName`,
 * `_leagueTier`) usados na linha "série" do card.
 *
 * @param {Array<object>} rosterData
 * @returns {Array<object>}
 */
function mapRosterToTeams(rosterData) {
    return rosterData.map(r => ({
        user: r.ownerName,
        team: r.teamName,
        avatarId: r.avatar,
        w: r.wins,
        l: r.losses,
        pts: r.fpts,
        _leagueName: r.leagueName,
        _leagueTier: r.leagueTier,
    }));
}

/**
 * Configuração visual estática por tier (letra + descrição em PT-BR maiúscula).
 * As classes CSS `.tier-label.s/.a/.b/.c/.d` carregam o gradiente.
 */
const TIER_CONFIG = {
    S: { letter: 'S', desc: 'ELITE',       cls: 's' },
    A: { letter: 'A', desc: 'CONTENDERS',  cls: 'a' },
    B: { letter: 'B', desc: 'RISERS',      cls: 'b' },
    C: { letter: 'C', desc: 'MID-PACK',    cls: 'c' },
    D: { letter: 'D', desc: 'RELEGATION',  cls: 'd' },
};

/**
 * Calcula movimento entre o rank novo (por PWR) e o original (por pts).
 * Retorna `{ symbol, cls, aria }` para renderização do indicador.
 *
 * @param {number} rank
 * @param {number} originalRank
 * @returns {{symbol: string, cls: string, aria: string}}
 */
function movementFor(rank, originalRank) {
    const diff = originalRank - rank; // positivo = subiu
    if (diff > 0) {
        return { symbol: `↑${diff}`, cls: 'move-up',   aria: `subiu ${diff}` };
    }
    if (diff < 0) {
        return { symbol: `↓${-diff}`, cls: 'move-down', aria: `desceu ${-diff}` };
    }
    return { symbol: '—', cls: 'move-same', aria: 'sem variação' };
}

// isSeasonFinalized() agora vive em data.js (fonte única).

/**
 * Renderiza HTML de um único PWR card.
 * @param {object} row PowerRow + flags do mapRoster
 * @returns {string}
 */
function renderPwrCard(row) {
    const team = row.team;
    const safeUser = escapeHtml(team.user || '');
    const safeTeamName = escapeHtml(team.team || '');
    const safeSeries = escapeHtml(team._leagueName || '');
    const avatarUrl = sanitizeAvatarUrl(team.avatarId);
    const pts = sanitizeNumber(team.pts, 0, VALIDATION.MAX_POINTS).toFixed(1);
    const record = `${team.w}-${team.l}`;
    const score = row.pwr.toFixed(1);
    const pwrPct = Math.max(0, Math.min(100, row.pwr));
    const mv = movementFor(row.rank, row.originalRank);

    return `
        <article class="pwr-card" data-user="${safeUser}">
            <div class="pwr-rank-tab" aria-label="Posição ${row.rank}, ${mv.aria}">
                <span class="pwr-rank">#${row.rank}</span>
                <span class="${mv.cls}">${mv.symbol}</span>
            </div>
            <div class="pwr-card-left">
                <img src="${avatarUrl}" alt="" class="pwr-avatar" loading="lazy"
                     onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                <div class="pwr-info">
                    <div class="pwr-team-name">
                        ${playerLinkHTML({ user: team.user, displayName: safeTeamName })}
                    </div>
                    <div class="pwr-series">${safeSeries}</div>
                    <div class="pwr-record">${record} <span class="pwr-pts">${pts} pts</span></div>
                </div>
            </div>
            <div class="pwr-card-right">
                <div class="pwr-score">${score}</div>
                <div class="pwr-score-label">PWR</div>
                <div class="pwr-bar"><div class="pwr-bar-fill" data-pct="${pwrPct}"></div></div>
            </div>
        </article>
    `;
}

/**
 * Agrupa as rows por tier preservando a ordem S→A→B→C→D.
 * @param {Array} rows
 * @returns {Object<string, Array>}
 */
function groupRowsByTier(rows) {
    const grouped = { S: [], A: [], B: [], C: [], D: [] };
    rows.forEach(r => { grouped[r.tier].push(r); });
    return grouped;
}

/**
 * Caption acima do tier list. Apenas para temporada finalizada.
 * @param {boolean} finalized
 * @returns {string}
 */
function buildPowerCaption(finalized) {
    if (!finalized) return '';
    const icon = IconRegistry.chart({ size: 14 });
    return `<div class="power-caption">${icon}<span>Tier List baseada na pontuação total da temporada</span></div>`;
}

/**
 * Constrói uma `<section.tier-row>` para um tier não-vazio.
 * @param {string} tierKey  'S'|'A'|'B'|'C'|'D'
 * @param {Array}  list     Rows nesse tier
 * @param {number} tierIdx  Posição visual (pra stagger delay)
 * @returns {string}
 */
function buildTierSection(tierKey, list, tierIdx) {
    const cfg = TIER_CONFIG[tierKey];
    const aria = `Tier ${cfg.letter} — ${cfg.desc}: ${list.length} times`;
    return `
        <section class="tier-row stagger-item" role="region" aria-label="${aria}"
                 style="animation-delay: ${tierIdx * STAGGER_DELAY_MS}ms">
            <div class="tier-label ${cfg.cls}">
                <span class="letter">${cfg.letter}</span>
                <span class="desc">${cfg.desc}</span>
            </div>
            <div class="tier-teams">
                ${list.map(renderPwrCard).join('')}
            </div>
        </section>
    `;
}

/**
 * Anima as barras (0% → pct) em rAF. As barras começam com width=0 e
 * `data-pct` no DOM; este passe aplica a largura final via JS pra disparar
 * a transition definida no CSS.
 * @param {HTMLElement} container
 */
function animatePwrBars(container) {
    requestAnimationFrame(() => {
        container.querySelectorAll('.pwr-bar-fill').forEach(b => {
            const pct = parseFloat(b.getAttribute('data-pct')) || 0;
            b.style.width = pct + '%';
        });
    });
}

function renderPowerRankings() {
    const container = document.getElementById(DOM_IDS.POWER);
    if (!container) return;

    if (!appState.rosterData || appState.rosterData.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    // powerRanking() preserva a referência do objeto team, então
    // _leagueName/_leagueTier anexados em mapRosterToTeams() ficam acessíveis
    // via r.team dentro do card.
    const teams = mapRosterToTeams(appState.rosterData);
    const rows = powerRanking(teams);
    const grouped = groupRowsByTier(rows);
    const finalized = isSeasonFinalized(appState.season);

    const sectionsHtml = Object.keys(TIER_CONFIG)
        .filter(k => grouped[k].length > 0)
        .map((k, i) => buildTierSection(k, grouped[k], i))
        .join('');

    container.innerHTML = `
        ${buildPowerCaption(finalized)}
        <div class="tier-list">
            ${sectionsHtml}
        </div>
    `;

    animatePwrBars(container);
}
