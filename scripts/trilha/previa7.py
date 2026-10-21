#!/usr/bin/env python3
"""KHC Prévia · Semana 7: ~51 s, plataforma 8-bit com swing (168 BPM).

Rivalidade máxima com tema de chefão, Guilhotina em terror ("carrasco") e
o flash do dossiê CENSURADO. Tempos = os da timeline de
video/previa7/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/previa7.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(6.1, 0.5), (11.1, 0.5), (16.1, 0.5), (22.9, 0.8), (27.6, 0.5), (32.2, 0.5), (36.4, 0.5), (41.4, 0.7), (43.5, 0.3), (47.1, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(47.8), bpm=168, grid=1.2, seed=77, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
t.blip(0.25, note("E5"))
t.blip(0.43, note("G5"))
t.coin(1.0)  # START!
t.play(1.2, R(17.8), "plataforma")


def liga(a, sfx):
    t.blips(R(a + 0.4), R(a + 0.9), 5, base="C5", vel=0.6)  # cards entrando
    t.coins(R(a + 1.0), R(a + 1.7))  # % de playoffs subindo
    sfx(R(a + 2.0))  # selo


liga(2.8, t.stamp)  # Elite: Public Enemy no G4 por um fio
liga(7.8, t.damage)  # Série A: Diogoashura pega os dois donos
liga(12.8, t.deflate)  # Série B: Ceará sem cabeça

# Rivalidade máxima
t.play(R(17.8), R(24.3), "chefao")
t.alarm(R(17.85), 0.6)
t.stamp(R(18.85))  # VS
t.coins(R(19.3), R(20.5))
t.stamp(R(20.6))
t.cricket(R(22.05))  # "Alguém vai ganhar."

t.play(R(24.3), R(29.3), "plataforma")
liga(24.3, t.one_up)  # Série D: o Elieser pegou gosto?

# Guilhotina (terror)
t.play(R(29.3), R(33.3), "carrasco")
t.toll(R(29.4), "E2")
t.stamp(R(30.5))

# KHC NBA · Burgundy
t.play(R(33.3), R(44.3), "plataforma")
t.blips(R(33.7), R(34.2), 8, base="C5", step=1, vel=0.5)
t.stamp(R(34.8))
# Cocoricó PL
t.coins(R(37.9), R(38.7))
t.stamp(R(38.8))
t.low_life(R(39.5), R(40.1))  # 7%

# Flash CENSURADO (2 s) e a pergunta sobre o dossiê do Public Enemy
t.glitch(R(42.3))
t.stamp(R(42.42))
t.blip(R(43.3), note("E5"))  # E o dossiê do Public Enemy #1?
t.cricket(R(43.75))  # Onde estará?

# Fim
t.play(R(44.3), R(47.8), "heroi")
t.stage_clear(R(44.6))
t.ba_dum_tss(R(45.6))  # "Ou quem o Ditador deixar."
t.save_beep(R(46.4))

for p in (2.8, 7.8, 12.8, 17.8, 24.3, 29.3, 33.3, 37.3, 44.3):
    t.warp(R(p))

run(t)
