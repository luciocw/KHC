# Vídeos curtos da KHC (9:16)

Os vídeos são páginas HTML animadas, gravadas quadro a quadro pelo Chromium e codificadas com ffmpeg. A trilha vem de `scripts/trilha/`.

- `engine.js` / `engine.css`: timeline (`seek(t)`), HUD, cards de confronto, selos de zoeira, legendas, transições e fade. As cores e fontes são as da KHC.
- `fetch_rodada.py`: baixa da Sleeper os confrontos da semana de todas as ligas (`data.json`) e os avatares.
- `fetch_guilhotina.py`: baixa a KHC Guilhotina (`guilhotina.json`): vivos, cortados por rodada, quem escapou por pouco e os donos da KHC que não estão na liga.
- `render.cjs`: grava o vídeo (`--stills` gera PNGs para conferir quadros soltos).
- `semana5/`: as cenas do KHC Confrontos · Semana 5 (TNF).
- `guilhotina/`: apresentação da KHC Guilhotina (cortes com a lâmina, trilha de terror).

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
- O dono do **Imperius Rex FC** (RiqueSantos) tem o apelido de **"Ditador Rique Infantinno"**. Na Cocoricó Premier League, o time dele é o "North London Dictator" (torce pro Tottenham). É comissário da NBA (National Burgundy Association), mas não tem time lá.
- **Caipiracicaba** tem o apelido de **"o Vigarista"** (inspirado no Dick Vigarista da Corrida Maluca). Use o apelido quando ele aparecer. **Menos ênfase nele:** só ganha cena ou prêmio próprio se houver algo marcante (derrota muito grande, vitória relevante). Fora isso, não citar sozinho.
- **Toda Prévia e todo Awards falam de todas as ligas**: Elite, A, B, C, D, Guilhotina e, quando houver assunto, KHC NBA (Burgundy) e Cocoricó Premier League (`video/fetch_tambem.py`).
- A zoeira é liberada com todos os participantes, sempre com base nos números reais da rodada. Antes de afirmar "venceu/perdeu", confira quem enfrentou quem (`data.json`: cada item de `matchups` é um par de adversários).
- **KHC Guilhotina** (liga de 23 times, sem V–D): a cada rodada, a menor pontuação entre os vivos é cortada. Não tem juiz, imunidade, líder nem classificação: só vivos e cortados. O Vigarista corre o mesmo risco. Imperius Rex FC e Public Enemy #1 **não** estão na Guilhotina: zoar o "medo da lâmina". A partir da Semana 6, ela entra no Awards e na Prévia (`python3 video/fetch_guilhotina.py video/<pasta>`).
- Trilha: o padrão é a fase `plataforma` (Mario). Na Guilhotina, use as fases de terror (`terror`, `carrasco`, `assombrada`) com os efeitos `chop` e `toll`. Em dossiê, plantão ou investigação, use a fase `policial`.
