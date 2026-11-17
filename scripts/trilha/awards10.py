#!/usr/bin/env python3
"""KHC Awards · Semana 10: ~46 s, plataforma 8-bit com swing (168 BPM).

Abre com a DENÚNCIA (fase policial): o Ditador, o pacto pela lesão do Drake
Maye e o Public Enemy #1 cobrando 226 × 129. Guilhotina em terror.
Tempos = os da timeline de video/awards10/index.html; R() soma as pausas.

Uso: python3 scripts/trilha/awards10.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(11.2, 1.0), (15.4, 0.6), (19.4, 0.6), (23.4, 0.6), (27.4, 0.6), (32.4, 0.7), (36.4, 0.6), (40.1, 0.3)]
R = remap(HOLDS)

t = Track(dur=R(40.5), bpm=168, grid=1.2, seed=1010, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, R(3.0), "plataforma")

# DENÚNCIA (policial)
D = 3.0
t.play(R(D), R(12.0), "policial")
t.alarm(R(D + .05), 0.6)
t.blip(R(D + 1.2), note("E5"))  # pacto
t.damage(R(D + 1.4))
t.blip(R(D + 2.5), note("G5"))  # satanás
t.stamp(R(D + 4.4))  # 226 × 129
t.coins(R(D + 4.5), R(D + 5.2))
t.cricket(R(D + 5.9))  # Enganou a todos?
t.stamp(R(7.6))


def premio(a, sfx):
    t.blips(R(a + .35), R(a + .5), 2, base="E5")
    t.coins(R(a + .4), R(a + 1.2))
    sfx(R(a + 1.4))


t.play(R(12.0), R(28.0), "plataforma")
premio(12.0, t.damage)  # líder derrubado
premio(16.0, t.deflate)  # folga das Gordinhas
premio(20.0, t.stamp)  # dupla personalidade
premio(24.0, t.power_up)  # lua de mel

# Guilhotina (terror)
t.play(R(28.0), R(33.0), "carrasco")
t.chop(R(29.3))
t.toll(R(29.6), "E2")
t.stamp(R(30.5))

# Semana do Satanás
t.play(R(33.0), R(37.0), "chefao")
t.blips(R(33.35), R(33.65), 3, base="E5")
t.stamp(R(34.4))

# Fim
t.play(R(37.0), R(40.5), "heroi")
t.stage_clear(R(37.3))
t.ba_dum_tss(R(38.2))
t.save_beep(R(39.0))

for p in (3.0, 12.0, 16.0, 20.0, 24.0, 28.0, 33.0, 37.0):
    t.warp(R(p))

run(t)
