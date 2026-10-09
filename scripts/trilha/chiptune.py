"""Motor de trilhas 8-bit (estilo game arcade/NES) para os vídeos curtos da KHC.

Padrões da casa, já aprovados:
- música contínua: nos selos de zoeira ela só abaixa (ducking) enquanto o
  efeito toca; `--com-paradas` troca por corte seco;
- sem pratos (crash/chimbal aberto);
- efeitos sem chiado: todos tonais (pulso/triângulo); ruído só na caixa e
  no chimbal fechado, curtos e baixos;
- som de cartucho: dois pulsos (melodia e acordes), triângulo no baixo;
- mix para celular: passa-alta 70 Hz, corte em ~6,5 kHz, -14 LUFS.

Cada vídeo tem um arquivo de arranjo (veja `semana5.py`) que cria um `Track`,
toca fases com `play()`, chama os efeitos nos tempos do briefing e termina
com `run(track)`, que exporta WAV/MP3 e, com `--video`, junta com o vídeo.
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 48000


# ------------------------------------------------------------------ notas
def note(name):
    """'C5', 'F#4', 'Bb3' → número MIDI."""
    pc = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    rest = name[1:]
    if rest[0] == "#":
        pc, rest = pc + 1, rest[1:]
    elif rest[0] == "b":
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def notes(names):
    return [note(n) for n in names.split()]


def hz(midi):
    return 440.0 * 2 ** ((np.asarray(midi, dtype=float) - 69) / 12)


def seq(*bars):
    """Melodia: cada compasso tem 8 colcheias. "." segura a nota, "-" é pausa."""
    out = []
    for b in bars:
        toks = b.split()
        assert len(toks) == 8, b
        out += [None if x == "-" else ("." if x == "." else note(x)) for x in toks]
    return out


def chords(*cs):
    return [notes(c) for c in cs]


# ------------------------------------------------------------------ fases
# Cada fase: melodia (4 compassos), acordes, fundamentais do baixo e estilos.
#   bass:  bounce | ostinato | march | sparse | waltz | pedal
#   drums: std | boss | march | fast | sparse | drive | none
# Todas as melodias são originais.
PHASES = {
    # abertura heroica, Dó maior
    "heroi": dict(
        mel=seq("C5 - G4 C5 E5 - G5 -", "A5 - G5 E5 F5 - D5 -",
                "E5 - C5 E5 G5 - C6 -", "B5 - G5 - D5 - G5 -"),
        ch=chords("E4 G4 C5", "F4 A4 C5", "E4 G4 C5", "D4 G4 B4"),
        roots=["C3", "F2", "C3", "G2"], bass="bounce", drums="std"),
    # chefão, Ré menor cromático
    "chefao": dict(
        mel=seq("D5 - D5 F5 E5 - C#5 -", "D5 - A4 - Bb4 - A4 -",
                "D5 - F5 A5 G#5 - A5 -", "Bb5 - A5 - C#5 - D5 -"),
        ch=chords("D4 F4 A4", "D4 F4 Bb4", "D4 F4 A4", "C#4 E4 A4"),
        roots=["D2", "Bb1", "D2", "A1"], bass="ostinato", drums="boss"),
    # castelo pomposo, Lá menor harmônico
    "castelo": dict(
        mel=seq("A4 . . E5 . . A5 .", "G#5 . . F5 . . E5 .",
                "F5 . . D5 . . B4 .", "C5 . B4 . A4 . . ."),
        ch=chords("A3 C4 E4", "G#3 B3 E4", "A3 D4 F4", "A3 C4 E4"),
        roots=["A2", "E2", "D2", "A2"], bass="march", drums="march", duty=0.25),
    # fase rápida e animada, Sol maior
    "rapida": dict(
        mel=seq("G5 A5 B5 D6 - B5 D6 -", "E6 D6 B5 G5 - A5 B5 -",
                "C6 B5 A5 G5 - E5 G5 -", "A5 - F#5 - D5 - G5 -"),
        ch=chords("D4 G4 B4", "E4 G4 B4", "E4 G4 C5", "D4 F#4 A4"),
        roots=["G2", "E2", "C3", "D3"], bass="bounce", drums="fast"),
    # subterrânea, grave e econômica, Mi menor
    "subterranea": dict(
        mel=seq("E4 - - E4 G4 - - -", "F#4 - - D4 - - - -",
                "E4 - - B3 D4 - - E4", "- - G4 - F#4 - D4 -"),
        ch=chords("E3 G3 B3", "D3 F#3 A3", "E3 G3 B3", "D3 F#3 A3"),
        roots=["E2", "D2", "E2", "D2"], bass="sparse", drums="sparse", duty=0.125),
    # aquática e molenga, Fá maior
    "aquatica": dict(
        mel=seq("C5 . . A4 . . F5 .", "E5 . . D5 . . C5 .",
                "Bb4 . . D5 . . F5 .", "E5 . . . C5 . . ."),
        ch=chords("F4 A4 C5", "E4 G4 C5", "F4 Bb4 D5", "E4 G4 C5"),
        roots=["F2", "C2", "Bb1", "C2"], bass="waltz", drums="none", duty=0.25, vib=0.35),
    # fase final tensa, Mi menor
    "final": dict(
        mel=seq("E5 - E5 - F#5 - G5 -", "A5 - G5 - F#5 - D#5 -",
                "E5 - G5 - B5 - C6 -", "B5 - A5 - G5 - F#5 -"),
        ch=chords("E4 G4 B4", "D#4 F#4 B4", "E4 G4 B4", "D#4 F#4 A4"),
        roots=["E2", "B1", "E2", "B1"], bass="pedal", drums="drive"),
    # saltitante de plataforma, Dó maior (a da semana 4)
    "plataforma": dict(
        mel=seq("G5 - E5 G5 - A5 G5 -", "F5 - A5 C6 - A5 F5 -",
                "D5 F5 - G5 - B5 D6 -", "C6 - G5 - E5 C5 - -"),
        ch=chords("E4 G4 C5", "F4 A4 C5", "D4 G4 B4", "E4 G4 C5"),
        roots=["C3", "F2", "G2", "C3"], bass="bounce", drums="std"),
    # meio-tempo triste, Lá menor
    "triste": dict(
        mel=seq("A4 . - C5 B4 . - -", "A4 . - F4 . . - -",
                "D5 . - C5 A4 . - -", "G#4 . - B4 E5 . - -"),
        ch=chords("A3 C4 E4", "A3 C4 F4", "A3 D4 F4", "G#3 B3 E4"),
        roots=["A2", "F2", "D2", "E2"], bass="march", drums="sparse"),
}


class Track:
    """Uma trilha de duração fixa sobre uma grade de colcheias.

    `grid` é o instante (s) de uma colcheia de referência, normalmente quando
    entra a melodia; as fases devem começar em tempos que caiam nessa grade.
    """

    def __init__(self, dur, bpm=150, grid=0.0, seed=0):
        self.dur = dur
        self.n = int(round(SR * dur))
        self.e8 = 60 / bpm / 2
        self.grid = grid
        self.rng = np.random.default_rng(seed)
        self.lead, self.harm, self.bass, self.drums, self.fx = (np.zeros(self.n) for _ in range(5))
        self.ducks = []  # trechos em que a música abaixa (ou corta, com paradas)

    # ------------------------------------------------------ síntese básica
    def _add(self, bus, start, sig, gain=1.0):
        i = int(round(start * SR))
        if i >= self.n:
            return
        j = min(self.n, i + len(sig))
        bus[i:j] += sig[: j - i] * gain

    @staticmethod
    def _t(dur):
        return np.arange(max(1, int(dur * SR))) / SR

    @staticmethod
    def _phase(freq, t):
        return np.cumsum(np.broadcast_to(np.asarray(freq, dtype=float), t.shape)) / SR

    def _pulse(self, freq, t, duty=0.5):
        return np.where(self._phase(freq, t) % 1.0 < duty, 1.0, -1.0)

    def _triangle(self, freq, t):
        p = self._phase(freq, t) % 1.0
        return np.round((4 * np.abs(p - 0.5) - 1) * 7.5) / 7.5  # 16 degraus

    def _noise(self, dur, rate):
        n = len(self._t(dur))
        idx = np.floor(np.arange(n) * rate / SR).astype(int)
        return self.rng.choice([-1.0, 1.0], size=idx[-1] + 1)[idx]

    @staticmethod
    def _env(n, decay, sustain=0.0, attack=0.002):
        t = np.arange(n) / SR
        e = sustain + (1 - sustain) * np.exp(-t / decay)
        a = int(attack * SR)
        if a:
            e[:a] *= np.linspace(0, 1, a)
        e = np.floor(e * 15) / 15  # volume em 16 níveis, como no chip
        k = min(n, int(0.004 * SR))
        e[-k:] *= np.linspace(1, 0, k)
        return e

    # ---------------------------------------------------------- instrumentos
    def lead_note(self, start, midi, dur, duty=0.5, vib=0.0, vel=1.0):
        t = self._t(dur)
        m = np.full_like(t, float(midi))
        if vib:
            m += vib * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.1) / 0.1, 0, 1)
        self._add(self.lead, start, self._pulse(hz(m), t, duty) * self._env(len(t), 0.35, 0.55), vel)

    def chord(self, start, midis, dur, duty=0.25, vel=1.0, speed=1 / 40):
        """Acorde "de cartucho": as notas se alternam muito rápido no 2º pulso."""
        t = self._t(dur)
        m = np.asarray(midis, dtype=float)[(np.floor(t / speed).astype(int)) % len(midis)]
        self._add(self.harm, start, self._pulse(hz(m), t, duty) * self._env(len(t), 0.2, 0.3), vel)

    def bass_note(self, start, midi, dur, vel=1.0):
        t = self._t(dur)
        s = self._triangle(hz(midi), t)
        k = min(len(t), int(0.004 * SR))
        s[-k:] *= np.linspace(1, 0, k)
        self._add(self.bass, start, s, vel)

    def kick(self, start, vel=1.0):
        t = self._t(0.15)
        s = self._triangle(hz(62 - 28 * np.clip(t / 0.06, 0, 1)), t) * self._env(len(t), 0.07)
        self._add(self.drums, start, s, vel)

    def snare(self, start, vel=1.0):
        t = self._t(0.12)
        self._add(self.drums, start, self._noise(0.12, 12000) * self._env(len(t), 0.035), 0.4 * vel)

    def hat(self, start, vel=1.0):
        t = self._t(0.03)
        self._add(self.drums, start, self._noise(0.03, 30000) * self._env(len(t), 0.008), 0.18 * vel)

    def hit(self, start, midis, dur=0.6, vel=1.0):
        """Acorde de destaque (abertura, último acorde)."""
        self.chord(start, midis, dur, duty=0.5, vel=1.1 * vel)
        self.lead_note(start, max(midis) + 12, dur, vib=0.3, vel=0.9 * vel)
        self.bass_note(start, min(midis) - 24, dur, 1.1 * vel)
        self.kick(start, vel)

    # ----------------------------------------------------------------- fases
    def play(self, a, b, phase, vel=1.0, melody=True):
        """Toca a fase em [a, b) sobre a grade (compasso 1 em `a`)."""
        ph = PHASES[phase] if isinstance(phase, str) else phase
        e8 = self.e8
        mel, nb = ph["mel"], len(ph["ch"])
        duty, vib = ph.get("duty", 0.5), ph.get("vib", 0.0)
        ka = int(round((a - self.grid) / e8))
        kb = int(round((b - self.grid) / e8))
        for k in range(ka, kb):
            t = self.grid + k * e8
            rel = k - ka
            bar, pos = (rel // 8) % nb, rel % 8
            m = mel[rel % len(mel)]
            if melody and m not in (None, "."):
                ln = 1
                while ln < 8 and mel[(rel + ln) % len(mel)] == ".":
                    ln += 1
                d = ln * e8 if ln > 1 else 0.7 * e8  # picado, a não ser que segure
                self.lead_note(t, m, min(d, b - t), duty=duty, vib=vib, vel=vel)
            ch, root = ph["ch"][bar], note(ph["roots"][bar])
            self._comp(t, pos, ph["bass"], ch, root, vel)
            self._beat(t, pos, ph["drums"], vel)

    def _comp(self, t, pos, style, ch, root, vel):
        e8 = self.e8
        if style == "waltz":
            self.chord(t, ch, e8, duty=0.125, vel=0.55 * vel)  # arpejo contínuo, "boiando"
        elif pos % 2:
            self.chord(t, ch, 0.6 * e8, vel=0.85 * vel)  # "tchá" no contratempo
        if style == "bounce" and pos % 2 == 0:
            self.bass_note(t, root + (0, 7, 12, 7)[pos // 2], 0.75 * e8, vel)
        elif style == "ostinato":
            self.bass_note(t, root + (12 if pos % 2 else 0), 0.8 * e8, vel)
        elif style in ("march", "waltz") and pos in (0, 3, 6):
            ln = 1.4 if style == "march" else 2.6
            self.bass_note(t, root + {0: 0, 3: 7, 6: 12}[pos], ln * e8, 0.9 * vel)
        elif style == "sparse" and pos in (0, 2, 3, 4, 6):
            self.bass_note(t, root + (7 if pos == 6 else 0), 0.5 * e8, 1.2 * vel)
        elif style == "pedal":
            for h in (0, 1):  # semicolcheias, tensão
                self.bass_note(t + h * e8 / 2, root + (12 if h else 0), 0.45 * e8, vel)

    def _beat(self, t, pos, style, vel):
        e8 = self.e8
        if style == "std":
            if pos in (0, 4):
                self.kick(t, 0.7 * vel)
            if pos in (2, 6):
                self.snare(t, vel)
            self.hat(t, 1.0 if pos % 2 == 0 else 0.5)
        elif style == "boss":
            if pos in (0, 3, 4, 7):
                self.kick(t, 0.8 * vel)
            if pos in (2, 6):
                self.snare(t, vel)
            self.hat(t, 0.8)
        elif style == "march":
            if pos in (0, 4):
                self.kick(t, 0.8 * vel)
            if pos in (2, 6, 7):
                self.snare(t, 0.8 * vel)
        elif style == "fast":
            if pos % 2 == 0:
                self.kick(t, 0.7 * vel)
            if pos in (2, 6):
                self.snare(t, vel)
            self.hat(t, 1.0)
            self.hat(t + e8 / 2, 0.5)
        elif style == "sparse":
            if pos in (0, 3):
                self.kick(t, 0.7 * vel)
            if pos == 4:
                self.snare(t, 0.6 * vel)
        elif style == "drive":
            self.kick(t, 0.6 * vel)
            if pos in (2, 6):
                self.snare(t, vel)
            self.hat(t + e8 / 2, 0.7)

    def duck(self, a, b):
        """Selo de zoeira: a música abaixa em [a, b) (ou corta, com paradas)."""
        self.ducks.append((a, b))

    # --------------------------------------------------------------- efeitos
    def jingle(self, start, midis, step, duty=0.5, vel=1.0, last=None, vib=0.0):
        for i, m in enumerate(midis):
            d = last if (last and i == len(midis) - 1) else step
            t = self._t(d)
            mm = np.full_like(t, float(m))
            if vib and i == len(midis) - 1:
                mm += vib * np.sin(2 * np.pi * 7 * t)
            s = self._pulse(hz(mm), t, duty) * self._env(len(t), d * 0.8, 0.4)
            self._add(self.fx, start + i * step, s, 0.5 * vel)

    def glide(self, start, m0, m1, dur, duty=0.5, vel=1.0, wobble=0.0):
        t = self._t(dur)
        m = np.linspace(m0, m1, len(t)) + wobble * np.sin(2 * np.pi * 12 * t)
        self._add(self.fx, start, self._pulse(hz(m), t, duty) * self._env(len(t), dur, 0.6), 0.45 * vel)

    def console_on(self, start=0.0):
        """Console ligando + "PRESS START"."""
        self.glide(start, note("C4"), note("C6"), 0.05, duty=0.125, vel=0.5)
        self.jingle(start, notes("G5 C6"), 0.025, duty=0.25, vel=0.6)

    def blip(self, start, midi, vel=1.0):
        self.jingle(start, [midi, midi + 12], 0.035, duty=0.25, vel=vel, last=0.1)

    def blips(self, a, b, count, base="C5", step=2, vel=0.7):
        """Bipes subindo, um por linha que entra na tela."""
        for i, t in enumerate(np.linspace(a, b, count)):
            self.blip(t, note(base) + step * i, vel)

    def coins(self, a, b, every=0.13):
        """Placar subindo: moedas sendo coletadas."""
        for i, t in enumerate(np.arange(a, b, every)):
            base = note("E6") + (i % 3) * 2
            self.jingle(t, [base, base + 5], 0.045, vel=0.6, last=0.16)

    def coin(self, start):
        self.jingle(start, notes("E6 A6"), 0.06, last=0.3)

    def power_up(self, start):
        seq_ = [note("C5") + x for x in (0, 4, 7, 12, 4, 7, 12, 16, 7, 12, 16, 19)]
        self.jingle(start, seq_, 0.03, duty=0.25, last=0.1)

    def death(self, start):
        """Morte do personagem: sobe, trava e despenca."""
        self.glide(start, note("A5"), note("D6"), 0.12, vel=0.9)
        self.jingle(start + 0.15, notes("C6 G5 E5 C5 G4"), 0.08, vel=0.9, last=0.2)

    def damage(self, start):
        t = self._t(0.3)
        s = self._pulse(hz(76 - 30 * t / 0.3), t) * (np.floor(t * 30) % 2)  # pisca
        self._add(self.fx, start, s * self._env(len(t), 0.25), 0.45)

    def defeat(self, start):
        self.jingle(start, notes("G4 F#4 F4 E4"), 0.18, last=0.5, vib=0.35)

    def star(self, start, dur=0.9):
        """Estrela de invencibilidade: arpejo brilhante girando."""
        t = self._t(dur)
        arp = np.array(notes("C6 E6 G6 C7"), dtype=float)
        m = arp[(np.floor(t / 0.035).astype(int)) % 4] + 2 * np.floor(t / 0.3)
        self._add(self.fx, start, self._pulse(hz(m), t, 0.25) * self._env(len(t), dur, 0.7), 0.35)

    def one_up(self, start):
        self.jingle(start, notes("E6 G6 E7 C7 D7 G7"), 0.07, duty=0.25, vel=0.9, last=0.15)

    def cricket(self, start, dur=0.3):
        """Grilo: silêncio constrangedor."""
        t = self._t(dur)
        gate = (np.sin(2 * np.pi * 30 * t) > 0) * (np.sin(2 * np.pi * 4 * t) > -0.3)
        s = self._pulse(hz(103), t) * gate
        self._add(self.fx, start, s * self._env(len(t), dur, 0.8), 0.18)

    def pause(self, start):
        self.jingle(start, notes("E6 C6 E6 C6"), 0.06, duty=0.125, vel=0.8)

    def bubbles(self, a, b):
        for i, t in enumerate(np.arange(a, b, 0.11)):
            m = note("C5") + 3 * (i % 4)
            self.glide(t, m, m + 12, 0.07, duty=0.25, vel=0.6)

    def deflate(self, start, dur=0.65):
        """Balão esvaziando."""
        t = self._t(dur)
        m = 74 - 26 * (t / dur) + 1.5 * np.sin(2 * np.pi * 11 * t)
        self._add(self.fx, start, self._pulse(hz(m), t, 0.125) * self._env(len(t), dur, 0.7), 0.42)

    def sad_trombone(self, start):
        self.jingle(start, notes("B4 A#4 A4 G#4"), 0.22, last=0.55, vib=0.4)

    def countdown(self, a, b):
        for i, t in enumerate(np.linspace(a, b, 4)):
            self.jingle(t, [note("A5") if i < 3 else note("A6")], 0.12, vel=0.8)

    def low_life(self, a, b):
        """Alarme de vida baixa."""
        for t in np.arange(a, b, 0.2):
            self.jingle(t, [note("B5")], 0.09, vel=0.55)

    def alarm(self, start, dur=1.0):
        t = self._t(dur)
        m = np.where((t * 4) % 1 < 0.5, note("A5"), note("E5"))
        self._add(self.fx, start, self._pulse(hz(m), t) * self._env(len(t), 2, 0.9), 0.3)

    def glitch(self, start):
        """Equivalente 8-bit do arranhão de disco, sem ruído."""
        t = self._t(0.35)
        s = self._pulse(hz(84 - 50 * (t / 0.35) ** 0.6), t) * (np.floor(t * 40) % 2)
        self._add(self.fx, start, s * self._env(len(t), 0.2), 0.45)

    def stamp(self, start):
        t = self._t(0.25)
        s = self._triangle(hz(40 - 12 * np.clip(t / 0.08, 0, 1)), t) * self._env(len(t), 0.1)
        s += 0.5 * self._pulse(hz(52), t) * self._env(len(t), 0.02)
        self._add(self.fx, start, s, 0.9)

    def scribble(self, start, dur=0.48):
        """Caneta riscando."""
        t = self._t(dur)
        m = 86 + 6 * np.sin(2 * np.pi * 9 * t)
        s = self._pulse(hz(m), t, 0.125) * (np.sin(2 * np.pi * 16 * t) > -0.2)
        self._add(self.fx, start, s * self._env(len(t), 1.0, 0.8), 0.3)

    def ba_dum_tss(self, start):
        self.bass_note(start, note("G3"), 0.12, 1.0)
        self.bass_note(start + 0.15, note("C3"), 0.15, 1.0)
        self.kick(start + 0.15, 0.8)
        self.jingle(start + 0.35, notes("E7 B7"), 0.03, duty=0.125, vel=0.7)

    def stage_clear(self, start):
        self.jingle(start, notes("C5 E5 G5 C6 E6 G6"), 0.05, duty=0.25, vel=0.9, last=0.1)

    def game_over(self, start):
        self.jingle(start, notes("C5 G4 E4 A4 B4 A4 G#4"), 0.1, vel=0.9, last=0.4, vib=0.3)

    def save_beep(self, start):
        self.jingle(start, notes("A6 E7"), 0.06, duty=0.125, vel=0.7, last=0.12)

    def warp(self, peak):
        """Transição: glissando de pulso baixinho (sem ruído), pico em `peak`."""
        pre, post = 0.35, 0.15
        t = self._t(pre + post)
        m = np.where(t < pre, 60 + 24 * (t / pre) ** 1.5, 84 - 20 * (t - pre) / post)
        shape = np.where(t < pre, 0.3 + 0.7 * t / pre, np.exp(-(t - pre) / 0.06))
        self._add(self.fx, peak - pre, self._pulse(hz(m), t, 0.125) * shape, 0.16)

    # ------------------------------------------------------------------- mix
    def mixdown(self, cuts=False, fade_from=None):
        n = self.n
        g = np.ones(n)
        for a, b in self.ducks:
            g[int(a * SR): int(b * SR)] = 0.0 if cuts else 0.35
        k = int((0.003 if cuts else 0.05) * SR)
        g = np.convolve(g, np.ones(k) / k, mode="same")
        ld, hm, bs, dr = self.lead * g, self.harm * g, self.bass * g, self.drums * g
        dl = int(self.e8 * 1.5 * SR)  # eco curto só à direita, para dar largura
        echo = np.zeros(n)
        echo[dl:] = ld[:-dl]
        L = 0.34 * ld + 0.25 * hm * 1.15 + 0.5 * bs + 0.5 * dr + 0.6 * self.fx
        R = 0.34 * ld + 0.10 * echo + 0.25 * hm * 0.85 + 0.5 * bs + 0.5 * dr + 0.6 * self.fx
        L, R = (_eq(x, hp=70, lp=6500) for x in (L, R))  # celular
        fade_from = self.dur - 0.45 if fade_from is None else fade_from
        a = int(fade_from * SR)
        fade = np.ones(n)
        fade[a:] = np.linspace(1, 0, n - a) ** 2
        out = np.stack([L * fade, R * fade], axis=1)
        return out / np.abs(out).max() * 0.7


def _eq(sig, hp=None, lp=None):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hp:
        g /= np.sqrt(1 + (hp / f) ** 4)
    if lp:
        g /= np.sqrt(1 + (f / lp) ** 4)
    return np.fft.irfft(spec * g, len(sig))


def _write_wav(path, stereo):
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def _loudnorm(src, dst, n, lufs):
    """Normalização EBU R128 em duas passadas, cortando no número exato de amostras."""
    import json

    target = f"I={lufs}:TP=-1.5:LRA=11"
    probe = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", src, "-af", f"loudnorm={target}:print_format=json",
         "-f", "null", "-"], capture_output=True, text=True, check=True).stderr
    m = json.loads(probe[probe.rindex("{"): probe.rindex("}") + 1])
    af = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
          f"offset={m['target_offset']}:linear=true,aresample={SR},atrim=end_sample={n}")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", af,
                    "-c:a", "pcm_s16le", dst], check=True)


def run(track, argv=None):
    """CLI comum dos arranjos.

    python3 scripts/trilha/<arranjo>.py SAIDA [--video VIDEO.mp4] [--com-paradas] [--lufs -14]

    Gera SAIDA.wav (duração exata) e SAIDA.mp3; com --video, também SAIDA.mp4
    com o áudio começando em 0,0 s (vídeo copiado, sem recomprimir).
    """
    argv = sys.argv[1:] if argv is None else argv
    out, video, cuts, lufs = "trilha", None, False, -14.0
    it = iter(argv)
    for a in it:
        if a == "--video":
            video = next(it)
        elif a == "--com-paradas":
            cuts = True
        elif a == "--lufs":
            lufs = float(next(it))
        else:
            out = os.path.splitext(a)[0]
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "raw.wav")
        _write_wav(raw, track.mixdown(cuts=cuts))
        _loudnorm(raw, out + ".wav", track.n, lufs)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out + ".wav",
                    "-c:a", "libmp3lame", "-b:a", "256k", out + ".mp3"], check=True)
    made = [out + ".wav", out + ".mp3"]
    if video:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", video,
                        "-i", out + ".wav", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest",
                        out + ".mp4"], check=True)
        made.append(out + ".mp4")
    print(f"{track.dur:.2f} s{' (com paradas)' if cuts else ''}: " + ", ".join(made))
