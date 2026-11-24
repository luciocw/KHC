# Arquitetura e código

## Stack

- HTML semântico, variáveis CSS e JS vanilla, sem `type="module"`: os scripts entram por tags em ordem (ver o fim do `index.html`).
- Ícones SVG inline (registro em `js/icons.js`).
- API pública do Sleeper, sem login.
- Nenhuma dependência de terceiros no site.

## Estrutura

```
index.html                  estrutura da página (header, page head, #view, bottom nav, drawer)
styles.css                  cores, fontes e espaçamentos da marca + componentes (organizado por === seções ===)
manifest.webmanifest        app na tela inicial
js/
  landing.js                landing da 1ª visita e #/inicio (carregado no <head>)
  config.js                 KHC_CONFIG (ligas + regras por ano, Copa, Pontos KHC), SERIES_META, appState
  sanitize.js               escapeHtml, sanitizeAvatarUrl, sanitizeNumber etc.
  api.js                    fetch com nova tentativa, cache (localStorage), fetchLeagueData, confrontos
  data.js                   temporadas fechadas (data/*.json)
  derivations.js            todas as contas: Power Ranking, Chances, Copa, Champions, Lendas, leitura do registro
  icons.js                  IconRegistry (SVG line 24px) + renderIcons()
  types.js                  typedefs em JSDoc
  ui/
    helpers.js              avatar, botão de time, escudo, medalha, pílula, scroll lock
    drawer.js               perfil do jogador (focus trap, Esc, URL #/jogador/…)
    export.js               imagens PNG (canvas) de cada tela, baixar e compartilhar
  tabs/                     uma tela por arquivo: ligas, chances, chaveamento, copa, copa-ucl,
                            guilhotina, tambem, rodada, top-scorers, power-ranking, lendas,
                            temporadas, regras
  app.js                    roteamento por hash, loadData, render
data/                       registros das temporadas fechadas + chances semanais (ver dados.md)
scripts/
  derive-season.mjs         fecha a temporada
  snapshot-chances.mjs      registro semanal das chances (GitHub Actions)
  trilha/                   trilhas 8-bit dos vídeos
video/                      vídeos curtos (ver video/README.md)
tests/contas.test.mjs       testes das contas, sem rede
assets/
  logo/svg/                 escudos oficiais em vetor (KHC, Elite, Séries A–F, Copa)
  logo/png/                 escudos por série (+ ui/ 160px, favicon)
  banners/                  og-image 1200×630, hero, header
  app/                      ícones do app
```

Os scripts em `scripts/` e os testes carregam `js/config.js` e `js/derivations.js` com `node:vm`. Por isso, as contas ficam em `derivations.js` sem tocar na tela, e o fechamento faz exatamente a mesma conta que o site.

## Identidade visual

- As cores (ligas, zonas, medalhas, tiers), a tipografia e os espaçamentos ficam no topo de `styles.css`, vindos do guia da marca.
- Fonte **Archivo** variável (eixo de largura: 125% nos títulos, 75% nos rótulos, 62% nos números).
- `data-league="a|b|c|d|e|f|elite"` num container reaponta `--accent` para a cor da série.
- Escudos por série em `assets/logo/png/` (PNG 160px em `ui/` para a interface) e vetores oficiais em `assets/logo/svg/`. O cabeçalho e o favicon usam o SVG. Banners em `assets/banners/` (`og-image` é a usada no compartilhamento).

## Decisões

- **Vanilla por escolha consciente:** o site só lê dados, tem poucas abas e uma função de render por aba. React, Vue ou Next não trariam benefício aqui. Sem bundle, sem servidor de desenvolvimento, publicação trivial.
- **Sem `type="module"`:** tags de script em ordem global. Funciona em qualquer navegador, sem atrito de CORS e sem etapa de build.
- **JSON para o passado, Sleeper ao vivo para o presente:** temporadas fechadas são fato histórico imutável, guardado em JSON (carrega rápido). A temporada em andamento é dinâmica, e o Sleeper é a fonte de verdade. O `js/data.js` esconde essa diferença do resto do código.
- **JSDoc em vez de TypeScript:** o editor completa o código sem precisar de build. Os tipos ficam em `js/types.js`.
- **SVG inline em vez de sprite ou fonte de ícones:** registro em `js/icons.js`, ícones ajustáveis em tempo de execução, sem dependência externa.

## Rodar localmente

Abrindo pelo `file://`, o `fetch('data/...json')` pode falhar por CORS. Use um servidor HTTP simples:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000.

## Testes

`node --test tests/*.test.mjs` testa as contas que decidem resultado: Pontos KHC e desempates, Copa KHC, Champions KHC, leitura dos confrontos gravados e Chances. Usa o mesmo código do site e não precisa de rede. O GitHub Actions (`.github/workflows/testes.yml`) roda a cada push e pull request, e também confere a sintaxe dos scripts.

## Publicação

O GitHub Pages serve direto da branch `main`. Um commit na `main` fica no ar em cerca de 30 s.
