---
name: trilha-khc
description: Cria a trilha sonora 8-bit (estilo game arcade/NES) de um vídeo curto da KHC a partir de um briefing com tempos, e junta com o vídeo. Use quando o usuário enviar um vídeo da KHC e/ou um briefing de trilha ("trilha", "som", "música", "8-bit") pedindo o áudio.
---

# Trilha 8-bit dos vídeos da KHC

Use o template em `scripts/trilha/` (leia `scripts/trilha/README.md`). Não escreva um motor novo.

1. Inspecione o vídeo com `ffprobe` (duração, resolução) e confira alguns quadros nos tempos do briefing.
2. Crie `scripts/trilha/<nome-do-video>.py` a partir de `semana5.py`. Mapeie cada cena para uma fase de `PHASES` e cada marcação para um efeito de `Track`.
3. Siga os padrões já aprovados pelo usuário, mesmo que o briefing peça outra coisa:
   - música contínua, com `t.duck()` nos selos em vez de corte seco;
   - sem pratos;
   - efeitos sem chiado (tonais);
   - melodias originais.
   Se o briefing pedir paradas secas, gere também a versão `--com-paradas` e avise.
4. Gere com `--video` no vídeo 720p. Confira:
   - a duração exata;
   - -14 LUFS;
   - nenhum buraco de volume além do fade.
   Entregue o MP4, o MP3 e o WAV com SendUserFile.
5. Faça commit do arranjo novo na branch de trabalho.

Para montar o vídeo em si (cenas animadas com os dados da Sleeper), veja `video/README.md`.
