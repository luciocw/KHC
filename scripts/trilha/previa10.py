#!/usr/bin/env python3
"""KHC Prévia · Semana 10: ~56 s, plataforma 8-bit com swing (168 BPM).

Abre com o Vigarista decapitado na Guilhotina (rodada 9, terror), depois as
cinco divisões em tabela (após a rodada 9, com o placar parcial do TNF), a
Guilhotina ao vivo, NBA/Cocoricó e o fim. R() soma as pausas de leitura de
video/previa10/index.html.

Uso: python3 scripts/trilha/previa10.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(5.8, 1.0), (10.4, 1.2), (15.9, 1.2), (21.4, 1.2), (26.9, 1.2), (32.4, 1.2), (37.4, 1.0), (41.9, 0.7), (46.2, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(46.5), bpm=168, grid=1.2, seed=10, swing=0.12)

# O Vigarista decapitado (terror)
t.toll(0.0)
t.hit(0.05, notes("A3 C4 E4 A4"), dur=1.0)
t.play(1.2, R(7.0), "carrasco")
t.chop(1.6)
t.stamp(1.7)  # Cabeça rolou
t.coins(2.4, 3.3)  # barras das menores pontuações
t.sad_trombone(R(3.6))


def tabela(a, sfx):
    t.blips(R(a + .35), R(a + .8), 6, base="C5", step=1, vel=0.5)
    t.coins(R(a + .9), R(a + 1.6))
    t.blip(R(a + 1.8), note("A5"))
    sfx(R(a + 2.1))


t.play(R(7.0), R(34.5), "plataforma")
tabela(7.0, t.stamp)  # Elite: dono fora do G4
tabela(12.5, t.damage)  # Série A: clássico dos donos
tabela(18.0, t.stamp)  # Série B
tabela(23.5, t.glitch)  # Série C: o líder larga atrás
tabela(29.0, t.deflate)  # Série D: líder × 9º

# Guilhotina ao vivo (terror)
t.play(R(34.5), R(38.5), "carrasco")
t.toll(R(34.6), "E2")
t.low_life(R(35.4), R(35.9))
t.stamp(R(35.8))

# NBA e Cocoricó
t.play(R(38.5), R(43.0), "plataforma")
t.blips(R(38.9), R(39.5), 5, base="E5")
t.stamp(R(39.9))

# Fim
t.play(R(43.0), R(46.5), "heroi")
t.stage_clear(R(43.3))
t.ba_dum_tss(R(44.3))
t.save_beep(R(45.1))

for p in (7.0, 12.5, 18.0, 23.5, 29.0, 34.5, 38.5, 43.0):
    t.warp(R(p))

run(t)
