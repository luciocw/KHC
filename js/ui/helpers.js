// =============================================================================
// UI / HELPERS — Pequenos geradores de HTML compartilhados entre tabs.
//
// Foco: eliminar repetição de markup que aparece em 3+ tabs. Nada aqui faz
// fetch ou manipula appState. Exceção: lockBodyScroll/unlockBodyScroll, que
// alteram body.style.overflow (usados por drawer e modal).
//
// Depende de: js/sanitize.js
// =============================================================================

/**
 * Gera o markup do `.player-link` (span clicável que abre o drawer).
 * Cada tab estava reimplementando este span com pequenas variações no
 * aria-label — agora há uma única forma canônica.
 *
 * O `user` é o identificador estável (ownerName) usado pelo drawer pra
 * resolver carreira via careerForUser(). O `displayName` é o texto visível.
 *
 * @param {object} opts
 * @param {string} opts.user         Identificador estável (ownerName ou teamId)
 * @param {string} opts.displayName  Texto visível (call site é responsável pelo escape)
 * @param {string} [opts.ariaLabel]  Label custom; default = "Abrir perfil de <displayName>"
 * @param {string} [opts.extraClass] Classes adicionais (ex: "team-name")
 * @returns {string} HTML pronto pra interpolação
 */
function playerLinkHTML({ user, displayName, ariaLabel, extraClass } = {}) {
    const safeUser = escapeHtml(user || '');
    const label = ariaLabel || `Abrir perfil de ${displayName}`;
    const cls = extraClass ? `player-link ${extraClass}` : 'player-link';
    return `<span class="${cls}" data-user="${safeUser}" tabindex="0" role="button" aria-label="${label}">${displayName}</span>`;
}

// -----------------------------------------------------------------------------
// Scroll lock compartilhado (drawer + modal)
// -----------------------------------------------------------------------------
// Contador de overlays abertos: o scroll do body só é liberado quando o
// último fecha. Antes, fechar o modal com o drawer aberto destravava a página.

let _scrollLockCount = 0;
let _scrollLockPrevOverflow = '';

/** Trava o scroll do body (idempotente por overlay; chamar unlock ao fechar). */
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

// Exporta no escopo global (padrão vanilla do projeto)
window.playerLinkHTML = playerLinkHTML;
window.lockBodyScroll = lockBodyScroll;
window.unlockBodyScroll = unlockBodyScroll;
