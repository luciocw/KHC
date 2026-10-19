// =============================================================================
// TAB / PREMIER — Cocoricó Premier League (fantasy de futebol na Sleeper).
//
//   - Página própria (#/premier), fora do menu: entra pelo escudo no topo (#premierLink), por Regras, pelo link
//     direto e pelo cartão "Enquanto a NFL descansa" na aba Ligas, que só
//     aparece na entressafra da NFL (Sleeper state season_type = 'off').
//   - Só a tabela: a Sleeper não entrega placares por rodada desta liga.
//     V–E–D, PF, PC e eficiência de escalação (PF ÷ máximo possível, o
//     "ppts" que a própria Sleeper calcula).
//   - Ordem como na Sleeper: aproveitamento (empate = ½ vitória), depois PF.
//   - Botão "Voltar para a NFL" no topo.
//
// Depende de: config, sanitize, api, ui/helpers
// =============================================================================

let _premier = null;   // { status, data } da sessão (o reload limpa)

function resetPremierCache() {
    _premier = null;
}

/**
 * Tabela da liga (configuração, usuários e elencos).
 * @returns {Promise<{leg: number, scored: number, teams: Array}>}
 */
async function loadPremier() {
    const base = `https://api.sleeper.app/v1/league/${PREMIER_LEAGUE.id}`;
    const [lgRes, usersRes, rostersRes] = await Promise.all([
        fetchWithRetry(base), fetchWithRetry(`${base}/users`), fetchWithRetry(`${base}/rosters`)
    ]);
    if (!lgRes.ok || !usersRes.ok || !rostersRes.ok) throw new Error('Premier League indisponível');
    const [lg, users, rosters] = await Promise.all([lgRes.json(), usersRes.json(), rostersRes.json()]);
    const st = (lg && lg.settings) || {};
    const userMap = {};
    (Array.isArray(users) ? users : []).forEach(u => { if (isValidUser(u)) userMap[u.user_id] = u; });

    const num = (a, b) => sanitizeNumber(a, 0, VALIDATION.MAX_POINTS, 0) + sanitizeNumber(b, 0, 99, 0) / 100;
    const teams = (Array.isArray(rosters) ? rosters : []).filter(isValidRoster).map(r => {
        const u = userMap[r.owner_id] || {};
        const s = r.settings || {};
        const wins = sanitizeNumber(s.wins, 0, VALIDATION.MAX_WINS, 0);
        const ties = sanitizeNumber(s.ties, 0, VALIDATION.MAX_WINS, 0);
        const losses = sanitizeNumber(s.losses, 0, VALIDATION.MAX_LOSSES, 0);
        const fpts = num(s.fpts, s.fpts_decimal);
        const ppts = num(s.ppts, s.ppts_decimal);
        const games = wins + ties + losses;
        return {
            teamId: r.roster_id,
            teamName: sanitizeString((u.metadata && u.metadata.team_name) || u.display_name || 'Time', VALIDATION.MAX_TEAM_NAME_LENGTH, 'Time'),
            ownerName: sanitizeString(u.display_name || '', VALIDATION.MAX_OWNER_NAME_LENGTH, ''),
            avatar: leagueAvatarOf(u) || u.avatar || null,
            wins, ties, losses, fpts,
            fptsAgainst: num(s.fpts_against, s.fpts_against_decimal),
            ppts,
            efficiency: ppts > 0 ? fpts / ppts : null,
            pct: games ? (wins + ties / 2) / games : 0
        };
    }).sort((a, b) => (b.pct - a.pct) || (b.fpts - a.fpts));
    const scored = Math.round(sanitizeNumber(st.last_scored_leg, 0, 60, 0));
    return { leg: Math.round(sanitizeNumber(st.leg, 0, 60, 0)), scored, teams };
}

/** Dados da Premier (dispara a busca na 1ª vez; re-renderiza ao terminar). */
function premierData() {
    if (_premier) return _premier;
    const entry = _premier = { status: 'loading' };
    loadPremier()
        .then(data => { entry.status = 'ready'; entry.data = data; entry.fetchedAt = Date.now(); })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === 'premier' || (appState.tab === 'ligas' && isNflOffseason())) renderView();
        });
    return entry;
}

/** Entressafra da NFL: depois do Super Bowl até a pré-temporada. */
function isNflOffseason() {
    return !!(appState.nflState && appState.nflState.season_type === 'off');
}

/** "85%" ou "—". */
function fmtEff(e) {
    return e === null || e === undefined ? '—' : `${Math.round(e * 100)}%`;
}

/** Subtítulo do card. */
function premierSubtitle(data) {
    return `${data.teams.length} times · ${data.scored ? `após a rodada ${data.scored}` : 'antes da 1ª rodada'} · ${PREMIER_LEAGUE.season}`;
}

/** Link "Voltar para a NFL". */
function backToNflHTML() {
    return `<a class="back-link" href="${hashFor('ligas', appState.season, appState.series)}">
        <span data-icon="chevronLeft" data-size="18"></span>Voltar para a NFL
    </a>`;
}

/**
 * Página #/premier.
 * @returns {string} HTML
 */
function renderPremier() {
    const entry = premierData();
    const header = (subtitle, actions) => `<header class="card__hd">
            <img class="crest crest--round" src="${CREST_PATH}${PREMIER_LEAGUE.crest}" alt="" width="56" height="56">
            <div class="grow">
                <h2 class="display" id="premier-title">${escapeHtml(PREMIER_LEAGUE.name)}</h2>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            ${actions}
        </header>`;
    const wrap = inner => `${backToNflHTML()}
        <section class="card premier" data-league="epl" aria-labelledby="premier-title">${inner}</section>`;

    if (entry.status === 'loading') {
        const row = '<div class="skeleton-row"><span class="skeleton sk-pos"></span><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
        return wrap(header('Carregando…', '') + `<div aria-busy="true">${row.repeat(8)}</div>`);
    }
    if (entry.status === 'error') {
        return wrap(header('', '') + stateHTML({
            icon: 'alert', title: 'Não deu pra carregar a Premier League',
            text: 'Verifique sua conexão e tente de novo.',
            action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
        }));
    }

    const d = entry.data;
    const actions = `<div class="export-actions" role="group" aria-label="Exportar tabela da Premier League como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar tabela da Premier League como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar tabela da Premier League como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>`;
    const rows = d.teams.map((t, i) => `<tr>
            <td><span class="pos">${i + 1}</span></td>
            <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
            <td class="rec">${t.wins}–${t.ties}–${t.losses}</td>
            <td>${fmtPts(t.fpts)}</td>
            <td class="hide-mobile">${fmtPts(t.fptsAgainst)}</td>
            <td>${fmtEff(t.efficiency)}</td>
        </tr>`).join('');

    return wrap(`${header(premierSubtitle(d), actions)}
        <div class="table-wrap">
            <table class="standings standings--compact">
                <caption class="sr-only">Classificação da ${escapeHtml(PREMIER_LEAGUE.name)}</caption>
                <thead><tr>
                    <th scope="col">#</th>
                    <th scope="col">Time</th>
                    <th scope="col"><abbr title="Vitórias, empates e derrotas">V–E–D</abbr></th>
                    <th scope="col"><abbr title="Pontos feitos">PF</abbr></th>
                    <th scope="col" class="hide-mobile"><abbr title="Pontos contra">PC</abbr></th>
                    <th scope="col"><abbr title="Eficiência de escalação: pontos feitos ÷ máximo possível com a melhor escalação">Efic.</abbr></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="chances-note">Efic. = pontos feitos ÷ máximo possível com a melhor escalação de cada rodada (cálculo do Sleeper). Ordem: aproveitamento (empate vale meia vitória), depois pontos.</p>`);
}

/**
 * Cartão "Enquanto a NFL descansa" (topo da aba Ligas, só na entressafra).
 * @returns {string} HTML ('' fora da entressafra)
 */
function premierOffseasonCardHTML() {
    if (!isNflOffseason()) return '';
    const entry = premierData();
    const leader = entry.status === 'ready' ? entry.data.teams[0] : null;
    return `<a class="card offseason-card" data-league="epl" href="#/premier">
        <img class="crest crest--round" src="${CREST_PATH}${PREMIER_LEAGUE.crest}" alt="" width="40" height="40">
        <span class="grow">
            <span class="eyebrow eyebrow--accent">Enquanto a NFL descansa</span>
            <b>${escapeHtml(PREMIER_LEAGUE.name)}</b>
            ${leader ? `<small>Líder: ${escapeHtml(leader.teamName)} · ${leader.wins}–${leader.ties}–${leader.losses}</small>` : ''}
        </span>
        <span class="offseason-card__cta">Ver tabela ›</span>
    </a>`;
}
