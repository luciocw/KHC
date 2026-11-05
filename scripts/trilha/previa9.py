#!/usr/bin/env python3
"""KHC Prévia · Semana 9: ~57 s, plataforma 8-bit com swing (168 BPM).

Abre com o decreto do Ditador Henrique I (tema de chefão, troféus contando
como moedas, o bode "Bradyzete" com o grilo), depois as cinco divisões em
tabela (após a rodada 8), a Guilhotina em terror e NBA/Cocoricó.
Tempos = os da timeline de video/previa9/index.html; R() soma as pausas.

Uso: python3 scripts/trilha/previa9.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(6.6, 1.2), (11.4, 1.2), (16.9, 1.2), (22.4, 1.2), (27.9, 1.2), (33.4, 1.2), (38.4, 1.0), (42.9, 0.7), (47.2, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(47.5), bpm=168, grid=1.2, seed=99, swing=0.12)

# Decreto do Ditador
t.console_on(0.0)
t.alarm(0.1, 0.5)  # DECRETO OFICIAL
t.hit(0.15, notes("D4 F4 A4 D5"), dur=1.0)
t.play(1.2, R(8.0), "chefao")
for i in range(5):  # 5 troféus dos 49ers
    t.coin(1.6 + i * .1)
for i in range(6):  # 6 de Pittsburgh e 6 de New England
    t.coin(3.3 + i * .1)
    t.coin(3.6 + i * .1)
t.stamp(4.1)  # 5 < 6
t.deflate(4.0, 0.5)  # SF fica cinza
t.ba_dum_tss(5.1)  # Bradyzete
t.cricket(5.8)


def tabela(a, sfx):
    t.blips(R(a + .35), R(a + .8), 6, base="C5", step=1, vel=0.5)
    t.coins(R(a + .9), R(a + 1.6))
    t.blip(R(a + 1.8), note("A5"))
    sfx(R(a + 2.1))


t.play(R(8.0), R(35.5), "plataforma")
tabela(8.0, t.stamp)  # Elite: 1º × 2º
tabela(13.5, t.damage)  # Série A: decreto × Bear Down
tabela(19.0, t.power_up)  # Série B: Gordinhas
tabela(24.5, t.stamp)  # Série C
tabela(30.0, t.deflate)  # Série D: Elieser sem cabeça

# Guilhotina (terror)
t.play(R(35.5), R(39.5), "carrasco")
t.toll(R(35.6), "E2")
t.chop(R(36.3))
t.stamp(R(36.8))

# NBA e Cocoricó
t.play(R(39.5), R(44.0), "plataforma")
t.blips(R(39.9), R(40.4), 4, base="E5")
t.stamp(R(40.8))

# Fim
t.play(R(44.0), R(47.5), "heroi")
t.stage_clear(R(44.3))
t.ba_dum_tss(R(45.3))  # "Agora joga, Ditador."
t.save_beep(R(46.1))

for p in (8.0, 13.5, 19.0, 24.5, 30.0, 35.5, 39.5, 44.0):
    t.warp(R(p))

run(t)
