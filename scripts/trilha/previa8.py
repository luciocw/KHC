#!/usr/bin/env python3
"""KHC Prévia · Semana 8: ~56 s, plataforma 8-bit com swing (168 BPM).

As cinco divisões em tabela completa (após a rodada 7), o Modo Furtivo do
VoliBEARS (fase subterrânea, de espionagem), a Guilhotina em terror
("carrasco") e o fim heroico. Tempos = os da timeline de
video/previa8/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/previa8.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(6.4, 1.2), (11.9, 1.2), (17.9, 0.7), (21.9, 1.2), (27.4, 1.2), (32.9, 1.2), (37.9, 1.0), (42.9, 0.7), (46.8, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(47.5), bpm=168, grid=1.2, seed=88, swing=0.12)

# Abertura: metade da temporada
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
t.blip(0.25, note("E5"))
t.blip(0.43, note("G5"))
t.coin(1.0)  # START!
t.coins(1.5, 2.3)  # barra da temporada enchendo
t.play(1.2, R(14.0), "plataforma")


def tabela(a, sfx):
    t.blips(R(a + .35), R(a + .8), 6, base="C5", step=1, vel=0.5)  # linhas entrando
    t.coins(R(a + .9), R(a + 1.6))  # % de playoffs
    t.blip(R(a + 1.8), note("A5"))  # VS
    sfx(R(a + 2.1))  # selo


tabela(3.0, t.stamp)  # Elite: dono fora do G4 pega o líder
tabela(8.5, t.damage)  # Série A: o Ditador

# Modo Furtivo (VoliBEARS)
F = 14.0
t.play(R(F), R(18.5), "subterranea")
for i in range(6):  # pulinhos da caixa
    t.blip(R(F + i * .3), note("C4") + 2 * i, vel=0.45)
t.alarm(R(F + 2.0), 0.35)  # "!" LÍDER DETECTADO
t.blip(R(F + 2.0), note("E6"))
t.stamp(R(16.6))  # Só Los Pollos Hermanos venceu ele

t.play(R(18.5), R(35.0), "plataforma")
tabela(18.5, t.power_up)  # Série B: Gordinhas
tabela(24.0, t.glitch)  # Série C: internet consertada?
tabela(29.5, t.stamp)  # Série D: Bob Marley × líder

# Guilhotina (terror)
t.play(R(35.0), R(39.0), "carrasco")
t.toll(R(35.1), "E2")
t.chop(R(35.8))  # cabeça rolou
t.stamp(R(36.3))

# NBA e Cocoricó
t.play(R(39.0), R(44.0), "plataforma")
t.blips(R(39.4), R(39.8), 3, base="E5")
t.stamp(R(40.4))
t.low_life(R(40.6), R(41.1))  # Cruise com 11%

# Fim
t.play(R(44.0), R(47.5), "heroi")
t.stage_clear(R(44.3))
t.ba_dum_tss(R(45.3))  # "Metade das desculpas."
t.save_beep(R(46.1))

for p in (3.0, 8.5, 14.0, 18.5, 24.0, 29.5, 35.0, 39.0, 44.0):
    t.warp(R(p))

run(t)
