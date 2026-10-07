#!/usr/bin/env python3
"""Trilha sonora do vídeo "KHC Awards · Semana 4" (hard rock de arena, 105 BPM).

Tudo é sintetizado com numpy (guitarras, baixo, bateria e efeitos), seguindo
os tempos do briefing README-trilhaKHC. Gera um WAV estéreo 48 kHz com
exatamente 56,0 s; a normalização para -14 LUFS é feita depois com ffmpeg.

Uso: python3 scripts/trilha-semana4.py saida.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 56.0
N = int(SR * DUR)
BPM = 105
E8 = 60 / BPM / 2  # colcheia
rng = np.random.default_rng(4)


# ---------------------------------------------------------------- utilidades
def buf():
    return np.zeros(N)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def add(bus, start, sig, gain=1.0):
    i = int(round(start * SR))
    if i >= N:
        return
    j = min(N, i + len(sig))
    bus[i:j] += sig[: j - i] * gain


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def saw(freq, t, phase=0.0):
    ph = np.cumsum(np.broadcast_to(freq, t.shape)) / SR + phase if np.ndim(freq) else freq * t + phase
    return 2 * (ph % 1.0) - 1


def env_ad(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def fade_tail(sig, ms=8):
    k = min(len(sig), int(ms * SR / 1000))
    sig[-k:] *= np.linspace(1, 0, k)
    return sig


def eq(sig, hp=None, lp=None, peaks=(), order=2):
    """EQ de fase zero no domínio da frequência (passa-alta, passa-baixa, sinos)."""
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hp:
        g *= 1 / np.sqrt(1 + (hp / f) ** (2 * order))
    if lp:
        g *= 1 / np.sqrt(1 + (f / lp) ** (2 * order))
    for fc, db, q in peaks:
        g *= 10 ** (db / 20 * np.exp(-((np.log2(f / fc)) ** 2) * q * 2))
    return np.fft.irfft(spec * g, len(sig))


def noise(dur):
    return rng.standard_normal(int(dur * SR))


# ------------------------------------------------------------------ buses
gtr_open_L, gtr_open_R = buf(), buf()
gtr_mute_L, gtr_mute_R = buf(), buf()
lead = buf()
bass = buf()
drums = buf()
sfx = buf()


# --------------------------------------------------------------- guitarras
def power_chord(root, dur, voice_detune):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for iv, amp in ((0, 1.0), (7, 0.8), (12, 0.6)):
        f = hz(root + iv) * (1 + voice_detune)
        s += amp * (saw(f, t) + saw(f * 1.004, t, 0.3)) * 0.5
    return s


def guitar(start, root, dur, kind="open", vel=1.0):
    """kind: open (acorde soando), mute (palm mute curto)."""
    if kind == "mute":
        d = min(dur, 0.16)
        for bus, det in ((gtr_mute_L, -0.002), (gtr_mute_R, 0.002)):
            s = power_chord(root, d, det)[:]
            s *= env_ad(len(s), 0.002, 0.055)
            add(bus, start + (0.006 if bus is gtr_mute_R else 0), fade_tail(s), vel)
    else:
        for bus, det in ((gtr_open_L, -0.003), (gtr_open_R, 0.003)):
            s = power_chord(root, dur, det)
            e = env_ad(len(s), 0.003, 3.0) * 0.85 + 0.15
            s *= e
            add(bus, start + (0.008 if bus is gtr_open_R else 0), fade_tail(s, 15), vel)


def bass_note(start, root, dur, vel=1.0):
    t = t_axis(dur)
    f = hz(root - 12)
    s = 0.6 * saw(f, t) + 0.6 * np.sin(2 * np.pi * f * t)
    s *= env_ad(len(s), 0.004, 0.9) * 0.7 + 0.3
    add(bass, start, fade_tail(s, 10), vel)


def lead_note(start, midi, dur, vib=0.0, bend_from=None, vel=1.0):
    t = t_axis(dur)
    m = np.full_like(t, float(midi))
    if bend_from is not None:
        k = min(len(t), int(0.08 * SR))
        m[:k] = np.linspace(bend_from, midi, k)
    if vib:
        m += vib * np.sin(2 * np.pi * 6.0 * t) * np.clip(t / 0.15, 0, 1)
    f = hz(m)
    s = saw(f, t) + 0.5 * saw(f * 2.002, t)
    s *= env_ad(len(s), 0.004, 2.0) * 0.6 + 0.4
    add(lead, start, fade_tail(s, 10), vel)


# ---------------------------------------------------------------- bateria
def kick(start, vel=1.0):
    t = t_axis(0.35)
    f = 50 + 110 * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
    s += 0.35 * eq(noise(0.35), hp=1500) * np.exp(-t / 0.004)
    add(drums, start, s, 1.0 * vel)


def snare(start, vel=1.0):
    t = t_axis(0.3)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    nz = eq(noise(0.3), hp=1200, lp=9000, peaks=((4000, 4, 1),)) * np.exp(-t / 0.09)
    add(drums, start, 0.55 * body + 0.6 * nz, 0.8 * vel)


def hat(start, vel=1.0, open_=False):
    d = 0.3 if open_ else 0.06
    t = t_axis(d)
    s = eq(noise(d), hp=7000) * np.exp(-t / (0.12 if open_ else 0.018))
    add(drums, start, s, 0.22 * vel)


def crash(start, vel=1.0, dur=2.2):
    t = t_axis(dur)
    s = eq(noise(dur), hp=3500, peaks=((6000, 3, 1),)) * np.exp(-t / (dur / 3.5))
    add(drums, start, fade_tail(s, 30), 0.38 * vel)


def tom(start, pitch=110, vel=1.0):
    t = t_axis(0.35)
    f = pitch * (1 + 0.6 * np.exp(-t / 0.03))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
    s += 0.15 * eq(noise(0.35), hp=800, lp=5000) * np.exp(-t / 0.02)
    add(drums, start, s, 0.8 * vel)


def stick(start):
    t = t_axis(0.05)
    s = eq(noise(0.05), hp=2000, lp=8000, peaks=((3200, 10, 3),)) * np.exp(-t / 0.008)
    add(drums, start, s, 0.7)


# ------------------------------------------------------------------ riffs
# Cada passo é uma colcheia: (nota MIDI, tipo, duração em colcheias) ou None.
E, F, G, A, B, D, C, Bb = 40, 41, 43, 45, 47, 38, 48, 46
RIFFS = {
    "main": [(E, "mute", 1), (E, "mute", 1), (G, "open", 2), None, (E, "mute", 1),
             (A, "open", 2), None, (E, "mute", 1), (E, "mute", 1), (D + 12, "open", 2),
             None, (C, "open", 1), (B, "open", 1), (A, "open", 2), None],
    "villain": [(E, "mute", 1), (E, "mute", 1), (F, "open", 2), None, (E, "mute", 1),
                (E, "mute", 1), (Bb, "open", 2), None, (E, "mute", 1), (E, "mute", 1),
                (F, "open", 1), (E, "open", 1), (D + 12, "open", 2), None, (F, "open", 1)],
    "half": [(E, "open", 3), None, None, (E, "mute", 1), (G, "open", 2), None,
             (A, "open", 3), None, None, (E, "mute", 1), (G, "open", 1), (F, "open", 1)],
    "hold": [(B, "open", 8)] + [None] * 7,
    "chorus": [(E, "open", 2), None, (C, "open", 2), None, (D + 12, "open", 2), None,
               (B, "open", 1), (E, "mute", 1)],
}
for k in list(RIFFS):
    steps = RIFFS[k]
    RIFFS[k] = steps + [None] * (16 - len(steps)) if len(steps) < 16 else steps

play_segments = []  # (início, fim) em que a banda toca; usado pelo gate


def groove(a, b, riff="main", drums_style="rock", transpose=0, vel=1.0, crash_in=True,
           bass_on=True):
    """Toca o riff + bateria em [a, b), com a grade ancorada em `a`."""
    play_segments.append((a, b))
    steps = RIFFS[riff]
    n = int(np.floor((b - a) / E8 + 1e-6))
    for i in range(n):
        t = a + i * E8
        st = steps[i % len(steps)]
        if st:
            root, kind, ln = st
            dur = min(ln * E8, b - t)
            guitar(t, root + transpose, dur, kind, vel)
            if bass_on:
                bass_note(t, root + transpose, min(dur, E8 * (ln if kind == "open" else 1)), vel)
        elif bass_on and riff == "hold":
            bass_note(t, steps[0][0] + transpose, E8, 0.8 * vel)
        beat = i % 8  # posição no compasso (8 colcheias)
        if drums_style == "rock":
            if beat in (0, 4, 5):
                kick(t, vel)
            if beat in (2, 6):
                snare(t, vel)
            hat(t, 1.0 if i % 2 == 0 else 0.6)
        elif drums_style == "half":
            if beat in (0, 3):
                kick(t, vel)
            if beat == 4:
                snare(t, vel)
            if i % 2 == 0:
                hat(t, 0.9)
        elif drums_style == "hold":
            kick(t, 0.7 * vel)
            if beat in (2, 6):
                snare(t, 0.8 * vel)
            hat(t, 0.5, open_=(beat == 7))
    if crash_in:
        crash(a, vel)


def hit(t, root, vel=1.0, ring=0.45, cymbal=True):
    """Acento de banda inteira (stop)."""
    play_segments.append((t, t + ring))
    guitar(t, root, ring, "open", vel)
    bass_note(t, root, ring, vel)
    kick(t, vel)
    if cymbal:
        crash(t, 0.8 * vel, 1.2)


# -------------------------------------------------------------------- SFX
def feedback(start, dur, f0=2350):
    t = t_axis(dur)
    f = f0 * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR)
    e = np.clip(t / (dur * 0.7), 0, 1) ** 2
    add(sfx, start, fade_tail(s * e, 40), 0.28)


def whoosh(peak):
    """Whoosh + slide de guitarra, ~0,5 s com pico em `peak`."""
    pre, post = 0.38, 0.14
    d = pre + post
    t = t_axis(d)
    e = np.where(t < pre, (t / pre) ** 2, np.exp(-(t - pre) / 0.05))
    nz = noise(d)
    # varredura de filtro: mistura de bandas ponderada no tempo
    lo = eq(nz, hp=300, lp=1500)
    hi = eq(nz, hp=2500, lp=9000)
    mix = np.clip(t / pre, 0, 1)
    s = (lo * (1 - mix) + hi * mix) * e
    add(sfx, peak - pre, s, 0.5)
    # slide de guitarra descendo (pick slide)
    m = np.linspace(64, 40, len(t))
    f = hz(m)
    g = np.tanh(4 * (saw(f, t) + saw(f * 1.5, t))) * e
    add(sfx, peak - pre, eq(g, hp=200, lp=3500), 0.22)


def record_scratch(start):
    d = 0.42
    t = t_axis(d)
    # dois "puxões" de disco: ruído com ressonância de pitch varrendo
    sweep = np.concatenate([np.linspace(0, 1, len(t) // 2), np.linspace(1, 0.2, len(t) - len(t) // 2)])
    f = 300 + 2200 * sweep
    tone = saw(f, t) * 0.4
    nz = noise(d) * 0.6
    s = eq(tone + nz, hp=400, lp=6000, peaks=((1500, 6, 1),))
    e = np.exp(-((t - 0.12) / 0.09) ** 2) + 0.8 * np.exp(-((t - 0.3) / 0.07) ** 2)
    add(sfx, start, s * e, 0.55)


def sad_trombone(start, notes=(58, 57, 56, 55), step=0.38, last=0.9):
    t0 = start
    for i, m in enumerate(notes):
        d = last if i == len(notes) - 1 else step
        t = t_axis(d)
        mm = np.full_like(t, float(m))
        if i == len(notes) - 1:
            mm += 0.35 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.2, 0, 1)
            mm -= np.clip((t - d * 0.6) / (d * 0.4), 0, 1) * 1.5
        f = hz(mm)
        s = saw(f, t)
        # wah: ganho da banda de formante abrindo e fechando
        wah = 0.5 - 0.5 * np.cos(2 * np.pi * t / d)
        bright = eq(s, hp=600, lp=2500)
        dark = eq(s, lp=700)
        s = dark * (1 - wah) + bright * wah * 1.4
        e = np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.05, 0, 1)
        add(sfx, t0, s * e, 0.42)
        t0 += d


def cash_register(start):
    d = 0.9
    t = t_axis(d)
    clunk = eq(noise(0.08), lp=1500) * np.exp(-t_axis(0.08) / 0.015)
    add(sfx, start, clunk, 0.6)
    bell = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((2093, 1), (3136, 0.6), (4186, 0.4), (5274, 0.3)))
    add(sfx, start + 0.09, bell * np.exp(-t / 0.3), 0.22)


def stamp(start):
    t = t_axis(0.3)
    s = np.sin(2 * np.pi * np.cumsum(80 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07)
    s += 0.5 * eq(noise(0.3), lp=2500) * np.exp(-t / 0.02)
    add(sfx, start, s, 0.8)


def pen_scribble(start, dur=0.5):
    t = t_axis(dur)
    s = eq(noise(dur), hp=2500, lp=8000)
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * t + 2 * np.sin(2 * np.pi * 3 * t)))
    add(sfx, start, fade_tail(s * am * np.clip(t / 0.02, 0, 1), 20), 0.4)


def siren(start, dur=1.0):
    t = t_axis(dur)
    f = 900 + 350 * np.sin(2 * np.pi * 2.0 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * saw(f, t)
    e = np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
    add(sfx, start, s * e, 0.22)


def balloon(start, dur):
    t = t_axis(dur)
    f = 420 * (1 - 0.55 * t / dur) * (1 + 0.08 * np.sin(2 * np.pi * 9 * t))
    buzz = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR))
    hiss = eq(noise(dur), hp=1500, lp=7000) * 0.4
    s = eq(buzz, hp=200, lp=3000) * 0.8 + hiss
    e = np.clip(t / 0.05, 0, 1) * (1 - 0.5 * t / dur) * np.clip((dur - t) / 0.08, 0, 1)
    add(sfx, start, s * e, 0.4)


# ================================================================ ARRANJO
# 0,0–3,5 · Abertura
feedback(0.0, 0.25, 2500)
hit(0.05, E, 1.0, ring=0.18)
for i, t in enumerate((0.25, 0.41, 0.57, 0.73)):
    hit(t, (E, G, A, B)[i], 0.9, ring=0.13, cymbal=(i == 3))
groove(1.0, 3.5, "main")

# 3,5–8,5 · Clube do 4–0
groove(3.5, 6.9, "main")
for i, t in enumerate(np.linspace(4.4, 5.05, 6)):
    tom(t, 160 - i * 15, 0.7)
record_scratch(6.9)
groove(6.9 + 3 * E8, 8.5, "main", crash_in=True)

# 8,5–14,5 · Ladrão de Vitórias (vilão + solo)
groove(8.5, 11.9, "villain", vel=0.9)
solo = [76, 79, 81, 83, 84, 83, 81, 79, 81, 83, 86, 88, 86, 84, 83, 81,
        83, 84, 86, 88, 91, 88, 86, 88]
step = (11.4 - 10.1) / len(solo)
for i, m in enumerate(solo):
    lead_note(10.1 + i * step, m, step * 1.05, vel=0.9)
lead_note(11.4, 88, 0.5, vib=0.6, bend_from=86)
hit(11.9, E, 1.0, ring=0.6)
stamp(11.9)
cash_register(11.95)
groove(12.5, 14.5, "villain", vel=0.9, crash_in=False)

# 14,5–20,5 · Pé-frio do Ano (meio-tempo)
groove(14.5, 16.0, "half", drums_style="half")
hit(16.0, G, 0.9, ring=0.5)
hit(16.6, E - 5, 1.0, ring=0.8)  # segundo acento mais grave
sad_trombone(17.5)
groove(17.5 + 0.38 * 3 + 0.9 + 0.05, 20.5, "half", drums_style="half")
play_segments.append((16.6, 17.5))

# 20,5–26,0 · Dupla Personalidade
groove(20.5, 21.3, "main")
hit(21.3, E + 12, 0.9, ring=0.6)  # agudo
hit(22.0, E - 5, 1.0, ring=0.95)  # grave
pen_scribble(23.0, 0.48)
groove(24.0, 26.0, "main")

# 26,0–30,5 · Demônio de Folga (afinação mais grave, mais sujo)
groove(26.0, 28.2, "main", transpose=-2, vel=1.05)
siren(27.2, 1.0)
record_scratch(28.2)
groove(28.2 + 2 * E8, 30.5, "main", transpose=-2, vel=1.05, crash_in=True)

# 30,5–36,0 · Bola Murcha (banda para)
balloon(31.7, 1.3)
bass_note(33.1, E + 12, 0.35, 1.2)
bass_note(33.5, E + 7, 0.5, 1.2)
play_segments += [(33.1, 33.45), (33.5, 34.0)]
sad_trombone(34.2, notes=(55, 54, 53), step=0.3, last=0.6)
play_segments.append((35.4, 36.0))
stick(35.43)
stick(35.71)
for i in range(4):
    snare(35.71 + i * E8 / 4 * 2, 0.6 + 0.1 * i)

# 36,0–41,5 · Fila do Rebaixamento (meio-tempo arrastado)
groove(36.0, 39.5, "half", drums_style="half", transpose=-2)
for t in np.linspace(36.75, 37.5, 7):
    kick(t, 0.8)
hit(39.5, D, 1.0, ring=0.55)
stamp(39.5)
groove(40.1, 41.5, "half", drums_style="half", transpose=-2, crash_in=False)

# 41,5–47,5 · Corda Bamba (breakdown)
play_segments.append((41.5, 44.5))
n = int((44.5 - 41.5) / E8)
for i in range(n):
    t = 41.5 + i * E8
    prog = i / n
    guitar(t, E, E8, "mute", 0.35 + 0.75 * prog)
    if i % 2 == 0 or t > 42.3:
        kick(t, 0.6 + 0.4 * prog)
for t in np.linspace(42.3, 43.2, 5):
    guitar(t, E, 0.1, "mute", 1.1)
    tom(t, 90, 0.5)
for i in range(8):  # rufo de caixa crescendo até o selo
    snare(43.95 + i * 0.07, 0.4 + 0.08 * i)
groove(44.5, 47.5, "main", vel=1.05)

# 47,5–52,5 · Vote no Grupo (segura um acorde)
groove(47.5, 48.4, "hold", drums_style="hold")
for i, (t, m) in enumerate(((48.4, B), (48.7, B + 2), (49.0, B + 4))):
    hit(t, m, 0.9 + 0.05 * i, ring=0.28, cymbal=(i == 2))
groove(49.3, 49.7, "hold", drums_style="hold", transpose=4, crash_in=False)
play_segments.append((49.7, 50.25))
for i in range(6):
    tom(49.7 + i * 0.085, 180 - i * 22, 0.8)
groove(50.25, 52.5, "hold", drums_style="hold", vel=1.0)

# 52,5–56,0 · Fim
groove(52.5, 53.4, "chorus")
hit(53.4, E, 1.1, ring=0.9)
play_segments.append((53.4, 54.3))
play_segments.append((54.3, DUR))
tom(54.3, 140, 0.9)
tom(54.42, 95, 1.0)
kick(54.42, 0.7)
crash(54.62, 0.9, 1.0)
hat(54.62, 2.0, open_=True)
feedback(54.9, 0.6, 2600)

# Transições
for p in (3.5, 8.5, 14.5, 20.5, 26.0, 30.5, 36.0, 41.5, 47.5, 52.5):
    whoosh(p)


# ===================================================================== MIX
def gate():
    """1 onde a banda toca, 0 nas paradas secas (corte de 3 ms)."""
    g = np.zeros(N)
    for a, b in play_segments:
        g[int(a * SR): int(min(b, DUR) * SR)] = 1
    k = int(0.003 * SR)
    ramp = np.ones(k) / k
    return np.convolve(g, ramp, mode="same")


def amp_sim(x, drive):
    x = eq(x, hp=110, peaks=((800, 3, 1),))
    x = np.tanh(drive * x)
    return eq(x, hp=90, lp=4800, peaks=((1800, 3, 1.2), (350, -3, 1)), order=3)


g = gate()
gOL = amp_sim(gtr_open_L, 6) * g
gOR = amp_sim(gtr_open_R, 6) * g
gML = eq(amp_sim(gtr_mute_L, 7), lp=2500) * g
gMR = eq(amp_sim(gtr_mute_R, 7), lp=2500) * g
ld = eq(np.tanh(5 * eq(lead, hp=300)), hp=400, lp=6000, peaks=((2500, 3, 1),))
ld_echo = np.zeros_like(ld)
dl = int(0.214 * SR)
ld_echo[dl:] = ld[:-dl] * 0.35
bs = eq(np.tanh(2.0 * bass), hp=55, lp=1400, peaks=((110, 2, 1), (700, 3, 1))) * g
dr = eq(drums, hp=45) * g

L = 0.55 * gOL + 0.35 * gML + 0.5 * bs + 0.7 * dr + 0.4 * (ld * 0.8 + ld_echo * 0.3) + 0.9 * sfx
R = 0.55 * gOR + 0.35 * gMR + 0.5 * bs + 0.7 * dr + 0.4 * (ld * 0.8 + ld_echo * 1.0) + 0.9 * sfx

# celular: corta subgrave e tira o excesso de graves
L = eq(L, hp=75, peaks=((150, -2, 1), (3000, 1.5, 1)), order=3)
R = eq(R, hp=75, peaks=((150, -2, 1), (3000, 1.5, 1)), order=3)

# fade para preto 55,55–56,0
fade = np.ones(N)
a = int(55.55 * SR)
fade[a:] = np.linspace(1, 0, N - a) ** 2
L *= fade
R *= fade

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.7, R / peak * 0.7
out = np.stack([L, R], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")

path = sys.argv[1] if len(sys.argv) > 1 else "trilha.wav"
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"{path}: {N / SR:.3f} s")
