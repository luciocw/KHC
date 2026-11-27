// =============================================================================
// TAB / INÍCIO (protótipo, #/hub) — página inicial revitalizada.
//
//   - Destaque principal (inspirado em "Timed Card Opening"): fundo com
//     textura nas cores da liga e o escudo grande; título condensado enorme.
//     Passa sozinho pelos slides (resumo da semana, Elite, divisões A–F,
//     Champions KHC)
//     com contador "01 / 07", setas e barra de progresso; pausa ao tocar e
//     não anda sozinho com "reduzir movimento".
//   - Cards em carrossel sobre o destaque: tocar abre o slide; o botão do
//     slide leva à tabela.
//   - "Minha KHC" (inspirado no menu circular): o jogador lembrado no centro
//     e, em volta, as competições dele (divisões, Elite e Champions KHC).
//   - "Outras ligas": Guilhotina, Cocoricó Premier League e NBA.
//
// Lê: appState.leagues, appState.hubSlide · Depende de: config, api,
//   derivations, ui/helpers, ui/situacao, tabs/ligas, tabs/copa
// =============================================================================

const HUB_INTERVAL_MS = 6500;
let _hubTimer = null;
let _hubWeek = {};   // `${ano}|${semana}` → { status, top }

/** Maior pontuação da semana atual entre as divisões (busca uma vez). */
function hubWeekTop() {
    const leagues = appState.leagues.filter(l => isRegularSeries(l.info.tier));
    const week = appState.nflState ? sanitizeNumber(appState.nflState.display_week, 0, 30, 0) : 0;
    if (!leagues.length || !week || week > REGULAR_SEASON_WEEKS + 3) return null;
    const key = `${appState.season}|${week}`;
    if (_hubWeek[key]) return _hubWeek[key];
    const entry = _hubWeek[key] = { status: 'loading', week };
    Promise.all(leagues.map(l => fetchWeekScores(l.info.id, week, { live: true }).then(s => ({ l, s }))))
        .then(list => {
            let best = null;
            list.forEach(({ l, s }) => Object.entries(s).forEach(([rid, pts]) => {
                if (!best || pts > best.pts) best = { pts, tier: l.info.tier, team: l.teams.find(t => String(t.teamId) === rid) };
            }));
            entry.status = 'ready';
            entry.top = best && best.team ? best : null;
        })
        .catch(() => { entry.status = 'error'; })
        .then(() => { if (appState.tab === 'hub') renderView(); });
    return entry;
}

/** Slides do destaque: resumo da semana, Elite, divisões e a Champions KHC. */
function hubSlides() {
    const week = appState.nflState ? sanitizeNumber(appState.nflState.display_week, 0, 30, 0) : 0;
    const slides = [];
    const wk = hubWeekTop();
    const label = weekLabel() || (isSeasonOver() ? 'Temporada encerrada' : `Temporada ${appState.season}`);
    slides.push({
        key: 'semana', tier: null, league: 'khc', crest: 'escudo-khc.png',
        eyebrow: `Temporada ${appState.season} · ${label}`,
        title: week ? `Semana ${week}` : 'KHC',
        text: wk && wk.status === 'ready' && wk.top
            ? `Maior pontuação até agora: ${wk.top.team.teamName} (${SERIES_META[wk.top.tier].short}), ${fmtPts(wk.top.pts)} pts.`
            : 'Placares, tabelas, chances e a Champions da turma, num lugar só.',
        cta: { text: 'Ver a rodada', href: hashFor('rodada', appState.season, 'serie-a') },
        card: { title: 'Resumo da semana', sub: wk && wk.top ? `Destaque: ${wk.top.team.teamName}` : label }
    });
    // Divisões e Elite (E e F entram sozinhas quando configuradas); a
    // Guilhotina fica em "Outras ligas"
    sortLeagues(appState.leagues).filter(l => !isGuillotine(l.info.tier)).forEach(l => {
        const tier = l.info.tier;
        const meta = SERIES_META[tier];
        const leader = l.teams[0];
        slides.push({
            key: tier, tier, league: meta.league, crest: meta.crest,
            eyebrow: tier === 'elite' ? 'Só os classificados' : `${l.teams.length} times · ${label}`,
            title: meta.short,
            text: leader ? `Líder: ${leader.teamName}, ${leader.wins}–${leader.losses} e ${fmtPts(leader.fpts)} pts.` : '',
            cta: { text: 'Ver a tabela', href: hashFor('ligas', appState.season, tier) },
            card: { title: meta.short, sub: leader ? `${leader.teamName} · ${leader.wins}–${leader.losses}` : '' }
        });
    });
    // Champions KHC (a Copa no formato Champions)
    const cc = championsConfig();
    if (cc) {
        const cd = copaData(cc);
        let text = `Fase de liga nas semanas ${cc.leagueWeeks[0]} a ${cc.leagueWeeks[cc.leagueWeeks.length - 1]}, mata-mata em ida e volta e final na semana ${cc.knockout.final[0]}.`;
        let sub = 'Formato Champions';
        if (cd.status === 'ready') {
            const m = uclModel(cd.data, cc);
            const leg = m.settings.leg;
            const ph = m.phases.find(p => leg <= p.weeks[p.weeks.length - 1]) || m.phases[m.phases.length - 1];
            const leader = m.table[0] && m.table[0].entry;
            if (m.champion) {
                text = `Campeão: ${m.champion.winner.team.teamName}. Vice: ${m.champion.runnerUp.team.teamName}.`;
                sub = `Campeão: ${m.champion.winner.team.teamName}`;
            } else if (ph.key === 'liga') {
                text = `Fase de liga em andamento. Líder: ${leader ? leader.team.teamName : '—'}. Os 8 primeiros vão direto às oitavas; do 9º ao 24º, playoff.`;
                sub = `Fase de liga · ${weeksLabel(ph.weeks)}`;
            } else {
                text = `${ph.name} em ${ph.weeks.length > 1 ? 'ida e volta' : 'jogo único'} (${weeksLabel(ph.weeks)}). Melhor da fase de liga: ${leader ? leader.team.teamName : '—'}.`;
                sub = `${ph.name} · ${weeksLabel(ph.weeks)}`;
            }
        }
        slides.push({
            key: 'champions', tier: 'copa', league: 'copa', crest: CHAMPIONS_CREST,
            eyebrow: `Champions KHC${cc.test ? ' · simulação' : ''}`,
            title: 'Champions',
            text,
            cta: { text: 'Ver a Champions', href: '#/copa-champions' },
            card: { title: 'Champions KHC', sub }
        });
    }
    return slides;
}

/** Destaque principal (o slide aberto). */
function hubHeroHTML(slides, i) {
    const s = slides[i];
    const n = slides.length;
    return `<div class="hub-hero__bg" aria-hidden="true">
            <img class="hub-hero__crest" src="assets/logo/png/${s.crest}" alt="">
        </div>
        <div class="hub-hero__content" data-slide-key="${s.key}">
            <span class="hub-hero__eyebrow">${escapeHtml(s.eyebrow)}</span>
            <h2 class="hub-hero__title">${escapeHtml(s.title)}</h2>
            <p class="hub-hero__text">${escapeHtml(s.text)}</p>
            <a class="hub-hero__cta" href="${s.cta.href}">${escapeHtml(s.cta.text)} <span aria-hidden="true">→</span></a>
        </div>
        <div class="hub-hero__nav">
            <button type="button" class="hub-arrow" data-hub-step="-1" aria-label="Anterior"><span data-icon="chevronLeft" data-size="20"></span></button>
            <button type="button" class="hub-arrow" data-hub-step="1" aria-label="Próximo"><span data-icon="chevronRight" data-size="20"></span></button>
            <span class="hub-progress" aria-hidden="true"><i></i></span>
            <span class="hub-count num">${String(i + 1).padStart(2, '0')}<small> / ${String(n).padStart(2, '0')}</small></span>
        </div>`;
}

/** Cards do carrossel (um por slide). */
function hubCardsHTML(slides, i) {
    return slides.map((s, k) => `<button type="button" class="hub-card${k === i ? ' is-active' : ''}" data-hub-slide="${k}" data-league="${s.league}" aria-pressed="${k === i}">
            <img src="${CREST_PATH}${s.crest}" alt="" width="44" height="50">
            <span class="hub-card__title">${escapeHtml(s.card.title)}</span>
            <span class="hub-card__sub">${escapeHtml(s.card.sub)}</span>
        </button>`).join('');
}

/**
 * "Minha KHC": o jogador lembrado no centro e as competições dele em volta.
 * Sem usuário lembrado: a busca.
 */
function hubMineHTML() {
    const me = rememberedUser();
    if (!me) {
        return `<section class="card hub-mine hub-mine--empty">
            <h2 class="display">Minha KHC</h2>
            <p>Busque seu usuário do Sleeper e toque em <b>"Lembrar: este sou eu"</b>: suas competições aparecem aqui.</p>
            ${playerSearchHTML()}
        </section>`;
    }
    const ids = playerIdsFor(me);
    // divisões e Elite (a Guilhotina fica em "Outras ligas") + Champions KHC
    const rows = situationRows(me, ids).filter(r => !isGuillotine(r.tier));
    const cc = championsConfig();
    if (cc) {
        const cd = copaData(cc);
        if (cd.status === 'ready') {
            const r = uclSituationRow(cd.data, me, ids, cc, 'Champions KHC');
            if (r) rows.push(r);
        } else if (cd.status === 'loading') rows.push({ tier: 'copa', crest: CHAMPIONS_CREST, title: 'Champions KHC', main: 'Carregando…', href: '#/copa-champions' });
    }
    const p = profileModel(me);
    const n = rows.length;
    // nós num arco à direita do centro (de −70° a 70°)
    const nodes = rows.map((r, k) => {
        const ang = n === 1 ? 0 : -70 + (140 * k) / (n - 1);
        return `<a class="hub-node${r.tone ? ' is-' + r.tone : ''}" href="${r.href || '#'}" style="--ang:${ang}deg" data-league="${r.tier ? SERIES_META[r.tier].league : 'khc'}">
            <span class="hub-node__dot">${r.tier ? `<img src="${CREST_PATH}${r.crest || SERIES_META[r.tier].crest}" alt="" width="30" height="34">` : '★'}</span>
            <span class="hub-node__text"><b>${escapeHtml(r.title)}</b><small>${escapeHtml(r.main)}</small></span>
        </a>`;
    }).join('');
    return `<section class="card hub-mine" aria-label="Minha KHC">
        <div class="hub-orbit">
            <button type="button" class="hub-orbit__center" data-user="${escapeHtml(me)}" aria-label="Abrir meu perfil">
                ${avatarHTML({ avatarId: p.avatarId, name: me, size: 'lg' })}
                <span class="eyebrow">Minha KHC</span>
                <b dir="auto">${escapeHtml(me)}</b>
            </button>
            <div class="hub-orbit__ring" aria-hidden="true"></div>
            ${nodes}
        </div>
    </section>`;
}

/**
 * "Outras ligas": Guilhotina, Cocoricó Premier League e NBA, com o status
 * de cada uma (e o do jogador lembrado na Guilhotina).
 */
function hubOthersHTML() {
    const cards = [];
    const g = appState.leagues.find(l => isGuillotine(l.info.tier));
    if (g) {
        const alive = g.teams.filter(t => !isChopped(t)).length;
        const me = rememberedUser();
        const ids = me ? playerIdsFor(me) : [];
        const mine = me && g.teams.find(t => t.ownerName === me || (t.ownerId && ids.includes(t.ownerId)));
        const you = mine ? ` · você: ${isChopped(mine) ? `cortado${mine.eliminated ? ` na ${mine.eliminated}` : ''}` : 'vivo'}` : '';
        cards.push({ href: '#/guilhotina', league: 'g', img: `${CREST_PATH}${SERIES_META.guilhotina.crest}`, round: false, title: 'Guilhotina', sub: `${alive} vivos de ${g.teams.length}${you}` });
    }
    Object.values(ALSO_LEAGUES).forEach(cfg => {
        const d = alsoData(cfg.key);
        let sub = 'Carregando…';
        if (d.status === 'ready') {
            const lead = d.data.teams[0];
            sub = isAlsoPreseason(d.data) ? 'Aguardando o draft' : lead ? `Líder: ${lead.teamName} · ${alsoRecord(cfg, lead)}` : '';
        } else if (d.status === 'error') sub = '';
        cards.push({ href: `#/${cfg.key}`, league: cfg.league, img: `${CREST_PATH}${cfg.crest}`, round: cfg.round, title: cfg.name, sub });
    });
    if (!cards.length) return '';
    return `<section class="hub-others" aria-labelledby="hub-others-title">
        <h2 class="eyebrow" id="hub-others-title">Outras ligas</h2>
        <div class="hub-others__list">${cards.map(c => `<a class="hub-other" href="${c.href}" data-league="${c.league}">
            <img class="${c.round ? 'is-round' : ''}" src="${c.img}" alt="" height="44">
            <span class="grow"><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.sub)}</small></span>
            <span aria-hidden="true">→</span>
        </a>`).join('')}</div>
    </section>`;
}

/**
 * Página Início (protótipo).
 * @returns {string} HTML
 */
function renderHub() {
    const slides = hubSlides();
    if (!slides.length) return stateHTML({ icon: 'trophy', title: 'Nada por aqui ainda' });
    const i = ((appState.hubSlide || 0) % slides.length + slides.length) % slides.length;
    appState.hubSlide = i;
    return `
        <section class="hub-hero" data-league="${slides[i].league}" aria-roledescription="carrossel" aria-label="Destaques">
            ${hubHeroHTML(slides, i)}
            <div class="hub-cards" role="group" aria-label="Escolher destaque">${hubCardsHTML(slides, i)}</div>
        </section>
        ${hubMineHTML()}
        ${hubOthersHTML()}`;
}

/** Troca o slide sem redesenhar a página (mantém a rolagem dos cards). */
function hubGo(index) {
    const hero = document.querySelector('.hub-hero');
    if (!hero) return;
    const slides = hubSlides();
    const i = ((index % slides.length) + slides.length) % slides.length;
    appState.hubSlide = i;
    hero.setAttribute('data-league', slides[i].league);
    const swap = () => {
        hero.querySelectorAll('.hub-hero__bg, .hub-hero__content, .hub-hero__nav').forEach(el => el.remove());
        hero.insertAdjacentHTML('afterbegin', hubHeroHTML(slides, i));
        renderIcons(hero);
        hero.querySelectorAll('.hub-card').forEach((c, k) => {
            c.classList.toggle('is-active', k === i);
            c.setAttribute('aria-pressed', String(k === i));
            if (k === i) c.parentElement.scrollTo({ left: c.offsetLeft - 16, behavior: 'smooth' });
        });
    };
    // "card que abre": transição nativa onde houver; senão, troca direta
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(swap);
    else swap();
    hubStartTimer();
}

/** Passa sozinho (pausa ao tocar/passar o mouse; sem "reduzir movimento"). */
function hubStartTimer() {
    clearInterval(_hubTimer);
    _hubTimer = null;
    if (appState.tab !== 'hub' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector('.hub-hero');
    if (!hero || hero.dataset.paused) return;
    _hubTimer = setInterval(() => {
        const h = document.querySelector('.hub-hero');
        if (appState.tab !== 'hub' || !h) { clearInterval(_hubTimer); return; }
        if (h.matches(':hover') || h.dataset.paused) return;   // pausado enquanto a pessoa olha
        hubGo((appState.hubSlide || 0) + 1);
    }, HUB_INTERVAL_MS);
}
