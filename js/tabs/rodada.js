// =============================================================================
// TAB / RODADA — Confrontos da semana de uma série, com placar.
//
//   - Abas por série (iguais às da Ligas) e navegação de semana (‹ select ›).
//   - Semana padrão: a atual da liga (settings.leg); temporada encerrada →
//     última semana dos playoffs.
//   - Status da semana: encerrada (≤ last_scored_leg), em andamento (= leg)
//     ou a jogar. Vencedor só é marcado na semana encerrada.
//   - Playoffs: rótulos pelo chaveamento (Final, 3º lugar, Semifinal…);
//     jogos fora do chaveamento = Consolação; sem jogo = lista "Sem confronto".
//   - Botões Baixar / Compartilhar: os confrontos viram PNG (ui/export.js).
//
// Dados sob demanda (só a série/semana aberta), em memória; loadData() limpa.
// Lê: appState.leagues, appState.season, appState.series, appState.matchWeek
// Depende de: config, sanitize, api, data, ui/helpers, tabs/ligas
// =============================================================================

const _leagueSettings = {};   // leagueId → { status, data }
const _rounds = {};           // `${leagueId}|${week}` → { status, data }

/** Esquece settings e placares (recarregar dados). */
function resetRoundCache() {
    Object.keys(_leagueSettings).forEach(k => delete _leagueSettings[k]);
    Object.keys(_rounds).forEach(k => delete _rounds[k]);
}

/** Última semana da liga: temporada regular + rodadas de playoff. */
function lastWeekOf(settings) {
    const rounds = settings.playoffTeams > 1 ? Math.ceil(Math.log2(settings.playoffTeams)) : 0;
    return Math.max(1, settings.playoffStart - 1 + rounds);
}

/** Semana exibida: a escolhida (limitada) ou a padrão. */
function effectiveWeek(settings) {
    const last = lastWeekOf(settings);
    if (appState.matchWeek) return Math.min(Math.max(1, appState.matchWeek), last);
    if (isSeasonFinalized()) return last;
    return Math.min(Math.max(1, settings.leg || 1), last);
}

/** 'final' | 'live' | 'upcoming' */
function weekStatus(settings, week) {
    if (week <= settings.lastScored) return 'final';
    if (week === settings.leg) return 'live';
    return 'upcoming';
}

/**
 * Seleção atual da aba Rodada para uma liga. Dispara o carregamento do que
 * faltar; quando chega, re-renderiza se ainda for a mesma seleção.
 * @param {Object} league
 * @returns {{status: ('loading'|'ready'|'error'), week?: number, settings?: Object, data?: Object}}
 */
function currentRound(league) {
    const id = league.info.id;
    const st = _leagueSettings[id];
    if (!st) {
        _leagueSettings[id] = { status: 'loading' };
        fetchLeagueSettings(id)
            .then(data => { _leagueSettings[id] = { status: 'ready', data }; })
            .catch(() => { _leagueSettings[id] = { status: 'error' }; })
            .then(rerenderRoundIfShowing);
        return { status: 'loading' };
    }
    if (st.status !== 'ready') return { status: st.status };

    const settings = st.data;
    const week = effectiveWeek(settings);
    const key = `${id}|${week}`;
    const rd = _rounds[key];
    if (!rd) {
        _rounds[key] = { status: 'loading' };
        fetchRoundData(id, week)
            .then(data => { _rounds[key] = { status: 'ready', data }; })
            .catch(() => { _rounds[key] = { status: 'error' }; })
            .then(rerenderRoundIfShowing);
        return { status: 'loading', week, settings };
    }
    return { status: rd.status, week, settings, data: rd.data };
}

function rerenderRoundIfShowing() {
    if (appState.tab === 'rodada' && appState.loadState === 'ready') renderView();
}

/**
 * Nome da rodada de playoff pelo chaveamento.
 * @returns {string}
 */
function playoffLabel(game, totalRounds) {
    if (game.p === 1) return 'Final';
    if (game.p === 3) return 'Disputa do 3º lugar';
    if (game.p) return `Disputa do ${game.p}º lugar`;
    if (game.r === totalRounds - 1) return 'Semifinal';
    if (game.r === totalRounds - 2) return 'Quartas de final';
    return `Playoffs · rodada ${game.r}`;
}

/**
 * Confrontos prontos para desenhar (HTML e PNG).
 * @returns {{games: Array<{label: string, a: Object, b: Object, winner: (''|'a'|'b')}>,
 *            byes: Array<Object>, status: string, subtitle: string, isPlayoff: boolean}}
 */
function roundModel(league, round) {
    const { settings, week, data } = round;
    const status = weekStatus(settings, week);
    const byRoster = {};
    league.teams.forEach(t => { byRoster[t.teamId] = t; });
    const side = m => ({ team: byRoster[m.rosterId] || { teamName: `Time ${m.rosterId}`, ownerName: '', avatar: null }, points: m.points, rosterId: m.rosterId });

    const groups = {};
    const byes = [];
    data.matchups.forEach(m => {
        if (m.matchupId === null) byes.push(side(m));
        else (groups[m.matchupId] = groups[m.matchupId] || []).push(m);
    });

    const isPlayoff = week >= settings.playoffStart;
    const roundNo = week - settings.playoffStart + 1;
    const totalRounds = lastWeekOf(settings) - settings.playoffStart + 1;
    const bracketRound = data.bracket.filter(g => g.r === roundNo);

    const games = Object.keys(groups).map(Number).sort((x, y) => x - y).map(mid => {
        const [ma, mb] = groups[mid];
        if (!mb) { byes.push(side(ma)); return null; }
        let label = '';
        let order = 100 + mid;
        if (isPlayoff) {
            const g = bracketRound.find(b => (b.t1 === ma.rosterId && b.t2 === mb.rosterId) || (b.t1 === mb.rosterId && b.t2 === ma.rosterId));
            label = g ? playoffLabel(g, totalRounds) : 'Consolação';
            // Final, 3º lugar, chaveamento principal, outras colocações, consolação
            order = !g ? 200 + mid : g.p === 1 ? 1 : g.p === 3 ? 2 : !g.p ? 3 : 10 + g.p;
        }
        const a = side(ma), b = side(mb);
        let winner = '';
        if (status === 'final' && a.points !== b.points) winner = a.points > b.points ? 'a' : 'b';
        return { label, order, a, b, winner };
    }).filter(Boolean).sort((x, y) => x.order - y.order);

    const statusText = { final: 'Encerrada', live: 'Em andamento', upcoming: 'A jogar' }[status];
    const weekText = isPlayoff ? `Playoffs · Semana ${week}` : `Semana ${week} de ${settings.playoffStart - 1}`;
    return { games, byes, status, isPlayoff, subtitle: `${weekText} · ${statusText}` };
}

/** Lado de um confronto (time + pontos). */
function matchSideHTML(s, state, status) {
    const pts = status === 'upcoming' ? '—' : fmtPts(s.points);
    return `<div class="match__side${state ? ' is-' + state : ''}">
        ${teamButtonHTML({ user: s.team.ownerName, team: s.team.teamName, avatarId: s.team.avatar })}
        <span class="num match__pts">${pts}</span>
    </div>`;
}

/** Navegação de semana: ‹ [select] ›. */
function weekNavHTML(settings, week) {
    const last = lastWeekOf(settings);
    const link = w => hashFor('rodada', appState.season, appState.series, w);
    const options = Array.from({ length: last }, (_, i) => i + 1).map(w =>
        `<option value="${w}"${w === week ? ' selected' : ''}>Semana ${w}${w >= settings.playoffStart ? ' · Playoffs' : ''}</option>`).join('');
    const arrow = (w, icon, label) => (w >= 1 && w <= last)
        ? `<a class="icon-btn" href="${link(w)}" aria-label="${label}"><span data-icon="${icon}" data-size="20"></span></a>`
        : `<span class="icon-btn is-disabled" aria-hidden="true"><span data-icon="${icon}" data-size="20"></span></span>`;
    return `<div class="week-nav">
        ${arrow(week - 1, 'chevronLeft', 'Semana anterior')}
        <label class="week-nav__select"><span class="sr-only">Semana</span>
            <select data-week-select>${options}</select>
        </label>
        ${arrow(week + 1, 'chevronRight', 'Próxima semana')}
    </div>`;
}

/** Placeholder enquanto os confrontos carregam. */
function matchesSkeletonHTML() {
    const row = '<div class="skeleton-row"><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
    return `<div aria-busy="true" aria-label="Carregando confrontos">${row.repeat(6)}</div>`;
}

/**
 * Renderiza a aba Rodada.
 * @returns {string} HTML
 */
function renderRodada() {
    const leagues = sortLeagues(appState.leagues);
    const tier = resolveSeriesTier(leagues);
    if (!tier) {
        return stateHTML({ icon: 'swords', title: 'Nada por aqui ainda', text: 'Nenhuma série desta temporada carregou.' });
    }
    appState.series = tier;
    const league = leagues.find(l => l.info.tier === tier);
    const meta = SERIES_META[tier];
    const round = currentRound(league);

    const tabs = leagues.map(l => {
        const m = SERIES_META[l.info.tier];
        const current = l.info.tier === tier;
        return `<a href="${hashFor('rodada', appState.season, l.info.tier, appState.matchWeek)}" data-league="${m.league}"${current ? ' aria-current="page"' : ''}>
            ${crestHTML(l.info.tier, 28)}<span>${escapeHtml(m.short)}</span></a>`;
    }).join('');

    const error = stateHTML({
        icon: 'alert',
        title: 'Não deu pra carregar os confrontos',
        text: 'Verifique sua conexão e tente de novo.',
        action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
    });

    let subtitle = 'Carregando…';
    let nav = '';
    let body = matchesSkeletonHTML();
    let actions = '';
    if (round.settings) nav = weekNavHTML(round.settings, round.week);
    if (round.status === 'error') {
        body = error;
        subtitle = '';
    } else if (round.status === 'ready') {
        const m = roundModel(league, round);
        subtitle = m.subtitle;
        const games = m.games.map(g => `<li class="match">
            ${g.label ? `<div class="eyebrow match__label${g.label === 'Final' ? ' eyebrow--accent' : ''}">${escapeHtml(g.label)}</div>` : ''}
            ${matchSideHTML(g.a, g.winner === 'a' ? 'win' : g.winner === 'b' ? 'lose' : '', m.status)}
            ${matchSideHTML(g.b, g.winner === 'b' ? 'win' : g.winner === 'a' ? 'lose' : '', m.status)}
        </li>`).join('');
        const byes = m.byes.length
            ? `<p class="match-byes"><b>Sem confronto:</b> ${m.byes.map(s => escapeHtml(s.team.teamName)).join(' · ')}</p>`
            : '';
        body = games
            ? `<ul class="matches">${games}</ul>${byes}`
            : stateHTML({ icon: 'calendar', title: 'Sem confrontos', text: 'Esta semana não tem jogos nesta série.' });
        if (games) {
            actions = `<div class="export-actions" role="group" aria-label="Exportar confrontos como imagem">
                <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar confrontos da ${escapeHtml(meta.name)} como imagem">
                    <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
                </button>
                ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar confrontos da ${escapeHtml(meta.name)} como imagem">
                    <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
                </button>` : ''}
            </div>`;
        }
    }

    return `
        ${partialWarningHTML()}
        <nav class="series-tabs" aria-label="Séries">${tabs}</nav>
        <section class="card round" data-league="${meta.league}" aria-labelledby="round-title">
            <header class="card__hd">
                ${crestHTML(tier, 56)}
                <div class="grow">
                    <h2 class="display" id="round-title">${escapeHtml(meta.name)}</h2>
                    <p>${escapeHtml(subtitle)}</p>
                </div>
                ${actions}
            </header>
            ${nav}
            ${body}
        </section>`;
}
