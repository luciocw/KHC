#!/usr/bin/env python3
"""KHC Confrontos · Semana 5 (TNF): 150 BPM, cada liga é uma fase.

Os tempos abaixo são os da timeline do vídeo (video/semana5/index.html);
R() soma as pausas de leitura, que são as mesmas do vídeo.

Uso: python3 scripts/trilha/semana5.py SAIDA [--video VIDEO.mp4] [--com-paradas]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(2.5, 0.6), (6.6, 0.8), (8.9, 1.6), (13.95, 1.6), (18.75, 1.6), (23.85, 1.6), (29.25, 1.6)]
R = remap(HOLDS)

t = Track(dur=R(35.5), bpm=150, grid=1.2, seed=5)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)  # soa até a melodia entrar
t.blip(0.25, note("G5"))
t.blip(0.43, note("C6"))
t.play(1.2, R(3.0), "heroi")

# Destaque do TNF: chefão
t.play(R(3.0), R(7.0), "chefao")
t.coins(R(3.8), R(5.1))  # contador até 79.2
t.power_up(R(5.1))
t.death(R(5.2))  # K.O. do Los Pollos
t.duck(R(5.2), R(6.2))

# Elite: castelo
t.play(R(7.0), R(12.0), "castelo")
t.blips(R(7.6), R(8.1), 4)
t.coins(R(7.85), R(8.8))
t.damage(R(9.4))  # "34 aqui. 0 na Série A"
t.defeat(R(10.2))

# Série A: fase rápida
t.play(R(12.0), R(17.0), "rapida")
t.blips(R(12.6), R(13.25), 5, base="D5")
t.coins(R(12.85), R(13.9))
t.star(R(14.2))  # "Maior placar do TNF"
t.one_up(R(15.2))
t.duck(R(15.2), R(15.8))

# Série B: subterrânea
t.play(R(17.0), R(22.0), "subterranea")
t.blips(R(17.6), R(18.25), 5, base="C4", vel=0.8)
t.cricket(R(19.5))  # "TNF? Nunca nem vi"
t.pause(R(19.8))  # "0–4 na frente do 4–0"
t.duck(R(19.5), R(20.2))

# Série C: aquática
t.play(R(22.0), R(27.0), "aquatica")
t.bubbles(R(22.6), R(23.25))
t.deflate(R(24.5))  # Kelce Gremista murchando
t.sad_trombone(R(25.2))
t.duck(R(24.5), R(26.2))

# Série D: fase final
t.play(R(27.0), R(32.0), "final")
t.countdown(R(27.6), R(28.25))
t.low_life(R(29.4), R(30.2))  # "Pé-frio na frente"
t.duck(R(29.4), R(30.2))

# Fim
t.stage_clear(R(32.0))
t.hit(R(32.3), notes("C4 E4 G4 C5"), dur=0.8)  # "Domingo decide."
t.game_over(R(33.1))  # "Ou piora."
t.save_beep(R(33.8))
t.chord(R(33.9), notes("C4 Eb4 G4"), R(35.5) - R(33.9), duty=0.125, vel=0.45)  # tela de game over
t.bass_note(R(33.9), note("C2"), R(35.5) - R(33.9), 0.8)

for p in (3.0, 7.0, 12.0, 17.0, 22.0, 27.0, 32.0):
    t.warp(R(p))

run(t)
