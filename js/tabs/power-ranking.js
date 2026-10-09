// =============================================================================
// TAB / POWER RANKING — Tiers S/A/B/C/D pelo Power Score (derivations.js).
//
//   - Só séries regulares: a Elite fica de fora para não contar o mesmo time
//     duas vezes.
//   - Tiers como cabeçalhos horizontais: badge + nome em PT-BR.
//   - Card: #rank | avatar | time + série · V–D · pts | PWR + barra.
//   - Sem setas de movimento: não há histórico semanal para comparar.
//   - Botões Baixar / Compartilhar: o ranking vira PNG (ui/export.js).
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

/** Resumo da fórmula (nota da aba e rodapé da imagem). */
const PWR_FORMULA_SHORT = 'PWR = 60% aproveitamento + 40% pontos normalizados';

/**
 * Linhas do Power Ranking da temporada (só séries regulares).
 * Usado pela aba e pela imagem exportada.
 * @returns {Array<object>} PowerRow ordenadas
 */
function powerRows() {
    const regular = appState.rosterData.filter(r => r.leagueTier !== 'elite');
    return powerRanking(mapRosterToTeams(regular));
}

/**
 * Renderiza a aba Power Ranking.
 * @returns {string} HTML
 */
function renderPowerRankings() {
    const rows = powerRows();
    if (!rows.length) {
        return stateHTML({ icon: 'zap', title: 'Nada por aqui ainda' });
    }

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
            <span><b>Como calculamos:</b> PWR = 60% aproveitamento + 40% pontos normalizados (0–100).
            Só séries regulares — a Elite não entra para não contar o mesmo time duas vezes.</span>
        </div>
        <div class="tiers">${sections}</div>`;
}
