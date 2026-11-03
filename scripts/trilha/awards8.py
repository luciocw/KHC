#!/usr/bin/env python3
"""KHC Awards · Semana 8: ~46 s, plataforma 8-bit com swing (168 BPM).

Lag em dobro (som "travando"), Guilhotina em terror ("carrasco") e a vaca
do Cruise: o clipe (6 s) toca de 32,0 a 38,0 na timeline, com a música
abaixando e um tombo 8-bit quando a vaca cai. R() soma as pausas de
leitura do vídeo (video/awards8/index.html).

Uso: python3 scripts/trilha/awards8.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(8.9, 0.8), (12.9, 0.6), (16.9, 0.6), (20.9, 0.6), (24.9, 0.6), (29.9, 0.7), (41.6, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(42.0), bpm=168, grid=1.2, seed=8, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, R(3.0), "plataforma")

# 01 · Lag em dobro
L = 3.0
t.play(R(L), R(L + 1.0), "rapida")
t.coins(R(L + .35), R(L + 1.0))
t.play(R(L + 1.0), R(L + 2.65), "chefao", vel=0.6)
for i in range(9):
    t.blip(R(L + 1.0 + i * .18), note("A5") - (i % 3) * 5, vel=0.5)
t.glitch(R(L + 1.05))
t.glitch(R(L + 1.85))
t.alarm(R(L + 1.3), 0.5)
t.play(R(L + 2.65), R(30.5), "plataforma")
t.defeat(R(L + 2.7))
t.stamp(R(6.4))


def premio(a, sfx):
    t.blips(R(a + .35), R(a + .5), 2, base="E5")
    t.coins(R(a + .4), R(a + 1.2))
    sfx(R(a + 1.4))


premio(9.5, t.damage)  # o Vigarista derruba o Ditador
premio(13.5, t.damage)  # VoliBEARS abatido
premio(17.5, t.stamp)  # dono de duas caras
premio(21.5, t.deflate)  # bola murcha

# 06 · Guilhotina (terror)
t.play(R(25.5), R(30.5), "carrasco")
t.chop(R(26.8))
t.toll(R(27.1), "E2")
t.stamp(R(28.0))

# 07 · A vaca subiu (clipe de 32,0 a 38,0)
t.play(R(30.5), R(38.5), "plataforma", vel=0.7)
t.blips(R(30.85), R(31.05), 2, base="E5")
t.power_up(R(31.6))  # a vaca no alto
t.duck(R(36.6), R(37.8))  # a música some na queda
t.glide(R(36.8), note("C6"), note("C3"), 0.7, duty=0.25, vel=0.7)  # caindo
t.defeat(R(37.5))

# Fim
t.play(R(38.5), R(42.0), "heroi")
t.stage_clear(R(38.8))
t.ba_dum_tss(R(39.7))
t.save_beep(R(40.5))

for p in (3.0, 9.5, 13.5, 17.5, 21.5, 25.5, 30.5, 38.5):
    t.warp(R(p))

run(t)
