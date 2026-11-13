// =============================================================================
// TAB / LIGAS · COPA KHC — mata-mata do site, em paralelo às divisões.
//
//   - Não é liga do Sleeper: usa a pontuação que cada time já faz na sua
//     liga naquela semana. Não conta para playoffs nem rebaixamento.
//   - Participantes: todos os times das divisões (Séries A–F); Elite e
//     Guilhotina ficam fora (o time da Elite já está numa divisão).
//   - Semana classificatória (copa.qualifying): os `bracket` maiores
//     pontuadores avançam. Depois, sorteio livre da chave (drawCup com a
//     semente copa.seed: mesma semente = mesmo sorteio, dá para conferir) e
//     uma fase por semana até a final (32 times: semanas 13 a 17).
//   - Empate (no corte ou num jogo): mais pontos na semana anterior; depois
//     a ordem do sorteio.
//   - Configuração em KHC_CONFIG[ano].copa (config.js).
//
// Lê: appState.season, appState.leagues, appState.copaPhase
// Depende de: config, api, derivations (drawCup, cupRoundName), ui/helpers
// =============================================================================

const _copa = {};   // `${ano}|${lastUpdated}` → { status, data }

function resetCopaCache() {
    Object.keys(_copa).forEach(k => delete _copa[k]);
}

/** Configuração da Copa na temporada (ou null). */
function copaConfig(season) {
    const c = (KHC_CONFIG[season || appState.season] || {}).copa;
    return c && c.qualifying && c.bracket ? c : null;
}

/** Fases: classificatória + log2(bracket) rodadas, uma por semana. */
function copaPhases(cfg) {
    const phases = [{ key: 'q', name: 'Classificatória', week: cfg.qualifying }];
    for (let teams = cfg.bracket, w = cfg.qualifying + 1; teams >= 2; teams /= 2, w++) {
        phases.push({ key: `r${teams}`, name: cupRoundName(teams), short: teams === 2 ? 'Final' : teams === 4 ? 'Semi' : teams === 8 ? 'Quartas' : teams === 16 ? 'Oitavas' : `${teams / 2} avos`, week: w, teams });
    }
    return phases;
}

/** Ligas das divisões que entram na Copa. */
function copaLeagues() {
    return appState.leagues.filter(l => isRegularSeries(l.info.tier));
}

/**
 * Placares das semanas da Copa (e da anterior, para desempate).
 * @returns {Promise<{settings: Object, scores: Object<number, Object<string, number>>}>}
 */
async function loadCopa(cfg) {
    const leagues = copaLeagues();
    if (!leagues.length) throw new Error('sem divisões');
    const settings = await fetchLeagueSettings(leagues[0].info.id);
    const last = cfg.qualifying + copaPhases(cfg).length - 1;
    const weeks = [];
    for (let w = cfg.qualifying - 1; w <= Math.min(last, settings.leg); w++) if (w >= 1) weeks.push(w);
    const scores = {};
    await Promise.all(weeks.map(async w => {
        const live = w > settings.lastScored;
        const per = await Promise.all(leagues.map(l => fetchWeekScores(l.info.id, w, { live })));
        scores[w] = {};
        leagues.forEach((l, i) => {
            Object.entries(per[i]).forEach(([rid, pts]) => { scores[w][`${l.info.tier}:${rid}`] = pts; });
        });
    }));
    return { settings, scores, fetchedAt: Date.now() };
}

/** Dados da Copa (dispara a busca na 1ª vez; re-renderiza ao terminar). */
function copaData() {
    const cfg = copaConfig();
    if (!cfg) return { status: 'off' };
    const key = `${appState.season}|${appState.lastUpdated || ''}`;
    if (_copa[key]) return _copa[key];
    const entry = _copa[key] = { status: 'loading' };
    loadCopa(cfg)
        .then(data => { entry.status = 'ready'; entry.data = data; })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === 'ligas' && appState.loadState === 'ready' && isCup(appState.series)) renderView();
        });
    return entry;
}

/**
 * Tudo resolvido: classificatória, chave sorteada, jogos de cada fase e campeão.
 * @returns {{cfg: Object, phases: Array, entrants: Array, qualifying: Object, rounds: Array, champion: (Object|null), current: number}}
 */
function copaModel(data) {
    const cfg = copaConfig();
    const { settings, scores } = data;
    const phases = copaPhases(cfg);
    const status = w => (w <= settings.lastScored ? 'final' : w === settings.leg ? 'live' : 'upcoming');
    const pts = (w, k) => (scores[w] && scores[w][k]) || 0;

    // Participantes: todos os times das divisões
    const entrants = copaLeagues().flatMap(l => l.teams.map(t => ({ key: `${l.info.tier}:${t.teamId}`, tier: l.info.tier, team: t })));
    const byKey = Object.fromEntries(entrants.map(e => [e.key, e]));
    const keys = entrants.map(e => e.key).sort();

    // Classificatória: os `bracket` maiores pontuadores da semana
    const qw = cfg.qualifying;
    const ranked = keys.slice().sort((a, b) => (pts(qw, b) - pts(qw, a)) || (pts(qw - 1, b) - pts(qw - 1, a)) || a.localeCompare(b));
    const qStatus = status(qw);
    const qualifying = {
        week: qw, status: qStatus, cut: Math.min(cfg.bracket, ranked.length),
        rows: ranked.map((k, i) => ({ entry: byKey[k], points: pts(qw, k), rank: i + 1 }))
    };

    // Chave: sorteada só quando a classificatória fecha
    const rounds = [];
    let champion = null;
    if (qStatus === 'final') {
        let slots = drawCup(ranked.slice(0, cfg.bracket), cfg.seed).slots.map(s => s.team);
        phases.slice(1).forEach(ph => {
            const st = status(ph.week);
            const games = [];
            for (let i = 0; i < slots.length; i += 2) {
                const a = slots[i], b = slots[i + 1];
                const g = { a: a && { entry: byKey[a], points: pts(ph.week, a) }, b: b && { entry: byKey[b], points: pts(ph.week, b) }, winner: '' };
                if (st === 'final' && a && b) {
                    const d = (pts(ph.week, a) - pts(ph.week, b)) || (pts(ph.week - 1, a) - pts(ph.week - 1, b));
                    g.winner = d >= 0 ? 'a' : 'b';   // empate total: ordem do sorteio
                }
                games.push(g);
            }
            rounds.push({ ...ph, status: st, games });
            slots = games.map(g => (g.winner === 'a' ? g.a.entry.key : g.winner === 'b' ? g.b.entry.key : null));
        });
        const fin = rounds[rounds.length - 1];
        const g = fin && fin.games[0];
        if (g && g.winner) champion = { winner: g[g.winner].entry, runnerUp: g[g.winner === 'a' ? 'b' : 'a'].entry };
    }

    // Fase aberta: a escolhida, ou a da semana atual (limitada às fases da Copa)
    const byWeek = phases.findIndex(p => p.week === settings.leg);
    const auto = settings.leg < qw ? 0 : byWeek >= 0 ? byWeek : phases.length - 1;
    const current = appState.copaPhase !== null && appState.copaPhase >= 0 && appState.copaPhase < phases.length ? appState.copaPhase : auto;
    return { cfg, phases, entrants, qualifying, rounds, champion, current };
}

/** Subtítulo do card. */
function copaSubtitle(m) {
    const last = m.phases[m.phases.length - 1].week;
    return `${m.cfg.test ? 'Teste · ' : ''}${m.entrants.length} times · semanas ${m.cfg.qualifying} a ${last}`;
}

/** Lado de um confronto da Copa (time + série + pontos). */
function copaSideHTML(s, state, status, placeholder) {
    if (!s) return `<div class="match__side bracket__tbd"><span>${escapeHtml(placeholder)}</span></div>`;
    const t = s.entry.team;
    const pts = status === 'upcoming' ? '' : fmtPts(s.points);
    return `<div class="match__side${state ? ' is-' + state : ''}">
        ${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}
        ${seriesPillHTML(s.entry.tier)}
        ${pts ? `<span class="num match__pts">${pts}</span>` : ''}
    </div>`;
}

/**
 * Corpo da aba Copa (dentro de Ligas).
 * @returns {string} HTML
 */
function renderCopa() {
    const cfg = copaConfig();
    const meta = SERIES_META.copa;
    const entry = copaData();
    const header = (subtitle, actions) => `<header class="card__hd">
            ${crestHTML('copa', 56)}
            <div class="grow">
                <h2 class="display" id="series-title">${escapeHtml(meta.name)}</h2>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            ${actions}
        </header>`;
    const wrap = inner => `<section class="card copa" data-league="copa" aria-labelledby="series-title">${inner}</section>`;
    if (!cfg) return wrap(header('', '') + stateHTML({ icon: 'trophy', title: 'Sem Copa nesta temporada' }));
    if (entry.status === 'loading') {
        const row = '<div class="skeleton-row"><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
        return wrap(header('Carregando…', '') + `<div aria-busy="true">${row.repeat(8)}</div>`);
    }
    if (entry.status === 'error') {
        return wrap(header('', '') + stateHTML({
            icon: 'alert', title: 'Não deu pra carregar a Copa',
            text: 'Verifique sua conexão e tente de novo.',
            action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
        }));
    }

    const m = copaModel(entry.data);
    const ph = m.phases[m.current];
    const statusText = { final: 'Encerrada', live: 'Ao vivo', upcoming: 'A jogar' };
    const tabs = `<div class="view-switch copa-phases" role="group" aria-label="Fase da Copa">${m.phases.map((p, i) =>
        `<button type="button" data-copa-phase="${i}" aria-pressed="${i === m.current}">${escapeHtml(p.short || p.name)}<small>S${p.week}</small></button>`).join('')}</div>`;

    let body;
    let exportable = true;
    if (m.current === 0) {
        const q = m.qualifying;
        const shown = q.status !== 'upcoming';
        // Antes da semana: só a lista de participantes (por série), sem corte
        const list = shown ? q.rows : q.rows.slice().sort((a, b) =>
            (TIER_ORDER.indexOf(a.entry.tier) - TIER_ORDER.indexOf(b.entry.tier)) || a.entry.team.teamName.localeCompare(b.entry.team.teamName));
        const rows = list.map((r, i) => {
            const t = r.entry.team;
            const cutLine = shown && i === q.cut - 1 && i < q.rows.length - 1;
            const out = shown && i >= q.cut;
            return `<tr class="${!shown ? '' : out ? 'z-releg' : 'z-playoff'}${cutLine ? ' cut-releg' : ''}">
                <td><span class="pos">${shown ? i + 1 : '–'}</span></td>
                <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
                <td>${seriesPillHTML(r.entry.tier)}</td>
                <td class="rec">${shown ? fmtPts(r.points) : '—'}</td>
            </tr>`;
        }).join('');
        body = `<div class="table-wrap">
                <table class="standings standings--compact copa-q">
                    <caption class="sr-only">Classificatória da Copa KHC, semana ${q.week}</caption>
                    <thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Série</th><th scope="col"><abbr title="Pontos na semana ${q.week}">Sem ${q.week}</abbr></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="legend">${shown
                ? `<span><i style="background:var(--zone-playoff)"></i>Os ${q.cut} maiores pontuadores da semana ${q.week} avançam${q.status === 'live' ? ' (parcial)' : ''}</span><span><i style="background:var(--zone-releg)"></i>${q.status === 'live' ? 'Fora, por enquanto' : 'Eliminados'}</span>`
                : `<span>${q.rows.length} participantes. Na semana ${q.week}, os ${q.cut} maiores pontuadores avançam para o mata-mata.</span>`}</div>`;
        exportable = true;
    } else {
        const r = m.rounds[m.current - 1];
        if (!r) {
            body = stateHTML({ icon: 'calendar', title: 'Chave ainda não sorteada', text: `O sorteio sai quando a semana ${m.cfg.qualifying} fechar, com os ${m.cfg.bracket} classificados.` });
            exportable = false;
        } else {
            const prev = m.current >= 2 ? m.phases[m.current - 1] : null;
            const ph2 = prev ? (prev.short || prev.name).toLowerCase() : '';
            body = `<ul class="matches">${r.games.map((g, i) => {
                const ph1 = prev ? `Vencedor do jogo ${2 * i + 1} (${ph2})` : 'A definir';
                const ph1b = prev ? `Vencedor do jogo ${2 * i + 2} (${ph2})` : 'A definir';
                return `<li class="match${ph.teams === 2 ? ' match--final' : ''}">
                    <div class="eyebrow match__label${ph.teams === 2 ? ' eyebrow--accent' : ''}">${ph.teams === 2 ? 'Final' : `Jogo ${i + 1}`}</div>
                    ${copaSideHTML(g.a, g.winner === 'a' ? 'win' : g.winner === 'b' ? 'lose' : '', r.status, ph1)}
                    ${copaSideHTML(g.b, g.winner === 'b' ? 'win' : g.winner === 'a' ? 'lose' : '', r.status, ph1b)}
                </li>`;
            }).join('')}</ul>`;
            exportable = r.games.some(g => g.a && g.b);
        }
    }

    const champ = m.champion ? `<div class="copa-champ">
            <span class="medal medal--1">1</span>
            <span class="grow"><span class="eyebrow eyebrow--accent">Campeão da Copa KHC</span><b dir="auto">${escapeHtml(m.champion.winner.team.teamName)}</b>
            <small>${escapeHtml(m.champion.winner.team.ownerName)} · vice: ${escapeHtml(m.champion.runnerUp.team.teamName)}</small></span>
        </div>` : '';
    const actions = exportable ? `<div class="export-actions" role="group" aria-label="Exportar a fase da Copa como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar ${escapeHtml(ph.name)} da Copa como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar ${escapeHtml(ph.name)} da Copa como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>` : '';
    const phStatus = m.current === 0 ? m.qualifying.status : (m.rounds[m.current - 1] || {}).status || 'upcoming';
    const note = m.cfg.test
        ? `Teste: a Copa KHC vale a partir de 2027 e não soma Pontos KHC agora. Não conta para playoffs nem rebaixamento. Usa os pontos de cada time na sua liga na semana. Sorteio livre com a semente "${m.cfg.seed}"; empate: mais pontos na semana anterior.`
        : `Não conta para playoffs nem rebaixamento. Usa os pontos de cada time na sua liga na semana. Sorteio livre com a semente "${m.cfg.seed}"; empate: mais pontos na semana anterior.`;

    return wrap(`${header(`${copaSubtitle(m)} · ${ph.name} · semana ${ph.week} · ${statusText[phStatus]}`, actions)}
        ${tabs}
        ${champ}
        ${body}
        <p class="chances-note">${escapeHtml(note)}</p>`);
}
