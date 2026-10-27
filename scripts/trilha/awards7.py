#!/usr/bin/env python3
"""KHC Awards · Semana 7: ~53 s, plataforma 8-bit com swing (168 BPM).

O prêmio do LAG (ferpetucco) tem tema de chefão com o som "travando"; a
Guilhotina usa a fase de terror "carrasco". Tempos = os da timeline de
video/awards7/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/awards7.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(7.9, 0.8), (12.6, 0.5), (16.6, 0.5), (20.6, 0.5), (24.6, 0.6), (28.6, 0.5), (33.5, 0.6), (37.6, 0.5), (43.6, 0.8), (47.6, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(48.0), bpm=168, grid=1.2, seed=7, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, R(3.0), "plataforma")

# 01 · LAG: partida online travando
L = 3.0
t.play(R(L), R(L + 1.0), "rapida")
t.coins(R(L + .35), R(L + 1.0))
t.play(R(L + 1.0), R(L + 2.65), "chefao", vel=0.6)
for i in range(9):  # bipes "picotados" do lag
    t.blip(R(L + 1.0 + i * .18), note("A5") - (i % 3) * 5, vel=0.5)
t.glitch(R(L + 1.05))
t.glitch(R(L + 1.85))  # rubber-band
t.alarm(R(L + 1.3), 0.5)
t.play(R(L + 2.65), R(9.5), "plataforma")
t.defeat(R(L + 2.7))
t.stamp(R(L + 3.4))  # Desculpa oficial: LAG
t.ba_dum_tss(R(L + 4.1))


def premio(a, sfx):
    t.blips(R(a + .35), R(a + .5), 2, base="E5")
    t.coins(R(a + .4), R(a + 1.2))
    sfx(R(a + 1.4))


t.play(R(9.5), R(29.5), "plataforma")
premio(9.5, t.damage)  # Caçador de Donos
premio(13.5, t.deflate)  # Vigarista
premio(17.5, t.power_up)  # Gordinhas
premio(21.5, t.stamp)  # Fim do Jejum
t.sad_trombone(R(22.9))  # Bola Murcha
premio(25.5, t.stamp)  # Bob Marley em paz

# 07 · Guilhotina (terror)
t.play(R(29.5), R(34.5), "carrasco")
t.chop(R(30.8))
t.toll(R(31.1), "E2")
t.stamp(R(32.0))
t.cricket(R(32.85))  # "A lâmina não lê enquete."

# 08 · NBA · 09 · Cocoricó
t.play(R(34.5), R(44.5), "plataforma")
t.blip(R(34.85), note("E5"))
t.stamp(R(35.9))
t.blips(R(38.85), R(39.0), 2, base="E5")
t.damage(R(39.6))
t.star(R(40.4), 0.8)  # Bola de Ouro
t.defeat(R(41.1))  # North London Dictator perdeu de novo

# Fim
t.play(R(44.5), R(48.0), "heroi")
t.stage_clear(R(44.8))
t.ba_dum_tss(R(45.7))
t.save_beep(R(46.5))

for p in (3.0, 9.5, 13.5, 17.5, 21.5, 25.5, 29.5, 34.5, 38.5, 44.5):
    t.warp(R(p))

run(t)
