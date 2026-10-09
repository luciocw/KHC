#!/usr/bin/env python3
"""KHC Confrontos · Semana 5 (TNF): 35,5 s, 150 BPM, cada liga é uma fase.

Uso: python3 scripts/trilha/semana5.py SAIDA [--video VIDEO.mp4] [--com-paradas]
"""
from chiptune import Track, note, notes, run

t = Track(dur=35.5, bpm=150, grid=1.2, seed=5)

# 0,0–3,0 · Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)  # soa até a melodia entrar
t.blip(0.25, note("G5"))
t.blip(0.43, note("C6"))
t.play(1.2, 3.0, "heroi")

# 3,0–7,0 · Destaque do TNF: chefão
t.play(3.0, 7.0, "chefao")
t.coins(3.8, 5.1)  # contador até 79.2
t.power_up(5.1)
t.death(5.2)  # "Contra 0.0…"
t.duck(5.2, 6.2)

# 7,0–12,0 · Elite: castelo
t.play(7.0, 12.0, "castelo")
t.blips(7.6, 8.1, 4)
t.coins(7.85, 8.8)
t.damage(9.4)  # "34 aqui. 0 na Série A"
t.defeat(10.2)

# 12,0–17,0 · Série A: fase rápida
t.play(12.0, 17.0, "rapida")
t.blips(12.6, 13.25, 5, base="D5")
t.coins(12.85, 13.9)
t.star(14.2)  # "Maior placar do TNF"
t.one_up(15.2)
t.duck(15.2, 15.8)

# 17,0–22,0 · Série B: subterrânea
t.play(17.0, 22.0, "subterranea")
t.blips(17.6, 18.25, 5, base="C4", vel=0.8)
t.cricket(19.5)  # "TNF? Nunca nem vi"
t.pause(19.8)  # "0–4 na frente do 4–0"
t.duck(19.5, 20.2)

# 22,0–27,0 · Série C: aquática
t.play(22.0, 27.0, "aquatica")
t.bubbles(22.6, 23.25)
t.deflate(24.5)  # Bola Murcha
t.sad_trombone(25.2)
t.duck(24.5, 26.2)

# 27,0–32,0 · Série D: fase final
t.play(27.0, 32.0, "final")
t.countdown(27.6, 28.25)
t.low_life(29.4, 30.2)  # "Pé-frio na frente"
t.duck(29.4, 30.2)

# 32,0–35,5 · Fim
t.stage_clear(32.0)
t.hit(32.3, notes("C4 E4 G4 C5"), dur=0.8)  # "Domingo decide."
t.game_over(33.1)  # "Ou piora."
t.save_beep(33.8)
t.chord(33.9, notes("C4 Eb4 G4"), 1.6, duty=0.125, vel=0.45)  # tela de game over
t.bass_note(33.9, note("C2"), 1.6, 0.8)

for p in (3.0, 7.0, 12.0, 17.0, 22.0, 27.0, 32.0):
    t.warp(p)

run(t)
