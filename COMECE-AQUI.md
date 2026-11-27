# Comece aqui

Guia de entrada para quem vai assumir a KHC, seja uma pessoa ou uma IA. Em 10 minutos você sabe o que tem aqui, o que roda sozinho e o que precisa ser feito à mão. O detalhe de cada parte está em [`docs/`](docs/), com o índice no [`README.md`](README.md).

## O que é

A **KHC** é um grupo de ligas de Fantasy Football (NFL) no Sleeper: **Elite** e **Séries A–D** (com acesso e rebaixamento), **KHC Guilhotina**, a **Champions KHC** (a Copa do site, formato Champions) e, em "Também na KHC", a Cocoricó Premier League e a KHC NBA.

Este repositório tem duas coisas:

1. **O site** (https://luciocw.github.io/KHC/): HTML/CSS/JS puro, sem build e sem backend. Ele lê a API pública do Sleeper, que não precisa de login.
2. **Os vídeos curtos da semana** (Prévia, Awards e especiais) para o WhatsApp: páginas animadas gravadas em MP4, com trilha 8-bit.

## Mapa rápido

| Onde | O quê |
|---|---|
| `js/config.js` | **Comece por aqui no código.** IDs das ligas no Sleeper por ano, regras do ano, Champions KHC (`copa`) e Pontos KHC |
| `js/derivations.js` | Todas as contas: Power Ranking, Chances, Copa, Champions e Lendas. Não depende da tela, e os testes rodam em cima dele |
| `js/tabs/*.js` | Uma tela por arquivo. `regras.js` é a aba Regras, que explica as contas para o público |
| `js/app.js`, `js/api.js`, `js/data.js` | Navegação, busca no Sleeper com cache, temporadas fechadas |
| `data/<ano>.json` | Registro fechado de cada temporada, com classificação, troféus e todos os confrontos (gerado por script, não editar à mão; formato em [`docs/dados.md`](docs/dados.md)) |
| `data/chances-<ano>.json` | Chances de cada time após cada rodada (gravado sozinho pelo GitHub Actions) |
| `scripts/derive-season.mjs` | Fecha a temporada e gera o `data/<ano>.json` |
| `video/` | Motor dos vídeos e uma pasta por vídeo. **Índice dos vídeos de 2026 em [`video/README.md`](video/README.md)** |
| `scripts/trilha/` | Trilhas 8-bit, uma por vídeo ([`scripts/trilha/README.md`](scripts/trilha/README.md)) |
| `tests/contas.test.mjs` | Testes das contas, sem rede |
| `docs/` | Documentação detalhada: funcionalidades, Copa, Lendas, dados, arquitetura |
| `CLAUDE.md` | Regras da casa (valem para pessoas também) |
| `.claude/skills/` | Passo a passo que o Claude segue para fazer vídeo (`video-khc`) e trilha (`trilha-khc`) |

## O que roda sozinho

- **Site no ar:** o GitHub Pages publica a branch `main`. Um merge na `main` fica no ar em cerca de 30 s.
- **Temporada em andamento:** tudo vem do Sleeper em tempo real. Não há nada para atualizar à mão durante a semana.
- **Registro das chances** (`.github/workflows/chances.yml`): roda toda terça e quarta e grava `data/chances-<ano>.json`.
- **Testes** (`.github/workflows/testes.yml`): rodam a cada push e pull request.

## O que é feito à mão

### Toda semana (opcional): vídeos

Prévia (antes da rodada) e Awards (depois que ela fecha). O processo está em `video/README.md`. Lá ficam também as regras da zoeira, que são parte do combinado com o grupo: nome do time e nunca da pessoa, zoar os donos e falar de todas as ligas. Com o Claude, basta pedir "faz o Awards da semana X" e ele segue a skill `video-khc`.

Para gravar, a máquina precisa de Node com Playwright/Chromium, `ffmpeg` e Python 3 com `numpy`.

**Som:** cada temporada tem um estilo de trilha, registrado em `video/README.md`. Em 2026 foi 8-bit estilo Super Mario; o de 2027 ainda será decidido.

### Fim da temporada (depois da semana 17)

Grava o resultado final (classificação, troféus e todos os confrontos) no `data/<ano>.json`. O site passa a tratar o ano como fechado e soma os Pontos KHC nas Lendas.

**Passo a passo para leigos em [`ENCERRAMENTO-TEMPORADA.md`](ENCERRAMENTO-TEMPORADA.md).** O caminho mais fácil é pelo GitHub, no navegador e sem terminal: **Actions → Encerrar temporada → Run workflow**, digitar o ano e depois aprovar o pull request.

### Começo de temporada nova

O Sleeper gera IDs novos para as ligas todo ano. Acrescente o ano em `KHC_CONFIG` (`js/config.js`) e revise os textos da aba Regras e da landing. O passo a passo está em [`docs/dados.md`](docs/dados.md).

## Champions KHC

- **Champions KHC** (`copa` em `config.js`, `format: 'ucl'`; aba Champions em Ligas, `#/ligas/<ano>/copa`): a Copa da KHC no formato Champions. Em 2026 é simulação com os jogos reais (`test: true`, não soma Pontos KHC); proposta oficial para 2027. Antes dela, falta o fechamento gravar o pódio da Champions (ver `docs/copa.md`).
- Usa a mesma conta do site e do fechamento (`resolveUcl` em `derivations.js`), com sorteio por semente fixa: dá sempre o mesmo resultado, então qualquer um pode conferir.
- Depois que 2026 fechar, ela sai dos confrontos gravados no `data/2026.json` e continua de pé mesmo que o Sleeper apague as ligas antigas. Detalhes em [`docs/copa.md`](docs/copa.md).

## Acessos de que você precisa

- **GitHub:** permissão de escrita neste repositório, concedida pelo dono em Settings → Collaborators. O GitHub Pages fica em Settings → Pages.
- **Sleeper:** nenhum para o site, porque a API é pública. Para criar as ligas do ano e pegar os IDs novos, é preciso ser comissário no app do Sleeper.

## Como trabalhar

- Mudanças por branch e pull request para a `main`. Use nomes de branch que digam o que está sendo feito.
- Mudou regra ou conta? Atualize no mesmo PR a aba Regras (`js/tabs/regras.js`) e a documentação (`README.md` / `docs/`), rode `node --test tests/*.test.mjs` e acrescente um teste (ver `CLAUDE.md`).
- Textos do site em português do Brasil.
- Para rodar o site local: `python3 -m http.server 8000` e abra http://localhost:8000.

## Pendências conhecidas

- **Os MP4 dos vídeos não ficam guardados (decisão do dono).** O que fica é o que permite refazer: cenas, dados e trilha de cada vídeo, mais o estilo de som de cada temporada em `video/README.md`.
- **Roteiros:** só 4 vídeos têm `BRIEFING.md`. Nos outros, a ideia das cenas está no `index.html` e nas mensagens de commit. Daqui em diante, salve o roteiro na pasta do vídeo.
- **Awards da Semana 4:** só a trilha ficou (`scripts/trilha/awards4.py`). **Awards da Semana 9:** não foi feito.
- **Botão "Quero jogar" da landing:** ainda sem destino, à espera do link de inscrição.
