# Ultimate KHC — Revisão de UI/UX + Brief para Claude Design

> Revisão completa do código (HTML, 2.587 linhas de CSS, 17 arquivos JS) + screenshots reais
> tiradas com dados ao vivo da Sleeper (out/2026). Screenshots em [`screens/`](./screens).
>
> Estrutura: **1. Resumo** · **2. Bugs que afetam a UI** · **3. Problemas de UX/UI por tela** ·
> **4. Dívida de CSS** · **5. Acessibilidade** · **6. Brief para o Claude Design (tokens, componentes,
> dados, estados)** · **7. Oportunidades** · **8. Prioridades**

---

## 1. Resumo

| Área | Nota | Comentário |
|---|---|---|
| Identidade visual | Boa | Dark + laranja forte, coerente, cara de "esporte". Falta hierarquia e respiro. |
| Arquitetura front | Boa | Vanilla, renderers pequenos, sanitização correta. Fácil de redesenhar. |
| Mobile | Fraca | Header ocupa ~45% da 1ª tela; Power Ranking quebra; Top Scorers perde contexto. |
| Clareza dos dados | Média | Tabelas sem cabeçalho, sem zonas de playoff/rebaixamento, indicadores enganosos. |
| Consistência | Média | Dados novos (Serie D) não chegaram em header, drawer, modal. |
| CSS | Média/fraca | Muito código morto e regras de breakpoint que se sobrescrevem. |

**Stack (não muda com o redesign):** HTML + CSS + JS puro, sem build, GitHub Pages. Fonte Inter (Google Fonts).
Dados: `data/<ano>.json` (temporadas finalizadas) + Sleeper API ao vivo (temporada ativa).
Qualquer proposta do Claude Design precisa ser implementável como **HTML/CSS estático + templates em string JS**.

---

## 2. Bugs que afetam o que o usuário vê (confirmados)

| # | Bug | Onde | Impacto |
|---|---|---|---|
| B1 | **Medalhas não aparecem na aba Ligas** (temporada finalizada). A célula de rank fica vazia nos top-4. `window.IconRegistry` é sempre `undefined` porque `IconRegistry` é `const` global (não vira propriedade de `window`). Também some o ícone da caption. | `js/tabs/ligas.js:59,82` | Ver `screens/desktop-2025-leagues.png` — posições 1-4 sem número nem medalha. |
| B2 | **Trocar temporada durante o carregamento é ignorado.** `loadData()` sai cedo se `isLoading`; a UI fica com dados de 2026 rotulados como "Classificação final 2025". Reproduzido com Playwright. | `js/app.js:35` | Dados errados com legenda errada. |
| B3 | **Serie D tratada como Serie A no drawer.** O regex de série não tem `D` e `SERIES_NAMES` não tem `D`; jogador da Serie D aparece com pill "Serie A". | `js/ui/drawer.js:32-37,110-115` | Informação errada no perfil. |
| B4 | **Setas de movimento do Power Ranking não significam nada.** `originalRank` = posição na lista concatenada das ligas (Elite, A, B…), não ranking por pontos. Resultado: "↑35", "↑26". | `js/derivations.js:75`, `power-ranking.js:83` | Indicador enganoso e chamativo (verde/vermelho). |
| B5 | **"Semana 8 / 14" fixo** na aba Temporadas (hardcoded). | `js/tabs/temporadas.js:109-110` | Informação falsa. |
| B6 | **Tier label do Power Ranking quebrado no mobile.** Regra `@media (max-width:768px)` coloca letra e descrição lado a lado dentro de uma coluna de 64px. Os cards ficam estreitos e truncam os nomes. | `styles.css:2488-2495` vs `921-926` | Ver `screens/mobile-2026-power.png`. |
| B7 | **Drawer: estatísticas não batem com o histórico.** "Temporadas: 1 / V-D 10-4" só conta temporadas finalizadas, mas o histórico lista 2026 "em andamento". | `drawer.js` + `careerForUser` | Confuso. |
| B8 | Drawer em temporada arquivada: "Atualmente em: Serie A" usa o roster da temporada **selecionada** (2025), não a atual. | `drawer.js:135-143` | Informação errada. |
| B9 | Lendas/Temporadas escapam o username duas vezes antes de `data-user`. Usuário com `&`, `'`, `/` ou `=` no nome não abre o perfil certo. | `lendas.js:106,118`, `temporadas.js:47,56` | Baixo risco hoje, mas existe. |
| B10 | Modal e drawer resetam `body.style.overflow` sem coordenação (abrir modal com drawer aberto destrava o scroll). | `modal.js:178,190` | Menor. |

> Esses bugs são de código; não precisam ir pro Claude Design, mas convém corrigir **antes** de aplicar o redesign
> para não "desenhar em cima" de comportamento errado.

---

## 3. Problemas de UX/UI por tela

### 3.1 Global (header, controles, fundo)
- **Header grande demais no mobile**: logo 82px + título 36px + subtítulo + select + 2 linhas de abas. O conteúdo começa só em ~45% da 1ª tela (`screens/mobile-first-viewport.png`).
- **Subtítulo desatualizado**: "Serie A • Serie B • Serie C • Elite" — falta **Serie D** (já existe em 2026). Melhor gerar a partir de `KHC_CONFIG`.
- **Logo é um JPEG quadrado com fundo preto** (`khc-logo.png` é na verdade JPEG). Fica um "quadrado" visível sobre o fundo; precisa de PNG/SVG transparente. `logo.jpg` e `khc-logo.png` são o mesmo arquivo.
- **Ruído de fundo**: linhas horizontais + 2 vinhetas laranja + marca d'água do logo atrás do conteúdo. A marca d'água aparece atrás das abas e cards (visível nas screenshots).
- **Seletor de temporada isolado** acima das abas, sem relação visual com o conteúdo; "Temporada 2025 (Arquivo)" é texto longo.
- **Abas em pílulas que quebram em 2 linhas** no mobile (3 + 2), sem ícones ≤420px. Não há bottom-nav nem scroll horizontal; altura ~36px (< 44px recomendado para toque).
- **Sem estado na URL**: aba e temporada não ficam no `#hash`. Recarregar volta para Ligas/2026; não dá para compartilhar link de uma aba ou de um perfil.
- **Sem "última atualização"** nem semana atual em lugar nenhum — para temporada ao vivo isso é a informação mais importante.
- **Mensagens de estado usam emoji** (⚠️ ❌) enquanto o resto usa ícones SVG próprios.

### 3.2 Ligas (aba padrão)
- **Tabela sem cabeçalho**: o usuário precisa adivinhar que "3–1" é V–D e "625.3" são pontos.
- **Sem zonas**: não mostra linha de playoff (top 6), zona de promoção (top 2) nem rebaixamento (últimos 2) — regras que estão no modal "Sobre". Esse é o maior ganho de UX possível nesta aba.
- **5 ligas em grid 2 colunas** → Serie D sozinha na última linha; Elite tem 8 times e o card fica com espaço vazio.
- **Ordem das ligas**: Elite primeiro (paralela) mistura com a hierarquia A→D. Considerar Elite em destaque separado.
- `team-name` e `team-owner` às vezes são iguais (usuário sem nome de time) → linha repetida.
- `.league-badge` "10 TIMES" ocupa espaço nobre e pouco informa.
- Nome do time é o link do perfil, mas o perfil é do **dono** — affordance pouco clara (sem sublinhado/ícone).

### 3.3 Top Scorers
- **Elite duplica times**: "GORDINHAS AJEITADAS" aparece 2× (Serie B e Elite). No mobile a coluna Liga é escondida → as duas linhas ficam idênticas.
- **Sem avatar, sem dono, sem V–D** — é a tabela mais "pobre" do site.
- **Animação em cascata de 80ms por linha**: com 48 times a última linha só aparece após ~3,8s. O mesmo vale para Lendas.
- Sem filtro por série / toggle "incluir Elite".

### 3.4 Power Ranking
- Setas de movimento erradas (B4). Precisa ou de histórico semanal real, ou remover.
- Tiers por limites absolutos (S ≥ 80…) → com poucas semanas, distribuição fica estranha (6 em S, 1 em D…).
- Descrições em inglês ("CONTENDERS", "RISERS", "MID-PACK", "RELEGATION") num site PT-BR; "ELITE" colide com o nome da liga Elite.
- Mesmo time aparece 2× (Elite + série regular).
- No mobile: coluna de tier com ~64px x 1.000+px de altura colorida — muita área de cor saturada sem informação.
- Barra de PWR de 3px: quase invisível.
- Sem explicação de como o PWR é calculado (60% win rate + 40% pontos normalizados).

### 3.5 Lendas KHC
- Funcional, mas visualmente igual a uma planilha. Para a "galeria de campeões" pede algo mais celebratório (pódio do líder, avatares, títulos por ano).
- Sem avatares; cabeçalho com chips "1º 2º 3º 4º" muito pequenos (10px).
- Texto vazio "As lendas serão reveladas…" bom, mas sem ilustração.

### 3.6 Temporadas
- Card da temporada ativa só lista nomes das séries "— Em disputa" (+ semana falsa). Poderia mostrar líder atual de cada série.
- Pódios finalizados OK, mas os pontos ("2198.0") sem rótulo.
- Container `.seasons-container` aninhado dentro de outro `.seasons-container` (classe repetida).

### 3.7 Drawer de jogador
- Boa base (`screens/desktop-drawer.png`). Problemas: conquistas zeradas ocupam muito espaço com cor; estatísticas inconsistentes (B7); "Pontos totais 2045.46" com 2 casas enquanto o resto usa 1; sem link para o perfil Sleeper; sem gráfico/evolução.

### 3.8 Modal "Sobre a Liga"
- Regras desatualizadas: promoção/rebaixamento só cita A/B/C (falta D); critério da Elite cita "top 4 da A + top 4 da B" — **confirmar a regra atual**.
- Rodapé "Mais regras e história serão adicionadas aqui em breve" passa sensação de inacabado.
- O conteúdo merece uma página/aba própria ("Regras") em vez de um botão discreto no rodapé.

---

## 4. Dívida de CSS (relevante pro redesign)

- **Código morto** (~300+ linhas): `.hof-*` inteiro, `.pulse-dot`, `.hover-lift`, `.touch-feedback`, `.text-gold/.text-orange`, `.power-card`, `.tier-letter`, `.tier-emoji`, `.tier-team-card`, `.tier-power-score`, `.power-value`, `.legend-content`, `.legends-col-*`, `.season-leagues`, `.form-chips-placeholder` + container query de 1280px (o container máximo é 1200px, nunca dispara).
- **Bloco `=== RESPONSIVE ===` (fim do arquivo) sobrescreve regras melhores** declaradas antes: legends ≤600px, `.season-year` ≤760px, tier-label (causa do B6).
- **Tokens duplicados**: conjunto novo (`--orange`, `--text-2`…) + "legacy aliases" (`--khc-orange`, `--text-muted`, `--spacing-*`, `--radius-*`) usados misturados.
- **Sem escala de espaçamento/tipografia de fato**: font-size em px soltos (9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 30, 36, 56) e paddings ad hoc.
- **Cores hardcoded** fora dos tokens: tiers (`#9e6cd9`, `#6fcc94`…), erro (`#ff6b6b`), cache notice (`rgba(251,191,36,…)`, amarelo diferente do `--gold`), `#22c55e`.
- 5 cards diferentes (league, top-scorers, legends, season, pwr) repetem o mesmo gradiente + borda + `::before` laranja → deveria ser um componente `.card`.
- `@import` da fonte dentro do CSS bloqueia renderização (melhor `<link rel="preconnect">` + `<link>` no HTML).
- Breakpoints inconsistentes: 380, 420, 600, 760, 768, 920, 1180 px.

---

## 5. Acessibilidade

**Já bom:** skip link, padrão WAI-ARIA de tabs com setas/Home/End, focus trap em drawer e modal, `prefers-reduced-motion`, `aria-label` nas linhas, `lang="pt-BR"`.

**Problemas:**
- **Contraste**: `--text-3` (38% de opacidade) sobre `#0f0c0a` ≈ **3.3:1** — abaixo de AA (4.5:1) e é usado em textos de 9–12px (dono do time, labels, rank). `--text-2` (62%) passa.
- Textos de 9–10px em vários labels (tier desc, `conquista-label`, `pwr-score-label`, chips).
- Alvos de toque < 44px: abas (~36px), `.player-link` (só o texto), botão fechar (36px).
- `.player-link` é `<span role="button">` — melhor `<button>` ou `<a href="#/jogador/x">` (com URL).
- `role="table"` em divs sem `aria-rowcount`; linhas de Ligas com `role="listitem"` + `aria-label` longo substituindo o conteúdo.
- `aria-live="polite"` em containers inteiros → leitor de tela anuncia tabelas inteiras a cada render.
- Gradiente de texto no título da Elite (`-webkit-text-fill-color: transparent`) some em modo alto contraste.

---

## 6. Brief para o Claude Design

### 6.1 Contexto do produto
- **O que é:** hub de uma comunidade brasileira de Fantasy Football (NFL) na Sleeper. ~50 jogadores, 4 divisões com acesso/descenso (Serie A, B, C, D) + **KHC Elite** (liga paralela de convidados — top da temporada anterior; um jogador pode estar em 2 ligas).
- **Quem usa:** os próprios membros, majoritariamente **no celular**, para checar classificação, provocar os amigos e ver histórico/troféus.
- **Momentos-chave:** (1) durante a temporada — "como está minha liga essa semana?"; (2) fim de temporada — campeões, acesso/rebaixamento; (3) entre temporadas — lendas e histórico.
- **Formato da temporada:** 14 semanas regulares, playoffs top 6 em 2 semanas, pontuação PPR, roster `QB · 2 RB · 2 WR · TE · FLEX · SF · K · D/ST`.
- **Tom:** competitivo, "resenha", orgulho de clube. Referências possíveis: apps de futebol (Sofascore, OneFootball), ESPN Fantasy.

### 6.2 Telas e conteúdo (inventário)
| Tela | Conteúdo | Fonte |
|---|---|---|
| Header | Logo, nome, séries, seletor de temporada | estático + `KHC_CONFIG` |
| Ligas | 1 card por série: rank, avatar, nome do time, dono, V–D, pontos; medalha top-4 se finalizada | Sleeper / JSON |
| Top Scorers | Todos os times de todas as séries ordenados por pontos | derivado |
| Power Ranking | PWR 0–100 (60% win% + 40% pts normalizados), tiers S–D | derivado |
| Lendas | Contagem de ouro/prata/bronze/4º por jogador, todas as temporadas | JSON finalizados |
| Temporadas | Card por ano: pódio top-4 por série (final) ou status (ativa) | JSON + config |
| Drawer jogador | Avatar, séries atuais, conquistas, carreira (temporadas, V–D, %, pts, melhor campanha), histórico por ano | derivado |
| Modal Sobre | Fundação, formato, promoção/rebaixamento, Elite | estático |

**Estados obrigatórios a desenhar:** loading (skeleton), erro de API, "dados em cache (há X min)", falha parcial ("2 ligas não carregaram"), vazio ("Sem dados", "As lendas serão reveladas…"), temporada ativa vs finalizada.

**Volumes reais (2026):** Elite 8 times, A/B/C/D 10 times cada = 48 linhas no Top Scorers / Power Ranking. Nomes de time até ~25 caracteres, inclusive em árabe (RTL: "سانتا كروز"), emoji ("Mangue Chiefs 🦀") e CAIXA ALTA.

### 6.3 Design tokens atuais (`styles.css` → `:root`)
```css
:root {
  /* Backgrounds */
  --bg: #050505;  --bg-2: #0a0a0a;  --bg-card: #0f0c0a;  --bg-card-2: #14110d;
  /* Borders */
  --border: rgba(255,110,50,.12);  --border-strong: rgba(255,110,50,.28);
  /* Text */
  --text: #f4eee8;  --text-2: rgba(244,238,232,.62);  --text-3: rgba(244,238,232,.38); /* ⚠ contraste */
  /* Brand */
  --orange: #ff6b35;  --orange-2: #ff8a4a;  --orange-dim: rgba(255,107,53,.55);
  /* Medalhas */
  --gold: #f5b400;  --silver: #c9c9d3;  --bronze: #d18046;  --fourth: #6ab2e0;
  /* Status */
  --green: #3eb371;  --red: #d6543a;
  /* Tipografia */
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  /* Efeitos */
  --shadow-card: 0 1px 0 rgba(255,255,255,.02) inset, 0 12px 40px rgba(0,0,0,.4);
  --glow-orange: 0 0 0 1px rgba(255,107,53,.35), 0 0 24px rgba(255,107,53,.35);
  --transition-fast: .15s ease;  --transition-tab: .25s cubic-bezier(.2,.7,.2,1);
}
/* Tiers (hardcoded hoje) */
.tier-label.s { background: linear-gradient(135deg,#f5b400,#ffd766); }
.tier-label.a { background: linear-gradient(135deg,#3eb371,#6fcc94); }
.tier-label.b { background: linear-gradient(135deg,#6ab2e0,#94c8ea); }
.tier-label.c { background: linear-gradient(135deg,#9e6cd9,#b793e2); }
.tier-label.d { background: linear-gradient(135deg,#d6543a,#e07b65); }
```
Raio: cards 16px (12px mobile), linhas 8px, pílulas 99px. Container: `max-width: 1200px; padding: 20px`.
Ícones: SVG line 24×24, `stroke-width: 2`, `currentColor` (troféu, alvo, gráfico, colunas, calendário, chevron, X, ampulheta) + 4 medalhas preenchidas com gradiente radial (`js/icons.js`).

**Pedido ao Claude Design:** consolidar em escala de espaçamento (4/8/12/16/24/32/48), escala tipográfica (~6 tamanhos, mínimo 12px), tokens semânticos (`--surface`, `--surface-raised`, `--text-muted` com contraste AA, `--success`, `--danger`, `--warning`), cores de tier e de zona (promoção / playoff / rebaixamento).

### 6.4 Esqueleto do HTML (`index.html`)
```html
<a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>
<div class="watermark" aria-hidden="true"></div>
<div class="container">
  <header role="banner">
    <div class="brand-logo"><img src="assets/khc-logo.png" alt="Ultimate League KHC" class="brand-logo-img"></div>
    <h1 class="brand-title">ULTIMATE KHC</h1>
    <p class="brand-subtitle"><span>Serie A</span><span>Serie B</span><span>Serie C</span><span>Elite</span></p>
  </header>
  <div class="controls">
    <div class="season-select"><select id="seasonSelector">…2025 (Arquivo) / 2026…</select></div>
    <nav class="nav-tabs" role="tablist">
      <!-- 5x --> <button class="tab-btn" role="tab" aria-selected aria-controls="tab-…">
                   <span class="tab-icon" data-icon="trophy"></span><span class="tab-label">LIGAS</span></button>
    </nav>
  </div>
  <main id="main-content">
    <section id="tab-leagues" class="view-section" role="tabpanel"><div id="leaguesContainer" class="leagues-grid"></div></section>
    <section id="tab-global"  …><div id="globalContainer"></div></section>
    <section id="tab-power"   …><div id="powerContainer" class="power-container"></div></section>
    <section id="tab-legends" …><div id="legendsContainer"></div></section>
    <section id="tab-seasons" …><div id="seasonsContainer"></div></section>
  </main>
  <footer class="site-footer"> brand + <button data-open-modal="about">Sobre a Liga</button></footer>
</div>
<aside id="player-drawer" class="drawer" role="dialog" aria-modal="true" hidden>…</aside>
<div id="about-modal" class="modal" role="dialog" aria-modal="true" hidden>…</div>
```

### 6.5 Templates dos componentes (o que o JS gera)
**Linha de liga** — `js/tabs/ligas.js` (grid `24px 36px 1fr auto auto`)
```html
<article class="league-card serie-a|elite|…">
  <div class="league-header">
    <span class="dot active|dim"></span><h3 class="league-title">KHC Serie A</h3>
    <div class="league-badge">10 Times</div>
  </div>
  <div class="standings-list" role="list">
    <div class="team-row" role="listitem">
      <div class="rank-num">1</div>            <!-- ou <div class="rank-medal">SVG</div> -->
      <img class="team-avatar" src="https://sleepercdn.com/avatars/thumbs/{id}">
      <div class="team-info">
        <span class="player-link team-name" data-user="{owner}">{Nome do time}</span>
        <div class="team-owner">{owner}</div>
      </div>
      <div class="team-record"><span class="w">3</span><span class="dash">–</span><span class="l">1</span></div>
      <div class="team-fpts">625.3</div>
    </div>
  </div>
</article>
```
**Linha Top Scorers** — `js/tabs/top-scorers.js` (grid `36px 1fr auto auto`)
```html
<div class="global-row top-1" role="row">
  <div class="global-rank medal">SVG|1</div>
  <div class="global-team-name"><span class="player-link" data-user>{time}</span></div>
  <div><span class="global-league-tag is-elite">KHC Elite</span></div>
  <div class="global-pts">757.1</div>
</div>
```
**Card PWR** — `js/tabs/power-ranking.js`
```html
<section class="tier-row"><div class="tier-label s"><span class="letter">S</span><span class="desc">ELITE</span></div>
  <div class="tier-teams">
    <article class="pwr-card">
      <div class="pwr-rank-tab"><span class="pwr-rank">#1</span><span class="move-up">↑18</span></div>
      <div class="pwr-card-left"><img class="pwr-avatar"><div class="pwr-info">
        <div class="pwr-team-name">{time}</div><div class="pwr-series">KHC Serie B</div>
        <div class="pwr-record">4-0 <span class="pwr-pts">757.1 pts</span></div></div></div>
      <div class="pwr-card-right"><div class="pwr-score">100.0</div><div class="pwr-score-label">PWR</div>
        <div class="pwr-bar"><div class="pwr-bar-fill" style="width:100%"></div></div></div>
    </article>
  </div>
</section>
```
**Linha Lendas** — `js/tabs/lendas.js` (grid `40px 1fr 44px×4`)
```html
<div class="legends-row is-leader" role="row">
  <div class="legends-rank">1</div><div class="legends-user"><span class="player-link">{user}</span></div>
  <div class="legends-count gold">1</div><div class="legends-count zero">–</div>…
</div>
```
**Card de temporada** — `js/tabs/temporadas.js`
```html
<article class="season-card">
  <header class="season-card-hd"><span class="season-year">2025</span>
    <span class="season-meta"><span class="season-chip is-final">FINALIZADA</span></span></header>
  <div class="season-podium-grid">
    <div class="podium-col"><div class="podium-col-title">KHC Serie A</div>
      <div class="podium-row"><span class="podium-icon">🥇SVG</span>
        <span class="podium-name"><span class="player-link">{user}</span><span class="podium-team">{time}</span></span>
        <span class="podium-pts">2198.0</span></div>
    </div>
  </div>
</article>
```
**Drawer** — `js/ui/drawer.js`: `drawer-header` (avatar 64 + nome + pills de série) → `Conquistas` (grid 4 `conquista-cell gold|silver|bronze|fourth`) → `Estatísticas de Carreira` (grid 2 `stat-tile`, + `full` para melhor campanha) → `Histórico` (`history-row`: ano+série · time+V–D·pts · medalha ou pill "Em andamento").

### 6.6 Modelo de dados (para o designer saber o que existe)
```js
Season = { id: 2025, status: 'active'|'final', series: Series[], week?, weeksTotal? }
Series = { id: 'A'|'B'|'C'|'D'|'Elite', name: 'KHC Serie A', teams: Team[], kind?: 'parallel' }
Team   = { rank, user, team, avatarId, w, l, pts,
           ptsAgainst?, ppts?,          // só no JSON finalizado
           trophy?: 'gold'|'silver'|'bronze'|'fourth' }
Career = { user, currentSeries, trophies:{gold,silver,bronze,fourth}, totalSeasons,
           totalWins, totalLosses, totalPts, bestCampaign?, history: [...] }
```
**Dados disponíveis e ainda não usados na UI** (oportunidades): `ptsAgainst` (pontos sofridos), `ppts` (pontos potenciais → "eficiência de escalação"), e pela Sleeper API: semana atual (`/state/nfl`), matchups da semana (`/league/{id}/matchups/{week}`), bracket de playoffs (`/winners_bracket`), sequência de vitórias (`metadata.streak` / `metadata.record` dos rosters).

### 6.7 Restrições técnicas para o redesign
- Sem framework / sem build: entregar HTML + CSS (variáveis) + templates em template string.
- Avatares vêm da CDN da Sleeper (quadrados, qualidade variável, às vezes ícone padrão laranja).
- Precisa funcionar com 2 a 6 séries por temporada e de 8 a 12 times por série.
- Português do Brasil. Nomes de usuário com acento, emoji e RTL.

---

## 7. Oportunidades de UX (sugestões para levar ao Claude Design)

1. **Header compacto + navegação fixa**: header pequeno (logo 32–40px + nome) e abas como barra fixa no topo (desktop) / **bottom nav** no mobile. Seletor de temporada como chip/segmented control junto ao título.
2. **"Minha liga" primeiro**: deixar o usuário escolher sua série/jogador (localStorage) e abrir nela; ou abas internas por série em vez de 5 cards empilhados.
3. **Zonas na classificação**: faixa lateral colorida para promoção (top 2), playoffs (top 6) e rebaixamento (últimos 2), com legenda. Cabeçalho de colunas (V–D, PF, PA).
4. **Status ao vivo**: "Semana 5 de 14 · atualizado há 2 min" + botão atualizar.
5. **Top Scorers**: avatar + dono + série; toggle "Incluir Elite"; filtro por série; sem cascata longa de animação.
6. **Power Ranking**: tiers como cabeçalhos horizontais (não coluna lateral), nomes em PT-BR, explicação do cálculo num tooltip/“?”, remover setas até haver histórico semanal real.
7. **Lendas como "Hall da Fama"**: pódio visual do top-3, avatares, linha do tempo de campeões por ano/série.
8. **Perfil do jogador com URL própria** (`#/jogador/nome`) — compartilhável no grupo.
9. **Página "Regras"** no lugar do modal escondido no rodapé, incluindo Serie D e a regra atual da Elite.
10. **Fundo mais limpo**: remover marca d'água atrás do conteúdo; usar o laranja como acento, não como cor de todo título.

---

## 8. Prioridades sugeridas

| Prioridade | Item |
|---|---|
| Agora (código, antes do redesign) | B1 medalhas · B2 troca de temporada · B3 Serie D no drawer · B4 setas falsas · B5 semana fixa · B6 tier mobile · subtítulo/modal sem Serie D |
| Redesign (Claude Design) | Header/navegação mobile · zonas na classificação · Top Scorers · Power Ranking · Lendas · tokens/escala/contraste |
| Depois | URL por aba/perfil · dados ao vivo (semana, matchups, bracket) · limpeza do CSS morto |

---

### Screenshots (`review/screens/`)
| Arquivo | O que mostra |
|---|---|
| `desktop-first-viewport.png`, `mobile-first-viewport.png` | 1ª dobra — header ocupando a tela |
| `desktop-2026-*.png`, `mobile-2026-*.png` | Todas as abas, temporada ativa |
| `desktop-2025-leagues.png` | **B1**: top-4 sem medalha/número |
| `desktop-2025-global.png`, `desktop-2025-power.png` | Temporada finalizada |
| `mobile-2026-power.png` | **B6**: tier label quebrado |
| `*-drawer.png`, `*-modal.png` | Perfil do jogador e Sobre a Liga |
