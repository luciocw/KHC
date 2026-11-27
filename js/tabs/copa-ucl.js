// =============================================================================
// TAB / LIGAS · COPA KHC · FORMATO CHAMPIONS (KHC_CONFIG[ano].copa.format 'ucl')
//
//   - Fase de liga (copa.leagueWeeks): potes por divisão (copa.pots), cada
//     time joga `perPot` vezes contra cada pote, nunca contra a própria
//     divisão; tabela única (vitória 3, empate 1; saldo; pontos feitos).
//   - 1º–8º direto às oitavas; 9º–24º no playoff; 25º+ fora.
//   - Mata-mata em 2 semanas (soma dos pontos); semana final: final e
//     disputa do 3º lugar. Empate no agregado: melhor posição na fase de liga.
//   - Conta em resolveUcl (derivations.js), a mesma do fechamento.
//
// Lê: appState.copaPhase, appState.copaLeagueView, appState.copaWeek
// Depende de: config, derivations (resolveUcl), ui/helpers, tabs/copa
// =============================================================================

/** Fases da Copa estilo Champions, com as semanas de cada uma. */
function uclPhases(cfg) {
    const ko = cfg.knockout;
    return [
        { key: 'liga', name: 'Fase de liga', short: 'Fase de liga', weeks: cfg.leagueWeeks },
        { key: 'playoff', name: 'Playoff', short: 'Playoff', weeks: ko.playoff },
        { key: 'r16', name: 'Oitavas de final', short: 'Oitavas', weeks: ko.r16 },
        { key: 'qf', name: 'Quartas de final', short: 'Quartas', weeks: ko.qf },
        { key: 'sf', name: 'Semifinal', short: 'Semi', weeks: ko.sf },
        { key: 'final', name: 'Final', short: 'Final', weeks: ko.final }
    ];
}

/** "S3–8" / "S17". */
function weeksLabel(weeks) {
    return weeks.length > 1 ? `S${weeks[0]}–${weeks[weeks.length - 1]}` : `S${weeks[0]}`;
}

/**
 * Copa resolvida, com os times de cada id e a fase aberta.
 * @returns {Object}
 */
function uclModel(data, cfg = copaConfig()) {
    const { settings, scores } = data;
    const entrants = copaLeagues().flatMap(l => l.teams.map(t => ({ key: `${l.info.tier}:${t.teamId}`, tier: l.info.tier, team: t })));
    const byKey = Object.fromEntries(entrants.map(e => [e.key, e]));
    const cup = resolveUcl(cfg, entrants.map(e => ({ key: e.key, tier: e.tier })), scores, settings);
    const potOf = tier => cfg.pots.findIndex(p => p.includes(tier)) + 1;

    const phases = uclPhases(cfg);
    const auto = Math.max(0, phases.findIndex(p => settings.leg <= p.weeks[p.weeks.length - 1]));
    const pick = appState.copaPhase;
    const current = pick !== null && pick >= 0 && pick < phases.length ? pick : (settings.leg > phases[phases.length - 1].weeks.slice(-1)[0] ? phases.length - 1 : auto);
    const podium = cup.podium ? cup.podium.map(k => byKey[k]) : null;
    return {
        cfg, settings, phases, current, entrants, byKey, potOf,
        table: cup.table.map((r, i) => ({ ...r, rank: i + 1, entry: byKey[r.key] })),
        league: cup.league, leagueStatus: cup.leagueStatus, rounds: cup.rounds,
        champion: podium ? { winner: podium[0], runnerUp: podium[1], third: podium[2] } : null
    };
}

/** Zona da posição na fase de liga. */
function uclZone(rank) {
    return rank <= 8 ? 'direct' : rank <= 24 ? 'playoff' : 'out';
}

/** "134.7 + —": pernas do confronto (semana ainda não jogada = —). */
function uclLegsText(legs, weeks, leg) {
    return legs.map((p, i) => (weeks[i] <= leg ? fmtPts(p) : '—')).join(' + ');
}

/** Linha de um time num jogo/confronto (com as pernas, se houver). */
function uclSideHTML(entry, state, legs, total, status, placeholder) {
    if (!entry) return `<div class="match__side bracket__tbd"><span>${escapeHtml(placeholder || 'A definir')}</span></div>`;
    const t = entry.team;
    const show = status !== 'upcoming';
    const legsHTML = legs && show
        ? `<span class="ucl-legs num">${legs}</span>` : '';
    return `<div class="match__side${state ? ' is-' + state : ''}">
        ${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}
        ${seriesPillHTML(entry.tier)}
        ${legsHTML}
        ${show ? `<span class="num match__pts">${fmtPts(total)}</span>` : ''}
    </div>`;
}

/**
 * Corpo da aba Copa no formato Champions.
 * @param {Object} data  copaData().data
 * @param {Function} header  (subtítulo, ações) → HTML do cabeçalho do card
 * @returns {string} HTML
 */
function renderCopaUcl(data, header) {
    const m = uclModel(data);
    const ph = m.phases[m.current];
    const statusText = { final: 'Encerrada', live: 'Ao vivo', upcoming: 'A jogar' };
    const tabs = `<div class="view-switch copa-phases" role="group" aria-label="Fase da Copa">${m.phases.map((p, i) =>
        `<button type="button" data-copa-phase="${i}" aria-pressed="${i === m.current}">${escapeHtml(p.short)}<small>${weeksLabel(p.weeks)}</small></button>`).join('')}</div>`;

    let body, phStatus, exportable = true;
    if (ph.key === 'liga') {
        phStatus = m.leagueStatus;
        const view = appState.copaLeagueView === 'jogos' ? 'jogos' : 'tabela';
        const sub = `<div class="view-switch" role="group" aria-label="Tabela ou jogos">
                <button type="button" data-copa-view="tabela" aria-pressed="${view === 'tabela'}">Tabela</button>
                <button type="button" data-copa-view="jogos" aria-pressed="${view === 'jogos'}">Jogos</button>
            </div>`;
        if (view === 'tabela') {
            const played = m.table.some(r => r.j > 0);
            const rows = m.table.map((r, i) => {
                const z = uclZone(r.rank);
                const cut = played && (r.rank === 8 || r.rank === 24) && i < m.table.length - 1;
                const t = r.entry.team;
                const saldo = r.pf - r.pc;
                return `<tr class="${played ? `z-${z === 'direct' ? 'promo' : z === 'playoff' ? 'playoff' : 'releg'}` : ''}${cut ? ' cut-playoff' : ''}">
                    <td><span class="pos">${played ? r.rank : '–'}</span></td>
                    <td class="cell-team">${teamButtonHTML({ user: t.ownerName, team: t.teamName, avatarId: t.avatar })}</td>
                    <td>${seriesPillHTML(r.entry.tier)}</td>
                    <td class="rec">${r.v}–${r.e}–${r.d}</td>
                    <td class="num ucl-pts">${r.pts}</td>
                    <td class="hide-mobile">${played ? `${saldo >= 0 ? '+' : ''}${fmtPts(saldo)}` : '—'}</td>
                </tr>`;
            }).join('');
            body = `${sub}<div class="table-wrap">
                    <table class="standings standings--compact ucl-table">
                        <caption class="sr-only">Fase de liga da Copa KHC</caption>
                        <thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Série</th>
                            <th scope="col"><abbr title="Vitórias, empates e derrotas">V–E–D</abbr></th>
                            <th scope="col"><abbr title="Pontos na Copa: vitória 3, empate 1">Pts</abbr></th>
                            <th scope="col" class="hide-mobile"><abbr title="Saldo de pontos de fantasy nos jogos da Copa">Saldo</abbr></th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="legend">
                    <span><i style="background:var(--zone-promo)"></i>1º–8º: direto às oitavas</span>
                    <span><i style="background:var(--zone-playoff)"></i>9º–24º: playoff</span>
                    <span><i style="background:var(--zone-releg)"></i>25º em diante: eliminado</span>
                </div>`;
        } else {
            const weeks = m.cfg.leagueWeeks;
            const wk = weeks.includes(appState.copaWeek) ? appState.copaWeek
                : weeks.find(w => w >= m.settings.leg) || weeks[weeks.length - 1];
            const round = m.league.find(r => r.week === wk);
            const chips = `<div class="chips copa-weeks" role="group" aria-label="Rodada da fase de liga">${weeks.map((w, i) =>
                `<button type="button" data-copa-week="${w}" aria-pressed="${w === wk}">Rodada ${i + 1} · S${w}</button>`).join('')}</div>`;
            body = `${sub}${chips}<ul class="matches">${round.games.map(g => {
                const a = m.byKey[g.a], b = m.byKey[g.b];
                const win = g.status === 'final' && g.pa !== g.pb ? (g.pa > g.pb ? 'a' : 'b') : '';
                return `<li class="match">
                    ${uclSideHTML(a, win === 'a' ? 'win' : win === 'b' ? 'lose' : '', null, g.pa, g.status)}
                    ${uclSideHTML(b, win === 'b' ? 'win' : win === 'a' ? 'lose' : '', null, g.pb, g.status)}
                </li>`;
            }).join('')}</ul>`;
            phStatus = round.status;
        }
    } else {
        const r = m.rounds.find(x => x.key === ph.key);
        if (!r) {
            body = stateHTML({ icon: 'calendar', title: 'Chave ainda não definida', text: `A chave sai da tabela quando a fase de liga terminar (semana ${m.cfg.leagueWeeks[m.cfg.leagueWeeks.length - 1]}).` });
            phStatus = 'upcoming';
            exportable = false;
        } else {
            phStatus = r.status;
            body = `<ul class="matches">${r.games.map(g => {
                const a = m.byKey[g.a], b = m.byKey[g.b];
                const isFinal = g.label === 'Final';
                const ph1 = g.label === 'Disputa do 3º lugar' ? 'Perdedor da semifinal 1' : 'A definir';
                const ph2 = g.label === 'Disputa do 3º lugar' ? 'Perdedor da semifinal 2' : 'A definir';
                return `<li class="match${isFinal ? ' match--final' : ''}">
                    <div class="eyebrow match__label${isFinal ? ' eyebrow--accent' : ''}">${escapeHtml(g.label)}</div>
                    ${uclSideHTML(a, g.winner === 'a' ? 'win' : g.winner === 'b' ? 'lose' : '', g.weeks.length > 1 ? uclLegsText(g.legsA, g.weeks, m.settings.leg) : null, g.ta, g.status, ph1)}
                    ${uclSideHTML(b, g.winner === 'b' ? 'win' : g.winner === 'a' ? 'lose' : '', g.weeks.length > 1 ? uclLegsText(g.legsB, g.weeks, m.settings.leg) : null, g.tb, g.status, ph2)}
                </li>`;
            }).join('')}</ul>`;
        }
    }

    const champ = m.champion ? `<div class="copa-champ">
            <span class="medal medal--1">1</span>
            <span class="grow"><span class="eyebrow eyebrow--accent">Campeão da Copa KHC</span><b dir="auto">${escapeHtml(m.champion.winner.team.teamName)}</b>
            <small>${escapeHtml(m.champion.winner.team.ownerName)} · vice: ${escapeHtml(m.champion.runnerUp.team.teamName)} · 3º: ${escapeHtml(m.champion.third.team.teamName)}</small></span>
        </div>` : '';
    const actions = exportable ? `<div class="export-actions" role="group" aria-label="Exportar a fase da Copa como imagem">
            <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar ${escapeHtml(ph.name)} da Copa como imagem">
                <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
            </button>
            ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar ${escapeHtml(ph.name)} da Copa como imagem">
                <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
            </button>` : ''}
        </div>` : '';
    const potsText = m.cfg.pots.map((p, i) => `pote ${i + 1}: ${p.map(t => SERIES_META[t].short).join(' + ')}`).join(' · ');
    const nGames = m.cfg.leagueWeeks.length;
    const note = `${m.cfg.test ? 'Simulação/teste: não soma Pontos KHC. ' : ''}Formato Champions: ${potsText}. Cada time joga ${nGames} vezes na fase de liga (${m.cfg.perPot} contra cada pote, nunca contra a própria divisão), com a pontuação da sua liga na semana. Vitória 3, empate 1; desempate: saldo, pontos feitos. Mata-mata em 2 semanas (soma), empate no agregado: melhor posição na fase de liga. Sorteio com a semente "${m.cfg.seed}".`;
    const subtitle = `${m.cfg.test ? 'Teste · ' : ''}${m.entrants.length} times · ${ph.name} · ${weeksLabel(ph.weeks)} · ${statusText[phStatus] || ''}`;

    return `${header(subtitle, actions)}
        ${tabs}
        ${champ}
        ${body}
        <p class="chances-note">${escapeHtml(note)}</p>`;
}
