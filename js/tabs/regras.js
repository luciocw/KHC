// =============================================================================
// TAB / REGRAS — Formato, acesso e rebaixamento, playoffs, Elite e as regras
// da temporada inaugural (2025). Substitui o antigo modal "Sobre a Liga".
//
// Conteúdo estático, confirmado pela organização da liga. Playoffs conferidos
// nas configurações das ligas na Sleeper (playoff_teams / playoff_week_start).
// =============================================================================

/** "campeão 12 · vice 8 · 3º 6 · …" a partir de KHC_POINTS. */
function pointsLine(kind) {
    return KHC_POINTS[kind].map((p, i) => `${i === 0 ? 'campeão' : i === 1 ? 'vice' : `${i + 1}º`} ${p}`).join(' · ');
}

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
            'Pódio final recebe medalha: ouro, prata e bronze. O 4º lugar não tem medalha, mas soma Pontos KHC.',
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
        icon: 'trophy',
        title: 'Champions KHC',
        lead: (() => {
            const y = Object.keys(KHC_CONFIG).sort().reverse().find(k => KHC_CONFIG[k].copa);
            return y && KHC_CONFIG[y].copa.test ? `<b>Simulação em ${y}</b>, com os jogos reais da temporada: o formato é a proposta para 2027 e não soma Pontos KHC agora.` : '';
        })(),
        items: [
            'A Copa da KHC, no formato da Liga dos Campeões. Competição à parte, como uma Copa ao lado do campeonato: mesmos times, mas <b>não conta</b> para playoffs nem rebaixamento. Roda no site, com a pontuação de cada time na sua liga na semana. Fica em Ligas, na aba <a href="#/ligas/' + (Object.keys(KHC_CONFIG).sort().reverse().find(k => KHC_CONFIG[k].copa) || '') + '/copa">Champions</a>.',
            'Participam todos os times das divisões. Elite e Guilhotina não entram.',
            '<b>Fase de liga:</b> potes por divisão (2026: A+B e C+D; 2027: A+B, C+D e E+F). Cada time faz 6 jogos, divididos igualmente entre os potes, e nunca enfrenta a própria divisão. Vitória 3, empate 1; desempate: saldo e pontos feitos.',
            '<b>Classificação:</b> do 1º ao 8º vão direto às oitavas; do 9º ao 24º jogam o playoff; do 25º em diante, eliminados.',
            '<b>Mata-mata:</b> ida e volta em 2 semanas (vale a soma). Empate no agregado: passa quem foi melhor na fase de liga. Final e disputa do 3º lugar na semana 17, junto com as finais das divisões.',
            '<b>Sorteio:</b> sai com uma semente definida antes; com a mesma semente, o sorteio é sempre igual (dá para conferir).',
            'Quem já caiu na sua liga continua escalando o time para a Champions.',
        ]
    },
    {
        icon: 'crown',
        title: 'Pontos KHC (Lendas)',
        lead: KHC_POINTS_DRAFT ? '<b>Em discussão:</b> valores e critérios podem mudar e serão definidos antes da temporada 2027.' : '',
        items: [
            'Pontos pela colocação final de cada temporada, somados no Hall da Fama (Lendas). Só entram temporadas fechadas: a atual entra depois da final.',
            `<b>Séries A–F</b> (do 1º ao ${KHC_POINTS.serie.length}º, quem não é rebaixado): ${pointsLine('serie')}. Todas valem igual: as divisões surgiram por ordem de inscrição, não por nível.`,
            `<b>KHC Elite</b> (liga só de classificados, acima das divisões): ${pointsLine('elite')}.`,
            `<b>Champions KHC</b> (a partir de 2027; 1º ao 4º pela final e disputa do 3º): ${pointsLine('copa')}.`,
            '<b>Colocação final:</b> 1º ao 4º pelos playoffs (final e disputa do 3º), 5º e 6º pela disputa do 5º lugar, 7º em diante pela temporada regular.',
            'KHC Guilhotina (liga avulsa), Premier League e NBA não pontuam.',
            '<b>Desempate:</b> mais títulos, depois melhor aproveitamento V–D, depois título mais recente. O aproveitamento (a % ao lado do nome nas Lendas) conta só a temporada regular das divisões nas temporadas fechadas: 14 jogos por ano para todos; playoffs, Elite e Copa não entram. O "aproveitamento geral" do perfil é outro número: inclui a temporada atual e a Elite.',
        ]
    },
    {
        icon: 'trophy',
        title: 'Também na KHC',
        items: [
            '<a href="#/guilhotina">KHC Guilhotina</a>: liga avulsa (entra quem quer). A cada rodada, quem faz menos pontos entre os vivos é cortado. Não soma Pontos KHC.',
            '<a href="#/premier">Cocoricó Premier League</a>: fantasy de futebol no Sleeper, com a turma da KHC. Para a conversa não parar na entressafra da NFL.',
            '<a href="#/nba">National Burgundy Association</a>: fantasy de basquete no Sleeper, liga nova na temporada 2026/27 da NBA.',
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
    return `<a class="btn rules__intro" href="#/inicio">Ver a apresentação da KHC</a>
    <div class="rules">${RULES.map(r => `
        <section class="card rule">
            <h2 class="display rule__title"><span class="rule__icon" data-icon="${r.icon}" data-size="20"></span>${r.title}</h2>
            ${r.lead ? `<p class="rule__lead">${r.lead}</p>` : ''}
            <ul>${r.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </section>`).join('')}
    </div>`;
}
