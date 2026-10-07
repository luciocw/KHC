// =============================================================================
// UI / MODAL — About modal (Fase 4.B).
// Vanilla module, sem dependências externas além das globais do projeto:
//   - IconRegistry.close (icons.js)
//   - escapeHtml (sanitize.js) — não usado aqui pois copy é estática controlada,
//     mas mantido como dependência opcional para futuras extensões.
//
// API pública (no escopo global):
//   - openAboutModal()
//   - closeAboutModal()
//
// Wire automático:
//   - [data-open-modal="about"]  → abre
//   - [data-close-modal]          → fecha (dentro do modal)
//   - ESC                         → fecha
//   - clique no backdrop          → fecha (via [data-close-modal] no backdrop)
//
// Acessibilidade:
//   - role="dialog" aria-modal="true" aria-labelledby
//   - focus trap (Tab cicla apenas entre focáveis do modal)
//   - foco inicial vai para o botão de fechar
//   - foco devolvido ao trigger ao fechar
//   - body.scroll lock enquanto aberto
// =============================================================================

(function () {
    'use strict';

    const MODAL_ID = 'about-modal';
    const BODY_ID = 'about-modal-body';

    // Selector dos focáveis dentro do modal (focus trap)
    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    // Estado interno
    let modalEl = null;
    let bodyEl = null;
    let closeBtnEl = null;
    let lastTrigger = null;
    let isOpen = false;
    let isBuilt = false;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Constrói o HTML do corpo do modal. Copy estática: regras atuais
     * (a partir de 2026) + regras da temporada inaugural (2025), que eram
     * diferentes. Playoffs conferidos nas configurações das ligas na Sleeper.
     */
    function buildBodyHTML() {
        return `
            <dl>
                <dt>A Liga</dt>
                <dd>Fundada em 2025.</dd>

                <dt>Formato</dt>
                <dd>
                    <ul>
                        <li>Séries A, B, C e D com 10 participantes cada</li>
                        <li>Pontuação: PPR padrão</li>
                        <li>Roster: <code>QB · 2 RB · 2 WR · TE · FLEX · SF · K · D/ST</code></li>
                        <li>Temporada regular: 14 semanas</li>
                        <li>Playoffs: 6 classificados, semanas 15 a 17</li>
                    </ul>
                </dd>

                <dt>Promoção &amp; Rebaixamento</dt>
                <dd>
                    <ul>
                        <li>3 equipes sobem e 3 descem entre séries vizinhas:</li>
                        <li>Serie A ⇄ Serie B</li>
                        <li>Serie B ⇄ Serie C</li>
                        <li>Serie C ⇄ Serie D</li>
                    </ul>
                </dd>

                <dt>KHC Elite</dt>
                <dd>
                    Liga <strong>PARALELA</strong>, não um tier: premia os melhores da
                    temporada anterior, que competem em duas ligas ao mesmo tempo.
                    <ul>
                        <li>2027: campeão e vice de cada série (A, B, C e D) — 8 participantes</li>
                        <li>Playoffs: 4 classificados</li>
                    </ul>
                </dd>

                <dt>Regras de 2025</dt>
                <dd>
                    Temporada inaugural, com regras diferentes:
                    <ul>
                        <li>Promoção &amp; rebaixamento de 2 equipes entre séries vizinhas</li>
                        <li>Elite 2026: top 4 da Serie A + top 4 da Serie B de 2025</li>
                    </ul>
                </dd>
            </dl>
        `;
    }

    /**
     * Popula o body e renderiza o ícone X no botão de fechar.
     * Chamado na primeira abertura (lazy) e idempotente.
     */
    function ensureBuilt() {
        if (isBuilt) return true;

        modalEl = document.getElementById(MODAL_ID);
        if (!modalEl) return false;

        bodyEl = modalEl.querySelector('#' + BODY_ID);
        closeBtnEl = modalEl.querySelector('.modal-close');

        if (bodyEl) {
            bodyEl.innerHTML = buildBodyHTML();
        }

        if (closeBtnEl && typeof IconRegistry !== 'undefined' && IconRegistry.close) {
            closeBtnEl.innerHTML = IconRegistry.close({ size: 20 });
        }

        isBuilt = true;
        return true;
    }

    // -------------------------------------------------------------------------
    // Focus trap
    // -------------------------------------------------------------------------

    function getFocusable() {
        if (!modalEl) return [];
        return Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }

    function trapTab(e) {
        if (e.key !== 'Tab') return;
        const focusables = getFocusable();
        if (focusables.length === 0) {
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
            if (active === first || !modalEl.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (active === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    function handleKeydown(e) {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeAboutModal();
            return;
        }
        trapTab(e);
    }

    // -------------------------------------------------------------------------
    // Open / close
    // -------------------------------------------------------------------------

    function openAboutModal() {
        if (isOpen) return;
        if (!ensureBuilt()) return;

        lastTrigger = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        modalEl.hidden = false;
        isOpen = true;
        lockBodyScroll();

        // foco inicial: botão de fechar
        requestAnimationFrame(() => {
            if (closeBtnEl) closeBtnEl.focus();
        });
    }

    function closeAboutModal() {
        if (!isOpen || !modalEl) return;
        modalEl.hidden = true;
        isOpen = false;
        unlockBodyScroll();

        if (lastTrigger && typeof lastTrigger.focus === 'function') {
            lastTrigger.focus();
        }
        lastTrigger = null;
    }

    // Expor no escopo global (padrão do projeto vanilla)
    window.openAboutModal = openAboutModal;
    window.closeAboutModal = closeAboutModal;

    // -------------------------------------------------------------------------
    // Bootstrap
    // -------------------------------------------------------------------------

    function bindGlobalTriggers() {
        // delegation: clique em qualquer elemento com [data-open-modal="about"]
        document.addEventListener('click', (e) => {
            const target = e.target instanceof Element ? e.target : null;
            if (!target) return;

            const opener = target.closest('[data-open-modal="about"]');
            if (opener) {
                e.preventDefault();
                openAboutModal();
                return;
            }

            // Fechar via [data-close-modal] dentro do modal
            if (isOpen && modalEl && modalEl.contains(target)) {
                const closer = target.closest('[data-close-modal]');
                if (closer) {
                    e.preventDefault();
                    closeAboutModal();
                }
            }
        });

        document.addEventListener('keydown', handleKeydown);
    }

    function init() {
        ensureBuilt();
        bindGlobalTriggers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
