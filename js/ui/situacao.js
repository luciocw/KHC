// =============================================================================
// UI / SITUAÇÃO — "Como estou na KHC": busca de jogador e resumo da temporada.
//
//   - Busca (topo da aba Ligas): usuário do Sleeper ou nome do time, sem
//     diferenciar maiúsculas e acentos; abre o perfil (drawer.js).
//   - "Minha situação": o usuário lembrado no aparelho (localStorage
//     khc_me), com atalho direto ao perfil.
//   - Resumo no topo do perfil, na temporada em andamento: posição, V–D e
//     zona em cada divisão (com as chances), Elite, Guilhotina, Copa KHC e o
//     lugar no Hall da Fama.
//
// Lê: appState.leaguesBySeason, appState.season
// Depende de: config, sanitize, data, derivations, ui/helpers, tabs/ligas
//   (zonesFor, zoneOf), tabs/chances (leagueOdds, fmtPct), tabs/copa
// =============================================================================

const ME_KEY = 'khc_me';

/** Usuário lembrado neste aparelho (ou null). */
function rememberedUser() {
    try { return localStorage.getItem(ME_KEY) || null; } catch (e) { return null; }
}

/** Lembra (ou esquece, com null) o usuário deste aparelho. */
function rememberUser(username) {
    try {
        if (username) localStorage.setItem(ME_KEY, username);
        else localStorage.removeItem(ME_KEY);
    } catch (e) { /* sem storage */ }
}

/** Texto sem acentos e em minúsculas (para a busca). */
function foldText(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Todos os jogadores conhecidos (temporadas carregadas e histórico), um por
 * pessoa: nome atual, time, séries atuais e avatar.
 * @returns {Array<{user: string, team: string, tiers: string[], avatar: (string|null)}>}
 */
function playerIndex() {
    const byKey = new Map();
    const put = (key, user, team, tier, avatar, live) => {
        const e = byKey.get(key) || { user, team, tiers: [], avatar: null, live: false };
        if (live && !e.live) { e.user = user; e.team = team; e.live = true; }
        if (live && tier && !e.tiers.includes(tier)) e.tiers.push(tier);
        if (!e.avatar && avatar) e.avatar = avatar;
        byKey.set(key, e);
    };
    const live = currentSeasonYear();
    Object.entries(appState.leaguesBySeason).forEach(([year, leagues]) => (leagues || []).forEach(l => l.teams.forEach(t => {
        if (!t.ownerName) return;
        put(t.ownerId ? `id:${t.ownerId}` : t.ownerName, t.ownerName, t.teamName, l.info.tier, t.avatar, year === live);
    })));
    getFinalizedSeasons().forEach(season => season.series.forEach(s => s.teams.forEach(t => {
        put(t.userId ? `id:${t.userId}` : t.user, t.user, t.team, null, t.avatarId, false);
    })));
    return [...byKey.values()].map(e => ({ ...e, tiers: e.tiers.sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)) }));
}

/** Temporada em andamento (a mais recente da config que não está fechada). */
function currentSeasonYear() {
    const years = Object.keys(KHC_CONFIG).sort();
    return years.reverse().find(y => !isSeasonFinalized(y)) || years[0];
}

/** Resultados da busca (até 8), melhor casamento primeiro. */
function searchPlayers(query) {
    const q = foldText(query);
    if (q.length < 2) return [];
    const score = p => {
        const u = foldText(p.user), t = foldText(p.team);
        if (u === q) return 0;
        if (u.startsWith(q)) return 1;
        if (t.startsWith(q)) return 2;
        if (u.includes(q)) return 3;
        if (t.includes(q)) return 4;
        return 9;
    };
    return playerIndex().map(p => ({ p, s: score(p) })).filter(x => x.s < 9)
        .sort((a, b) => (a.s - b.s) || (b.p.live - a.p.live) || a.p.user.localeCompare(b.p.user))
        .slice(0, 8).map(x => x.p);
}

/** Lista de resultados da busca (HTML). */
function searchResultsHTML(query) {
    if (foldText(query).length < 2) return '';
    const list = searchPlayers(query);
    if (!list.length) return '<p class="psearch__empty">Ninguém com esse nome. Tente o usuário do Sleeper ou o nome do time.</p>';
    return `<ul class="psearch__list" role="listbox" aria-label="Jogadores encontrados">${list.map(p => `<li>
            <button type="button" class="psearch__item" role="option" data-user="${escapeHtml(p.user)}">
                ${avatarHTML({ avatarId: p.avatar, name: p.team || p.user })}
                <span class="grow"><b dir="auto">${escapeHtml(p.user)}</b><small dir="auto">${escapeHtml(p.team || '')}</small></span>
                ${p.tiers.length ? `<span class="psearch__pills">${p.tiers.map(seriesPillHTML).join('')}</span>` : ''}
            </button>
        </li>`).join('')}</ul>`;
}

/**
 * Caixa de busca do topo da aba Ligas, com o atalho "Minha situação" quando
 * há usuário lembrado.
 * @returns {string} HTML
 */
function playerSearchHTML() {
    const me = rememberedUser();
    return `<div class="psearch" role="search">
        <label class="psearch__field">
            <span data-icon="search" data-size="18"></span>
            <span class="sr-only">Buscar jogador</span>
            <input type="search" id="playerSearch" autocomplete="off" spellcheck="false"
                placeholder="Como estou na KHC? Digite seu usuário do Sleeper" enterkeyhint="search">
        </label>
        ${me ? `<button type="button" class="btn psearch__me" data-user="${escapeHtml(me)}">Minha situação</button>` : ''}
        <div class="psearch__results" id="playerSearchResults" aria-live="polite"></div>
    </div>`;
}

/** Atualiza só os resultados (mantém o foco no campo). */
function updatePlayerSearch(query) {
    const box = document.getElementById('playerSearchResults');
    if (!box) return;
    box.innerHTML = searchResultsHTML(query);
    renderIcons(box);
}

// ---------------------------------------------------------------------------
// Resumo da temporada em andamento (topo do perfil)
// ---------------------------------------------------------------------------

/** Linhas da situação de um jogador nas ligas da temporada em andamento. */
function situationRows(username, ids) {
    const year = currentSeasonYear();
    const leagues = appState.leaguesBySeason[year] || [];
    const mine = t => t.ownerName === username || (t.ownerId && ids.includes(t.ownerId));
    const rows = [];
    const liveSeason = appState.season === year;   // zonas e chances usam a temporada aberta
    leagues.slice().sort((a, b) => TIER_ORDER.indexOf(a.info.tier) - TIER_ORDER.indexOf(b.info.tier)).forEach(league => {
        const i = league.teams.findIndex(mine);
        if (i < 0) return;
        const t = league.teams[i];
        const tier = league.info.tier;
        const n = league.teams.length;
        if (isGuillotine(tier)) {
            const cut = isChopped(t);
            rows.push({ tier, title: 'Guilhotina', main: cut ? `Cortado${t.eliminated ? ` na rodada ${t.eliminated}` : ''}` : 'Vivo', tone: cut ? 'out' : 'up', href: '#/guilhotina' });
            return;
        }
        let zoneText = '', tone = '';
        if (liveSeason && !isSeasonOver(year)) {
            const z = zonesFor(tier, false);
            const { zone } = zoneOf(i, n, z);
            zoneText = zone === 'playoff' ? 'zona de playoffs' : zone === 'releg' ? 'zona de rebaixamento' : 'fora dos playoffs';
            tone = zone === 'playoff' ? 'up' : zone === 'releg' ? 'down' : '';
        }
        let chances = '';
        if (liveSeason) {
            const o = leagueOdds(league);
            if (o.status === 'ready' && o.data.active && o.data.byId[t.teamId]) {
                const c = o.data.byId[t.teamId];
                chances = `Chance de playoffs ${fmtPct(c.playoffs)}${o.data.relegate ? ` · de queda ${fmtPct(c.releg)}` : ''}`;
            } else if (o.status === 'loading') chances = 'Calculando as chances…';
        }
        rows.push({
            tier, title: SERIES_META[tier].short,
            main: `${i + 1}º de ${n} · ${t.wins}–${t.losses} · ${fmtPts(t.fpts)} pts`,
            sub: [zoneText && zoneText[0].toUpperCase() + zoneText.slice(1), chances].filter(Boolean).join(' · '),
            tone, href: hashFor('ligas', year, tier)
        });
    });
    return rows;
}

/** Situação na Copa KHC da temporada aberta (ou null). */
function copaSituationRow(username, ids) {
    if (!copaConfig() || appState.season !== currentSeasonYear()) return null;
    const entry = copaData();
    if (entry.status !== 'ready') return entry.status === 'loading' ? { tier: 'copa', title: 'Copa KHC', main: 'Carregando…' } : null;
    if (copaConfig().format === 'ucl') return uclSituationRow(entry.data, username, ids);
    const m = copaModel(entry.data);
    const isMe = e => e && (e.team.ownerName === username || (e.team.ownerId && ids.includes(e.team.ownerId)));
    const row = (main, sub, tone) => ({ tier: 'copa', title: `Copa KHC${m.cfg.test ? ' (teste)' : ''}`, main, sub, tone, href: hashFor('ligas', appState.season, 'copa') });
    const q = m.qualifying;
    const qi = q.rows.findIndex(r => isMe(r.entry));
    if (qi < 0) return null;
    if (q.status === 'upcoming') return row(`Classificatória na semana ${q.week}`, `Os ${q.cut} maiores pontuadores da semana avançam`);
    if (q.status === 'live') return row(`${qi + 1}º na classificatória (parcial) · ${fmtPts(q.rows[qi].points)} pts`, qi < q.cut ? 'Dentro dos classificados, por enquanto' : 'Fora dos classificados, por enquanto', qi < q.cut ? 'up' : 'down');
    if (qi >= q.cut) return row(`Eliminado na classificatória (${qi + 1}º)`, '', 'out');
    if (m.champion && isMe(m.champion.winner)) return row('Campeão da Copa KHC!', '', 'up');
    for (let i = m.rounds.length - 1; i >= 0; i--) {
        const r = m.rounds[i];
        const g = r.games.find(x => isMe(x.a && x.a.entry) || isMe(x.b && x.b.entry));
        if (!g) continue;
        const meA = isMe(g.a && g.a.entry);
        const me = meA ? g.a : g.b, opp = meA ? g.b : g.a;
        const vs = opp ? opp.entry.team.teamName : 'a definir';
        if (g.winner) {
            const won = (g.winner === 'a') === meA;
            if (!won) return row(`Eliminado: ${r.name.toLowerCase()}${g.label === 'Disputa do 3º lugar' ? ' (3º lugar)' : ''}`, `${fmtPts(me.points)} × ${fmtPts(opp.points)} ${vs}`, 'out');
            if (g.label === 'Disputa do 3º lugar') return row('3º lugar na Copa KHC', '', 'up');
            return row(`Classificado: venceu ${r.name.toLowerCase()}`, `${fmtPts(me.points)} × ${fmtPts(opp.points)} ${vs}`, 'up');
        }
        const placar = r.status === 'upcoming' ? `semana ${r.week}` : `${fmtPts(me.points)} × ${fmtPts(opp ? opp.points : 0)}${r.status === 'live' ? ' (ao vivo)' : ''}`;
        return row(`${g.label === 'Disputa do 3º lugar' ? 'Disputa do 3º lugar' : r.name}: contra ${vs}`, placar, '');
    }
    return row(`Classificado (${qi + 1}º na classificatória)`, 'Chave sai quando a classificatória fecha', 'up');
}

/** Situação na Copa estilo Champions: fase de liga ou mata-mata. */
function uclSituationRow(data, username, ids, cfg, title) {
    const m = uclModel(data, cfg);
    const isMe = e => e && (e.team.ownerName === username || (e.team.ownerId && ids.includes(e.team.ownerId)));
    const row = (main, sub, tone) => ({ tier: 'copa', crest: title ? CHAMPIONS_CREST : null, title: title || `Copa KHC${m.cfg.test ? ' (teste)' : ''}`, main, sub, tone, href: title ? '#/copa-champions' : hashFor('ligas', appState.season, 'copa') });
    const pos = m.table.findIndex(r => isMe(r.entry));
    if (pos < 0) return null;
    const r = m.table[pos];
    const zone = pos < 8 ? 'direto às oitavas' : pos < 24 ? 'playoff' : 'eliminado';
    if (m.leagueStatus !== 'final') return row(`${pos + 1}º na fase de liga · ${r.pts} pts (${r.v}–${r.e}–${r.d})`, `Hoje: ${zone}`, pos < 24 ? 'up' : 'down');
    if (pos >= 24) return row(`Eliminado na fase de liga (${pos + 1}º)`, '', 'out');
    if (m.champion && isMe(m.champion.winner)) return row('Campeão da Copa KHC!', '', 'up');
    for (let i = m.rounds.length - 1; i >= 0; i--) {
        const rd = m.rounds[i];
        const g = rd.games.find(x => isMe(m.byKey[x.a]) || isMe(m.byKey[x.b]));
        if (!g) continue;
        const meA = isMe(m.byKey[g.a]);
        const opp = m.byKey[meA ? g.b : g.a];
        const mine = meA ? g.ta : g.tb, theirs = meA ? g.tb : g.ta;
        const vs = opp ? opp.team.teamName : 'a definir';
        if (g.winner) {
            const won = (g.winner === 'a') === meA;
            if (!won) return row(`Eliminado: ${rd.name.toLowerCase()}`, `${fmtPts(mine)} × ${fmtPts(theirs)} ${vs}`, 'out');
            if (g.label === 'Disputa do 3º lugar') return row('3º lugar na Copa KHC', '', 'up');
            return row(`Classificado: venceu ${rd.name.toLowerCase()}`, `${fmtPts(mine)} × ${fmtPts(theirs)} ${vs}`, 'up');
        }
        return row(`${rd.name}: contra ${vs}`, rd.status === 'upcoming' ? weeksLabel(rd.weeks) : `${fmtPts(mine)} × ${fmtPts(theirs)} (soma${rd.status === 'live' ? ', ao vivo' : ''})`, '');
    }
    return row(`${pos + 1}º na fase de liga`, zone, 'up');
}

/** Lugar no Hall da Fama (ou null). */
function legendsRow(username, ids) {
    const list = legendsAggregator(getFinalizedSeasons(), currentPlayerNames());
    const i = list.findIndex(e => e.user === username || (e.key && e.key.startsWith('id:') && ids.includes(e.key.slice(3))));
    if (i < 0) return null;
    return { tier: null, title: 'Hall da Fama', main: `${i + 1}º · ${list[i].points} Pontos KHC`, sub: KHC_POINTS_DRAFT ? 'Pontos em discussão até 2027' : '', href: '#/lendas' };
}

/**
 * Bloco "Situação em <ano>" do perfil.
 * @param {string} username
 * @returns {string} HTML ('' se o jogador não está na temporada em andamento)
 */
function situationHTML(username) {
    const ids = playerIdsFor(username);
    const rows = situationRows(username, ids);
    const copa = copaSituationRow(username, ids);
    if (copa) rows.push(copa);
    const legend = legendsRow(username, ids);
    if (legend) rows.push(legend);
    if (!rows.length) return '';
    const me = rememberedUser() === username;
    const year = currentSeasonYear();
    return `<section aria-labelledby="drawer-sit" class="situation">
        <div class="situation__hd">
            <h3 class="eyebrow" id="drawer-sit">Situação em ${escapeHtml(year)}</h3>
            <button type="button" class="situation__me${me ? ' is-on' : ''}" data-remember-user="${escapeHtml(username)}" aria-pressed="${me}">
                ${me ? 'Este sou eu ✓' : 'Lembrar: este sou eu'}
            </button>
        </div>
        <ul class="situation__list">${rows.map(r => `<li>
            <a class="situation__row${r.tone ? ' is-' + r.tone : ''}" ${r.href ? `href="${r.href}" data-close-drawer` : ''}>
                ${r.tier ? crestHTML(r.tier, 28) : `<span class="medal medal--plain">★</span>`}
                <span class="grow"><small class="eyebrow">${escapeHtml(r.title)}</small>
                    <b>${escapeHtml(r.main)}</b>
                    ${r.sub ? `<small>${escapeHtml(r.sub)}</small>` : ''}</span>
            </a>
        </li>`).join('')}</ul>
    </section>`;
}
