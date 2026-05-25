// =============================================================================
// UI / HELPERS — Pequenos geradores de HTML compartilhados entre tabs.
//
// Foco: eliminar repetição de markup que aparece em 3+ tabs. Nada aqui faz
// fetch, manipula appState ou tem efeito colateral além de retornar string.
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

// Exporta no escopo global (padrão vanilla do projeto)
window.playerLinkHTML = playerLinkHTML;
