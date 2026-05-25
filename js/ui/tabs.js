// =============================================================================
// UI / TABS — Roteamento entre as 5 abas (Ligas, Top Scorers, Power, Lendas,
// Temporadas) com a11y completa (WAI-ARIA tabs pattern) e anúncios SR.
// Depende de: nenhum módulo JS (apenas DOM).
//
// `switchTab` é referenciada inline via onclick="switchTab(event, ...)" no
// index.html, então precisa estar no escopo global.
// =============================================================================

function switchTab(event, tabName) {
    // Valida tabName para evitar injeção
    const validTabs = ['leagues', 'global', 'power', 'legends', 'seasons'];
    if (!validTabs.includes(tabName)) {
        console.warn('Tab inválida:', tabName);
        return;
    }

    // Atualiza estado visual e ARIA das tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
    });

    const activeBtn = event.currentTarget;
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
    activeBtn.setAttribute('tabindex', '0');

    // Atualiza painéis
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.setAttribute('hidden', '');
    });

    const activePanel = document.getElementById(`tab-${tabName}`);
    activePanel.classList.add('active');
    activePanel.removeAttribute('hidden');

    // Anuncia mudança para leitores de tela
    announceToScreenReader(`Aba ${getTabLabel(tabName)} selecionada`);
}

/**
 * Retorna o label amigável da tab para leitores de tela
 */
function getTabLabel(tabName) {
    const labels = {
        'leagues': 'Ligas',
        'global': 'Top Scorers',
        'power': 'Power Ranking',
        'legends': 'Lendas KHC',
        'seasons': 'Temporadas'
    };
    return labels[tabName] || tabName;
}

/**
 * Anuncia mensagem para leitores de tela via aria-live region
 */
function announceToScreenReader(message) {
    let announcer = document.getElementById('sr-announcer');

    if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
    }

    // Limpa e adiciona nova mensagem (força releitura)
    announcer.textContent = '';
    setTimeout(() => {
        announcer.textContent = message;
    }, 100);
}

/**
 * Configura navegação por teclado nas tabs (WAI-ARIA pattern)
 */
function setupTabKeyboardNavigation() {
    const tablist = document.querySelector('[role="tablist"]');
    const tabs = tablist.querySelectorAll('[role="tab"]');

    tablist.addEventListener('keydown', (e) => {
        const currentTab = document.activeElement;
        if (!currentTab.matches('[role="tab"]')) return;

        const tabArray = Array.from(tabs);
        const currentIndex = tabArray.indexOf(currentTab);
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabArray.length;
                break;

            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabArray.length) % tabArray.length;
                break;

            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;

            case 'End':
                e.preventDefault();
                newIndex = tabArray.length - 1;
                break;

            default:
                return;
        }

        // Move foco e ativa a nova tab
        tabArray[newIndex].focus();
        tabArray[newIndex].click();
    });
}
