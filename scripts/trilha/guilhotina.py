#!/usr/bin/env python3
"""KHC Guilhotina · apresentação da liga: ~34 s, 8-bit de terror (144 BPM, sem swing).

Fases de terror do motor: "terror" (castelo de vampiro), "carrasco" (cortes)
e "assombrada" (caixinha de música). Tempos = os da timeline de
video/guilhotina/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/guilhotina.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, notes, remap, run

HOLDS = [(2.9, 0.5), (6.2, 0.5), (15.2, 1.0), (20.4, 0.6), (25.8, 0.8)]
R = remap(HOLDS)

t = Track(dur=R(30.5), bpm=144, grid=1.25, seed=23)

# Abertura: sino, o escudo cai e o título é cortado
t.toll(0.0)
t.hit(0.05, notes("A3 C4 E4 A4"), dur=1.1)
t.stamp(0.55)  # escudo aterrissa
t.chop(1.6)  # corte no título
t.play(1.25, R(7.0), "terror")

# A regra: a lâmina atravessa a tela
t.blips(R(3.75), R(4.1), 3, base="A4", step=1, vel=0.5)
t.chop(R(4.78))
t.stamp(R(4.95))  # CORTADO.

# Cemitério: um corte por rodada
t.play(R(7.0), R(16.5), "carrasco")
for i in range(5):
    t.chop(R(8.0 + i * 1.3))
t.toll(R(14.3), "E2")  # "5 cabeças rolaram."
t.sad_trombone(R(14.75))  # "Dó? Nenhum."

# Nem o Vigarista escapa
t.play(R(16.5), R(21.5), "terror")
t.alarm(R(16.7), 0.5)
t.blips(R(17.4), R(18.1), 5, base="A4", step=1, vel=0.5)  # distância da lâmina, rodada a rodada
t.stamp(R(18.6))  # Aqui não tem edição
t.chop(R(19.75))  # "Até a dele."

# Os donos da KHC com medo da lâmina: caixinha de música assombrada
t.play(R(21.5), R(27.0), "assombrada")
t.stamp(R(22.8))
t.stamp(R(23.1))
t.low_life(R(23.6), R(24.3))  # medômetro enchendo
t.cricket(R(24.95))  # "sumiram"

# Fim
t.play(R(27.0), R(30.0), "carrasco")
t.chop(R(27.9))  # "Quem é o próximo?"
t.hit(R(29.0), notes("A3 C4 E4 A4"), dur=1.2)
t.toll(R(29.0))

for p in (3.6, 7.0, 16.5, 21.5, 27.0):
    t.warp(R(p))

run(t)
