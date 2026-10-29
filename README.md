# Ultimate League KHC — Hub Oficial

Hub central das ligas KHC (Elite, Séries A–D e Guilhotina) de Fantasy Football, com a Premier League e a NBA da turma em "Também na KHC".
Single-page app **vanilla HTML/CSS/JS** — sem framework, sem build step, sem backend. Deploy direto no GitHub Pages.

## Funcionalidades

- **Landing (porta de entrada):** na 1ª visita pela raiz do site abre uma apresentação curta da KHC; "Ver as ligas" leva ao hub e, dali em diante, a raiz abre o hub direto. Links com endereço (`#/ligas/…`, compartilhados, app instalado) nunca passam pela landing, e quem já usava o hub também não. `#/inicio` abre a landing a qualquer momento (link de divulgação e botão em Regras). O botão "Quero jogar" ainda não tem destino: entra quando houver link de inscrição
- **7 abas:** Ligas, Rodada, Top Scorers, Power Ranking, Lendas KHC, Temporadas, Regras (+ Também na KHC, fora do menu)
- **Endereço por tela** (compartilhável): `#/ligas/2026/a`, `#/top/2026`, `#/jogador/<usuario>`
- **Ligas:** uma série por vez, com zonas de acesso / playoffs / rebaixamento por temporada e medalhas (número dentro) na classificação final; botões Baixar / Compartilhar geram PNG da tabela; seletor **Tabela | Chances** com Playoffs % e Queda % (simulação do resto da temporada regular, calibrada com o histórico de ligas 10/6 do Sleeper, atualiza quando a rodada fecha)
- **KHC Guilhotina:** dentro de Ligas (aba Guilhotina): vivos ordenados pela pontuação da semana, zona de corte quando todos já pontuaram, cortados com a rodada do corte; fora de Rodada, Top, Power e Chances; exporta PNG
- **Chaveamento** (Ligas → Tabela | Chances | Chaveamento): playoffs de cada série. Elite: semis 1º×4º e 2º×3º (sem. 15), final e 3º lugar (16). Séries A–D: 1º e 2º folgam; quartas 4º×5º e 3º×6º (15), semis e 5º lugar (16), final e 3º lugar (17). Na temporada regular mostra a projeção pela tabela de hoje, com a chance de playoffs de cada time; depois, o chaveamento do Sleeper com placares. Nas semanas de playoff, Ligas abre direto no Chaveamento. Exporta em imagem
- **Também na KHC** (`#/premier`, `#/nba`): página fora do menu, com abas por liga, botão Voltar para a NFL e atalho discreto (ícone de grade) no topo; aparece em Regras e, na entressafra da NFL, como cartão na aba Ligas
  - **Premier League** (`#/premier`): tabela da Cocoricó Premier League (V–E–D, PF, PC, eficiência de escalação) e exportar
  - **NBA** (`#/nba`): KHC NBA League · National Burgundy Association, liga nova em 2026/27 (6 times). Mesma tabela, com V–D, e Rodada (`#/nba/rodada/<semana>`) com destaques e exportar, como a da NFL; antes do draft mostra só os times que já entraram
- **Rodada:** confrontos e placar da semana por série (‹ semana ›), rótulos de playoff (Final, 3º lugar, Semifinal…) e exportação em PNG; destaques da semana (maior pontuação, maior vitória, jogo mais apertado)
- **App na tela inicial:** manifest + ícones (`assets/app/`) — Android instala pelo Chrome, iPhone pelo Safari (Compartilhar → Adicionar à Tela de Início)
- **Top Scorers:** filtro por série e "Incluir Elite" (desligado por padrão, evita time duplicado); Baixar / Compartilhar geram PNG da lista com o filtro atual (em "Todas", só o Top 20)
- **Power Ranking:** tiers S Favoritos · A Candidatos · B Meio de tabela · C Pressionados · D Lanternas por posição (10/20/40/20/10%). PWR = 50% força (all-play semana a semana contra as Séries A–D) + 30% aproveitamento + 20% fase (últimas 3 semanas); sem Elite. Exporta PNG
- **Lendas:** Hall da Fama por **Pontos KHC** (`KHC_POINTS` em `js/config.js`, em discussão até 2027), pela colocação final: Séries A–F 12/8/6/4/3/2/1 (1º ao 7º, todas iguais), Elite 14/10/7/5, Copa 10/7/5/2; Guilhotina, Premier e NBA não pontuam. 5º e 6º pela disputa do 5º lugar. Só temporadas fechadas. Desempate: títulos → aproveitamento V–D (temporada regular das divisões; sem playoffs, Elite e Copa) → título mais recente. O perfil mostra o "aproveitamento geral" (com a temporada atual e a Elite). Medalha só para 1º–3º. Baixar / Compartilhar geram PNG do top 10
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
  derive-season.mjs         fecha a temporada: data/<ano>.json a partir da config e do Sleeper
  snapshot-chances.mjs      registro semanal das chances (GitHub Actions)
js/
  landing.js                landing da 1ª visita e #/inicio (carregado no <head>)
  config.js                 KHC_CONFIG (ligas + regras por ano), SERIES_META, appState
  sanitize.js               escapeHtml, sanitizeAvatarUrl, sanitizeNumber, etc.
  api.js                    fetch+retry, cache (localStorage), fetchLeagueData, fetchNflState, confrontos
  data.js                   temporadas finalizadas (data/*.json)
  derivations.js            powerRanking, tierForRank, simulateOdds, legendsAggregator, careerForUser
  icons.js                  IconRegistry (SVG line 24px) + renderIcons()
  types.js                  JSDoc typedefs
  ui/
    helpers.js              avatar, botão de time, escudo, medalha, pílula, scroll lock
    drawer.js               perfil do jogador (focus trap, Esc, URL #/jogador/…)
    export.js               imagens PNG (canvas) de cada tela, baixar e compartilhar
  tabs/
    ligas.js · chances.js · chaveamento.js · guilhotina.js · tambem.js · rodada.js · top-scorers.js · power-ranking.js · lendas.js · temporadas.js · regras.js
  app.js                    roteamento por hash, loadData, render
assets/
  logo/svg/                 escudos oficiais em vetor (KHC, Elite, Séries A–F, Copa)
  logo/png/                 escudos por série (+ ui/ 160px, favicon)
  banners/                  og-image 1200×630, hero, header
```

## Registro semanal das chances

`scripts/snapshot-chances.mjs` refaz a conta da visão **Chances** (mesmo código do site) e grava em `data/chances-<ano>.json` as chances de cada time após cada rodada encerrada e, quando a temporada regular fecha, o resultado final (quem foi aos playoffs e quem caiu). Serve para conferir se o modelo acerta. O GitHub Actions (`.github/workflows/chances.yml`) roda toda terça e quarta; também dá para rodar à mão em **Actions → Registro das chances → Run workflow** ou `node scripts/snapshot-chances.mjs 2026`.

## Como atualizar quando a Sleeper renovar as ligas

A cada ano, novos league IDs são gerados. Pra adicionar um novo ano:

1. **Configurar a temporada nova** em `js/config.js` (ligas + regras):
   ```js
   '2027': {
     rules: { promote: 3, relegate: 3, playoffTeams: 6, elitePlayoffTeams: 8 },
     leagues: [
       { id: '...', name: 'KHC Elite',      tier: 'elite' },
       { id: '...', name: 'KHC Serie A',    tier: 'serie-a' },
       { id: '...', name: 'KHC Serie B',    tier: 'serie-b' },
       { id: '...', name: 'KHC Serie C',    tier: 'serie-c' },
       { id: '...', name: 'KHC Serie D',    tier: 'serie-d' },
       { id: '...', name: 'KHC Guilhotina', tier: 'guilhotina' },
     ],
   }
   ```
2. O seletor de temporada, as abas de série e as zonas saem da config automaticamente, e o site passa a abrir no ano mais recente. Séries novas (E, F) já têm cor e escudo em `SERIES_META` — use `tier: 'serie-e'` / `'serie-f'`. O chaveamento segue as vagas de playoff do Sleeper (4, 6 ou 8 times).
3. Durante a temporada, o site puxa tudo da Sleeper API automaticamente.
4. **Textos a revisar à mão:** as regras do ano (`js/tabs/regras.js`) e a landing (`index.html`, "Temporada 2026 em andamento").

## Como "fechar" uma temporada (snapshot final)

Quando a final e a disputa do 3º lugar terminam (semana 17), o site já mostra "Temporada encerrada" e abre no Chaveamento (pódio). Para gravar o histórico:

1. **Rodar:**
   ```bash
   node scripts/derive-season.mjs 2026
   ```
   O script lê as ligas de `js/config.js` e o chaveamento do Sleeper: 1º–4º pelos playoffs (troféus), 5º e 6º pela disputa do 5º lugar, o resto pela temporada regular; a Guilhotina sai pela ordem de corte, sem troféu nem Pontos KHC (Premier League e NBA não entram). Se alguma final ainda não tiver vencedor, ele para e avisa. Gera `data/2026.json`.

2. **Commit + push.** O site passa a tratar 2026 como finalizada (status: 'final'), mostra medalhas, contribui pra Lendas e Career.

## Como rodar localmente

Por causa de `fetch('data/...json')`, o `file://` pode falhar (CORS). Use um servidor HTTP simples:

```bash
python3 -m http.server 8000
# então abra http://localhost:8000
```

## Deploy

GitHub Pages serve diretamente da branch `main`. Commits pra `main` ficam no ar em ~30s.

## Decisões de arquitetura

- **Vanilla por escolha consciente** — o site é read-only, poucas abas, uma função de render por aba. Não há benefício em React/Vue/Next aqui. Bundle zero, dev server zero, deploy trivial.
- **Sem `type="module"`** — script tags em ordem global. Funciona em qualquer browser, sem CORS fricção, sem build step.
- **Híbrido JSON + live** — temporadas finalizadas são fato histórico imutável (JSON congelado, fast load). Ativa é dinâmica (Sleeper live, source of truth). O loader em `js/data.js` esconde a diferença.
- **JSDoc em vez de TypeScript** — IDE pega autocomplete sem precisar de build. Tipos vivem em `js/types.js`.
- **SVG inline em vez de sprite/font** — registry em `js/icons.js`, ícones customizáveis em runtime. Sem dependência externa.
