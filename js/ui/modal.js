// =============================================================================
// UI / MODAL — About modal (Fase 4.B).
// Vanilla module, sem dependências externas além das globais do projeto:
//   - IconRegistry.close (icons.js)
//   - KHC_CONFIG (config.js) para computar nº de temporadas finalizadas
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
     * Conta quantas temporadas estão "finalizadas" (têm campeões definidos).
     * Fallback simples: se houver erro, devolve 1.
     */
    function countFinishedSeasons() {
        try {
            if (typeof KHC_CONFIG !== 'object' || !KHC_CONFIG) return 1;
            return Object.values(KHC_CONFIG).filter((s) => {
                return s && Array.isArray(s.champions) && s.champions.length > 0;
            }).length || 1;
        } catch (_) {
            return 1;
        }
    }

    /**
     * Pluraliza "temporada(s) disputada(s)".
     */
    function temporadasLabel(n) {
        return n === 1 ? '1 temporada disputada' : `${n} temporadas disputadas`;
    }

    /**
     * Constrói o HTML do corpo do modal a partir de KHC_CONFIG.
     */
    function buildBodyHTML() {
        const seasonsN = countFinishedSeasons();
        return `
            <dl>
                <dt>A Liga</dt>
                <dd>Fundada em 2025. ${temporadasLabel(seasonsN)}.</dd>

                <dt>Formato</dt>
                <dd>
                    <ul>
                        <li>Pontuação: PPR padrão</li>
                        <li>Roster: <code>QB · 2 RB · 2 WR · TE · FLEX · SF · K · D/ST</code></li>
                        <li>Temporada regular: 14 semanas</li>
                        <li>Playoffs: Top 6, 2 semanas de mata-mata</li>
                    </ul>
                </dd>

                <dt>Promoção &amp; Rebaixamento</dt>
                <dd>
                    <ul>
                        <li>2 últimos da Serie A descem para Serie B</li>
                        <li>2 primeiros da Serie B sobem para Serie A</li>
                        <li>2 últimos da Serie B descem para Serie C</li>
                        <li>2 primeiros da Serie C sobem para Serie B</li>
                    </ul>
                </dd>

                <dt>KHC Elite</dt>
                <dd>
                    Liga <strong>PARALELA</strong>, não um tier. Top 4 da Serie A + top 4
                    da Serie B da temporada anterior se qualificam. Esses jogadores
                    competem em duas ligas ao mesmo tempo. Critérios podem mudar
                    ano a ano.
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
        document.body.style.overflow = 'hidden';

        // foco inicial: botão de fechar
        requestAnimationFrame(() => {
            if (closeBtnEl) closeBtnEl.focus();
        });
    }

    function closeAboutModal() {
        if (!isOpen || !modalEl) return;
        modalEl.hidden = true;
        isOpen = false;
        document.body.style.overflow = '';

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
