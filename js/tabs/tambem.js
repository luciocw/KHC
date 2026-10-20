// =============================================================================
// TAB / TAMBÉM NA KHC — ligas da turma fora da NFL, no Sleeper.
//
//   - #/premier: Cocoricó Premier League (fantasy de futebol).
//   - #/nba: KHC NBA League · National Burgundy Association (basquete).
//   - Fora do menu: entra pelo atalho no topo, por Regras e pelo cartão
//     "Enquanto a NFL descansa" na aba Ligas (só na entressafra da NFL,
//     Sleeper state season_type = 'off').
//   - Abas com os escudos e botão "Voltar para a NFL" no topo.
//   - Tabela: V–(E)–D, PF, PC e eficiência de escalação (PF ÷ máximo
//     possível, o "ppts" que o próprio Sleeper calcula). Ordem como no
//     Sleeper: aproveitamento (empate = ½ vitória), depois PF.
//   - NBA também tem Rodada (#/nba/rodada/<semana>), com o mesmo modelo e
//     exportação da aba Rodada da NFL (tabs/rodada.js). A Premier não tem
//     placar por rodada no Sleeper.
//   - Antes do draft: só os times que já entraram, e quantas vagas faltam.
//
// Depende de: config, sanitize, api, ui/helpers, tabs/rodada
// =============================================================================

/** Ligas da página, na ordem das abas. */
const ALSO_LEAGUES = {
    // weekly: o Sleeper entrega placar por semana (Rodada); a Premier não
    premier: { ...PREMIER_LEAGUE, key: 'premier', league: 'epl', tab: 'Premier League', sport: 'futebol', ties: true, round: true, weekly: false },
    nba:     { ...NBA_LEAGUE,     key: 'nba',     league: 'nba', tab: 'NBA',            sport: 'basquete', ties: false, round: false, weekly: true }
};

const _also = {};         // key → { status, data, fetchedAt } da sessão (o reload limpa)
const _alsoRounds = {};   // leagueId → settings · `${leagueId}|${semana}` → confrontos

function resetAlsoCache() {
    Object.keys(_also).forEach(k => delete _also[k]);
    Object.keys(_alsoRounds).forEach(k => delete _alsoRounds[k]);
}

/** Mostra a visão Rodada? (liga com placar por semana, depois do draft) */
function alsoShowsRound(cfg, data) {
    return cfg.weekly && appState.tab === cfg.key && appState.alsoView === 'rodada' && !isAlsoPreseason(data);
}

/** "Liga" no formato de roundModel / drawRoundCanvas. */
function alsoRoundLeague(cfg, data) {
    return { info: { id: cfg.id, tier: null }, meta: { name: cfg.name, crest: cfg.crest, league: cfg.league }, teams: data.teams };
}

/**
 * Semana aberta na Rodada de uma liga de Também na KHC (dispara o que faltar).
 * @returns {{status: ('loading'|'ready'|'error'), week?: number, settings?: Object, data?: Object}}
 */
function alsoRound(cfg) {
    const rerender = () => { if (appState.tab === cfg.key) renderView(); };
    const st = _alsoRounds[cfg.id];
    if (!st) {
        _alsoRounds[cfg.id] = { status: 'loading' };
        fetchLeagueSettings(cfg.id)
            .then(data => { _alsoRounds[cfg.id] = { status: 'ready', data }; })
            .catch(() => { _alsoRounds[cfg.id] = { status: 'error' }; })
            .then(rerender);
        return { status: 'loading' };
    }
    if (st.status !== 'ready') return { status: st.status };
    const settings = st.data;
    const last = lastWeekOf(settings);
    const week = Math.min(Math.max(1, appState.alsoWeek || settings.leg || 1), last);
    const key = `${cfg.id}|${week}`;
    const rd = _alsoRounds[key];
    if (!rd) {
        _alsoRounds[key] = { status: 'loading' };
        fetchRoundData(cfg.id, week)
            .then(data => { _alsoRounds[key] = { status: 'ready', data }; })
            .catch(() => { _alsoRounds[key] = { status: 'error' }; })
            .then(rerender);
        return { status: 'loading', week, settings };
    }
    return { status: rd.status, week, settings, data: rd.data };
}

/**
 * Corpo da visão Rodada (semana, destaques, confrontos).
 * @returns {{html: string, subtitle: string, ready: boolean}}
 */
function alsoRoundHTML(cfg, data) {
    const round = alsoRound(cfg);
    const nav = round.settings ? weekNavHTML(round.settings, round.week, `#/${cfg.key}/rodada/`) : '';
    if (round.status === 'error') {
        return {
            html: stateHTML({
                icon: 'alert', title: 'Não deu pra carregar os confrontos',
                text: 'Verifique sua conexão e tente de novo.',
                action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
            }),
            subtitle: '', ready: false
        };
    }
    if (round.status !== 'ready') return { html: nav + matchesSkeletonHTML(), subtitle: 'Carregando…', ready: false };
    const m = roundModel(alsoRoundLeague(cfg, data), round);
    const games = m.games.map(g => `<li class="match">
            ${g.label ? `<div class="eyebrow match__label${g.label === 'Final' ? ' eyebrow--accent' : ''}">${escapeHtml(g.label)}</div>` : ''}
            ${matchSideHTML(g.a, g.winner === 'a' ? 'win' : g.winner === 'b' ? 'lose' : '', m.status)}
            ${matchSideHTML(g.b, g.winner === 'b' ? 'win' : g.winner === 'a' ? 'lose' : '', m.status)}
        </li>`).join('');
    const byes = m.byes.length
        ? `<p class="match-byes"><b>Sem confronto:</b> ${m.byes.map(s => escapeHtml(s.team.teamName)).join(' · ')}</p>`
        : '';
    return {
        html: nav + (games
            ? `${highlightsHTML(m.highlights, m.status === 'live')}<ul class="matches">${games}</ul>${byes}`
            : stateHTML({ icon: 'calendar', title: 'Sem confrontos', text: 'Esta semana não tem jogos nesta liga.' })),
        subtitle: m.subtitle,
        ready: !!games
    };
}

/**
 * Tabela da liga (configuração, usuários e elencos).
 * @param {Object} cfg  item de ALSO_LEAGUES
 * @returns {Promise<{leg: number, scored: number, status: string, numTeams: number, teams: Array}>}
 */
async function loadAlsoLeague(cfg) {
    const base = `https://api.sleeper.app/v1/league/${cfg.id}`;
    const [lgRes, usersRes, rostersRes] = await Promise.all([
        fetchWithRetry(base), fetchWithRetry(`${base}/users`), fetchWithRetry(`${base}/rosters`)
    ]);
    if (!lgRes.ok || !usersRes.ok || !rostersRes.ok) throw new Error(`${cfg.name} indisponível`);
    const [lg, users, rosters] = await Promise.all([lgRes.json(), usersRes.json(), rostersRes.json()]);
    const st = (lg && lg.settings) || {};
    const status = ['pre_draft', 'drafting', 'in_season', 'complete'].includes(lg && lg.status) ? lg.status : 'in_season';
    const userMap = {};
    (Array.isArray(users) ? users : []).forEach(u => { if (isValidUser(u)) userMap[u.user_id] = u; });

    const preseason = status === 'pre_draft' || status === 'drafting';
    const num = (a, b) => sanitizeNumber(a, 0, VALIDATION.MAX_POINTS, 0) + sanitizeNumber(b, 0, 99, 0) / 100;
    const teams = (Array.isArray(rosters) ? rosters : []).filter(isValidRoster)
        // antes do draft, vaga sem dono não é time
        .filter(r => !preseason || userMap[r.owner_id])
        .map(r => {
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
        }).sort((a, b) => (b.pct - a.pct) || (b.fpts - a.fpts) || a.teamName.localeCompare(b.teamName));
    return {
        leg: Math.round(sanitizeNumber(st.leg, 0, 60, 0)),
        scored: Math.round(sanitizeNumber(st.last_scored_leg, 0, 60, 0)),
        status,
        numTeams: Math.round(sanitizeNumber(st.num_teams, 0, 32, teams.length)),
        teams
    };
}

/**
 * Dados de uma liga (dispara a busca na 1ª vez; re-renderiza ao terminar).
 * @param {string} key  'premier' | 'nba'
 * @returns {{status: ('loading'|'ready'|'error'), data?: Object, fetchedAt?: number}}
 */
function alsoData(key) {
    if (_also[key]) return _also[key];
    const entry = _also[key] = { status: 'loading' };
    loadAlsoLeague(ALSO_LEAGUES[key])
        .then(data => { entry.status = 'ready'; entry.data = data; entry.fetchedAt = Date.now(); })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === key || (key === 'premier' && appState.tab === 'ligas' && isNflOffseason())) renderView();
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

/** Antes do draft (só times que já entraram). */
function isAlsoPreseason(data) {
    return data.status === 'pre_draft' || data.status === 'drafting';
}

/** Subtítulo do card. */
function alsoSubtitle(cfg, data) {
    if (isAlsoPreseason(data)) {
        const open = Math.max(0, data.numTeams - data.teams.length);
        const draft = data.status === 'drafting' ? 'draft em andamento' : 'aguardando o draft';
        return `${data.teams.length} de ${data.numTeams} times${open ? '' : ' · liga completa'} · ${draft} · ${cfg.season}`;
    }
    return `${data.teams.length} times · ${data.scored ? `após a rodada ${data.scored}` : 'antes da 1ª rodada'} · ${cfg.season}`;
}

/** "V–E–D" ou "V–D". */
function alsoRecord(cfg, t) {
    return cfg.ties ? `${t.wins}–${t.ties}–${t.losses}` : `${t.wins}–${t.losses}`;
}

/** Escudo da liga (redondo 1:1 ou brasão 141:160). */
function alsoCrestHTML(cfg, h) {
    const w = cfg.round ? h : Math.round(h * 141 / 160);
    return `<img class="crest${cfg.round ? ' crest--round' : ''}" src="${CREST_PATH}${cfg.crest}" alt="" width="${w}" height="${h}">`;
}

/** Link "Voltar para a NFL". */
function backToNflHTML() {
    return `<a class="back-link" href="${hashFor('ligas', appState.season, appState.series)}">
        <span data-icon="chevronLeft" data-size="18"></span>Voltar para a NFL
    </a>`;
}

/** Abas Premier League | NBA. */
function alsoTabsHTML(active) {
    return `<nav class="series-tabs also-tabs" aria-label="Também na KHC">${Object.values(ALSO_LEAGUES).map(cfg =>
        `<a href="#/${cfg.key}" data-league="${cfg.league}"${cfg.key === active ? ' aria-current="page"' : ''}>${alsoCrestHTML(cfg, 28)}<span>${escapeHtml(cfg.tab)}</span></a>`).join('')}</nav>`;
}

/**
 * Página #/premier ou #/nba.
 * @param {string} key
 * @returns {string} HTML
 */
function renderAlso(key) {
    const cfg = ALSO_LEAGUES[key];
    const entry = alsoData(key);
    const header = (subtitle, actions) => `<header class="card__hd">
            ${alsoCrestHTML(cfg, 56)}
            <div class="grow">
                <h2 class="display" id="also-title">${escapeHtml(cfg.name)}</h2>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            ${actions}
        </header>`;
    const wrap = inner => `${backToNflHTML()}
        ${alsoTabsHTML(key)}
        <section class="card also" data-league="${cfg.league}" aria-labelledby="also-title">${inner}</section>`;

    if (entry.status === 'loading') {
        const row = '<div class="skeleton-row"><span class="skeleton sk-pos"></span><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
        return wrap(header('Carregando…', '') + `<div aria-busy="true">${row.repeat(6)}</div>`);
    }
    if (entry.status === 'error') {
        return wrap(header('', '') + stateHTML({
            icon: 'alert', title: `Não deu pra carregar a ${cfg.tab}`,
            text: 'Verifique sua conexão e tente de novo.',
            action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
        }));
    }

    const d = entry.data;
    const pre = isAlsoPreseason(d);
    const showRound = alsoShowsRound(cfg, d);
    const toggle = cfg.weekly && !pre ? `<div class="view-switch" role="group" aria-label="O que mostrar">
            <button type="button" data-href="#/${cfg.key}" aria-pressed="${!showRound}">Tabela</button>
            <button type="button" data-href="#/${cfg.key}/rodada" aria-pressed="${showRound}">Rodada</button>
        </div>` : '';
    const actions = `<div class="export-actions" role="group" aria-label="Exportar tabela da ${escapeHtml(cfg.tab)} como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar tabela da ${escapeHtml(cfg.tab)} como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar tabela da ${escapeHtml(cfg.tab)} como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>`;
    if (showRound) {
        const r = alsoRoundHTML(cfg, d);
        return wrap(`${header(r.subtitle, r.ready ? actions : '')}${toggle}${r.html}`);
    }
    if (!d.teams.length) {
        return wrap(header(alsoSubtitle(cfg, d), '') + stateHTML({
            icon: 'calendar', title: 'Aguardando os times',
            text: 'Assim que a turma entrar na liga no Sleeper, os times aparecem aqui.'
        }));
    }
    const rows = d.teams.map((t, i) => `<tr>
            <td><span class="pos">${i + 1}</span></td>
            <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
            <td class="rec">${alsoRecord(cfg, t)}</td>
            <td>${fmtPts(t.fpts)}</td>
            <td class="hide-mobile">${fmtPts(t.fptsAgainst)}</td>
            <td>${fmtEff(t.efficiency)}</td>
        </tr>`).join('');
    const recTitle = cfg.ties ? 'Vitórias, empates e derrotas' : 'Vitórias e derrotas';
    const open = Math.max(0, d.numTeams - d.teams.length);
    const note = pre
        ? `Antes do draft: só os times que já entraram na liga${open ? ` (${open} ${open === 1 ? 'vaga aberta' : 'vagas abertas'})` : ''}. A tabela começa a contar na 1ª rodada.`
        : `Efic. = pontos feitos ÷ máximo possível com a melhor escalação de cada rodada (cálculo do Sleeper). Ordem: aproveitamento${cfg.ties ? ' (empate vale meia vitória)' : ''}, depois pontos.`;

    return wrap(`${header(alsoSubtitle(cfg, d), actions)}
        ${toggle}
        <div class="table-wrap">
            <table class="standings standings--compact">
                <caption class="sr-only">Classificação da ${escapeHtml(cfg.name)}</caption>
                <thead><tr>
                    <th scope="col">#</th>
                    <th scope="col">Time</th>
                    <th scope="col"><abbr title="${recTitle}">${cfg.ties ? 'V–E–D' : 'V–D'}</abbr></th>
                    <th scope="col"><abbr title="Pontos feitos">PF</abbr></th>
                    <th scope="col" class="hide-mobile"><abbr title="Pontos contra">PC</abbr></th>
                    <th scope="col"><abbr title="Eficiência de escalação: pontos feitos ÷ máximo possível com a melhor escalação">Efic.</abbr></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="chances-note">${escapeHtml(note)}</p>`);
}

/**
 * Cartão "Enquanto a NFL descansa" (topo da aba Ligas, só na entressafra).
 * @returns {string} HTML ('' fora da entressafra)
 */
function premierOffseasonCardHTML() {
    if (!isNflOffseason()) return '';
    const cfg = ALSO_LEAGUES.premier;
    const entry = alsoData('premier');
    const leader = entry.status === 'ready' ? entry.data.teams[0] : null;
    return `<a class="card offseason-card" data-league="epl" href="#/premier">
        ${alsoCrestHTML(cfg, 40)}
        <span class="grow">
            <span class="eyebrow eyebrow--accent">Enquanto a NFL descansa</span>
            <b>${escapeHtml(cfg.name)}</b>
            ${leader ? `<small>Líder: ${escapeHtml(leader.teamName)} · ${alsoRecord(cfg, leader)}</small>` : ''}
        </span>
        <span class="offseason-card__cta">Ver tabela ›</span>
    </a>`;
}
