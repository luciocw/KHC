// =============================================================================
// TAB / REGRAS — Formato, acesso e rebaixamento, playoffs, Elite e as regras
// da temporada inaugural (2025). Substitui o antigo modal "Sobre a Liga".
//
// Conteúdo estático, confirmado pela organização da liga. Playoffs conferidos
// nas configurações das ligas na Sleeper (playoff_teams / playoff_week_start).
// =============================================================================

const RULES = [
    {
        icon: 'layers',
        title: 'Formato',
        items: [
            'Séries A, B, C e D com 10 participantes cada.',
            '14 semanas de temporada regular, pontuação PPR padrão.',
            'Roster: <code>QB · 2 RB · 2 WR · TE · FLEX · SF · K · D/ST</code>',
        ]
    },
    {
        icon: 'arrowUpDown',
        title: 'Acesso e rebaixamento',
        items: [
            '3 equipes sobem e 3 descem entre séries vizinhas: A ⇄ B, B ⇄ C, C ⇄ D.',
            '<b>Rebaixamento:</b> classificação final da temporada regular (playoffs não contam).',
            '<b>Promoção:</b> campeão, vice e 3º colocado dos playoffs (não da temporada regular).',
        ]
    },
    {
        icon: 'trophy',
        title: 'Playoffs',
        items: [
            '6 classificados em cada série, semanas 15 a 17.',
            'Top 4 final recebe medalha: ouro, prata, bronze e 4º.',
        ]
    },
    {
        icon: 'crown',
        title: 'KHC Elite',
        items: [
            'Liga <b>paralela</b>, não um tier: premia os melhores da temporada anterior, que competem em duas ligas ao mesmo tempo.',
            '2027: campeão e vice de cada série (A, B, C e D) — 8 participantes.',
            'Playoffs com 4 classificados. Não rebaixa.',
        ]
    },
    {
        icon: 'history',
        title: 'Regras de 2025',
        lead: 'Temporada inaugural, com regras diferentes:',
        items: [
            '2 últimos da Série A descem para Série B',
            '2 primeiros da Série B sobem para Série A',
            '2 últimos da Série B descem para Série C',
            '2 primeiros da Série C sobem para Série B',
            'KHC Elite: top 4 da Série A + top 4 da Série B da temporada anterior se qualificam',
        ]
    },
];

/**
 * Renderiza a aba Regras. Os textos acima são estáticos e controlados (HTML
 * confiável); nada aqui vem de usuário.
 * @returns {string} HTML
 */
function renderRules() {
    return `<div class="rules">${RULES.map(r => `
        <section class="card rule">
            <h2 class="display rule__title"><span class="rule__icon" data-icon="${r.icon}" data-size="20"></span>${r.title}</h2>
            ${r.lead ? `<p class="rule__lead">${r.lead}</p>` : ''}
            <ul>${r.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </section>`).join('')}
    </div>`;
}
