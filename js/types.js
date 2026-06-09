// =============================================================================
// TYPES — Typedefs JSDoc.
//
// Vanilla JS sem build step, mas IDEs (VSCode/JetBrains) e ESLint conseguem
// usar essas anotações para autocomplete e checagem leve. Documenta o data
// model do site sem custo de runtime.
//
// Estes typedefs mapeiam para o data model do handoff de design e para o
// JSON estático em data/<ano>.json gerado por scripts/derive-season.mjs.
//
// USO: prefira anotar funções públicas com @param/@returns referenciando
// estes nomes (ex: @param {Team} team).
// =============================================================================

/**
 * @typedef {'gold' | 'silver' | 'bronze' | 'fourth'} Trophy
 * Posição no playoff. Sem trophy = não classificou pro top 4.
 */

/**
 * @typedef {'S' | 'A' | 'B' | 'C' | 'D'} Tier
 * Classificação no Power Ranking. S = elite, D = reconstrução.
 */

/**
 * @typedef {'A' | 'B' | 'C' | 'D' | 'Elite'} SeriesId
 * Identificador curto da série. "Elite" é liga paralela.
 */

/**
 * @typedef {'active' | 'final'} SeasonStatus
 * Temporada em andamento (Sleeper live) ou finalizada (JSON estático).
 */

/**
 * @typedef {Object} Team
 * @property {number} rank             Posição final/atual dentro da série
 * @property {string} user             Username (display_name do Sleeper)
 * @property {string} team             Nome do time (metadata.team_name ou fallback)
 * @property {string|null} avatarId    ID do avatar Sleeper, null se sem avatar
 * @property {number} w                Vitórias
 * @property {number} l                Derrotas
 * @property {number} pts              Pontos a favor (decimal)
 * @property {number} [ptsAgainst]     Pontos sofridos
 * @property {number} [ppts]           Pontos potenciais (max possível com lineup perfeito)
 * @property {Trophy} [trophy]         Presente só em temporadas finalizadas, top 4
 * @property {boolean} [inElite]       True se o jogador também compete em Elite
 * @property {('W'|'L')[]} [form]      Últimos 5 jogos — derivado se necessário
 * @property {SeriesId} [serie]        Derivado: série em que está
 * @property {number} [season]         Derivado: ano da temporada
 */

/**
 * @typedef {Object} Series
 * @property {SeriesId} id             A | B | C | Elite
 * @property {string} name             Display: "KHC Serie A", "KHC Elite"
 * @property {Team[]} teams            Times ordenados por rank
 * @property {'parallel'} [kind]       Presente só em Elite
 */

/**
 * @typedef {Object} Season
 * @property {number} id               Ano da temporada (2025, 2026, ...)
 * @property {SeasonStatus} status     active | final
 * @property {Series[]} series         Séries da temporada
 * @property {number} [week]           Semana atual — só se status='active'
 * @property {number} [weeksTotal]     Total de semanas regulares — só se 'active'
 */

/**
 * @typedef {Object} TrophyCount
 * @property {number} gold
 * @property {number} silver
 * @property {number} bronze
 * @property {number} fourth
 */

/**
 * @typedef {Object} LegendEntry
 * Linha agregada na tabela Lendas KHC.
 * @property {string} user             Username
 * @property {TrophyCount} trophies    Contagem por tipo
 * @property {number} weighted         Score ponderado (gold*10 + silver*5 + bronze*3 + fourth)
 */

/**
 * @typedef {Object} CareerSeasonRow
 * Linha do histórico no Player Drawer.
 * @property {number} season           Ano
 * @property {SeriesId} serie
 * @property {string} team             Nome do time naquela temporada
 * @property {number} w
 * @property {number} l
 * @property {number} pts
 * @property {Trophy} [trophy]
 * @property {boolean} [active]        True se a temporada ainda está em andamento
 */

/**
 * @typedef {Object} Career
 * Resumo completo de um jogador, alimenta o Player Drawer.
 * @property {string} user
 * @property {SeriesId[]} currentSeries Séries em que o jogador compete na temporada atual
 * @property {TrophyCount} trophies     Conquistas totais
 * @property {number} totalSeasons
 * @property {number} totalWins
 * @property {number} totalLosses
 * @property {number} totalPts
 * @property {string} [bestCampaign]    Ex: "Campeão Serie A (2025)"
 * @property {CareerSeasonRow[]} history Por temporada, mais recente primeiro
 */

/**
 * @typedef {Object} PowerRow
 * Resultado da derivação do Power Ranking.
 * @property {Team} team
 * @property {number} pwr               Score 0-100
 * @property {Tier} tier
 * @property {number} rank              Posição no ranking power
 * @property {number} originalRank      Posição pelo ranking de pontos
 */

// Arquivo só de documentação. Nada exportado em runtime.
