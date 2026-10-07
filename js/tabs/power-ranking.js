// =============================================================================
// TAB / POWER RANKING — Tiers S/A/B/C/D pelo Power Score (derivations.js).
//
//   - Só séries regulares: a Elite fica de fora para não contar o mesmo time
//     duas vezes.
//   - Tiers como cabeçalhos horizontais: badge + nome em PT-BR.
//   - Card: #rank | avatar | time + série · V–D · pts | PWR + barra.
//   - Sem setas de movimento: não há histórico semanal para comparar.
//
// Lê: appState.rosterData
// Depende de: config, sanitize, derivations, ui/helpers
// =============================================================================

/** Nome e classe de cada tier (limites em tierForPwr, derivations.js). */
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

/**
 * Renderiza a aba Power Ranking.
 * @returns {string} HTML
 */
function renderPowerRankings() {
    const regular = appState.rosterData.filter(r => r.leagueTier !== 'elite');
    if (!regular.length) {
        return stateHTML({ icon: 'zap', title: 'Nada por aqui ainda' });
    }

    const rows = powerRanking(mapRosterToTeams(regular));
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
        <div class="note">
            <span data-icon="info" data-size="18"></span>
            <span><b>Como calculamos:</b> PWR = 60% aproveitamento + 40% pontos normalizados (0–100).
            Só séries regulares — a Elite não entra para não contar o mesmo time duas vezes.</span>
        </div>
        <div class="tiers">${sections}</div>`;
}
