// =============================================================================
// ICONS — Registro de SVGs inline da Ultimate KHC.
//
// Por que inline? O site é HTML/CSS/JS puro servido pelo GitHub Pages. Manter
// os SVGs como strings em JS evita N requests extras e permite que cor
// (`currentColor`) e tamanho sejam controlados pelo CSS pai.
//
// Como usar:
//   1. Diretamente:        elem.innerHTML = IconRegistry.trophy({ size: 14 });
//   2. Via placeholders:   <span data-icon="trophy" data-size="14"></span>
//                          então chame renderIcons() depois do DOMContentLoaded.
//
// Convenções:
//   - Ícones de UI (line) são desenhados com `stroke="currentColor"` e
//     `fill="none"` — herdam a cor do pai.
//   - Medalhas são filled, com gradiente radial — cor fixa por variante.
//   - Todos aceitam `opts.size` (px, número) e `opts.className` (string).
//
// Este arquivo é stand-alone (sem dependências) e expõe um único global:
// `IconRegistry`. Adicionar a `index.html` é trabalho da Fase 2 wire-up.
// =============================================================================

/**
 * Constrói atributos comuns para o elemento <svg> raiz.
 * @param {{size?: number, className?: string, viewBox?: string}} opts
 * @returns {string} Atributos prontos para concatenar no template.
 */
function svgAttrs(opts) {
    const size = opts.size != null ? opts.size : 14;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    const vb = opts.viewBox || '0 0 24 24';
    return `width="${size}" height="${size}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls} aria-hidden="true"`;
}

/* eslint-disable no-unused-vars */
const IconRegistry = {
    // ---------------------------------------------------------------------------
    // Ícones de aba (line, 14px default, herdam currentColor)
    // ---------------------------------------------------------------------------

    /**
     * Troféu — aba LIGAS.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    trophy: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/>
        <path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3"/>
    </svg>`,

    /**
     * Alvo — aba TOP SCORERS.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    target: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>`,

    /**
     * Gráfico de barras — aba POWER RANKING.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    chart: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <path d="M3 21h18"/>
        <rect x="5" y="12" width="3" height="8"/>
        <rect x="10.5" y="7" width="3" height="13"/>
        <rect x="16" y="3" width="3" height="17"/>
    </svg>`,

    /**
     * Colunas / pódio — aba LENDAS KHC.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    columns: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <path d="M3 21h18"/>
        <rect x="4" y="10" width="5" height="11"/>
        <rect x="9.5" y="4" width="5" height="17"/>
        <rect x="15" y="13" width="5" height="8"/>
    </svg>`,

    /**
     * Calendário — aba TEMPORADAS.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    calendar: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M16 3v4M8 3v4M3 10h18"/>
    </svg>`,

    // ---------------------------------------------------------------------------
    // UI utilitários
    // ---------------------------------------------------------------------------

    /**
     * Chevron — usado no botão de seleção de temporada. CSS gira 180° quando aberto.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    chevron: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <polyline points="6 9 12 15 18 9"/>
    </svg>`,

    /**
     * X — fecha drawer / modal.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    close: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,

    /**
     * Ampulheta — status "em andamento".
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    hourglass: (opts = {}) => `<svg ${svgAttrs(opts)}>
        <path d="M6 2h12M6 22h12"/>
        <path d="M6 2v3a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2"/>
        <path d="M6 22v-3a6 6 0 0 1 6-6 6 6 0 0 1 6 6v3"/>
    </svg>`,

    // ---------------------------------------------------------------------------
    // Indicadores
    // ---------------------------------------------------------------------------

    /**
     * Bolinha verde — indicador "live / temporada ativa". Útil quando CSS não
     * é suficiente (ex.: dentro de templates HTML inline).
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    dotGreen: (opts = {}) => {
        const size = opts.size != null ? opts.size : 10;
        const cls = opts.className ? ` class="${opts.className}"` : '';
        return `<svg width="${size}" height="${size}" viewBox="0 0 10 10"${cls} aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill="#3eb371"/>
        </svg>`;
    },

    // ---------------------------------------------------------------------------
    // Medalhas (filled, ~20px, gradiente radial por variante)
    // ---------------------------------------------------------------------------

    /**
     * Medalha de ouro — 1º lugar.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    medalGold: (opts = {}) => medalSvg(opts, 'gold', '#fce58a', '#f5b400', '#7a5400'),

    /**
     * Medalha de prata — 2º lugar.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    medalSilver: (opts = {}) => medalSvg(opts, 'silver', '#f1f1f5', '#c9c9d3', '#646470'),

    /**
     * Medalha de bronze — 3º lugar.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    medalBronze: (opts = {}) => medalSvg(opts, 'bronze', '#e9b18a', '#d18046', '#6e3c1a'),

    /**
     * Medalha "4º lugar" — azul claro.
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    medalFourth: (opts = {}) => medalSvg(opts, 'fourth', '#a8d0ec', '#6ab2e0', '#2a5a7a'),

    // ---------------------------------------------------------------------------
    // Brand
    // ---------------------------------------------------------------------------

    /**
     * Escudo da Ultimate KHC — logo principal do site.
     * Spec do design handoff:
     *   - 96×110 viewBox, gradiente marrom escuro com stroke laranja 2px.
     *   - Banner "LEAGUE" no topo (laranja, 9px, weight 900, fill escuro).
     *   - Bola de futebol americano no centro (gradiente radial laranja, rotacionada -22°)
     *     com laces brancas.
     *   - Três estrelas laranjas pequenas embaixo.
     *   - Texto "KHC" abaixo (laranja, 11px, weight 900, letter-spacing 2px).
     * @param {{size?: number, className?: string}} [opts]
     * @returns {string} SVG markup
     */
    logoShield: (opts = {}) => {
        const size = opts.size != null ? opts.size : 96;
        const height = Math.round(size * (110 / 96));
        const cls = opts.className ? ` class="${opts.className}"` : '';
        // Unique IDs per call to keep multiple instances in the same DOM safe.
        const uid = 'khc-' + Math.random().toString(36).slice(2, 8);
        return `<svg width="${size}" height="${height}" viewBox="0 0 96 110"${cls} role="img" aria-label="Ultimate KHC">
            <defs>
                <linearGradient id="${uid}-shield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#1a0c06"/>
                    <stop offset="100%" stop-color="#0a0503"/>
                </linearGradient>
                <radialGradient id="${uid}-ball" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="#ff8a4a"/>
                    <stop offset="100%" stop-color="#c84410"/>
                </radialGradient>
            </defs>
            <!-- Outer shield -->
            <path d="M48 4 L88 14 L88 58 C88 80 70 96 48 104 C26 96 8 80 8 58 L8 14 Z"
                  fill="url(#${uid}-shield)" stroke="#ff6b35" stroke-width="2"/>
            <!-- Inner shield outline (45% orange) -->
            <path d="M48 11 L82 19 L82 57 C82 75 67 89 48 96 C29 89 14 75 14 57 L14 19 Z"
                  fill="none" stroke="#ff6b35" stroke-opacity="0.45" stroke-width="1"/>
            <!-- LEAGUE banner across top -->
            <rect x="14" y="18" width="68" height="11" fill="#ff6b35"/>
            <text x="48" y="26.5" text-anchor="middle"
                  font-family="Inter, sans-serif" font-size="9" font-weight="900"
                  letter-spacing="1.2" fill="#1a0c06">LEAGUE</text>
            <!-- Football (rotated -22°) -->
            <g transform="rotate(-22 48 56)">
                <ellipse cx="48" cy="56" rx="20" ry="11" fill="url(#${uid}-ball)" stroke="#7a2a08" stroke-width="1"/>
                <!-- White laces -->
                <line x1="42" y1="56" x2="54" y2="56" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="44" y1="53.5" x2="44" y2="58.5" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
                <line x1="48" y1="53" x2="48" y2="59" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
                <line x1="52" y1="53.5" x2="52" y2="58.5" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
            </g>
            <!-- Three small stars -->
            ${starPath(34, 78)}
            ${starPath(48, 80)}
            ${starPath(62, 78)}
            <!-- KHC text -->
            <text x="48" y="96" text-anchor="middle"
                  font-family="Inter, sans-serif" font-size="11" font-weight="900"
                  letter-spacing="2" fill="#ff6b35">KHC</text>
        </svg>`;
    },
};
/* eslint-enable no-unused-vars */

/**
 * Helper interno: gera o SVG de uma medalha com gradiente radial.
 * Cada medalha tem ~20px, viewBox 24×24, com fita de baixo e centro de gradiente.
 * @param {{size?: number, className?: string}} opts
 * @param {string} variant - 'gold' | 'silver' | 'bronze' | 'fourth'
 * @param {string} light - Cor central (mais clara) do gradiente.
 * @param {string} mid - Cor de borda (mais escura) do gradiente.
 * @param {string} dark - Cor da fita / ringues.
 * @returns {string} SVG markup
 */
function medalSvg(opts, variant, light, mid, dark) {
    const size = opts.size != null ? opts.size : 20;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    const uid = 'm-' + variant + '-' + Math.random().toString(36).slice(2, 8);
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"${cls} role="img" aria-label="${variant} medal">
        <defs>
            <radialGradient id="${uid}" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stop-color="${light}"/>
                <stop offset="100%" stop-color="${mid}"/>
            </radialGradient>
        </defs>
        <!-- Ribbon -->
        <path d="M8 2 L10 12 L8 14 L12 12 L16 14 L14 12 L16 2 Z" fill="${dark}" opacity="0.85"/>
        <!-- Medal disc -->
        <circle cx="12" cy="16" r="6.5" fill="url(#${uid})" stroke="${dark}" stroke-width="0.8"/>
        <!-- Inner ring -->
        <circle cx="12" cy="16" r="4" fill="none" stroke="${dark}" stroke-opacity="0.45" stroke-width="0.6"/>
    </svg>`;
}

/**
 * Helper interno: gera o `<path>` de uma estrela laranja pequena para o logo.
 * Estrela de 5 pontas centrada em (cx, cy), ~6px de altura.
 * @param {number} cx
 * @param {number} cy
 * @returns {string} <path> markup
 */
function starPath(cx, cy) {
    // Pontos de uma estrela de 5 pontas (raio externo 3, interno 1.2)
    const r1 = 3;
    const r2 = 1.2;
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? r1 : r2;
        pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="#ff6b35"/>`;
}

/**
 * Substitui placeholders `<span data-icon="NAME" [data-size="N"] [data-class="..."]>`
 * pelo SVG correspondente. Chame uma vez após DOMContentLoaded, e novamente
 * depois de qualquer render dinâmico de markup que contenha placeholders.
 *
 * Exemplo:
 *   <span data-icon="trophy" data-size="14"></span>
 *   document.addEventListener('DOMContentLoaded', () => renderIcons());
 *
 * @param {ParentNode} [root=document] - Subtree onde procurar placeholders.
 * @returns {number} Quantidade de ícones renderizados.
 */
function renderIcons(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-icon]');
    let count = 0;
    nodes.forEach((node) => {
        const name = node.getAttribute('data-icon');
        const builder = IconRegistry[name];
        if (typeof builder !== 'function') {
            console.warn(`[icons] unknown icon: "${name}"`);
            return;
        }
        const size = parseInt(node.getAttribute('data-size'), 10);
        const className = node.getAttribute('data-class') || '';
        node.innerHTML = builder({
            size: Number.isFinite(size) ? size : undefined,
            className,
        });
        node.removeAttribute('data-icon'); // marca como renderizado
        count++;
    });
    return count;
}

console.info(`IconRegistry loaded — ${Object.keys(IconRegistry).length} icons`);
