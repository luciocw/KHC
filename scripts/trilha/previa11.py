#!/usr/bin/env python3
"""KHC Prévia · Semana 11: ~53 s, plataforma 8-bit com swing (168 BPM).

Ênfase no rebaixamento: contagem regressiva "faltam 4 rodadas" e a zona de
queda das Séries A, B e C (fase "final", tensa, com alarme de vida baixa),
depois Elite e D em tabela, Guilhotina em terror e NBA/Cocoricó.
Tempos = os da timeline de video/previa11/index.html; R() soma as pausas.

Uso: python3 scripts/trilha/previa11.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(3.6, 0.8), (9.6, 1.2), (15.6, 1.2), (21.6, 1.2), (26.9, 1.0), (32.4, 1.0), (36.4, 0.8), (40.4, 0.7), (44.7, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(45.0), bpm=168, grid=1.2, seed=11, swing=0.12)

# Contagem regressiva
t.console_on(0.0)
t.hit(0.05, notes("A3 C4 E4 A4"), dur=1.15)
t.alarm(0.05, 0.5)
t.stamp(0.5)  # o 4 bate
t.countdown(1.1, 1.55)  # 11, 12, 13, 14
t.play(1.2, R(22.5), "final")

# Zonas de queda: A, B e C
for a in (4.5, 10.5, 16.5):
    t.blips(R(a + .4), R(a + .95), 4, base="C5", step=-1, vel=0.5)
    t.low_life(R(a + 1.1), R(a + 2.3))  # % de queda subindo
    t.stamp(R(a + 2.5))


def tabela(a, sfx):
    t.blips(R(a + .35), R(a + .8), 6, base="C5", step=1, vel=0.5)
    t.coins(R(a + .9), R(a + 1.6))
    t.blip(R(a + 1.8), note("A5"))
    sfx(R(a + 2.1))


t.play(R(22.5), R(33.5), "plataforma")
tabela(22.5, t.stamp)  # Elite
tabela(28.0, t.stamp)  # Série D

# Guilhotina (terror)
t.play(R(33.5), R(37.5), "carrasco")
t.toll(R(33.6), "E2")
t.chop(R(34.3))
t.stamp(R(34.8))

# NBA e Cocoricó
t.play(R(37.5), R(41.5), "plataforma")
t.blips(R(37.9), R(38.5), 5, base="E5")
t.stamp(R(38.9))

# Fim
t.play(R(41.5), R(45.0), "heroi")
t.stage_clear(R(41.8))
t.alarm(R(42.8), 0.4)  # "9 na zona"
t.save_beep(R(43.6))

for p in (4.5, 10.5, 16.5, 22.5, 28.0, 33.5, 37.5, 41.5):
    t.warp(R(p))

run(t)
