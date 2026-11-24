# Vídeos curtos da KHC (9:16)

Os vídeos são páginas HTML animadas, gravadas quadro a quadro pelo Chromium e codificadas com ffmpeg. A trilha vem de `scripts/trilha/`.

- `engine.js` / `engine.css`: timeline (`seek(t)`), HUD, cards de confronto, selos de zoeira, legendas, transições e fade. As cores e fontes são as da KHC.
- `fetch_rodada.py`: baixa da Sleeper os confrontos da semana de todas as ligas (`data.json`) e os avatares.
- `fetch_guilhotina.py`: baixa a KHC Guilhotina (`guilhotina.json`): vivos, cortados por rodada, quem escapou por pouco e os donos da KHC que não estão na liga.
- `fetch_tambem.py`: baixa a KHC NBA (Burgundy) e a Cocoricó Premier League (`tambem.json`).
- `render.cjs`: grava o vídeo (`--stills` gera PNGs para conferir quadros soltos).
- `fonts/`: fontes embutidas nos vídeos (Archivo, Press Start 2P, Space Mono, Vazirmatn).

## Vídeos da temporada 2026

Cada pasta tem as cenas (`index.html`) e os dados daquela semana, guardados como estavam (`data.json` das ligas, `guilhotina.json`, `tambem.json` com NBA e Cocoricó). Alguns têm também o roteiro combinado com o dono (`BRIEFING.md`) e o script que fez as contas da semana (`.py`). A trilha de cada vídeo fica em `scripts/trilha/<pasta>.py`. Os MP4 finais **não** estão no git: para ter o arquivo de novo, grave a pasta (comandos abaixo). O vídeo sai igual porque os dados ficaram salvos; só os logos dos times são baixados de novo.

| Data | Pasta | Vídeo | Roteiro | Trilha |
|---|---|---|---|---|
| — | — | KHC Awards · Semana 4 (só a trilha ficou no repositório) | — | `awards4.py` |
| out. | `semana5/` | KHC Confrontos · Semana 5 (TNF) | — | `semana5.py` |
| 13/10 | `awards5/` | KHC Awards · Semana 5: o Vigarista no "Ladrão de Vitórias" | — | `awards5.py` |
| 15/10 | `previa6/` | KHC Prévia · Semana 6: duelo do Vigarista, denúncia "Complô da KHC?" | — | `previa6.py` |
| 16/10 | `guilhotina/` | Apresentação da KHC Guilhotina (cortes com a lâmina, trilha de terror) | — | `guilhotina.py` |
| 20/10 | `awards6/` | KHC Awards · Semana 6, com a Guilhotina | — | `awards6.py` |
| 21/10 | `imperius/` | Dossiê Imperius Rex FC: zoeira com o dono da liga ("Ditador Rique Infantinno") | — | `imperius.py` |
| 21/10 | `previa7/` | KHC Prévia · Semana 7: rivalidade máxima, Plantão KHC (dossiê CENSURADO), Guilhotina, NBA e Cocoricó | `BRIEFING.md` | `previa7.py` |
| 27/10 | `awards7/` | KHC Awards · Semana 7: o lag do ferpetucco, caçador de donos, Guilhotina, NBA e o Kane na Cocoricó | `BRIEFING.md` | `awards7.py` |
| 28/10 | `previa8/` | KHC Prévia · Semana 8: tabelas, Modo Furtivo do VoliBEARS, Guilhotina, NBA e Cocoricó | — | `previa8.py` |
| 03/11 | `awards8/` | KHC Awards · Semana 8: lag em dobro, o Vigarista derruba o Ditador, VoliBEARS abatido, a vaca do Cruise | — | `awards8.py` |
| 05/11 | `previa9/` | KHC Prévia · Semana 9: decreto do Ditador Henrique I, tabelas após a rodada 8 | — | `previa9.py` |
| — | — | KHC Awards · Semana 9 (não foi feito) | — | — |
| 13/11 | `previa10/` | KHC Prévia · Semana 10: o Vigarista decapitado, tabelas com o TNF, Guilhotina ao vivo | — | `previa10.py` |
| 17/11 | `awards10/` | KHC Awards · Semana 10: DENÚNCIA do Ditador, líder derrubado, folga das Gordinhas | `BRIEFING.md` | `awards10.py` |
| 18/11 | `previa11/` | KHC Prévia · Semana 11: contagem regressiva e zonas de queda das Séries A, B e C | — | `previa11.py` |
| 24/11 | `awards11/` | KHC Awards · Semana 11: quem já está decidido (100% de certeza, `decididos.py`), especial "Parabéns, Ditador!" | `BRIEFING.md` | `awards11.py` |
| 24/11 | `chances/` | Especiais "faltam 3": Corrida aos Playoffs (`playoffs.html`) e Luta contra a Queda (`rebaixamento.html`), com o que cada time precisa (`cenarios.py`) | — | `chances_playoffs.py`, `chances_queda.py` |

Os vídeos sem `BRIEFING.md` foram combinados direto na conversa. A ideia de cada cena está no `index.html` e nas mensagens de commit (`git log -- video/<pasta>`). Daqui em diante, salve o roteiro em `video/<pasta>/BRIEFING.md` junto com o vídeo e acrescente uma linha nesta tabela.

Para gravar um vídeo antigo de novo:

```bash
python3 video/fetch_rodada.py <semana> /tmp/logos                       # só para baixar os logos (não grave por cima da pasta: o data.json seria trocado pelo de hoje)
cp -r /tmp/logos/assets video/<pasta>/
node video/render.cjs video/<pasta>/index.html /tmp/v.mp4
python3 scripts/trilha/<pasta>.py saida --video /tmp/v.mp4
```

## Fazer um vídeo novo

```bash
python3 video/fetch_rodada.py 6 video/semana6               # dados + avatares
cp video/semana5/index.html video/semana6/                  # e reescreva as cenas e os textos
node video/render.cjs video/semana6/index.html /tmp/v.mp4   # ~1 min
python3 scripts/trilha/semana6.py saida --video /tmp/v.mp4  # trilha + mux
```

## Regras de legibilidade (celular)

- Nomes de time com pelo menos 40 px, pontos com 54 px e legenda com 68 px, em 1080×1920.
- Nada de print de tabela: todo texto é renderizado.

Os avatares não vão para o git (`.gitignore`). O `fetch_rodada.py` baixa de novo.

## Elenco e regras da zoeira

- **Imperius Rex FC** e **Public Enemy #1** são os donos das ligas KHC. Todo vídeo deve zoar os dois de alguma forma (um selo, uma legenda, o fim…), mesmo quando eles não são o assunto da semana.
- O dono do **Imperius Rex FC** (RiqueSantos) tem o apelido de **"Ditador Rique Infantinno"**. Na Cocoricó Premier League, o time dele é o "North London Dictator" (torce pro Tottenham). É comissário da NBA (National Burgundy Association), mas não tem time lá nesta temporada. Isso já foi zoado: não precisa citar em todo vídeo.
- **Caipiracicaba** tem o apelido de **"o Vigarista"** (inspirado no Dick Vigarista da Corrida Maluca). Use o apelido quando ele aparecer. **Menos ênfase nele:** só ganha cena ou prêmio próprio se houver algo marcante (derrota muito grande, vitória relevante). Fora isso, não citar sozinho.
- **Toda Prévia e todo Awards falam de todas as ligas**: Elite, A, B, C, D, Guilhotina e, quando houver assunto, KHC NBA (Burgundy) e Cocoricó Premier League (`video/fetch_tambem.py`).
- **Nos vídeos, cite sempre o nome do time, nunca o nome da pessoa** (os cards e prints trazem nomes; no vídeo vai o time: "Los Pollos Hermanos", não "Lucio").
- **Ganchos entre os vídeos:** toda Prévia termina com um gancho para o Awards (ex.: "Sábado tem Awards. Quem leva a Bola Murcha?", ou uma pergunta/aposta sobre um confronto da semana), e todo Awards termina com um gancho para a próxima Prévia (o confronto que vem aí, uma briga na zona, uma conta que ficou em aberto). Sempre que possível, o Awards responde ao gancho deixado pela Prévia ("Na Prévia, apostamos…") e vice-versa.
- A zoeira é liberada com todos os participantes, sempre com base nos números reais da rodada. Antes de afirmar "venceu/perdeu", confira quem enfrentou quem (`data.json`: cada item de `matchups` é um par de adversários).
- **KHC Guilhotina** (liga de 23 times, sem V–D): a cada rodada, a menor pontuação entre os vivos é cortada. Não tem juiz, imunidade, líder nem classificação: só vivos e cortados. O Vigarista corre o mesmo risco. Imperius Rex FC e Public Enemy #1 **não** estão na Guilhotina: zoar o "medo da lâmina". A partir da Semana 6, ela entra no Awards e na Prévia (`python3 video/fetch_guilhotina.py video/<pasta>`).
- Trilha: o padrão é a fase `plataforma` (Mario). Na Guilhotina, use as fases de terror (`terror`, `carrasco`, `assombrada`) com os efeitos `chop` e `toll`. Em dossiê, plantão ou investigação, use a fase `policial`.
