#!/usr/bin/env python3
"""KHC Awards · Semana 11: ~50 s, plataforma 8-bit com swing (168 BPM).

Quem já está decidido (fanfarra), as zonas de queda (fase tensa "final"),
Guilhotina em terror, o especial "Parabéns, Ditador!" (fanfarra exagerada
que desafina na medalha de prata) e o fim com o gancho da Prévia S12.
Tempos = os da timeline de video/awards11/index.html; R() soma as pausas.

Uso: python3 scripts/trilha/awards11.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(9.0, 1.4), (15.0, 1.2), (19.4, 0.6), (23.4, 0.6), (28.4, 0.6), (34.4, 1.2), (38.4, 0.6), (42.3, 0.6)]
R = remap(HOLDS)

t = Track(dur=R(43.0), bpm=168, grid=1.2, seed=1111, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, R(10.0), "plataforma")

# Decididos: um bipe por time
for i in range(8):
    t.blip(R(3.5 + i * .25), note("C5") + (2 * i if i < 6 else -4), vel=0.6)
t.damage(R(5.5))  # FORA
t.alarm(R(6.0), 0.4)  # rebaixados: nenhum. Ainda.

# Zonas de queda (tensa)
t.play(R(10.0), R(16.0), "final")
t.blips(R(10.4), R(11.0), 3, base="C5", step=-2, vel=0.5)
t.low_life(R(11.2), R(11.8))
t.stamp(R(11.8))


def premio(a, sfx):
    t.blips(R(a + .35), R(a + .5), 2, base="E5")
    t.coins(R(a + .4), R(a + 1.2))
    sfx(R(a + 1.4))


t.play(R(16.0), R(24.0), "plataforma")
premio(16.0, t.deflate)  # semana para esquecer
premio(20.0, t.stamp)  # foto-chegada

# Guilhotina (terror)
t.play(R(24.0), R(29.0), "carrasco")
t.chop(R(25.3))
t.toll(R(25.6), "E2")
t.stamp(R(26.5))

# Parabéns, Ditador! (fanfarra irônica)
t.play(R(29.0), R(35.0), "heroi")
t.stage_clear(R(29.05))
t.one_up(R(29.35))
t.stamp(R(30.6))  # *empatado com mais dois
t.glide(R(30.0), note("C5"), note("G5"), 0.7, duty=0.25, vel=0.6)  # medalha subindo…
t.glitch(R(30.7))  # …e travando
t.sad_trombone(R(31.0))
t.ba_dum_tss(R(32.4))  # vice conta como título

# NBA: a vaca segue na árvore
t.play(R(35.0), R(39.0), "plataforma")
t.power_up(R(35.4))
t.stamp(R(36.0))

# Fim
t.play(R(39.0), R(43.0), "final")
t.countdown(R(39.2), R(39.6))
t.coin(R(40.5))  # Copa KHC
t.save_beep(R(41.2))

for p in (3.0, 10.0, 16.0, 20.0, 24.0, 29.0, 35.0, 39.0):
    t.warp(R(p))

run(t)
