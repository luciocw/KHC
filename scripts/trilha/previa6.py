#!/usr/bin/env python3
"""KHC Prévia · Semana 6: 43 s, plataforma 8-bit com swing (168 BPM).

Tempos = os da timeline de video/previa6/index.html. Cada liga tem 6 s:
cards entram em +0,5 s, % de playoffs conta até +2,0 s, selo em +2,6 s.
R() soma as pausas de leitura, que são as mesmas do vídeo.

Uso: python3 scripts/trilha/previa6.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(5.0, 0.6), (7.05, 0.8), (11.0, 0.6), (13.05, 0.8), (20.3, 0.8), (23.0, 0.6), (25.05, 0.8),
         (29.0, 0.6), (31.05, 0.8), (35.0, 0.6), (37.05, 0.8)]
R = remap(HOLDS)

t = Track(dur=R(43.0), bpm=168, grid=1.2, seed=66, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
t.blip(0.25, note("E5"))
t.blip(0.43, note("G5"))
t.coin(1.1)  # START!
t.play(1.2, R(15.0), "plataforma")


def liga(a, sfx):
    t.blips(R(a + 0.5), R(a + 1.1), 5, base="C5", vel=0.6)  # cards entrando
    t.coins(R(a + 1.2), R(a + 1.9))  # % de playoffs subindo
    sfx(R(a + 2.6))  # selo de zoeira


liga(3.0, t.stamp)  # Elite: o 4º recebe o nº 1
liga(9.0, t.damage)  # Série A: Diogoashura em dupla jornada

# O Vigarista (tema de chefão)
t.play(R(15.0), R(21.0), "chefao")
t.alarm(R(15.2), 0.5)
t.glitch(R(16.6))  # fita de replay
t.damage(R(17.6))  # risca o 0.28
t.defeat(R(18.0))  # "perdeu de 147 a 120"
t.stamp(R(18.6))  # "Enganou até a edição"

t.play(R(21.0), R(39.0), "plataforma")
liga(21.0, t.damage)  # Série B: clássico da zona
liga(27.0, t.deflate)  # Série C: 51 pontos × invicto
liga(33.0, lambda x: t.low_life(x, x + 0.8))  # Série D: Elieser

# Fim
t.play(R(39.0), R(43.0), "heroi")
t.stage_clear(R(39.4))
t.ba_dum_tss(R(40.6))  # "Ou o Vigarista."
t.save_beep(R(41.4))

for p in (3.0, 9.0, 15.0, 21.0, 27.0, 33.0, 39.0):
    t.warp(R(p))

run(t)
