// =============================================================================
// TAB / POWER RANKING — Tiers S/A/B/C/D pelo Power Score (derivations.js):
// 50% força (all-play) + 30% V–D + 20% fase; tiers por posição.
//
//   - Só séries regulares: a Elite fica de fora para não contar o mesmo time
//     duas vezes.
//   - Tiers como cabeçalhos horizontais: badge + nome em PT-BR.
//   - Card: #rank | avatar | time + série · V–D · pts | PWR + barra.
//   - Placares semanais (semanas encerradas) buscados sob demanda e
//     guardados no aparelho; sem eles, prévia com pontos da temporada.
//   - Botões Baixar / Compartilhar: o ranking vira PNG (ui/export.js).
//
// Lê: appState.rosterData, appState.leagues, appState.season
// Depende de: config, sanitize, api, derivations, ui/helpers
// =============================================================================

/** Nome e classe de cada tier (cortes por posição em tierForRank, derivations.js). */
const TIER_CONFIG = {
    S: { name: 'Favoritos',      cls: 's' },
    A: { name: 'Candidatos',     cls: 'a' },
    B: { name: 'Meio de tabela', cls: 'b' },
    C: { name: 'Pressionados',   cls: 'c' },
    D: { name: 'Lanternas',      cls: 'd' },
};

/**
 * rosterData → formato Team de powerRanking(), carregando tier e avatar.
 * @param {Array<object>} rosterData
 * @returns {Array<object>}
 */
function mapRosterToTeams(rosterData) {
    return rosterData.map(r => ({
        key: `${r.leagueTier}|${r.teamId}`,
        user: r.ownerName,
        team: r.teamName,
        avatarId: r.avatar,
        w: r.wins,
        l: r.losses,
        pts: r.fpts,
        _leagueTier: r.leagueTier,
    }));
}

/**
 * Card de um time no Power Ranking.
 * @param {object} row PowerRow
 * @param {string} tierCls
 * @returns {string}
 */
function renderPwrCard(row, tierCls) {
    const t = row.team;
    const meta = SERIES_META[t._leagueTier];
    const safeUser = escapeHtml(t.user || '');
    const safeTeam = escapeHtml(t.team || '');
    const pct = Math.max(0, Math.min(100, row.pwr)).toFixed(0);
    return `<button type="button" class="pwr-card" data-user="${safeUser}" aria-label="#${row.rank} ${safeTeam}, PWR ${row.pwr.toFixed(1)}. Abrir perfil">
        <span class="pos pwr-card__rank">#${row.rank}</span>
        ${avatarHTML({ avatarId: t.avatarId, name: t.team })}
        <span class="grow">
            <span class="team__name" dir="auto">${safeTeam}</span>
            <span class="team__owner"><b data-league="${meta ? meta.league : 'a'}" class="text-accent">${escapeHtml(meta ? meta.short : '')}</b> · ${t.w}–${t.l} · ${fmtPts(t.pts)} pts</span>
        </span>
        <span class="pwr-card__score">
            <span class="num">${row.pwr.toFixed(1)}</span>
            <span class="pwr-bar pwr-bar--${tierCls}"><i style="width:${pct}%"></i></span>
        </span>
    </button>`;
}

/** Resumo da fórmula (nota da aba e rodapé da imagem). */
const PWR_FORMULA_SHORT = 'PWR = 50% força + 30% aproveitamento + 20% fase';

// Placares semanais (só semanas encerradas da temporada regular), por
// temporada + carga de dados. loadData() limpa via resetPowerCache().
let _pwrWeekly = null;   // { key, status: 'loading'|'ready'|'error', weekly, weeks }

function resetPowerCache() {
    _pwrWeekly = null;
}

/**
 * Busca os pontos semana a semana de todas as séries regulares.
 * @returns {Promise<{weekly: Object<string, number[]>, weeks: number}>}
 */
async function loadPowerWeekly() {
    const leagues = appState.leagues.filter(l => l.info.tier !== 'elite');
    const perLeague = await Promise.all(leagues.map(async l => {
        const st = await fetchLeagueSettings(l.info.id);
        const weeks = Math.max(0, Math.min(st.lastScored, st.playoffStart - 1));
        const scores = await Promise.all(Array.from({ length: weeks }, (_, i) => fetchWeekScores(l.info.id, i + 1)));
        return { tier: l.info.tier, scores };
    }));
    const weekly = {};
    let weeks = 0;
    perLeague.forEach(({ tier, scores }) => {
        weeks = Math.max(weeks, scores.length);
        scores.forEach(byRoster => {
            Object.keys(byRoster).forEach(rid => {
                const k = `${tier}|${rid}`;
                (weekly[k] = weekly[k] || []).push(byRoster[rid]);
            });
        });
    });
    return { weekly, weeks };
}

/** Placares semanais da temporada atual (dispara a busca na 1ª vez). */
function powerWeekly() {
    const key = `${appState.season}|${appState.lastUpdated || ''}`;
    if (_pwrWeekly && _pwrWeekly.key === key) return _pwrWeekly;
    _pwrWeekly = { key, status: 'loading' };
    const entry = _pwrWeekly;
    loadPowerWeekly()
        .then(r => { Object.assign(entry, { status: 'ready' }, r); })
        .catch(() => { entry.status = 'error'; })
        .then(() => {
            if (_pwrWeekly === entry && appState.tab === 'power' && appState.loadState === 'ready') renderView();
        });
    return entry;
}

/**
 * Linhas do Power Ranking da temporada (só séries regulares).
 * Usado pela aba e pela imagem exportada.
 * @returns {Array<object>} PowerRow ordenadas
 */
function powerRows() {
    const regular = appState.rosterData.filter(r => r.leagueTier !== 'elite');
    const w = powerWeekly();
    return powerRanking(mapRosterToTeams(regular), w.status === 'ready' && w.weeks ? w.weekly : null);
}

/**
 * Renderiza a aba Power Ranking.
 * @returns {string} HTML
 */
function renderPowerRankings() {
    const regular = appState.rosterData.filter(r => r.leagueTier !== 'elite');
    if (!regular.length) {
        return stateHTML({ icon: 'zap', title: 'Nada por aqui ainda' });
    }
    const weekly = powerWeekly();
    if (weekly.status === 'loading') return skeletonHTML();
    const rows = powerRows();
    const preview = !(weekly.status === 'ready' && weekly.weeks);

    const sections = Object.keys(TIER_CONFIG).map(key => {
        const list = rows.filter(r => r.tier === key);
        if (!list.length) return '';
        const cfg = TIER_CONFIG[key];
        return `<section aria-label="Tier ${key} — ${cfg.name}">
            <div class="tier-hd">
                <span class="tier-badge t-${cfg.cls}">${key}</span>
                <h2 class="display tier-hd__name">${cfg.name}</h2>
                <small class="eyebrow">${list.length} ${list.length === 1 ? 'time' : 'times'}</small>
            </div>
            <div class="pwr-grid">${list.map(r => renderPwrCard(r, cfg.cls)).join('')}</div>
        </section>`;
    }).join('');

    return `
        ${partialWarningHTML()}
        <div class="view-actions">
            <div class="export-actions" role="group" aria-label="Exportar Power Ranking como imagem">
                <button type="button" class="export-btn" data-action="export-download" aria-label="Baixar Power Ranking como imagem">
                    <span data-icon="download" data-size="18"></span><span class="export-btn__label">Baixar</span>
                </button>
                ${canShareFiles() ? `<button type="button" class="export-btn" data-action="export-share" aria-label="Compartilhar Power Ranking como imagem">
                    <span data-icon="share" data-size="18"></span><span class="export-btn__label">Compartilhar</span>
                </button>` : ''}
            </div>
        </div>
        <div class="note">
            <span data-icon="info" data-size="18"></span>
            <span><b>Como calculamos:</b> PWR = <b>50% força</b> (em cada semana, de quantos times das Séries A–D a sua pontuação ganharia) +
            <b>30% aproveitamento</b> (V–D) + <b>20% fase</b> (média das últimas ${PWR_FORM_WEEKS} semanas comparada à liga).
            Tiers por posição: 10% Favoritos · 20% Candidatos · 40% Meio de tabela · 20% Pressionados · 10% Lanternas.
            A Elite não entra para não contar o mesmo time duas vezes.${preview ? ' <i>Prévia: placares semanais indisponíveis, usando pontos da temporada.</i>' : ''}</span>
        </div>
        <div class="tiers">${sections}</div>`;
}
