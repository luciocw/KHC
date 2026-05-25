// =============================================================================
// TAB / POWER RANKING — Tier list S/A/B/C/D usando Power Score = 60% pts + 40%
// win rate, com tiers definidos por desvio padrão. Inclui badges e indicador
// de movimento (rank por pontos vs rank por power score).
// Lê: appState.rosterData
// Depende de: js/config.js, js/sanitize.js
// =============================================================================

/**
 * Calcula o Power Score combinando pontos e vitórias
 * Fórmula: (pontos normalizados * 0.6) + (win% * 0.4) * 100
 */
function calculatePowerScore(team, maxPts, minPts, maxGames) {
    const ptsNormalized = maxPts > minPts ? (team.fpts - minPts) / (maxPts - minPts) : 0;
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0;

    // Power Score: 60% pontuação + 40% win rate
    return (ptsNormalized * 0.6 + winPct * 0.4) * 100;
}

/**
 * Calcula média e desvio padrão de um array
 */
function calculateStats(values) {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
}

/**
 * Determina o tier baseado em desvio padrão
 */
function getTierByStdDev(score, mean, stdDev) {
    if (score >= mean + 1.5 * stdDev) return 'S';      // Excepcional (+1.5σ)
    if (score >= mean + 0.5 * stdDev) return 'A';      // Acima da média (+0.5σ)
    if (score >= mean - 0.5 * stdDev) return 'B';      // Média (±0.5σ)
    if (score >= mean - 1.5 * stdDev) return 'C';      // Abaixo da média (-0.5σ a -1.5σ)
    return 'D';                                         // Reconstrução (<-1.5σ)
}

/**
 * Gera badges especiais para um time
 * @param {object} team - Time a avaliar
 * @param {object} stats - Estatísticas pré-calculadas { maxPts, maxWins }
 * @param {number} rank - Posição atual no ranking
 * @returns {Array} - Array de badges
 */
function generateBadges(team, stats, rank) {
    const badges = [];

    // Líder geral
    if (rank === 1) {
        badges.push({ icon: '👑', label: 'Líder', class: 'badge-leader' });
    }

    // Top scorer (maior pontuação)
    if (team.fpts === stats.maxPts) {
        badges.push({ icon: '🎯', label: 'Top Scorer', class: 'badge-scorer' });
    }

    // Melhor record (mais vitórias)
    if (team.wins === stats.maxWins && team.wins > 0) {
        badges.push({ icon: '🔥', label: 'Hot Streak', class: 'badge-streak' });
    }

    // Invicto ou quase (≤1 derrota)
    if (team.losses <= 1 && team.wins > 5) {
        badges.push({ icon: '🛡️', label: 'Invicto', class: 'badge-undefeated' });
    }

    return badges;
}

/**
 * Gera indicador de movimento (simulado para esta versão)
 * Em produção, compararia com ranking da semana anterior
 */
function getMovementIndicator(rank, previousRank) {
    // Simulação: baseado na diferença entre ranking por pontos vs power score
    const diff = previousRank - rank;

    if (diff > 2) return { icon: '⬆️', class: 'movement-up-big', label: `+${diff}` };
    if (diff > 0) return { icon: '↗️', class: 'movement-up', label: `+${diff}` };
    if (diff < -2) return { icon: '⬇️', class: 'movement-down-big', label: `${diff}` };
    if (diff < 0) return { icon: '↘️', class: 'movement-down', label: `${diff}` };
    return { icon: '➡️', class: 'movement-same', label: '=' };
}

function renderPowerRankings() {
    const container = document.getElementById(DOM_IDS.POWER);

    if (appState.rosterData.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center" role="status">Sem dados</div>';
        return;
    }

    // Estatísticas base
    const allTeams = [...appState.rosterData];
    const maxPts = Math.max(...allTeams.map(t => t.fpts));
    const minPts = Math.min(...allTeams.map(t => t.fpts));
    const maxGames = Math.max(...allTeams.map(t => t.wins + t.losses));

    // Calcula Power Score para cada time
    const teamsWithScore = allTeams.map((team, originalIndex) => ({
        ...team,
        powerScore: calculatePowerScore(team, maxPts, minPts, maxGames),
        originalRank: originalIndex + 1 // Ranking original por pontos
    }));

    // Ordena por Power Score
    teamsWithScore.sort((a, b) => b.powerScore - a.powerScore);

    // Adiciona ranking atual
    teamsWithScore.forEach((team, index) => {
        team.currentRank = index + 1;
    });

    // Calcula estatísticas para distribuição por desvio padrão
    const scores = teamsWithScore.map(t => t.powerScore);
    const { mean, stdDev } = calculateStats(scores);

    // Agrupa times por tier
    const tiers = { S: [], A: [], B: [], C: [], D: [] };

    teamsWithScore.forEach(team => {
        const tier = getTierByStdDev(team.powerScore, mean, stdDev);
        team.tier = tier;
        tiers[tier].push(team);
    });

    // Pré-calcula stats para badges (evita recálculo O(n) em cada iteração)
    const badgeStats = {
        maxPts: Math.max(...teamsWithScore.map(t => t.fpts)),
        maxWins: Math.max(...teamsWithScore.map(t => t.wins))
    };

    // Configuração visual de cada tier
    const tierConfig = {
        S: { label: 'S', color: 'tier-s', description: 'Elite', emoji: '🏆' },
        A: { label: 'A', color: 'tier-a', description: 'Contenders', emoji: '⭐' },
        B: { label: 'B', color: 'tier-b', description: 'Playoff', emoji: '📈' },
        C: { label: 'C', color: 'tier-c', description: 'Médio', emoji: '📊' },
        D: { label: 'D', color: 'tier-d', description: 'Rebuild', emoji: '🔧' }
    };

    let html = '<div class="tier-list">';
    let tierIndex = 0;

    Object.keys(tiers).forEach(tierKey => {
        const tierTeams = tiers[tierKey];
        const config = tierConfig[tierKey];

        // Só mostra tier se tiver times
        if (tierTeams.length === 0) return;

        const ariaLabel = `Tier ${config.label} - ${config.description}: ${tierTeams.length} times`;

        html += `
            <div class="tier-row stagger-item ${config.color}" role="region" aria-label="${ariaLabel}" style="animation-delay: ${tierIndex * STAGGER_DELAY_MS}ms">
                <div class="tier-label">
                    <span class="tier-emoji">${config.emoji}</span>
                    <span class="tier-letter">${config.label}</span>
                    <span class="tier-desc">${config.description}</span>
                </div>
                <div class="tier-teams">
        `;

        tierTeams.forEach(team => {
            const safeTeamName = escapeHtml(team.teamName);
            const safeLeagueName = escapeHtml(team.leagueName);
            const safePts = sanitizeNumber(team.fpts, 0, VALIDATION.MAX_POINTS).toFixed(1);
            const avatarUrl = sanitizeAvatarUrl(team.avatar);
            const powerScore = team.powerScore.toFixed(1);

            // Badges (usa stats pré-calculados para performance O(1))
            const badges = generateBadges(team, badgeStats, team.currentRank);
            const badgesHtml = badges.map(b =>
                `<span class="team-badge ${b.class}" title="${b.label}">${b.icon}</span>`
            ).join('');

            // Movimento
            const movement = getMovementIndicator(team.currentRank, team.originalRank);

            // Barra de progresso (percentual relativo ao máximo)
            const progressPct = maxPts > 0 ? (team.fpts / maxPts * 100).toFixed(0) : 0;

            // Record formatado
            const record = `${team.wins}-${team.losses}`;

            html += `
                <div class="tier-team-card" title="${safeTeamName} - Power Score: ${powerScore}">
                    <div class="tier-card-header">
                        <span class="tier-rank">#${team.currentRank}</span>
                        <span class="tier-movement ${movement.class}" title="Variação: ${movement.label}">${movement.icon}</span>
                    </div>
                    <img src="${avatarUrl}" alt="" class="tier-team-avatar" loading="lazy" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'">
                    <div class="tier-team-info">
                        <div class="tier-team-header">
                            <span class="tier-team-name">${safeTeamName}</span>
                            <div class="tier-badges">${badgesHtml}</div>
                        </div>
                        <span class="tier-team-league">${safeLeagueName}</span>
                        <div class="tier-team-stats">
                            <span class="tier-record" title="Record">${record}</span>
                            <span class="tier-pts" title="Pontos totais">${safePts} pts</span>
                        </div>
                        <div class="tier-progress-container">
                            <div class="tier-progress-bar" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                    <div class="tier-power-score">
                        <span class="power-value">${powerScore}</span>
                        <span class="power-label">PWR</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        tierIndex++;
    });

    // Legenda
    html += `
        <div class="tier-legend stagger-item" style="animation-delay: ${tierIndex * STAGGER_DELAY_MS}ms">
            <div class="legend-title">Como funciona o Power Score?</div>
            <div class="legend-content">
                <div class="legend-item">
                    <span class="legend-formula">PWR = (Pontos × 60%) + (Win Rate × 40%)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge badge-leader">👑</span> Líder geral
                    <span class="legend-badge badge-scorer">🎯</span> Top Scorer
                    <span class="legend-badge badge-streak">🔥</span> Mais vitórias
                </div>
            </div>
        </div>
    `;

    html += '</div>';
    container.innerHTML = html;
}
