# Trilhas 8-bit dos vídeos curtos da KHC

Template para a trilha sonora dos vídeos verticais (WhatsApp), em 8-bit estilo game arcade/NES.
Tudo é sintetizado com numpy; o `ffmpeg` cuida da normalização e de juntar a trilha com o vídeo.

## Padrões da casa

- **Música contínua.** Nos selos de zoeira, a música só abaixa enquanto o efeito toca. `--com-paradas` liga o corte seco, se o briefing exigir.
- **Sem pratos.** Não há crash nem chimbal aberto.
- **Efeitos sem chiado.** Todos os efeitos são tonais. O ruído fica só na caixa e no chimbal fechado, curtos e baixos.
- **Som de cartucho.** Dois pulsos (melodia e acordes no contratempo), triângulo no baixo, melodia picada.
- **Mix para celular.** Passa-alta em 70 Hz, corte em ~6,5 kHz e -14 LUFS. O WAV sai com a duração exata do vídeo.

## Como fazer a trilha de um vídeo novo

1. Copie `semana5.py` para `<video>.py`.
2. Ajuste `Track(dur=..., bpm=..., grid=...)`. `grid` é o instante em que a melodia entra. As fases devem começar em tempos que caiam na grade de colcheias (a 150 BPM, a colcheia dura 0,2 s).
3. Para cada cena, use `t.play(início, fim, "<fase>")` e chame os efeitos nos tempos do briefing. Nos selos, use `t.duck(início, fim)`.
4. Gere:

```bash
python3 scripts/trilha/<video>.py saida --video video_720p.mp4          # contínua (padrão)
python3 scripts/trilha/<video>.py saida --video video_720p.mp4 --com-paradas
```

A saída é `saida.wav` (duração exata), `saida.mp3` e `saida.mp4`. O MP4 sai com o áudio a partir de 0,0 s e o vídeo copiado sem recomprimir.

## Fases prontas (`PHASES` em `chiptune.py`)

| Fase | Clima |
|---|---|
| `heroi` | abertura heroica (Dó maior) |
| `plataforma` | saltitante de jogo de plataforma (a da semana 4) |
| `chefao` | música de chefão, Ré menor cromático |
| `castelo` | castelo pomposo, marcha |
| `rapida` | fase rápida, a mais animada |
| `subterranea` | grave e econômica |
| `aquatica` | molenga, arpejo boiando com vibrato |
| `final` | fase final tensa, baixo em semicolcheias |
| `triste` | meio-tempo triste |

Uma fase nova é um `dict` com `mel` (`seq(...)`, 4 compassos de 8 colcheias), `ch` (acordes), `roots` (baixo) e os estilos `bass` e `drums`.

## Efeitos (métodos de `Track`)

`console_on`, `blip`, `blips`, `coin`, `coins`, `power_up`, `death`, `damage`, `defeat`, `star`, `one_up`, `cricket`, `pause`, `bubbles`, `deflate`, `sad_trombone`, `countdown`, `low_life`, `alarm`, `glitch`, `stamp`, `scribble`, `ba_dum_tss`, `stage_clear`, `game_over`, `save_beep`, `warp`, `hit`.

As melodias e jingles são originais. Não use temas de jogos de verdade (Mario etc.), porque são protegidos por direitos autorais. Use só o estilo.
