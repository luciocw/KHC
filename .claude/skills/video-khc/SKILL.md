---
name: video-khc
description: Monta os vídeos curtos 9:16 da KHC (Confrontos, Awards, Prévia da semana) com o motor de video/ e a trilha 8-bit de scripts/trilha/. Use quando o usuário pedir um vídeo da KHC ou mandar imagens de classificação, confrontos ou Power Ranking para virar vídeo.
---

# Vídeos curtos da KHC

Leia `video/README.md` (motor, comandos e **Elenco e regras da zoeira**) e siga o padrão dos vídeos que já existem (`video/semana5`, `video/awards5`, `video/previa6`).

Regras que o usuário já definiu:
- **Sempre zoar o Imperius Rex FC e o Public Enemy #1**, os donos das ligas, em todo vídeo.
- Sempre falar de todas as ligas: Elite, A, B, C, D, Guilhotina e, se houver assunto, KHC NBA e Cocoricó PL.
- Caipiracicaba = "o Vigarista", mas com menos ênfase: só cena própria se houver algo marcante (derrota muito grande, vitória relevante). Dono do Imperius Rex FC = "Ditador Rique Infantinno" (nunca "rei").
- KHC Guilhotina: menor pontuação da rodada entre os vivos é cortada (sem juiz, ninguém imune, sem líder nem classificação: só vivos e cortados). Os donos da KHC não jogam nela ("medo da lâmina"). Ela entra no Awards e na Prévia a partir da S6: dados com `video/fetch_guilhotina.py`. Na trilha, use as fases de terror (`terror`, `carrasco`, `assombrada`, `chop`, `toll`).
- Texto grande (nomes a partir de 40 px em 1080×1920), pausas de leitura antes de cada troca e transições sem cortar texto. Cerca de 45–50 s.
- Logos dos times por liga (`video/fetch_rodada.py`), não os avatares dos donos.
- Trilha: 8-bit de plataforma com swing (`Track(bpm=168, swing=0.12)`), contínua, sem pratos, efeitos sem chiado.
- Confira os confrontos reais antes de afirmar quem venceu quem.
- Entregue o MP4 com SendUserFile e faça commit na branch de trabalho.
