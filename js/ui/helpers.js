// =============================================================================
// UI / HELPERS — Pequenos geradores de HTML compartilhados entre abas.
//
// Nada aqui faz fetch ou manipula appState. Exceção: lockBodyScroll /
// unlockBodyScroll, que alteram body.style.overflow (usados pelo drawer).
//
// Convenção de escape: os helpers recebem dados CRUS e escapam por conta
// própria. Não passe strings já escapadas.
//
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

/**
 * Até 2 letras/números do nome, para o avatar de reserva.
 * @param {string} name
 * @returns {string}
 */
function initialsOf(name) {
    const chars = String(name || '').match(/[\p{L}\p{N}]/gu) || ['?'];
    return chars.slice(0, 2).join('').toUpperCase();
}

/**
 * Avatar quadrado (raio 8). Mostra as iniciais; a foto da Sleeper fica por
 * cima e some sozinha se falhar (onerror remove o <img>).
 * @param {{avatarId?: string|null, name: string, size?: 'lg'}} opts
 * @returns {string}
 */
function avatarHTML({ avatarId, name, size } = {}) {
    const cls = size === 'lg' ? 'avatar avatar--lg' : 'avatar';
    const valid = typeof avatarId === 'string' && VALIDATION.AVATAR_PATTERN.test(avatarId);
    const img = valid
        ? `<img src="${sanitizeAvatarUrl(avatarId)}" alt="" loading="lazy" onerror="this.remove()">`
        : '';
    return `<span class="${cls}" aria-hidden="true">${escapeHtml(initialsOf(name))}${img}</span>`;
}

/**
 * Botão do time (avatar + nome + dono ›) que abre o perfil do dono.
 * @param {{user: string, team: string, avatarId?: string|null}} opts
 * @returns {string}
 */
function teamButtonHTML({ user, team, avatarId }) {
    const safeUser = escapeHtml(user || '');
    const safeTeam = escapeHtml(team || '');
    return `<button type="button" class="team" data-user="${safeUser}" aria-label="${safeTeam}, de ${safeUser}. Abrir perfil">
        ${avatarHTML({ avatarId, name: team || user })}
        <span class="team__text">
            <span class="team__name" dir="auto">${safeTeam}</span>
            <span class="team__owner" dir="auto">${safeUser} <span aria-hidden="true">›</span></span>
        </span>
    </button>`;
}

/**
 * Escudo da série (PNG 160px). Decorativo: o nome sempre aparece ao lado.
 * @param {string} tier  'elite' | 'serie-a' …
 * @param {number} height
 * @returns {string}
 */
function crestHTML(tier, height) {
    const meta = SERIES_META[tier];
    const file = meta ? meta.crest : 'escudo-khc.png';
    const width = Math.round(height * 141 / 160);
    return `<img class="crest" src="${CREST_PATH}${file}" alt="" width="${width}" height="${height}" loading="lazy">`;
}

/**
 * Pílula da série (borda e texto na cor da liga).
 * @param {string} tier
 * @returns {string}
 */
function seriesPillHTML(tier) {
    const meta = SERIES_META[tier];
    if (!meta) return '';
    return `<span class="pill" data-league="${meta.league}">${escapeHtml(meta.short)}</span>`;
}

/**
 * Medalha com o número dentro (nunca substitui a posição).
 * @param {number} pos 1–4
 * @returns {string}
 */
function medalHTML(pos) {
    return `<span class="medal medal--${pos}" role="img" aria-label="${pos}º lugar">${pos}</span>`;
}

/** @param {number} n @returns {string} pontos com 1 casa decimal */
function fmtPts(n) {
    return (Number(n) || 0).toFixed(1);
}

/** Nome da série a partir do SeriesId do data model ('A', 'Elite'…). */
function seriesNameById(id) {
    const meta = SERIES_META[seriesIdToTier(id)];
    return meta ? meta.short : id;
}

/**
 * Estado vazio / erro centralizado.
 * @param {{icon?: string, title: string, text?: string, action?: string}} opts
 *        action: HTML de um botão opcional
 * @returns {string}
 */
function stateHTML({ icon, title, text, action }) {
    return `<div class="state card" role="status">
        ${icon ? `<span class="state__icon" data-icon="${icon}" data-size="28"></span>` : ''}
        <b class="state__title">${escapeHtml(title)}</b>
        ${text ? `<p class="state__text">${escapeHtml(text)}</p>` : ''}
        ${action || ''}
    </div>`;
}

// -----------------------------------------------------------------------------
// Scroll lock compartilhado
// -----------------------------------------------------------------------------
// Contador de overlays abertos: o scroll do body só é liberado quando o
// último fecha.

let _scrollLockCount = 0;
let _scrollLockPrevOverflow = '';

/** Trava o scroll do body (chamar unlock ao fechar). */
function lockBodyScroll() {
    if (_scrollLockCount === 0) {
        _scrollLockPrevOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
    }
    _scrollLockCount++;
}

/** Libera uma trava; restaura o overflow original quando não resta nenhuma. */
function unlockBodyScroll() {
    if (_scrollLockCount === 0) return;
    _scrollLockCount--;
    if (_scrollLockCount === 0) {
        document.body.style.overflow = _scrollLockPrevOverflow;
        _scrollLockPrevOverflow = '';
    }
}
