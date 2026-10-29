// =============================================================================
// TAB / LIGAS · GUILHOTINA — "KHC Guilhotina" dentro da aba Ligas.
//
//   - Regra (Sleeper, liga tipo 3): a cada rodada, quem faz menos pontos
//     entre os vivos é cortado e o elenco vai para o waiver.
//   - Vivos: ordenados pelos pontos da rodada em andamento (ao vivo) ou, antes
//     de a rodada começar, pelos pontos da temporada. O último fica na
//     "zona de corte" (só depois que todos os vivos pontuaram na semana).
//   - Cortados: rodada do corte e pontos naquela rodada. O Sleeper marca a
//     rodada em settings.eliminated (o elenco nem sempre fica vazio: pode
//     sobrar jogador). Dados antigos em cache, sem o campo: elenco vazio e
//     a última rodada em que pontuou.
//   - Sem V–D: fica fora de Rodada, Top Scorers, Power Ranking e Chances.
//
// Lê: appState.lastUpdated · Depende de: config, api, ui/helpers
// =============================================================================

/** Time cortado na guilhotina? */
function isChopped(t) {
    if (t.eliminated !== undefined) return t.eliminated > 0;
    return t.rosterSize === 0;
}

const _guillotine = {};   // `${leagueId}|${lastUpdated}` → { status, data }

/**
 * Placares das rodadas já cortadas (cache) e da rodada em andamento (ao vivo).
 * @param {Object} league
 * @returns {Promise<{chopped: number, leg: number, done: Array<Object>, live: (Object|null), fetchedAt: number}>}
 */
async function loadGuillotine(league) {
    const id = league.info.id;
    const st = await fetchLeagueSettings(id);
    const chopped = st.lastChopped;
    const weeks = Array.from({ length: chopped }, (_, i) => i + 1);
    const [done, live] = await Promise.all([
        Promise.all(weeks.map(w => fetchWeekScores(id, w))),
        st.leg > chopped ? fetchWeekScores(id, st.leg, { live: true }) : Promise.resolve(null)
    ]);
    return { chopped, leg: st.leg, done, live, fetchedAt: Date.now() };
}

/**
 * Dados da guilhotina (dispara a busca na 1ª vez; re-renderiza ao terminar).
 * @param {Object} league
 * @returns {{status: ('loading'|'ready'|'error'), data?: Object}}
 */
function guillotineData(league) {
    const key = `${league.info.id}|${appState.lastUpdated || ''}`;
    if (_guillotine[key]) return _guillotine[key];
    const entry = _guillotine[key] = { status: 'loading' };
    loadGuillotine(league)
        .then(data => { entry.status = 'ready'; entry.data = data; })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === 'ligas' && appState.loadState === 'ready' && isGuillotine(appState.series)) renderView();
        });
    return entry;
}

/**
 * Vivos (ordenados) e cortados (mais recente primeiro).
 * @param {Object} league
 * @param {Object} data  resultado de loadGuillotine
 * @returns {{alive: Array, cut: Array, week: number, isLive: boolean, started: boolean, danger: number, subtitle: string, champion: (Object|null)}}
 */
function guillotineModel(league, data) {
    const teams = league.teams;
    const isCut = isChopped;
    const weekPts = (w, t) => (data.done[w - 1] && data.done[w - 1][t.teamId]) || 0;

    const cut = teams.filter(isCut).map(t => {
        let week = t.eliminated || 0;
        for (let w = data.chopped; !week && w >= 1; w--) {
            if (weekPts(w, t) > 0) { week = w; break; }
        }
        return { team: t, week: week || 1, pts: week ? weekPts(week, t) : 0 };
    }).sort((a, b) => (b.week - a.week) || (a.pts - b.pts));

    const isLive = !!data.live;
    const week = isLive ? data.leg : data.chopped;
    const ptsOf = t => (isLive ? (data.live[t.teamId] || 0) : weekPts(data.chopped, t));
    const aliveTeams = teams.filter(t => !isCut(t));
    const started = isLive && aliveTeams.some(t => ptsOf(t) > 0);
    const alive = aliveTeams.map(t => ({ team: t, week: ptsOf(t), pf: t.fpts }))
        .sort((a, b) => (started ? (b.week - a.week) : 0) || (b.pf - a.pf));

    const champion = alive.length === 1 && cut.length ? alive[0] : null;
    // Zona de corte só quando todos os vivos já pontuaram na semana: no começo
    // da rodada, quem ainda não jogou aparece com 0 e não está "na zona".
    const allScored = alive.every(r => r.week > 0);
    const danger = started && allScored && alive.length > 1 ? 1 : 0;
    const status = champion ? 'campeão definido'
        : isLive ? `Semana ${week} · ${started ? 'ao vivo' : 'a jogar'}`
        : `${data.chopped} ${data.chopped === 1 ? 'corte' : 'cortes'}`;
    return {
        alive, cut, week, isLive, started, danger, champion,
        subtitle: `${alive.length} vivos de ${teams.length} · ${status}`
    };
}

/**
 * Card da guilhotina.
 * @param {Object} league
 * @returns {string} HTML
 */
function renderGuillotine(league) {
    const meta = SERIES_META[league.info.tier];
    const entry = guillotineData(league);
    const header = (subtitle, actions) => `<header class="card__hd">
            ${crestHTML(league.info.tier, 56)}
            <div class="grow">
                <h2 class="display" id="series-title">${escapeHtml(meta.name)}</h2>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            ${actions}
        </header>`;
    const wrap = inner => `<section class="card guillotine" data-league="${meta.league}" aria-labelledby="series-title">${inner}</section>`;

    if (entry.status === 'loading') {
        const row = '<div class="skeleton-row"><span class="skeleton sk-pos"></span><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
        return wrap(header('Carregando…', '') + `<div aria-busy="true">${row.repeat(8)}</div>`);
    }
    if (entry.status === 'error') {
        return wrap(header('', '') + stateHTML({
            icon: 'alert', title: 'Não deu pra carregar a guilhotina',
            text: 'Verifique sua conexão e tente de novo.',
            action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
        }));
    }

    const m = guillotineModel(league, entry.data);
    const actions = `<div class="export-actions" role="group" aria-label="Exportar guilhotina como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar a ${escapeHtml(meta.name)} como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar a ${escapeHtml(meta.name)} como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>`;

    const n = m.alive.length;
    const rows = m.alive.map((r, i) => {
        const inDanger = i >= n - m.danger;
        const cutLine = m.danger && i === n - m.danger - 1;
        const weekCell = m.isLive && !m.started ? '—' : fmtPts(r.week);
        return `<tr class="${inDanger ? 'z-releg' : 'z-playoff'}${cutLine ? ' cut-releg' : ''}">
            <td><span class="pos">${i + 1}</span></td>
            <td class="cell-team">${teamButtonHTML({ user: r.team.ownerName, team: r.team.teamName, avatarId: r.team.avatar })}</td>
            <td class="rec">${weekCell}</td>
            <td>${fmtPts(r.pf)}</td>
        </tr>`;
    }).join('');

    const cutRows = m.cut.map(c => `<li class="cut-row">
            <span class="cut-row__week">R${c.week}</span>
            ${teamButtonHTML({ user: c.team.ownerName, team: c.team.teamName, avatarId: c.team.avatar })}
            <span class="num cut-row__pts">${fmtPts(c.pts)}</span>
        </li>`).join('');

    const weekHead = `Sem ${m.week}`;   // "ao vivo" já está no subtítulo
    const legend = [
        m.champion ? '<span><i class="legend__medal"></i>Último sobrevivente</span>' : '<span><i style="background:var(--zone-playoff)"></i>Vivos</span>',
        m.danger ? '<span><i style="background:var(--zone-releg)"></i>Zona de corte · menor pontuação da semana</span>' : '',
        '<span>Cortado: o elenco vai para o waiver</span>'
    ].join('');

    return wrap(`${header(m.subtitle, actions)}
        <div class="table-wrap">
            <table class="standings standings--compact">
                <caption class="sr-only">Times vivos na ${escapeHtml(meta.name)}</caption>
                <thead><tr>
                    <th scope="col">#</th>
                    <th scope="col">Vivos</th>
                    <th scope="col"><abbr title="Pontos na semana">${escapeHtml(weekHead)}</abbr></th>
                    <th scope="col"><abbr title="Pontos na temporada">PF</abbr></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="legend">${legend}</div>
        ${m.cut.length ? `<section class="cut-list" aria-labelledby="cut-title">
            <h3 class="eyebrow" id="cut-title">Cortados · ${m.cut.length}</h3>
            <ol>${cutRows}</ol>
        </section>` : ''}`);
}
