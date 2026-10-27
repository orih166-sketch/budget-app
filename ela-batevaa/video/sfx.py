"""Synthesizes the sound-effects track (soft clicks, whooshes, chime) from events.json.
Usage: python3 sfx.py events.json out.wav"""
import json
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def click():
    n = int(SR * 0.05)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 140)
    tick = rng.standard_normal(n) * np.exp(-t * 600) * 0.5
    return (body * 0.55 + tick) * 0.5


def tick():
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 38) * 0.16


def whoosh():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # sweep a one-pole low-pass from dark to bright and back
    cut = 0.02 + 0.25 * np.sin(np.pi * t / t[-1]) ** 2
    out = np.zeros(n)
    y = 0.0
    for i in range(n):
        y += cut[i] * (noise[i] - y)
        out[i] = y
    env = np.sin(np.pi * t / t[-1]) ** 1.5
    return out * env * 0.55


def chime():
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f, d, a in ((659.25, 0.0, 1.0), (783.99, 0.12, 0.8), (987.77, 0.24, 0.7)):
        k = int(d * SR)
        tt = t[: n - k]
        s[k:] += a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.2)
    return s * 0.12


SOUNDS = {'click': click(), 'tick': tick(), 'whoosh': whoosh(), 'chime': chime()}


def main():
    data = json.load(open(sys.argv[1]))
    total = data['total']
    mix = np.zeros(int(SR * (total + 1)))
    for e in data['events']:
        snd = SOUNDS[e['kind']]
        k = int(e['t'] * SR)
        end = min(len(mix), k + len(snd))
        mix[k:end] += snd[: end - k]
    peak = np.max(np.abs(mix)) or 1
    mix = mix / peak * 0.6
    pcm = (mix[: int(SR * total)] * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main()
