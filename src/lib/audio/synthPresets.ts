// Synth presets — one voice factory per Matter. Pure Web Audio API, no
// external libraries. Each preset builds an oscillator stack + filter +
// amplitude envelope and routes it into a provided destination node.
//
// Voices are intentionally short-lived: build nodes, schedule an envelope,
// stop and disconnect when done. A returned `release()` lets long-press
// (drone) voices be sustained then faded out on demand.

import type { MatterType } from "@/lib/resonaui/types";

export type MatterScale = {
  // Semitone offsets from the matter root, used to quantise tap pitch.
  steps: number[];
  // Root frequency (Hz) at the bottom of the playable range.
  root: number;
};

// Per-matter musical character. Glass = bright bell pentatonic, Liquid =
// soft minor-ish, Bloom = warm major add9 harmony.
export const matterScales: Record<MatterType, MatterScale> = {
  glass: { root: 392.0, steps: [0, 2, 4, 7, 9, 12, 14, 16, 19] }, // G major pentatonic, high
  liquid: { root: 196.0, steps: [0, 3, 5, 7, 10, 12, 15, 17, 19] }, // G minor pentatonic
  bloom: { root: 261.63, steps: [0, 4, 7, 11, 12, 14, 16, 19, 23] } // C maj7 add9 spread
};

/** Quantise a 0..1 vertical position to a frequency on the matter scale. */
export function pitchForMatter(matter: MatterType, vertical01: number): number {
  const scale = matterScales[matter];
  const v = Math.min(1, Math.max(0, vertical01));
  const idx = Math.round(v * (scale.steps.length - 1));
  const semitone = scale.steps[idx];
  return scale.root * Math.pow(2, semitone / 12);
}

export type VoiceHandle = {
  /** Fade out and stop. Safe to call once. */
  release: (when?: number) => void;
};

type VoiceOptions = {
  ctx: AudioContext;
  destination: AudioNode;
  matter: MatterType;
  freq: number;
  /** When true, the voice sustains until release() (long-press / drone). */
  sustain?: boolean;
  /** 0..1 overall loudness scaler (e.g. from level). */
  velocity?: number;
};

/**
 * Spawn a synth voice for the given matter. Returns a handle whose
 * `release()` fades the voice out. One-shot voices auto-release.
 */
export function playMatterVoice(opts: VoiceOptions): VoiceHandle {
  const { ctx, destination, matter, freq, sustain = false } = opts;
  const velocity = Math.min(1, Math.max(0, opts.velocity ?? 0.7));
  const now = ctx.currentTime;

  // Per-voice amplitude envelope node.
  const amp = ctx.createGain();
  amp.gain.value = 0;

  // Per-voice tone filter.
  const filter = ctx.createBiquadFilter();

  const oscillators: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];

  let attack = 0.012;
  let release = 0.6;
  let peak = 0.32 * (0.55 + velocity * 0.75);

  if (matter === "glass") {
    // Bright FM-ish bell: sine carrier + detuned sine + high triangle.
    filter.type = "highpass";
    filter.frequency.value = 220;
    attack = 0.004;
    release = sustain ? 1.4 : 1.1;
    peak = 0.32 * (0.55 + velocity * 0.78);

    const partials: Array<[OscillatorType, number, number]> = [
      ["sine", 1, 1],
      ["sine", 2.01, 0.34],
      ["triangle", 3.0, 0.16]
    ];
    for (const [type, mult, gain] of partials) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(filter);
      oscillators.push(o);
    }
  } else if (matter === "liquid") {
    // Soft lowpass pad with a slow filter LFO (water-like motion).
    filter.type = "lowpass";
    filter.frequency.value = 620 + velocity * 700;
    filter.Q.value = 6;
    attack = sustain ? 0.18 : 0.05;
    release = sustain ? 1.2 : 0.9;
    peak = 0.36 * (0.55 + velocity * 0.78);

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = freq;
    const b = ctx.createOscillator();
    b.type = "sine";
    b.frequency.value = freq * 1.005; // gentle detune shimmer
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = freq * 0.5;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    a.connect(filter);
    b.connect(filter);
    sub.connect(subGain).connect(filter);
    oscillators.push(a, b, sub);

    // Filter LFO
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.35;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfos.push(lfo);
  } else {
    // Bloom — warm chordal pad (root / 3rd / 5th / 9th) through a soft lowpass.
    filter.type = "lowpass";
    filter.frequency.value = 1400 + velocity * 900;
    filter.Q.value = 1.2;
    attack = sustain ? 0.32 : 0.12;
    release = sustain ? 1.8 : 1.4;
    peak = 0.28 * (0.55 + velocity * 0.72);

    const chord = [1, 5 / 4, 3 / 2, 9 / 4]; // root, maj3rd, 5th, 9th
    for (const ratio of chord) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq * ratio;
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g).connect(filter);
      oscillators.push(o);
    }
  }

  filter.connect(amp).connect(destination);

  // Amplitude envelope (attack → optional sustain → release).
  amp.gain.cancelScheduledValues(now);
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(peak, now + attack);
  if (!sustain) {
    amp.gain.exponentialRampToValueAtTime(
      0.0001,
      now + attack + release
    );
  } else {
    amp.gain.linearRampToValueAtTime(peak * 0.82, now + attack + 0.4);
  }

  const startAt = now;
  for (const o of oscillators) o.start(startAt);
  for (const l of lfos) l.start(startAt);

  let released = false;
  const stopAll = (when: number) => {
    for (const o of oscillators) {
      try {
        o.stop(when);
      } catch {
        /* already stopped */
      }
    }
    for (const l of lfos) {
      try {
        l.stop(when);
      } catch {
        /* already stopped */
      }
    }
    // Disconnect a little after the stop time to free nodes.
    window.setTimeout(
      () => {
        try {
          amp.disconnect();
          filter.disconnect();
        } catch {
          /* noop */
        }
      },
      Math.max(0, (when - ctx.currentTime) * 1000) + 200
    );
  };

  if (!sustain) {
    stopAll(now + attack + release + 0.05);
  }

  return {
    release: (when?: number) => {
      if (released) return;
      released = true;
      const t = when ?? ctx.currentTime;
      const tail = matter === "glass" ? 0.6 : 0.9;
      amp.gain.cancelScheduledValues(t);
      amp.gain.setValueAtTime(Math.max(0.0001, amp.gain.value), t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      stopAll(t + tail + 0.05);
    }
  };
}
