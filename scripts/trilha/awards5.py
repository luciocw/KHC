#!/usr/bin/env python3
"""KHC Awards · Semana 5: 46,5 s, plataforma 8-bit com swing (168 BPM).

Tempos = os da timeline de video/awards5/index.html.

Uso: python3 scripts/trilha/awards5.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, run

t = Track(dur=46.5, bpm=168, grid=1.2, seed=55, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, 7.5, "plataforma")

# 01 · Clube do 5–0 × 0–5
t.blips(3.4, 3.55, 2, base="E5")
t.blips(4.6, 5.05, 4, base="C4", step=-1)
t.defeat(5.3)

# 02 · Ladrão de Vitórias
t.play(7.5, 12.0, "chefao")
t.coins(8.0, 9.0)
t.countdown(8.9, 9.3)  # largada da foto-chegada
t.alarm(9.3, 0.5)
t.stamp(9.6)

# 03 · Dupla Personalidade
t.play(12.0, 16.5, "rapida")
t.coins(12.6, 13.5)
t.power_up(13.5)
t.damage(14.0)

# 04 · A Matemática Pediu Demissão
t.play(16.5, 21.0, "subterranea")
t.blips(17.0, 18.0, 4, base="C5")
t.glitch(18.4)
t.stamp(18.6)

# 05 · Pé-frio do Ano
t.play(21.0, 25.5, "triste")
t.coins(21.6, 22.6)
t.defeat(23.0)

# 06 · Bola Murcha
t.play(25.5, 30.0, "aquatica")
t.deflate(26.0, 1.0)
t.deflate(27.2)
t.sad_trombone(27.6)
t.duck(27.2, 28.6)

# 07 · Fila do Rebaixamento
t.play(30.0, 35.5, "castelo")
t.blips(30.4, 31.12, 9, base="C4", step=1, vel=0.5)
t.damage(32.6)

# 08 · Corda Bamba
t.play(35.5, 39.5, "final")
t.low_life(37.2, 37.8)

# Vote no Grupo
t.play(39.5, 43.0, "plataforma")
t.blips(40.2, 40.8, 3, base="G5")
t.pause(41.4)

# Fim
t.play(43.0, 46.5, "heroi")
t.stage_clear(43.0)
t.ba_dum_tss(44.4)
t.save_beep(45.0)

for p in (3.0, 7.5, 12.0, 16.5, 21.0, 25.5, 30.0, 35.5, 39.5, 43.0):
    t.warp(p)

run(t)
