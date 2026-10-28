#!/usr/bin/env python3
"""KHC Prévia · Semana 8: ~63 s, plataforma 8-bit com swing (168 BPM).

As cinco divisões em tabela completa (após a rodada 7), o Modo Furtivo do
VoliBEARS (fase subterrânea, de espionagem), a Guilhotina em terror
("carrasco") e o fim heroico. Tempos = os da timeline de
video/previa8/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/previa8.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(6.4, 1.2), (11.9, 1.2), (17.9, 0.7), (23.9, 1.2), (27.9, 1.2), (33.4, 1.2), (38.9, 1.2), (43.9, 1.0), (48.9, 0.7), (52.8, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(53.5), bpm=168, grid=1.2, seed=88, swing=0.12)

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

# Cards da Série A: os 10 votos de "adversário mais forte"
t.play(R(18.5), R(41), "plataforma")
t.blips(R(18.9), R(19.8), 10, base="C5", step=1, vel=0.45)
t.one_up(R(20.6))  # Só o Lucio apontou o líder

tabela(24.5, t.power_up)  # Série B: Gordinhas
tabela(30, t.glitch)  # Série C: internet consertada?
tabela(35.5, t.stamp)  # Série D: Bob Marley × líder

# Guilhotina (terror)
t.play(R(41), R(45), "carrasco")
t.toll(R(41.1), "E2")
t.chop(R(41.8))  # cabeça rolou
t.stamp(R(42.3))

# NBA e Cocoricó
t.play(R(45), R(50), "plataforma")
t.blips(R(45.4), R(45.8), 3, base="E5")
t.stamp(R(46.4))
t.low_life(R(46.6), R(47.1))  # Cruise com 11%

# Fim
t.play(R(50), R(53.5), "heroi")
t.stage_clear(R(50.3))
t.ba_dum_tss(R(51.3))  # "Metade das desculpas."
t.save_beep(R(52.1))

for p in (3.0, 8.5, 14.0, 18.5, 24.5, 30.0, 35.5, 41.0, 45.0, 50.0):
    t.warp(R(p))

run(t)
