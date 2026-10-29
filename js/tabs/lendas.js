// =============================================================================
// TAB / LENDAS KHC — Hall da Fama: conquistas somadas de todas as temporadas
// finalizadas (data/<ano>.json).
//
//   - Ordem: Pontos KHC (KHC_POINTS em config.js; desempate em
//     legendsAggregator). Aviso enquanto os pontos estão em discussão.
//   - Pódio top 3 (2º · 1º · 3º) com anel na cor da medalha e os pontos.
//   - Tabela: # | manager + melhor resultado | ouro · prata · bronze · 4º | pts.
//
// Depende de: config, sanitize, data, derivations, ui/helpers
// =============================================================================

const MEDAL_KEYS = ['gold', 'silver', 'bronze', 'fourth'];
const MEDAL_LABELS = { gold: 'Ouro', silver: 'Prata', bronze: 'Bronze', fourth: '4º lugar' };
const PLACE_LABELS = ['Campeão', 'Vice'];   // 3º em diante: "3º", "5º"…

/**
 * "Campeão Série A 2025" a partir do melhor resultado.
 * @param {LegendEntry} entry
 * @returns {string}
 */
function bestResultLabel(entry) {
    const b = entry.best;
    if (!b) return '';
    return `${PLACE_LABELS[b.rank - 1] || `${b.rank}º`} ${seriesNameById(b.seriesId)} ${b.season}`;
}

/**
 * Coluna do pódio.
 * @param {LegendEntry} entry
 * @param {number} place 0-based (0 = 1º)
 * @returns {string}
 */
function buildPodiumCol(entry, place) {
    const safeUser = escapeHtml(entry.user);
    return `<button type="button" class="podium__col podium__col--${place + 1}" data-user="${safeUser}" aria-label="${place + 1}º: ${safeUser}. Abrir perfil">
        ${avatarHTML({ avatarId: entry.avatarId, name: entry.user, size: 'lg' })}
        <b class="podium__name" dir="auto">${safeUser}</b>
        <small class="podium__label">${escapeHtml(bestResultLabel(entry))}</small>
        <span class="podium__pts num">${entry.points} pts</span>
        <span class="podium__base">${medalHTML(place + 1)}</span>
    </button>`;
}

/**
 * Renderiza a aba Lendas.
 * @returns {string} HTML
 */
function renderLegends() {
    const all = legendsAggregator(getFinalizedSeasons());
    if (!all.length) {
        return stateHTML({ icon: 'crown', title: 'As lendas serão reveladas ao fim das temporadas.' });
    }

    const podium = [1, 0, 2]
        .filter(i => all[i])
        .map(i => buildPodiumCol(all[i], i))
        .join('');

    const head = `<div class="legends-row legends-row--head eyebrow" aria-hidden="true">
        <span>#</span><span>Manager</span>
        ${MEDAL_KEYS.map(k => `<span class="legends-row__medal"><i class="dot-medal dot-medal--${k}" title="${MEDAL_LABELS[k]}"></i></span>`).join('')}
        <span class="legends-row__pts">Pts</span>
    </div>`;

    const rows = all.map((e, i) => {
        const safeUser = escapeHtml(e.user);
        const counts = MEDAL_KEYS.map(k => {
            const v = e.trophies[k];
            return `<span class="num legends-row__count${v ? ` is-${k}` : ''}" aria-label="${v} ${MEDAL_LABELS[k]}">${v || '–'}</span>`;
        }).join('');
        return `<button type="button" class="legends-row" data-user="${safeUser}" aria-label="${i + 1}º: ${safeUser}, ${e.points} Pontos KHC. Abrir perfil">
            <span class="pos">${i + 1}</span>
            <span class="legends-row__who"><b dir="auto">${safeUser}</b><small>${escapeHtml(bestResultLabel(e))}</small></span>
            ${counts}
            <span class="num legends-row__pts">${e.points}</span>
        </button>`;
    }).join('');

    const draft = KHC_POINTS_DRAFT ? `<div class="state-inline" role="note">
            <span data-icon="info" data-size="18"></span>
            <span>Pontos KHC em discussão: valores e critérios podem mudar e serão definidos antes da temporada 2027. <a href="#/regras">Como funciona</a></span>
        </div>` : '';

    return `
        ${draft}
        <section class="card hall" aria-label="Pódio do Hall da Fama">
            <div class="eyebrow hall__eyebrow">Hall da Fama · Pontos KHC</div>
            <div class="podium">${podium}</div>
        </section>
        <div class="card legends">${head}${rows}</div>`;
}
