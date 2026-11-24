#!/usr/bin/env python3
"""Especial "Luta contra a queda" (faltam 3 rodadas): ~47 s, 8-bit tenso.

Ritmo mais calmo: cada tabela fica 3 s parada para leitura. Tempos = os da
timeline de video/chances/rebaixamento.html; R() soma as pausas.

Uso: python3 scripts/trilha/chances_queda.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(5.2, 1.5), (11.5, 3.0), (20.5, 3.0), (29.5, 3.0), (35.8, 0.5)]
R = remap(HOLDS)

t = Track(dur=R(36.5), bpm=150, grid=1.2, seed=1313)

t.console_on(0.0)
t.hit(0.05, notes("A3 C4 E4 A4"), dur=1.15)
t.stamp(0.5)
t.play(1.2, R(32.5), "final", vel=0.85)
for i in range(4):
    t.blip(1.2 + i * .35, note("A4") - 2 * i, vel=0.5)

for a in (5.5, 14.5, 23.5):
    t.blips(R(a + .5), R(a + 1.1), 7, base="C5", step=-1, vel=0.4)
    t.low_life(R(a + 1.4), R(a + 2.4))  # % de queda subindo
    t.stamp(R(a + 2.8))

t.play(R(32.5), R(36.5), "subterranea")
t.cricket(R(33.0))  # "Ninguém caiu."
t.ba_dum_tss(R(33.8))  # "Ainda."

for p in (5.5, 14.5, 23.5, 32.5):
    t.warp(R(p))

run(t)
