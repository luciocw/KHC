#!/usr/bin/env python3
"""Especial "Corrida aos playoffs" (faltam 3 rodadas): ~78 s, plataforma 8-bit.

Ritmo mais calmo: cada tabela fica 3 s parada para leitura. Tempos = os da
timeline de video/chances/playoffs.html; R() soma as pausas.

Uso: python3 scripts/trilha/chances_playoffs.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(5.6, 1.5), (12.0, 3.0), (21.0, 3.0), (30.0, 3.0), (39.0, 3.0), (48.0, 3.0), (54.2, 0.5)]
R = remap(HOLDS)

t = Track(dur=R(55.0), bpm=150, grid=1.2, seed=1212, swing=0.1)

t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
t.stamp(0.5)  # o 3
t.play(1.2, R(51.0), "plataforma", vel=0.85)
for i in range(5):
    t.blip(1.2 + i * .35, note("C5") + 2 * i, vel=0.5)  # legenda

for a in (6.0, 15.0, 24.0, 33.0, 42.0):
    t.blips(R(a + .5), R(a + 1.3), 8, base="C5", step=1, vel=0.4)  # linhas entrando
    t.coins(R(a + 1.4), R(a + 2.4))  # % subindo
    t.stamp(R(a + 2.8))

t.play(R(51.0), R(55.0), "heroi")
t.stage_clear(R(51.3))
t.save_beep(R(53.1))

for p in (6.0, 15.0, 24.0, 33.0, 42.0, 51.0):
    t.warp(R(p))

run(t)
