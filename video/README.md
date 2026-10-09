# Vídeos curtos da KHC (9:16)

Os vídeos são páginas HTML animadas, gravadas quadro a quadro pelo Chromium e codificadas com ffmpeg. A trilha vem de `scripts/trilha/`.

- `engine.js` / `engine.css`: timeline (`seek(t)`), HUD, cards de confronto, selos de zoeira, legendas, transições e fade. As cores e fontes são as da KHC.
- `fetch_rodada.py`: baixa da Sleeper os confrontos da semana de todas as ligas (`data.json`) e os avatares.
- `render.cjs`: grava o vídeo (`--stills` gera PNGs para conferir quadros soltos).
- `semana5/`: as cenas do KHC Confrontos · Semana 5 (TNF).

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
