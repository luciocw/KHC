#!/usr/bin/env python3
"""Dossiê Imperius Rex FC: ~20 s, plataforma 8-bit com swing (168 BPM).

O Tottenham ganha a fase triste. Tempos = os da timeline de
video/imperius/index.html; R() soma as pausas de leitura do vídeo.

Uso: python3 scripts/trilha/imperius.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, notes, remap, run

HOLDS = [(2.4, 0.6), (5.9, 0.6), (10.0, 0.5), (13.5, 0.5)]
R = remap(HOLDS)

t = Track(dur=R(18.0), bpm=168, grid=1.2, seed=99, swing=0.12)

# Dossiê: a carta 99
t.console_on(0.0)
t.hit(0.05, notes("D4 F4 A4 D5"), dur=1.0)
t.play(1.2, R(11.0), "chefao")
t.scribble(1.0, 0.35)  # círculo de caneta no 99
t.stamp(1.5)  # "99? Em 2025: 3–11"

# Prova 1: lanterna de 2025 que não caiu
t.blips(R(3.6), R(3.9), 3, base="C5", step=-2, vel=0.6)
t.stamp(R(4.4))

# Prova 2: fugiu da Guilhotina e da Burgundy Basquete
t.chop(R(8.3))
t.stamp(R(8.65))
t.cricket(R(9.65))

# Prova 3: Tottenham
t.play(R(11.0), R(14.5), "triste")
t.sad_trombone(R(11.9))

# Fim: rei sem coroa
t.play(R(14.5), R(18.0), "plataforma")
t.ba_dum_tss(R(15.3))
t.deflate(R(16.3), 0.6)  # a coroa cai
t.save_beep(R(17.0))

for p in (3.0, 7.0, 11.0, 14.5):
    t.warp(R(p))

run(t)
