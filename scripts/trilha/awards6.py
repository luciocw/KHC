#!/usr/bin/env python3
"""KHC Awards · Semana 6: ~48,7 s, plataforma 8-bit com swing (168 BPM).

A cena da Guilhotina (26–31,5) troca para a fase de terror "carrasco".
Tempos = os da timeline de video/awards6/index.html; R() soma as pausas de
leitura, que são as mesmas do vídeo.

Uso: python3 scripts/trilha/awards6.py SAIDA [--video VIDEO.mp4]
"""
from chiptune import Track, note, notes, remap, run

HOLDS = [(6.1, 0.7), (10.7, 0.7), (15.2, 0.7), (20.5, 0.8), (25.1, 0.7), (30.3, 0.8), (34.9, 0.7), (38.6, 0.6), (42.2, 0.4)]
R = remap(HOLDS)

t = Track(dur=R(43.0), bpm=168, grid=1.2, seed=66, swing=0.12)

# Abertura
t.console_on(0.0)
t.hit(0.05, notes("C4 E4 G4 C5"), dur=1.15)
for i, x in enumerate((0.25, 0.41, 0.57, 0.73)):
    t.blip(x, note("C5") + 3 * i)
t.play(1.2, R(7.5), "plataforma")


def duelo(a, stamp_at, sfx=None):
    """Dois times entram (a), placares sobem e o selo carimba."""
    t.blips(R(a), R(a + 0.15), 2, base="E5")
    t.coins(R(a + 0.2), R(a + 1.1))
    (sfx or t.stamp)(R(stamp_at))


# 01 · Complô Desmontado
duelo(3.4, 4.6, t.damage)
t.stamp(R(4.65))

# 02 · Promessa é Dívida (tema do chefão para o Vigarista)
t.play(R(7.5), R(12.0), "chefao")
duelo(7.85, 9.4)
t.alarm(R(9.2), 0.45)  # NO CAMPO: PERDEU.

# 03 · Foto-chegada
t.play(R(12.0), R(26.0), "plataforma")
duelo(12.4, 13.9)
t.countdown(R(13.2), R(13.6))
t.coin(R(13.6))  # 1.06

# 04 · Milagre da Semana e Bola Murcha
duelo(16.9, 18.2)
t.one_up(R(17.0))  # 1ª vitória do Elieser
t.deflate(R(17.6))  # Bola Murcha
for i in range(3):
    t.damage(R(18.95 + i * 0.15))  # X na enquete
t.sad_trombone(R(19.5))  # NINGUÉM ACERTOU

# 05 · Perdeu com Dignidade
duelo(21.9, 23.9, t.defeat)
t.coins(R(23.2), R(24.0))  # 34/48

# 06 · Guilhotina (terror)
t.play(R(26.0), R(31.5), "carrasco")
t.chop(R(27.3))
t.toll(R(27.6), "E2")
t.blip(R(28.0), note("A4"))
t.stamp(R(28.6))  # na beira pela 3ª vez

# 07 · Coragem Seletiva
t.play(R(31.5), R(39.5), "plataforma")
t.blips(R(31.85), R(32.0), 2, base="E5")
t.stamp(R(32.6))
t.stamp(R(33.0))
t.stamp(R(33.2))
t.cricket(R(34.25))  # "Onde tem lâmina, somem."

# 08 · Enquete
for i in range(3):
    t.blip(R(36.7 + i * 0.3), note("C5") + 4 * i)
t.blips(R(37.8), R(38.4), 3, base="G5", step=0, vel=0.4)

# Fim
t.play(R(39.5), R(43.0), "heroi")
t.stage_clear(R(39.9))
t.ba_dum_tss(R(40.8))  # "até o Imperius pode ganhar."
t.save_beep(R(41.6))

for p in (3.0, 7.5, 12.0, 16.5, 21.5, 26.0, 31.5, 36.0, 39.5):
    t.warp(R(p))

run(t)
