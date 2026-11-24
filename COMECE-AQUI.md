# Comece aqui

Guia de entrada para quem vai assumir a KHC, seja uma pessoa ou uma IA. Em 10 minutos você sabe o que tem aqui, o que roda sozinho e o que precisa ser feito à mão. O detalhe de cada funcionalidade fica no [`README.md`](README.md).

## O que é

A **KHC** é um grupo de ligas de Fantasy Football (NFL) no Sleeper: **Elite** e **Séries A–D** (com acesso e rebaixamento), **KHC Guilhotina**, a **Copa KHC** (mata-mata do site) e, em "Também na KHC", a Cocoricó Premier League e a KHC NBA.

Este repositório tem duas coisas:

1. **O site** (https://luciocw.github.io/KHC/): HTML/CSS/JS puro, sem build e sem backend. Ele lê a API pública do Sleeper, que não precisa de login.
2. **Os vídeos curtos da semana** (Prévia, Awards e especiais) para o WhatsApp: páginas animadas gravadas em MP4, com trilha 8-bit.

## Mapa rápido

| Onde | O quê |
|---|---|
| `js/config.js` | **Comece por aqui no código.** IDs das ligas no Sleeper por ano, regras do ano, Copa (`copa`), simulação da Champions (`copaSim`) e Pontos KHC |
| `js/derivations.js` | Todas as contas: Power Ranking, Chances, Copa, Champions e Lendas. Não depende da tela, e os testes rodam em cima dele |
| `js/tabs/*.js` | Uma tela por arquivo. `regras.js` é a aba Regras, que explica as contas para o público |
| `js/app.js`, `js/api.js`, `js/data.js` | Navegação, busca no Sleeper com cache, temporadas fechadas |
| `data/<ano>.json` | Registro fechado de cada temporada (gerado por script, não editar à mão) |
| `data/chances-<ano>.json` | Chances de cada time após cada rodada (gravado sozinho pelo GitHub Actions) |
| `scripts/derive-season.mjs` | Fecha a temporada e gera o `data/<ano>.json` |
| `video/` | Motor dos vídeos e uma pasta por vídeo. **Índice dos vídeos de 2026 em [`video/README.md`](video/README.md)** |
| `scripts/trilha/` | Trilhas 8-bit, uma por vídeo ([`scripts/trilha/README.md`](scripts/trilha/README.md)) |
| `tests/contas.test.mjs` | Testes das contas, sem rede |
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

### Fim da temporada (depois da semana 17)

1. `node scripts/derive-season.mjs <ano>`: grava classificação final, troféus e os placares de todas as semanas (é deles que a Copa e a Champions KHC passam a sair, sem Sleeper).
2. Commit do `data/<ano>.json` e merge na `main`. O site passa a tratar o ano como fechado e soma os Pontos KHC nas Lendas.

### Começo de temporada nova

O Sleeper gera IDs novos para as ligas todo ano. Acrescente o ano em `KHC_CONFIG` (`js/config.js`) e revise os textos da aba Regras e da landing. O passo a passo está no README, em "Como atualizar quando a Sleeper renovar as ligas".

## Copa KHC e Champions KHC

- **Copa KHC** (`copa` em `config.js`): mata-mata do site, classificatória na semana 12 e final na 17. Em 2026 roda **em teste** (`test: true`, não soma Pontos KHC) e vale para valer em 2027.
- **Champions KHC** (`copaSim`, página `#/copa-champions`): simulação do formato Champions, uma proposta para 2027, refeita com os jogos reais de 2026. Não é oficial.
- As duas usam a mesma conta do fechamento (`resolveCup` / `resolveUcl` em `derivations.js`), com sorteio por semente fixa: dá sempre o mesmo resultado, então qualquer um pode conferir.
- Depois que 2026 fechar, as duas saem dos placares gravados no `data/2026.json` e continuam de pé mesmo que o Sleeper apague as ligas antigas.

## Acessos de que você precisa

- **GitHub:** permissão de escrita neste repositório, concedida pelo dono em Settings → Collaborators. O GitHub Pages fica em Settings → Pages.
- **Sleeper:** nenhum para o site, porque a API é pública. Para criar as ligas do ano e pegar os IDs novos, é preciso ser comissário no app do Sleeper.

## Como trabalhar

- Mudanças por branch e pull request para a `main`. Use nomes de branch que digam o que está sendo feito.
- Mudou regra ou conta? Atualize no mesmo PR a aba Regras (`js/tabs/regras.js`) e o `README.md`, rode `node --test tests/*.test.mjs` e acrescente um teste (ver `CLAUDE.md`).
- Textos do site em português do Brasil.
- Para rodar o site local: `python3 -m http.server 8000` e abra http://localhost:8000.

## Pendências conhecidas

- **Os MP4 dos vídeos não ficam no git.** Dá para gravar de novo a partir de cada pasta (ver `video/README.md`), mas o arquivo publicado só existe onde foi compartilhado.
- **Roteiros:** só 4 vídeos têm `BRIEFING.md`. Nos outros, a ideia das cenas está no `index.html` e nas mensagens de commit. Daqui em diante, salve o roteiro na pasta do vídeo.
- **Awards da Semana 4:** só a trilha ficou (`scripts/trilha/awards4.py`). **Awards da Semana 9:** não foi feito.
- **Rodada e Chaveamento de temporadas fechadas** ainda buscam os placares no Sleeper. Só a Copa e a Champions saem do arquivo.
- **Botão "Quero jogar" da landing:** ainda sem destino, à espera do link de inscrição.
