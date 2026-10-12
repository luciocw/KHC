// =============================================================================
// LANDING — Porta de entrada para quem chega pela primeira vez.
//
// Quando aparece:
//   · 1ª visita sem endereço (raiz do site)  → landing
//   · #/inicio                               → landing (link de divulgação e
//                                              "Ver a apresentação" em Regras)
//   · qualquer outro endereço (#/ligas/…, link compartilhado, app instalado)
//                                            → hub direto
// "Ver as ligas" grava khc_landing_seen = '1' e a partir daí a raiz abre o hub.
// Quem já usava o hub antes da landing (tem chaves khc_* no navegador) é
// tratado como visto e nunca cai nela sem pedir.
//
// Carregado no <head> (sem defer): decide antes da primeira pintura e marca
// <html class="is-landing">; o CSS esconde o hub enquanto a classe existir.
// Os eventos são ligados no DOMContentLoaded. Não depende de outros módulos.
// =============================================================================

const LANDING_KEY = 'khc_landing_seen';
const LANDING_HASH = '#/inicio';

const RISK_LINES = [
    'Alta. Mas o grupo vai adorar.',
    'Depende. Você escala kicker na sexta?',
    '30%. Os outros 70% são o grupo te zoando.',
    'Baixa, se você parar de confiar em running back de comitê.',
    'Sinceramente? Já separa o print do rebaixamento.',
    'Zero, se você não entrar. Mas aí não tem graça.',
];

/**
 * Decide se a landing abre nesta visita.
 * @param {string} hash
 * @returns {boolean}
 */
function shouldShowLanding(hash) {
    if (hash === LANDING_HASH) return true;
    if (hash && hash !== '#' && hash !== '#/') return false;
    try {
        const seen = localStorage.getItem(LANDING_KEY);
        if (seen === '1') return false;
        if (seen === null) {
            let returning = false;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('khc_')) { returning = true; break; }
            }
            // '0' = já viu a landing, mas ainda não entrou no hub por ela.
            // Precisa ser gravado agora: o hub carrega por trás e cria chaves
            // khc_*, que na próxima visita pareceriam de alguém antigo.
            localStorage.setItem(LANDING_KEY, returning ? '1' : '0');
            return !returning;
        }
        return true;
    } catch (e) {
        return false; // sem storage: não dá pra lembrar, então não insiste
    }
}

function showLanding() {
    document.documentElement.classList.add('is-landing');
    window.scrollTo(0, 0);
}

function leaveLanding() {
    try { localStorage.setItem(LANDING_KEY, '1'); } catch (e) { /* sem storage */ }
    document.documentElement.classList.remove('is-landing');
    if (typeof syncHash === 'function') syncHash(); // grava na URL a aba atual do hub
    window.scrollTo(0, 0);
    const main = document.getElementById('main');
    if (main) main.focus({ preventScroll: true });
}

if (shouldShowLanding(location.hash)) document.documentElement.classList.add('is-landing');

// Registrado antes do app.js, que reage ao mesmo evento: lê o hash do próprio
// evento e acerta a classe antes do render do app.
window.addEventListener('hashchange', (e) => {
    let hash = '';
    try { hash = new URL(e.newURL).hash; } catch (err) { hash = location.hash; }
    if (hash === LANDING_HASH) showLanding();
    // Voltar (ou qualquer outro endereço) com a landing aberta leva ao hub.
    else document.documentElement.classList.remove('is-landing');
});

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('landing');
    if (!root) return;

    root.querySelectorAll('[data-landing-leave]').forEach(b => b.addEventListener('click', leaveLanding));

    const end = document.getElementById('landingEnd');
    root.querySelectorAll('[data-landing-to-end]').forEach(b => b.addEventListener('click', () => {
        end.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    const verdict = document.getElementById('landingVerdict');
    const say = (text) => {
        const span = document.createElement('span');
        span.textContent = text;
        verdict.replaceChildren(span);
    };
    let last = -1;
    document.getElementById('landingRisk').addEventListener('click', () => {
        let i;
        do { i = Math.floor(Math.random() * RISK_LINES.length); } while (i === last);
        last = i;
        say(RISK_LINES[i]);
    });
    // TODO: levar ao link de inscrição quando a organização definir.
    document.getElementById('landingJoin').addEventListener('click', () => say('Inscrições em breve.'));

    // Barra fixa: aparece depois que o botão do topo sai pela parte de cima e some quando os
    // botões do final estão visíveis (evita dois "Quero jogar" ao mesmo tempo).
    const dock = document.getElementById('landingDock');
    const dockBtn = dock.querySelector('button');
    let heroPassed = false; // o botão do topo já ficou para trás (acima da tela)
    let endVisible = false;
    const update = () => {
        const on = heroPassed && !endVisible;
        dock.classList.toggle('is-on', on);
        dock.setAttribute('aria-hidden', on ? 'false' : 'true');
        dockBtn.tabIndex = on ? 0 : -1;
    };
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { heroPassed = !e.isIntersecting && e.boundingClientRect.top < 0; update(); })
            .observe(root.querySelector('.ld-hero [data-landing-to-end]'));
        new IntersectionObserver(([e]) => { endVisible = e.isIntersecting; update(); })
            .observe(root.querySelector('.ld-end__actions'));
    }
});
