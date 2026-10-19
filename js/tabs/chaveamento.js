// =============================================================================
// CHAVEAMENTO — Playoffs de uma série (visão "Chaveamento" da aba Ligas).
//
//   - Elite (4 times): semis 1º×4º e 2º×3º na semana 15; final e 3º lugar
//     na 16.
//   - Séries A–D (6 times): 1º e 2º folgam nas quartas. Quartas 4º×5º e
//     3º×6º na 15; semis (1º × venc. 4º×5º, 2º × venc. 3º×6º) e 5º lugar na
//     16; final e 3º lugar na 17.
//   - 1º e 2º aparecem como "Folga" na coluna das quartas.
//   - Nas semanas de playoff a aba Ligas abre nesta visão (tabs/ligas.js).
//   - Temporada regular em andamento: projeção "se terminasse hoje", com a
//     ordem da tabela do site (vitórias, depois pontos) e a chance de
//     playoffs de cada time (tabs/chances.js).
//   - Temporada regular encerrada: chaveamento oficial do Sleeper
//     (winners_bracket), com placares das semanas de playoff.
//
// Lê: appState.lastUpdated · Depende de: config, api, ui/helpers,
//     tabs/rodada (lastWeekOf, playoffLabel)
// =============================================================================

const _brackets = {};   // `${leagueId}|${lastUpdated}` → { status, data }

function resetBracketCache() {
    Object.keys(_brackets).forEach(k => delete _brackets[k]);
}

/**
 * Formatos da KHC, no mesmo formato do winners_bracket do Sleeper
 * (m, r, t1/t2 = semente, t1_from/t2_from = vencedor/perdedor de m, p = colocação).
 */
const BRACKET_TEMPLATES = {
    4: [
        { m: 1, r: 1, t1: 1, t2: 4 },
        { m: 2, r: 1, t1: 2, t2: 3 },
        { m: 3, r: 2, t1_from: { w: 1 }, t2_from: { w: 2 }, p: 1 },
        { m: 4, r: 2, t1_from: { l: 1 }, t2_from: { l: 2 }, p: 3 }
    ],
    6: [
        { m: 1, r: 1, t1: 4, t2: 5 },
        { m: 2, r: 1, t1: 3, t2: 6 },
        { m: 3, r: 2, t1: 1, t2_from: { w: 1 } },
        { m: 4, r: 2, t1: 2, t2_from: { w: 2 } },
        { m: 5, r: 2, t1_from: { l: 1 }, t2_from: { l: 2 }, p: 5 },
        { m: 6, r: 3, t1_from: { w: 3 }, t2_from: { w: 4 }, p: 1 },
        { m: 7, r: 3, t1_from: { l: 3 }, t2_from: { l: 4 }, p: 3 }
    ]
};

/** Origem válida ({w: m} ou {l: m}) ou null. */
function bracketFrom(f) {
    if (!f || typeof f !== 'object') return null;
    if (Number.isInteger(f.w)) return { w: f.w };
    if (Number.isInteger(f.l)) return { l: f.l };
    return null;
}

/**
 * Chaveamento oficial (se a temporada regular acabou) e placares das
 * semanas de playoff já começadas.
 * @param {Object} league
 * @returns {Promise<{settings: Object, official: boolean, games: Array, scores: Object<number, Object>, fetchedAt: number}>}
 */
async function loadBracket(league) {
    const id = league.info.id;
    const settings = await fetchLeagueSettings(id);
    const official = settings.lastScored >= settings.playoffStart - 1;
    let games = [];
    if (official) {
        const res = await fetchWithRetry(`https://api.sleeper.app/v1/league/${id}/winners_bracket`);
        if (!res.ok) throw new Error(getErrorMessage(res.status));
        const raw = await res.json();
        const int = v => (Number.isInteger(v) ? v : null);
        games = (Array.isArray(raw) ? raw : []).filter(g => g && Number.isInteger(g.m) && Number.isInteger(g.r)).map(g => ({
            m: g.m, r: g.r, p: int(g.p),
            t1: int(g.t1), t2: int(g.t2), w: int(g.w), l: int(g.l),
            t1_from: bracketFrom(g.t1_from), t2_from: bracketFrom(g.t2_from)
        }));
    }
    const scores = {};
    if (official) {
        const weeks = [];
        for (let w = settings.playoffStart; w <= Math.min(lastWeekOf(settings), settings.leg); w++) weeks.push(w);
        const got = await Promise.all(weeks.map(w => fetchWeekScores(id, w, { live: w > settings.lastScored })));
        weeks.forEach((w, i) => { scores[w] = got[i]; });
    }
    return { settings, official, games, scores, fetchedAt: Date.now() };
}

/**
 * Chaveamento da série (dispara a busca na 1ª vez; re-renderiza ao terminar).
 * @param {Object} league
 * @returns {{status: ('loading'|'ready'|'error'), data?: Object}}
 */
function bracketData(league) {
    const key = `${league.info.id}|${appState.lastUpdated || ''}`;
    if (_brackets[key]) return _brackets[key];
    const entry = _brackets[key] = { status: 'loading' };
    loadBracket(league)
        .then(data => { entry.status = 'ready'; entry.data = data; })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (appState.tab === 'ligas' && appState.loadState === 'ready') renderView();
        });
    return entry;
}

/** "Semana 15". */
function bracketWeekOf(settings, r) {
    return settings.playoffStart + r - 1;
}

/**
 * Chaveamento pronto para desenhar (HTML e PNG).
 * @param {Object} league
 * @param {Object} data  resultado de loadBracket
 * @returns {{rounds: Array<{r: number, week: number, title: string, games: Array, byes: Array}>,
 *            official: boolean, podium: Array<Object>, subtitle: string, note: string}}
 */
function bracketModel(league, data) {
    const { settings } = data;
    const spots = league.info.tier === 'elite' ? 4 : 6;
    const seedOf = {};
    league.teams.forEach((t, i) => { seedOf[t.teamId] = i + 1; });
    const byRoster = {};
    league.teams.forEach(t => { byRoster[t.teamId] = t; });

    // Projeção: sementes = ordem atual da tabela
    const games = data.official && data.games.length
        ? data.games
        : (BRACKET_TEMPLATES[spots] || []).map(g => ({
            ...g,
            t1: g.t1 ? (league.teams[g.t1 - 1] || {}).teamId || null : null,
            t2: g.t2 ? (league.teams[g.t2 - 1] || {}).teamId || null : null,
            w: null, l: null
        }));
    // Projeção: chance de playoffs de cada time (mesma conta da visão Chances)
    const odds = !data.official ? leagueOdds(league) : null;
    const chanceOf = rid => (odds && odds.status === 'ready' && odds.data.active && odds.data.byId[rid]
        ? odds.data.byId[rid].playoffs : null);
    const totalRounds = Math.max(0, ...games.map(g => g.r));
    const byM = {};
    games.forEach(g => { byM[g.m] = g; });

    /** "4º × 5º", "semi do 1º" ou o rótulo do jogo de origem. */
    const describe = g => {
        if (g.t1 && g.t2) return `${Math.min(seedOf[g.t1], seedOf[g.t2])}º × ${Math.max(seedOf[g.t1], seedOf[g.t2])}º`;
        const known = g.t1 || g.t2;
        const label = playoffLabel(g, totalRounds);
        if (known && label === 'Semifinal') return `semi do ${seedOf[known]}º`;
        return label.replace(/^Disputa do /, '');
    };
    const side = (rid, from, g) => {
        const week = bracketWeekOf(settings, g.r);
        const played = data.official && week <= settings.leg;
        if (rid && byRoster[rid]) {
            const pts = played && data.scores[week] ? (data.scores[week][rid] || 0) : null;
            return { team: byRoster[rid], seed: seedOf[rid], points: pts, rid, chance: chanceOf(rid) };
        }
        const src = from && byM[from.w || from.l];
        const who = from && from.w ? 'Vencedor' : 'Perdedor';
        if (!src) return { team: null, placeholder: 'A definir' };
        const what = describe(src);
        return { team: null, placeholder: `${who} ${what.startsWith('semi') ? 'da' : 'de'} ${what}` };
    };

    const rounds = [];
    for (let r = 1; r <= totalRounds; r++) {
        const week = bracketWeekOf(settings, r);
        const status = !data.official ? 'projection' : week <= settings.lastScored ? 'final' : week === settings.leg ? 'live' : 'upcoming';
        const list = games.filter(g => g.r === r)
            // chave principal primeiro, depois colocações (Final, 3º, 5º)
            .sort((a, b) => ((a.p || 0) - (b.p || 0)) || (a.m - b.m))
            .map(g => {
                let a = side(g.t1, g.t1_from, g);
                let b = side(g.t2, g.t2_from, g);
                // melhor semente em cima; time definido antes de "Vencedor de…"
                if ((!a.team && b.team) || (a.team && b.team && b.seed < a.seed)) [a, b] = [b, a];
                let winner = '';
                if (g.w && a.rid === g.w) winner = 'a';
                else if (g.w && b.rid === g.w) winner = 'b';
                return { label: playoffLabel(g, totalRounds), p: g.p, a, b, winner, status };
            });
        // Folga: quem joga a rodada seguinte sem ter jogado esta (1º e 2º nas quartas)
        const playing = new Set(games.filter(g => g.r === r).flatMap(g => [g.t1, g.t2]).filter(Boolean));
        const byes = r === 1 ? games.filter(g => g.r === 2 && !g.p).flatMap(g => [g.t1, g.t2])
            .filter(rid => rid && byRoster[rid] && !playing.has(rid))
            .map(rid => ({ team: byRoster[rid], seed: seedOf[rid], chance: chanceOf(rid) })).sort((x, y) => x.seed - y.seed) : [];
        const main = list.find(g => !g.p) || list[0];
        rounds.push({ r, week, status, byes, title: main ? main.label.replace(/^Quartas de final$/, 'Quartas').replace(/^Semifinal$/, 'Semifinais') : `Rodada ${r}`, games: list });
    }

    // Pódio (quando a final e o 3º lugar já têm vencedor)
    const podium = [];
    const placed = p => games.find(g => g.p === p && g.w);
    const fin = placed(1), third = placed(3);
    if (fin) podium.push({ pos: 1, team: byRoster[fin.w] }, { pos: 2, team: byRoster[fin.l] });
    if (fin && third) podium.push({ pos: 3, team: byRoster[third.w] });

    const anyLive = rounds.some(r => r.status === 'live');
    const champion = podium.length ? 'campeão definido' : null;
    const subtitle = !data.official
        ? `Projeção · se a temporada regular terminasse hoje`
        : `Playoffs · ${champion || (anyLive ? 'em andamento' : `semanas ${settings.playoffStart}–${lastWeekOf(settings)}`)}`;
    const after = settings.lastScored ? `após a rodada ${settings.lastScored}` : 'antes da 1ª rodada';
    const note = !data.official
        ? `Pela tabela de hoje (${after}). % = chance de ir aos playoffs. O chaveamento oficial sai do Sleeper depois da semana ${settings.playoffStart - 1}.`
        : 'Chaveamento do Sleeper.';
    return { rounds, official: data.official, podium: podium.filter(x => x.team), subtitle, note };
}

/** Lado de um jogo do chaveamento. */
function bracketSideHTML(s, state, status) {
    if (!s.team) {
        return `<div class="match__side bracket__tbd"><span>${escapeHtml(s.placeholder)}</span></div>`;
    }
    const pts = s.points === null || status === 'upcoming' ? '' : fmtPts(s.points);
    return `<div class="match__side${state ? ' is-' + state : ''}">
        <span class="bracket__seed num">${s.seed}º</span>
        ${teamButtonHTML({ user: s.team.ownerName, team: s.team.teamName, avatarId: s.team.avatar })}
        ${pts ? `<span class="num match__pts">${pts}</span>` : ''}
        ${s.chance !== null && s.chance !== undefined ? `<span class="bracket__pct num${s.chance >= 0.9 ? ' is-hot' : ''}" title="Chance de ir aos playoffs">${fmtPct(s.chance)}</span>` : ''}
    </div>`;
}

/**
 * Corpo da visão Chaveamento (dentro do card da aba Ligas).
 * @param {Object} league
 * @returns {{html: string, subtitle: (string|null), ready: boolean}}
 */
function bracketViewHTML(league) {
    const entry = bracketData(league);
    if (entry.status === 'loading') {
        const row = '<div class="skeleton-row"><span class="skeleton sk-avatar"></span><span class="sk-text"><span class="skeleton sk-line"></span><span class="skeleton sk-line sk-line--short"></span></span><span class="skeleton sk-num"></span></div>';
        return { html: `<div aria-busy="true" aria-label="Carregando chaveamento">${row.repeat(6)}</div>`, subtitle: 'Carregando…', ready: false };
    }
    if (entry.status === 'error') {
        return {
            html: stateHTML({
                icon: 'alert', title: 'Não deu pra carregar o chaveamento',
                text: 'Verifique sua conexão e tente de novo.',
                action: '<button type="button" class="btn" data-action="reload">Tentar de novo</button>'
            }),
            subtitle: null, ready: false
        };
    }
    const m = bracketModel(league, entry.data);
    const statusText = { final: 'Encerrada', live: 'Ao vivo', upcoming: '', projection: '' };
    const cols = m.rounds.map(r => `<section class="bracket__round" aria-label="${escapeHtml(r.title)}, semana ${r.week}">
            <h3 class="eyebrow bracket__head">${escapeHtml(r.title)} · Semana ${r.week}${statusText[r.status] ? ` · <span class="${r.status === 'live' ? 'is-live' : ''}">${statusText[r.status]}</span>` : ''}</h3>
            <ul class="matches bracket__games">${r.games.map(g => `<li class="match${g.p === 1 ? ' match--final' : ''}">
                ${g.p ? `<div class="eyebrow match__label${g.p === 1 ? ' eyebrow--accent' : ''}">${escapeHtml(g.label)}</div>` : ''}
                ${bracketSideHTML(g.a, g.winner === 'a' ? 'win' : g.winner === 'b' ? 'lose' : '', g.status)}
                ${bracketSideHTML(g.b, g.winner === 'b' ? 'win' : g.winner === 'a' ? 'lose' : '', g.status)}
            </li>`).join('')}${r.byes.length ? `<li class="match bracket__bye">
                <div class="eyebrow match__label">Folga · direto às semis</div>
                ${r.byes.map(s => bracketSideHTML({ ...s, points: null }, '', 'upcoming')).join('')}
            </li>` : ''}</ul>
        </section>`).join('');
    const podium = m.podium.length ? `<ol class="bracket__podium" aria-label="Pódio">${m.podium.map(x => `<li>
            <span class="medal medal--${x.pos}">${x.pos}</span>
            <span class="bracket__podium-name" dir="auto">${escapeHtml(x.team.teamName)}</span>
        </li>`).join('')}</ol>` : '';
    return {
        html: `${podium}<div class="bracket" style="--rounds:${m.rounds.length}">${cols}</div>
            <p class="chances-note">${escapeHtml(m.note)}</p>`,
        subtitle: m.subtitle,
        ready: true
    };
}
