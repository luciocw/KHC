// =============================================================================
// ICONS — Registro de SVGs inline da Ultimate KHC.
//
// Por que inline? O site é HTML/CSS/JS puro servido pelo GitHub Pages. Manter
// os SVGs como strings em JS evita N requests extras e permite que cor
// (`currentColor`) e tamanho sejam controlados pelo CSS pai.
//
// Desenho: linha 2px, cantos arredondados, viewBox 24×24 — mesmo estilo do
// set Lucide indicado no guia da marca (ISC). Medalhas e escudos NÃO vivem
// aqui: medalha é CSS (`.medal`, número dentro) e escudo é imagem
// (`assets/logo/png/ui/escudo-*.png`).
//
// Como usar:
//   1. Diretamente:        elem.innerHTML = IconRegistry.trophy({ size: 20 });
//   2. Via placeholders:   <span data-icon="trophy" data-size="20"></span>
//                          e chame renderIcons() depois de inserir o markup.
//
// Expõe dois globais: `IconRegistry` e `renderIcons`.
// =============================================================================

/**
 * Constrói atributos comuns para o elemento <svg> raiz.
 * @param {{size?: number, className?: string}} opts
 * @returns {string} Atributos prontos para concatenar no template.
 */
function svgAttrs(opts) {
    const size = opts.size != null ? opts.size : 20;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls} aria-hidden="true" focusable="false"`;
}

/**
 * Fábrica de ícone: recebe o miolo do SVG e devolve a função `(opts) => svg`.
 * @param {string} body
 * @returns {function({size?: number, className?: string}=): string}
 */
function icon(body) {
    return (opts = {}) => `<svg ${svgAttrs(opts)}>${body}</svg>`;
}

/* eslint-disable no-unused-vars */
const IconRegistry = {
    // --- Navegação (abas) ---
    trophy: icon('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    chart: icon('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
    zap: icon('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    crown: icon('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>'),
    swords: icon('<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>'),
    calendar: icon('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
    bookOpen: icon('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),

    // --- Regras ---
    layers: icon('<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'),
    arrowUpDown: icon('<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>'),
    history: icon('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),

    // --- UI ---
    info: icon('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    refresh: icon('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
    download: icon('<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'),
    share: icon('<path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>'),
    chevronLeft: icon('<path d="m15 18-6-6 6-6"/>'),
    chevronRight: icon('<path d="m9 18 6-6-6-6"/>'),
    close: icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    alert: icon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
};
/* eslint-enable no-unused-vars */

/**
 * Substitui placeholders `<span data-icon="NAME" [data-size="N"]>` pelo SVG
 * correspondente. Chame depois de qualquer render que contenha placeholders.
 * @param {ParentNode} [root=document]
 * @returns {number} Quantidade de ícones renderizados.
 */
function renderIcons(root) {
    const scope = root || document;
    let count = 0;
    scope.querySelectorAll('[data-icon]').forEach((node) => {
        const builder = IconRegistry[node.getAttribute('data-icon')];
        if (typeof builder !== 'function') return;
        const size = parseInt(node.getAttribute('data-size'), 10);
        node.innerHTML = builder({ size: Number.isFinite(size) ? size : undefined });
        node.removeAttribute('data-icon');
        count++;
    });
    return count;
}
