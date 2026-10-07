// =============================================================================
// TAB / LENDAS KHC — Hall da Fama: conquistas somadas de todas as temporadas
// finalizadas (data/<ano>.json).
//
//   - Ordem: títulos sempre na frente (ouro → prata → bronze → 4º).
//   - Pódio top 3 (2º · 1º · 3º) com anel na cor da medalha.
//   - Tabela: # | manager + melhor resultado | ouro · prata · bronze · 4º.
//
// Depende de: config, sanitize, data, derivations, ui/helpers
// =============================================================================

const MEDAL_KEYS = ['gold', 'silver', 'bronze', 'fourth'];
const MEDAL_LABELS = { gold: 'Ouro', silver: 'Prata', bronze: 'Bronze', fourth: '4º lugar' };
const PLACE_LABELS = { gold: 'Campeão', silver: 'Vice', bronze: '3º', fourth: '4º' };

/**
 * "Campeão Série A 2025" a partir do melhor resultado.
 * @param {LegendEntry} entry
 * @returns {string}
 */
function bestResultLabel(entry) {
    const b = entry.best;
    if (!b) return '';
    return `${PLACE_LABELS[b.trophy]} ${seriesNameById(b.seriesId)} ${b.season}`;
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
    </div>`;

    const rows = all.map((e, i) => {
        const safeUser = escapeHtml(e.user);
        const counts = MEDAL_KEYS.map(k => {
            const v = e.trophies[k];
            return `<span class="num legends-row__count${v ? ` is-${k}` : ''}" aria-label="${v} ${MEDAL_LABELS[k]}">${v || '–'}</span>`;
        }).join('');
        return `<button type="button" class="legends-row" data-user="${safeUser}" aria-label="${i + 1}º: ${safeUser}. Abrir perfil">
            <span class="pos">${i + 1}</span>
            <span class="legends-row__who"><b dir="auto">${safeUser}</b><small>${escapeHtml(bestResultLabel(e))}</small></span>
            ${counts}
        </button>`;
    }).join('');

    return `
        <section class="card hall" aria-label="Pódio do Hall da Fama">
            <div class="eyebrow hall__eyebrow">Hall da Fama · por títulos</div>
            <div class="podium">${podium}</div>
        </section>
        <div class="card legends">${head}${rows}</div>`;
}
