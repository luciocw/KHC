# Ultimate League KHC — Hub Oficial

Hub central das ligas KHC (Serie A, B, C, Elite) de Fantasy Football.
Single-page app **vanilla HTML/CSS/JS** — sem framework, sem build step, sem backend. Deploy direto no GitHub Pages.

## Funcionalidades

- **5 abas:** Ligas, Top Scorers, Power Ranking, Lendas KHC, Temporadas
- **Modelo de dados híbrido:** temporadas finalizadas vêm de JSON estático (`data/<ano>.json`); temporada ativa vem da Sleeper API em tempo real
- **Player Drawer:** clique em qualquer username pra ver perfil, conquistas e histórico
- **Modal "Sobre a Liga":** regras, formato, promoção/rebaixamento, Elite
- **Lendas KHC:** ranking acumulado de conquistas cross-season
- **Power Ranking** com tiers S/A/B/C/D (60% win rate + 40% pts normalizado)
- **Mobile-first** com container queries e breakpoints específicos
- **Acessibilidade:** WAI-ARIA tabs pattern, focus trap em drawer/modal, skip link, reduced-motion support

## Stack

- HTML semântico + CSS variables + JS vanilla (sem `type="module"` — script tags em ordem)
- Inter via Google Fonts
- SVG icons inline (registry em `js/icons.js`)
- Sleeper API pública (sem auth)
- Sem dependências runtime de terceiros

## Estrutura

```
index.html                  ~250 linhas (header, 5 tabpanels, drawer/modal mounts)
styles.css                  ~2000 linhas (organizado por === seções ===)
data/
  2025.json                 snapshot da temporada 2025 (22 times, trofeus, métricas completas)
scripts/
  derive-season.mjs         derivador de JSON a partir da Sleeper API
js/
  config.js                 KHC_CONFIG (league IDs por ano) + constantes + appState
  sanitize.js               escapeHtml, sanitizeAvatarUrl, sanitizeNumber, etc.
  api.js                    fetch+retry, cache (5min localStorage), fetchLeagueData
  data.js                   loader híbrido: data/*.json para finalizadas, Sleeper para ativa
  derivations.js            pwrScore, tierForPwr, legendsAggregator, careerForUser
  icons.js                  IconRegistry com 14 SVGs + renderIcons() (hidrata data-icon)
  types.js                  JSDoc typedefs (Season, Team, Career, Trophy, Tier, etc.)
  ui/
    loading.js              spinners, skeletons
    tabs.js                 switchTab, keyboard nav (WAI-ARIA), screen reader announce
    drawer.js               player drawer (side-sheet, focus trap, ESC, scroll lock)
    modal.js                about modal (centered, scale-in, focus trap)
  tabs/
    ligas.js                renderLeagueCard
    top-scorers.js          renderGlobalStandings
    power-ranking.js        renderPowerRankings
    lendas.js               renderLegends
    temporadas.js           renderSeasons
  app.js                    bootstrap (init, loadData, DOMContentLoaded)
assets/
  logo.jpg                  fallback/watermark do logo
```

## Como atualizar quando a Sleeper renovar as ligas

A cada ano, novos league IDs são gerados. Pra adicionar um novo ano:

1. **Configurar a temporada nova** em `js/config.js`:
   ```js
   '2027': {
     leagues: [
       { id: '123...', name: 'KHC Serie A', tier: 'serie-a' },
       { id: '456...', name: 'KHC Serie B', tier: 'serie-b' },
       { id: '789...', name: 'KHC Serie C', tier: 'serie-c' },
       { id: '012...', name: 'KHC Elite',   tier: 'elite' },
     ],
   }
   ```
2. **Adicionar a opção no dropdown** em `index.html`:
   ```html
   <option value="2027">Temporada 2027</option>
   ```
3. Durante a temporada, o site puxa tudo da Sleeper API automaticamente.

## Como "fechar" uma temporada (snapshot final)

Quando o playoff termina e os campeões são definidos:

1. **Atualizar `scripts/derive-season.mjs`** — adicionar o bloco do ano em `SEASONS` com os league IDs e o top-4 oficial:
   ```js
   '2027': {
     series: [
       { id: 'A', name: 'KHC Serie A', leagueId: '123...', top4: [
         { trophy: 'gold',   user: 'fulano' },
         { trophy: 'silver', user: 'cicrano' },
         { trophy: 'bronze', user: 'beltrano' },
         { trophy: 'fourth', user: 'tertano' },
       ]},
       // ... B, C, Elite ...
     ]
   }
   ```
2. **Rodar:**
   ```bash
   node scripts/derive-season.mjs 2027
   ```
   Gera `data/2027.json`.

3. **Commit + push.** O site agora trata 2027 como finalizada (status: 'final'), mostra medalhas, contribui pra Lendas e Career.

## Como rodar localmente

Por causa de `fetch('data/...json')`, o `file://` pode falhar (CORS). Use um servidor HTTP simples:

```bash
python3 -m http.server 8000
# então abra http://localhost:8000
```

## Deploy

GitHub Pages serve diretamente da branch `main`. Commits pra `main` ficam no ar em ~30s.

## Decisões de arquitetura

- **Vanilla por escolha consciente** — o site é read-only, 5 tabs, ~5 funções de render. Não há benefício em React/Vue/Next aqui. Bundle zero, dev server zero, deploy trivial.
- **Sem `type="module"`** — script tags em ordem global. Funciona em qualquer browser, sem CORS fricção, sem build step.
- **Híbrido JSON + live** — temporadas finalizadas são fato histórico imutável (JSON congelado, fast load). Ativa é dinâmica (Sleeper live, source of truth). O loader em `js/data.js` esconde a diferença.
- **JSDoc em vez de TypeScript** — IDE pega autocomplete sem precisar de build. Tipos vivem em `js/types.js`.
- **SVG inline em vez de sprite/font** — registry em `js/icons.js`, ícones customizáveis em runtime. Sem dependência externa.
