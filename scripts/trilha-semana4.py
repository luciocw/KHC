#!/usr/bin/env python3
"""Trilha sonora do vídeo "KHC Awards · Semana 4" em estilo 8-bit (chiptune).

Canais no estilo de console 8-bit: dois pulsos (melodia e arpejo), triângulo
(baixo) e ruído (bateria), mais efeitos de videogame nos tempos do briefing
README-trilhaKHC. Gera um WAV estéreo 48 kHz com exatamente 56,0 s; a
normalização para -14 LUFS é feita depois com ffmpeg.

Uso: python3 scripts/trilha-semana4.py saida.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 56.0
N = int(SR * DUR)
BPM = 140
E8 = 60 / BPM / 2  # colcheia
BAR = 8 * E8
rng = np.random.default_rng(8)


# ---------------------------------------------------------------- utilidades
def add(bus, start, sig, gain=1.0):
    i = int(round(start * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    bus[i:j] += sig[: j - i] * gain


def t_axis(dur):
    return np.arange(max(1, int(dur * SR))) / SR


def hz(midi):
    return 440.0 * 2 ** ((np.asarray(midi, dtype=float) - 69) / 12)


def note(name):
    pcs = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    pc = pcs[name[0]]
    rest = name[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def phase(freq, t):
    f = np.broadcast_to(np.asarray(freq, dtype=float), t.shape)
    return np.cumsum(f) / SR


def pulse(freq, t, duty=0.25):
    return np.where(phase(freq, t) % 1.0 < duty, 1.0, -1.0)


def triangle(freq, t):
    p = phase(freq, t) % 1.0
    tri = 4 * np.abs(p - 0.5) - 1
    return np.round(tri * 7.5) / 7.5  # 16 degraus, como no chip


def chip_noise(dur, rate):
    """Ruído "sample and hold": quanto maior a taxa, mais agudo."""
    n = len(t_axis(dur))
    rate = np.broadcast_to(np.asarray(rate, dtype=float), (n,))
    idx = np.floor(np.cumsum(rate) / SR).astype(int)
    vals = rng.choice([-1.0, 1.0], size=idx[-1] + 1)
    return vals[idx]


def env(n, decay, sustain=0.0, attack=0.002):
    t = np.arange(n) / SR
    e = sustain + (1 - sustain) * np.exp(-t / decay)
    a = int(attack * SR)
    if a:
        e[:a] *= np.linspace(0, 1, a)
    e = np.floor(e * 15) / 15  # volume em 16 níveis
    k = min(n, int(0.004 * SR))
    e[-k:] *= np.linspace(1, 0, k)
    return e


def eq(sig, hp=None, lp=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hp:
        g /= np.sqrt(1 + (hp / f) ** 4)
    if lp:
        g /= np.sqrt(1 + (f / lp) ** 4)
    return np.fft.irfft(spec * g, len(sig))


# ------------------------------------------------------------------ buses
lead, arp, bass, drums, sfx = (np.zeros(N) for _ in range(5))
play_segments = []  # (início, fim) em que a "banda" toca; usado pelo gate


# --------------------------------------------------------------- canais
def lead_note(start, midi, dur, duty=0.25, vib=0.0, vel=1.0, slide_from=None):
    t = t_axis(dur)
    m = np.full_like(t, float(midi))
    if slide_from is not None:
        k = min(len(t), int(0.05 * SR))
        m[:k] = np.linspace(slide_from, midi, k)
    if vib:
        m += vib * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.12) / 0.1, 0, 1)
    s = pulse(hz(m), t, duty) * env(len(t), 0.35, 0.55)
    add(lead, start, s, vel)


def arp_chord(start, chord, dur, duty=0.125, vel=1.0, speed=1 / 40):
    """Acorde "de chip": as notas se alternam muito rápido."""
    t = t_axis(dur)
    idx = (np.floor(t / speed).astype(int)) % len(chord)
    m = np.asarray(chord, dtype=float)[idx]
    s = pulse(hz(m), t, duty) * env(len(t), 0.18, 0.25)
    add(arp, start, s, vel)


def bass_note(start, midi, dur, vel=1.0):
    t = t_axis(dur)
    s = triangle(hz(midi), t)
    k = min(len(t), int(0.004 * SR))
    s[-k:] *= np.linspace(1, 0, k)
    add(bass, start, s, vel)


def kick(start, vel=1.0):
    t = t_axis(0.16)
    m = 64 - 30 * np.clip(t / 0.06, 0, 1)
    s = triangle(hz(m), t) * env(len(t), 0.07)
    s += 0.4 * chip_noise(0.16, 9000) * env(len(t), 0.008)
    add(drums, start, s, vel)


def snare(start, vel=1.0):
    t = t_axis(0.2)
    s = chip_noise(0.2, 14000) * env(len(t), 0.06)
    s += 0.5 * pulse(hz(57 - 12 * np.clip(t / 0.05, 0, 1)), t, 0.5) * env(len(t), 0.025)
    add(drums, start, s, 0.6 * vel)


def hat(start, vel=1.0, open_=False):
    d = 0.18 if open_ else 0.04
    t = t_axis(d)
    s = chip_noise(d, 40000) * env(len(t), 0.06 if open_ else 0.012)
    add(drums, start, eq(s, hp=6000), 0.35 * vel)


def tom(start, midi=50, vel=1.0):
    t = t_axis(0.18)
    s = triangle(hz(midi + 14 * np.exp(-t / 0.03)), t) * env(len(t), 0.08)
    add(drums, start, s, 0.9 * vel)


# ------------------------------------------------------------------ temas
def seq(*bars):
    """Cada compasso: 8 colcheias. "." segura a nota anterior, "-" é pausa."""
    out = []
    for b in bars:
        toks = b.split()
        assert len(toks) == 8, b
        out += toks
    return out


THEMES = {
    # heroico, em Dó maior: C · G · Am · F
    "main": dict(
        mel=seq("C5 . E5 G5 . E5 G5 C6", "B5 . A5 G5 . D5 G5 B5",
                "C6 . B5 A5 . E5 A5 C6", "D6 . C6 A5 F5 . G5 ."),
        chords=[("C4", "E4", "G4"), ("B3", "D4", "G4"), ("C4", "E4", "A4"), ("C4", "F4", "A4")],
        roots=["C3", "G2", "A2", "F2"]),
    # vilão, Lá menor harmônico: Am · Bb · E · Am
    "villain": dict(
        mel=seq("A4 . C5 E5 . D#5 E5 .", "F5 . D5 Bb4 . A4 Bb4 .",
                "G#4 . B4 E5 . F5 E5 D5", "C5 . B4 A4 . - E4 ."),
        chords=[("A3", "C4", "E4"), ("Bb3", "D4", "F4"), ("G#3", "B3", "E4"), ("A3", "C4", "E4")],
        roots=["A2", "Bb2", "E2", "A2"]),
    # meio-tempo triste: Am · F · Dm · E
    "half": dict(
        mel=seq("A4 . . . C5 . B4 .", "A4 . . . F4 . . .",
                "D5 . . . C5 . A4 .", "G#4 . . . B4 . . ."),
        chords=[("A3", "C4", "E4"), ("A3", "C4", "F4"), ("A3", "D4", "F4"), ("G#3", "B3", "E4")],
        roots=["A2", "F2", "D2", "E2"]),
    # tensão segurando a dominante (Sol)
    "hold": dict(
        mel=seq("- - - - - - - -"),
        chords=[("G3", "B3", "D4", "F4")],
        roots=["G2"]),
}
for th in THEMES.values():
    th["mel"] = [None if x == "-" else ("." if x == "." else note(x)) for x in th["mel"]]
    th["chords"] = [[note(n) for n in c] for c in th["chords"]]
    th["roots"] = [note(r) for r in th["roots"]]


G0 = 1.0  # todas as cenas compartilham a mesma grade de tempo


def groove(a, b, theme="main", anchor=None, drums_style="std", tr=0, vel=1.0,
           duty=0.25, melody=True):
    """Toca o tema em [a, b) sobre a grade global, sem recomeçar o pulso nas
    trocas de cena. `anchor` (início da cena) marca o compasso 1 do tema."""
    anchor = a if anchor is None else anchor
    play_segments.append((a, b))
    th = THEMES[theme]
    mel, nbars = th["mel"], len(th["chords"])
    ak = int(round((anchor - G0) / E8))
    k0 = int(np.ceil((a - G0) / E8 - 1e-6))
    k1 = int(np.ceil((b - G0) / E8 - 1e-6))
    end = G0 + k1 * E8  # notas emendam na próxima colcheia da grade
    for k in range(k0, k1):
        t = G0 + k * E8
        rel = k - ak
        bar = (rel // 8) % nbars
        pos = rel % 8
        # melodia: soma as colcheias seguradas
        m = mel[rel % len(mel)]
        if melody and m not in (None, "."):
            ln = 1
            while ln < 8 and mel[(rel + ln) % len(mel)] == ".":
                ln += 1
            lead_note(t, m + tr, min(ln * E8, end - t), duty=duty, vel=vel,
                      vib=0.25 if ln >= 3 else 0)
        # arpejo em colcheias
        arp_chord(t, [c + tr for c in th["chords"][bar]], E8, vel=0.8 * vel)
        # baixo pulando oitava
        r = th["roots"][bar] + tr + (12 if pos % 2 else 0)
        bass_note(t, r, E8 * 0.9, vel)
        if drums_style == "std":
            if pos in (0, 3, 4):
                kick(t, vel)
            if pos in (2, 6):
                snare(t, vel)
            hat(t, 1.0 if pos % 2 == 0 else 0.6)
        elif drums_style == "half":
            if pos in (0, 5):
                kick(t, vel)
            if pos == 4:
                snare(t, vel)
            if pos % 2 == 0:
                hat(t, 0.8)
        elif drums_style == "drive":
            kick(t, 0.8 * vel)
            if pos in (2, 6):
                snare(t, 0.8 * vel)
            hat(t, 0.6)


def hit(t, chord, ring=0.3, vel=1.0):
    """Acento da banda inteira."""
    play_segments.append((t, t + ring))
    arp_chord(t, chord, ring, vel=vel)
    lead_note(t, max(chord) + 12, ring, duty=0.5, vel=0.7 * vel)
    bass_note(t, min(chord) - 12, ring, vel)
    kick(t, vel)


def accent(t, midi, dur=0.3, vel=1.0):
    """Acento por cima da música (nota de destaque + bumbo), sem parar a base."""
    lead_note(t, midi, dur, duty=0.5, vel=0.8 * vel)
    kick(t, vel)


# -------------------------------------------------------------------- SFX
def jingle(start, notes, step, duty=0.5, vel=1.0, last=None, vib=0.0):
    for i, m in enumerate(notes):
        d = (last if (last and i == len(notes) - 1) else step)
        t = t_axis(d)
        mm = np.full_like(t, float(m))
        if vib and i == len(notes) - 1:
            mm += vib * np.sin(2 * np.pi * 7 * t)
        add(sfx, start + i * step, pulse(hz(mm), t, duty) * env(len(t), d * 0.8, 0.4), 0.5 * vel)


def sweep(start, m0, m1, dur, duty=0.5, vel=1.0, wobble=0.0):
    t = t_axis(dur)
    m = np.linspace(m0, m1, len(t)) + wobble * np.sin(2 * np.pi * 12 * t)
    add(sfx, start, pulse(hz(m), t, duty) * env(len(t), dur, 0.6), 0.45 * vel)


def coin(start):
    jingle(start, [note("B5"), note("E6")], 0.07, last=0.4)


def power_up(start, base=note("C5"), vel=1.0):
    seq_ = [base + x for x in (0, 4, 7, 12, 4, 7, 12, 16, 7, 12, 16, 19)]
    jingle(start, seq_, 0.035, duty=0.25, vel=vel, last=0.15)


def glitch(start):
    """Equivalente 8-bit do arranhão de disco: o som "trava" e despenca."""
    d = 0.35
    t = t_axis(d)
    m = 84 - 50 * (t / d) ** 0.6
    s = pulse(hz(m), t, 0.5) * (np.floor(t * 40) % 2)
    add(sfx, start, s * env(len(t), 0.2), 0.45)


def lose(start, notes=("B4", "A#4", "A4", "G#4"), step=0.3, last=0.8):
    """O "wah-wah-wah-wahhh" de perder vida."""
    jingle(start, [note(n) for n in notes], step, duty=0.5, last=last, vib=0.4)


def stamp(start):
    t = t_axis(0.25)
    s = triangle(hz(40 - 12 * np.clip(t / 0.08, 0, 1)), t) * env(len(t), 0.1)
    s += 0.5 * pulse(hz(52), t, 0.5) * env(len(t), 0.02)
    add(sfx, start, s, 0.9)


def scribble(start, dur=0.48):
    t = t_axis(dur)
    m = 86 + 6 * np.sin(2 * np.pi * 9 * t)  # "zigue-zague" da caneta
    s = pulse(hz(m), t, 0.125) * (np.sin(2 * np.pi * 16 * t) > -0.2)
    add(sfx, start, s * env(len(t), 1.0, 0.8), 0.3)


def alarm(start, dur=1.0):
    t = t_axis(dur)
    m = np.where((t * 4) % 1 < 0.5, note("A5"), note("E5"))
    add(sfx, start, pulse(hz(m), t, 0.5) * env(len(t), 2, 0.9), 0.3)


def deflate(start, dur):
    t = t_axis(dur)
    m = 72 - 26 * (t / dur) + 1.5 * np.sin(2 * np.pi * 11 * t)
    add(sfx, start, pulse(hz(m), t, 0.125) * env(len(t), dur, 0.7), 0.4)


def blip(start, midi, vel=1.0):
    jingle(start, [midi, midi + 12], 0.04, duty=0.25, vel=vel, last=0.12)


# ================================================================ ARRANJO
CH = {k: [note(n) for n in v] for k, v in {
    "C": ("C4", "E4", "G4"), "G": ("G3", "B3", "D4"), "Am": ("A3", "C4", "E4"),
    "E": ("G#3", "B3", "E4"), "F": ("F3", "A3", "C4"), "Dm": ("D4", "F4", "A4"),
    "Em": ("E4", "G4", "B4"), "Bb": ("Bb3", "D4", "F4"), "D": ("D4", "F#4", "A4"),
}.items()}

# A música é contínua de 1,0 s até o fade: os efeitos e acentos entram por
# cima, sem paradas.

# 0,0–3,5 · Abertura: "start" + logo + 4 linhas do título
jingle(0.0, [note("C6"), note("G6")], 0.025, duty=0.125, vel=0.7)
hit(0.05, CH["C"], ring=0.18)
for i, (t, c) in enumerate(zip((0.25, 0.41, 0.57, 0.73), ("C", "F", "G", "C"))):
    hit(t, [x + (12 if i == 3 else 0) for x in CH[c]], ring=0.14)
groove(1.0, 8.5, "main")

# 3,5–8,5 · Clube do 4–0
for i, t in enumerate(np.linspace(4.4, 5.05, 6)):
    tom(t, 55 - 2 * i, 0.6)
glitch(6.9)

# 8,5–14,5 · Ladrão de Vitórias (vilão + solo)
groove(8.5, 10.1, "villain", anchor=8.5, vel=0.9)
groove(10.1, 11.9, "villain", anchor=8.5, vel=0.8, melody=False)
scale = [note(n) for n in ("A5", "B5", "C6", "D6", "E6", "F6", "G#6", "A6")]
solo = scale + scale[::-1][1:] + [note(n) for n in ("C6", "E6", "A6", "C7", "B6", "G#6", "E6", "B6", "C7")]
step = 1.3 / len(solo)
for i, m in enumerate(solo):
    lead_note(10.1 + i * step, m, step, duty=0.125, vel=0.9)
lead_note(11.4, note("A6"), 0.5, duty=0.125, vib=0.5, slide_from=note("G#6"))
groove(11.9, 14.5, "villain", anchor=8.5, vel=0.9)
accent(11.9, note("A6"))
stamp(11.9)
coin(11.98)
coin(12.2)

# 14,5–20,5 · Pé-frio do Ano (meio-tempo)
groove(14.5, 20.5, "half", drums_style="half")
accent(16.0, note("A5"))
accent(16.6, note("E4"))  # o segundo, mais grave
lose(17.5)

# 20,5–26,0 · Dupla Personalidade
groove(20.5, 26.0, "main", anchor=20.5)
accent(21.3, note("C7"))  # agudo
accent(22.0, note("A4"))  # grave
scribble(23.0)

# 26,0–30,5 · Demônio de Folga (mais grave e mais áspero)
groove(26.0, 30.5, "villain", anchor=26.0, tr=-3, duty=0.5, vel=1.05)
alarm(27.2, 1.0)
glitch(28.2)

# 30,5–36,0 · Bola Murcha (base baixinha, sem melodia, para os efeitos aparecerem)
groove(30.5, 36.0, "half", anchor=30.5, drums_style="half", vel=0.6, melody=False)
deflate(31.7, 1.3)
bass_note(33.1, note("E3"), 0.3, 1.0)
bass_note(33.5, note("A2"), 0.45, 1.0)
lose(34.2, notes=("G4", "F#4", "F4"), step=0.28, last=0.55)
for t in (35.3, 35.5, 35.7):  # contagem 3-2-1
    blip(t, note("C5"), 0.8)
for i in range(4):
    snare(35.8 + i * 0.05, 0.5 + 0.15 * i)

# 36,0–41,5 · Fila do Rebaixamento (meio-tempo arrastado)
groove(36.0, 41.5, "half", drums_style="half", tr=-2)
for t in np.linspace(36.75, 37.5, 7):
    kick(t, 0.9)
accent(39.5, note("G4"))
stamp(39.5)

# 41,5–47,5 · Corda Bamba (breakdown: bumbo + baixo pulsando, crescendo)
play_segments.append((41.5, 44.5))
k0 = int(np.ceil((41.5 - G0) / E8))
k1 = int(np.ceil((44.5 - G0) / E8))
for k in range(k0, k1):
    t = G0 + k * E8
    p = (k - k0) / (k1 - k0)
    bass_note(t, note("E2") + (12 if k % 2 else 0), E8 * 0.9, 0.6 + 0.6 * p)
    arp_chord(t, CH["Em"], E8, vel=0.25 + 0.55 * p)
    if (k - k0) % 2 == 0 or t > 42.3:
        kick(t, 0.6 + 0.4 * p)
for i, t in enumerate(np.linspace(42.3, 43.2, 5)):
    blip(t, note("E5") + 2 * i, 0.6)
for i in range(10):  # rufo crescendo até o selo
    snare(43.8 + i * 0.07, 0.4 + 0.07 * i)
power_up(44.5)
groove(44.5, 47.5, "main", vel=1.05)

# 47,5–52,5 · Vote no Grupo (segura a dominante)
groove(47.5, 52.5, "hold", drums_style="drive")
for i, t in enumerate((48.4, 48.7, 49.0)):  # opções 1, 2, 3: blips de menu subindo
    blip(t, note("G5") + 2 * i, 1.0)
for i in range(6):
    tom(49.7 + i * 0.09, 62 - 3 * i, 0.9)

# 52,5–56,0 · Fim
groove(52.5, DUR, "main")
accent(53.4, note("C6"), dur=0.9)
tom(54.3, 57, 1.0)  # ba-
tom(54.45, 50, 1.0)  # -dum
kick(54.45, 0.8)
jingle(54.65, [note("E7"), note("B7")], 0.03, duty=0.125, vel=0.7)  # -tss
jingle(54.9, [note(n) for n in ("E6", "G6", "E7", "C7", "D7", "G7")], 0.06, duty=0.25, vel=0.6)

# ===================================================================== MIX
def gate():
    g = np.zeros(N)
    for a, b in play_segments:
        g[int(a * SR): int(min(b, DUR) * SR)] = 1
    k = int(0.003 * SR)
    return np.convolve(g, np.ones(k) / k, mode="same")


g = gate()
ld, ar, bs, dr = lead * g, arp * g, bass * g, drums * g
# eco curto no lead (ping-pong) para dar largura
dl = int(E8 * 1.5 * SR)
echo = np.zeros(N)
echo[dl:] = ld[:-dl]

L = 0.34 * ld + 0.12 * echo + 0.22 * ar * 1.2 + 0.5 * bs + 0.55 * dr + 0.6 * sfx
R = 0.34 * ld + 0.04 * echo + 0.22 * ar * 0.8 + 0.5 * bs + 0.55 * dr + 0.6 * sfx
# celular: tira subgrave e suaviza o chiado das ondas quadradas
L, R = (eq(x, hp=70, lp=11000) for x in (L, R))

fade = np.ones(N)
a = int(55.55 * SR)
fade[a:] = np.linspace(1, 0, N - a) ** 2
L, R = L * fade, R * fade

peak = max(np.abs(L).max(), np.abs(R).max())
out = np.stack([L, R], axis=1) / peak * 0.7
pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")

path = sys.argv[1] if len(sys.argv) > 1 else "trilha.wav"
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"{path}: {N / SR:.3f} s")
