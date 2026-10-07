# Ultimate League KHC — Hub Oficial

Hub central das ligas KHC (Serie A, B, C, Elite) de Fantasy Football.
Single-page app **vanilla HTML/CSS/JS** — sem framework, sem build step, sem backend. Deploy direto no GitHub Pages.

## Funcionalidades

- **6 abas:** Ligas, Top Scorers, Power Ranking, Lendas KHC, Temporadas, Regras
- **Endereço por tela** (compartilhável): `#/ligas/2026/a`, `#/top/2026`, `#/jogador/<usuario>`
- **Ligas:** uma série por vez, com zonas de acesso / playoffs / rebaixamento por temporada e medalhas (número dentro) na classificação final
- **Top Scorers:** filtro por série e "Incluir Elite" (desligado por padrão, evita time duplicado)
- **Power Ranking:** tiers S Favoritos · A Candidatos · B Meio de tabela · C Pressionados · D Lanternas (60% aproveitamento + 40% pontos normalizados; sem Elite)
- **Lendas:** Hall da Fama ordenado por títulos (ouro → prata → bronze → 4º)
- **Perfil do jogador:** lateral no desktop, bottom sheet no celular
- **Modelo de dados híbrido:** temporadas finalizadas vêm de JSON estático (`data/<ano>.json`); temporada ativa vem da Sleeper API em tempo real
- **Estados:** carregando (skeleton), erro com "Tentar de novo", cache, falha parcial, vazio
- **Mobile-first:** navegação inferior fixa < 1024px; contraste AA; alvos ≥ 44px

## Identidade visual

- Tokens (cores, ligas, zonas, medalhas, tiers, tipografia, espaço) no topo de `styles.css`, vindos do guia da marca
- Fonte **Archivo** variável (eixo de largura: 125% títulos, 75% labels, 62% números)
- `data-league="a|b|c|d|e|f|elite"` num container reaponta `--accent` para a cor da série
- Escudos por série em `assets/logo/png/` (PNG 160px em `ui/` para a interface) e vetores oficiais em `assets/logo/svg/` (KHC, Elite, Séries A–F e Copa; o cabeçalho e o favicon usam o SVG); banners em `assets/banners/` (`og-image` usada no compartilhamento)

## Stack

- HTML semântico + CSS variables + JS vanilla (sem `type="module"` — script tags em ordem)
- SVG icons inline (registry em `js/icons.js`)
- Sleeper API pública (sem auth)
- Sem dependências runtime de terceiros

## Estrutura

```
index.html                  shell (header, page head, #view, bottom nav, drawer)
styles.css                  tokens + componentes (organizado por === seções ===)
data/
  2025.json                 snapshot da temporada 2025 (classificação final + troféus)
scripts/
  derive-season.mjs         derivador de JSON a partir da Sleeper API
js/
  config.js                 KHC_CONFIG (ligas + regras por ano), SERIES_META, appState
  sanitize.js               escapeHtml, sanitizeAvatarUrl, sanitizeNumber, etc.
  api.js                    fetch+retry, cache (localStorage), fetchLeagueData, fetchNflState
  data.js                   temporadas finalizadas (data/*.json)
  derivations.js            pwrScore, tierForPwr, legendsAggregator, careerForUser
  icons.js                  IconRegistry (SVG line 24px) + renderIcons()
  types.js                  JSDoc typedefs
  ui/
    helpers.js              avatar, botão de time, escudo, medalha, pílula, scroll lock
    drawer.js               perfil do jogador (focus trap, Esc, URL #/jogador/…)
  tabs/
    ligas.js · top-scorers.js · power-ranking.js · lendas.js · temporadas.js · regras.js
  app.js                    roteamento por hash, loadData, render
assets/
  logo/svg/                 escudos oficiais em vetor (KHC, Elite, Séries A–F, Copa)
  logo/png/                 escudos por série (+ ui/ 160px, favicon)
  banners/                  og-image 1200×630, hero, header
```

## Como atualizar quando a Sleeper renovar as ligas

A cada ano, novos league IDs são gerados. Pra adicionar um novo ano:

1. **Configurar a temporada nova** em `js/config.js` (ligas + regras):
   ```js
   '2027': {
     rules: { promote: 3, relegate: 3, playoffTeams: 6, elitePlayoffTeams: 4 },
     leagues: [
       { id: '123...', name: 'KHC Serie A', tier: 'serie-a' },
       { id: '456...', name: 'KHC Serie B', tier: 'serie-b' },
       { id: '789...', name: 'KHC Serie C', tier: 'serie-c' },
       { id: '012...', name: 'KHC Elite',   tier: 'elite' },
     ],
   }
   ```
2. O seletor de temporada, as abas de série e as zonas saem da config automaticamente. Séries novas (E, F) já têm cor e escudo em `SERIES_META` — use `tier: 'serie-e'` / `'serie-f'`.
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
