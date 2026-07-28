"use client";

import { useCallback, useEffect } from "react";
import type { MatterType } from "@/lib/resonaui/types";

const SCALES: Record<MatterType, { root: number; steps: number[] }> = {
  glass: { root: 392, steps: [0, 2, 4, 7, 9, 12, 14, 16, 19] },
  liquid: { root: 196, steps: [0, 3, 5, 7, 10, 12, 15, 17, 19] },
  bloom: { root: 261.63, steps: [0, 4, 7, 11, 12, 14, 16, 19, 23] }
};

type Voice = {
  matter: MatterType;
  oscillators: OscillatorNode[];
  ratios: number[];
  lfos: OscillatorNode[];
  amp: GainNode;
  filter: BiquadFilterNode;
  released: boolean;
};

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function frequencyFor(
  matter: MatterType,
  vertical01: number,
  continuous: boolean
): number {
  const scale = SCALES[matter];
  const v = clamp01(1 - vertical01);
  const scaled = v * (scale.steps.length - 1);
  let semitone: number;
  if (continuous) {
    const low = Math.floor(scaled);
    const high = Math.min(scale.steps.length - 1, low + 1);
    const blend = scaled - low;
    semitone = scale.steps[low] + (scale.steps[high] - scale.steps[low]) * blend;
  } else {
    semitone = scale.steps[Math.round(scaled)];
  }
  return scale.root * Math.pow(2, semitone / 12);
}

class GestureInstrument {
  private ctx: AudioContext | null = null;
  private destination: GainNode | null = null;
  private voices = new Map<string, Voice>();

  private ensure() {
    if (this.ctx && this.destination) return this.ctx;
    const Ctor =
      window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const destination = ctx.createGain();
    destination.gain.value = 0.64;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -5;
    limiter.knee.value = 8;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.22;
    destination.connect(limiter).connect(ctx.destination);
    this.ctx = ctx;
    this.destination = destination;
    return ctx;
  }

  async enable() {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === "running";
  }

  private spawn(
    id: string,
    matter: MatterType,
    vertical01: number,
    velocity: number
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.destination) return false;
    this.stop(id, 0.04);

    const now = ctx.currentTime;
    const frequency = frequencyFor(matter, vertical01, true);
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const oscillators: OscillatorNode[] = [];
    const ratios: number[] = [];
    const lfos: OscillatorNode[] = [];
    const loudness = 0.14 + clamp01(velocity) * 0.18;

    const addOsc = (
      type: OscillatorType,
      ratio: number,
      gain = 1,
      detune = 0
    ) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency * ratio;
      oscillator.detune.value = detune;
      const partial = ctx.createGain();
      partial.gain.value = gain;
      oscillator.connect(partial).connect(filter);
      oscillators.push(oscillator);
      ratios.push(ratio);
    };

    let attack = 0.06;
    if (matter === "glass") {
      filter.type = "highpass";
      filter.frequency.value = 190;
      filter.Q.value = 0.7;
      attack = 0.018;
      addOsc("sine", 1, 1);
      addOsc("sine", 2.01, 0.24);
      addOsc("triangle", 3, 0.1);
    } else if (matter === "liquid") {
      filter.type = "lowpass";
      filter.frequency.value = 760;
      filter.Q.value = 5.2;
      attack = 0.11;
      addOsc("sine", 1, 1);
      addOsc("sine", 1.006, 0.52);
      addOsc("triangle", 0.5, 0.24);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.28;
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(filter.frequency);
      lfos.push(lfo);
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 1550;
      filter.Q.value = 1.1;
      attack = 0.18;
      [1, 5 / 4, 3 / 2, 9 / 4].forEach((ratio) =>
        addOsc("sawtooth", ratio, 0.19, (Math.random() - 0.5) * 7)
      );
    }

    filter.connect(amp).connect(this.destination);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(loudness, now + attack);
    oscillators.forEach((oscillator) => oscillator.start(now));
    lfos.forEach((lfo) => lfo.start(now));

    this.voices.set(id, {
      matter,
      oscillators,
      ratios,
      lfos,
      amp,
      filter,
      released: false
    });
    return true;
  }

  start(id: string, matter: MatterType, vertical01: number, velocity = 0.8) {
    return this.spawn(id, matter, vertical01, velocity);
  }

  tap(matter: MatterType, vertical01: number, velocity = 0.72) {
    const id = `tap-${performance.now()}-${Math.random()}`;
    const ok = this.spawn(id, matter, vertical01, velocity);
    if (ok) window.setTimeout(() => this.stop(id, 0.42), 90);
    return ok;
  }

  glide(
    id: string,
    matter: MatterType,
    vertical01: number,
    motion = 0.5
  ) {
    const voice = this.voices.get(id);
    const ctx = this.ctx;
    if (!voice || !ctx || voice.released) return;
    const target = frequencyFor(matter, vertical01, true);
    const now = ctx.currentTime;
    const seconds = 0.035 + (1 - clamp01(motion)) * 0.11;
    voice.oscillators.forEach((oscillator, index) => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setValueAtTime(
        Math.max(1, oscillator.frequency.value),
        now
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, target * voice.ratios[index]),
        now + seconds
      );
    });
    const tone = matter === "glass" ? 260 : matter === "liquid" ? 650 : 1350;
    voice.filter.frequency.cancelScheduledValues(now);
    voice.filter.frequency.setTargetAtTime(
      tone + clamp01(motion) * (matter === "glass" ? 900 : 1250),
      now,
      0.05
    );
  }

  stop(id: string, tail = 0.72) {
    const voice = this.voices.get(id);
    const ctx = this.ctx;
    if (!voice || !ctx || voice.released) return;
    voice.released = true;
    const now = ctx.currentTime;
    const release = Math.max(0.04, tail);
    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setValueAtTime(Math.max(0.0001, voice.amp.gain.value), now);
    voice.amp.gain.exponentialRampToValueAtTime(0.0001, now + release);
    const stopAt = now + release + 0.05;
    voice.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop(stopAt);
      } catch {
        /* already stopped */
      }
    });
    voice.lfos.forEach((lfo) => {
      try {
        lfo.stop(stopAt);
      } catch {
        /* already stopped */
      }
    });
    this.voices.delete(id);
    window.setTimeout(() => {
      try {
        voice.amp.disconnect();
        voice.filter.disconnect();
      } catch {
        /* noop */
      }
    }, (release + 0.25) * 1000);
  }

  stopAll() {
    [...this.voices.keys()].forEach((id) => this.stop(id, 0.18));
  }
}

let singleton: GestureInstrument | null = null;
function getInstrument() {
  if (!singleton) singleton = new GestureInstrument();
  return singleton;
}

export function useGestureInstrument() {
  const instrument = getInstrument();
  const enable = useCallback(() => instrument.enable(), [instrument]);
  const start = useCallback(
    (id: string, matter: MatterType, vertical01: number, velocity?: number) =>
      instrument.start(id, matter, vertical01, velocity),
    [instrument]
  );
  const tap = useCallback(
    (matter: MatterType, vertical01: number, velocity?: number) =>
      instrument.tap(matter, vertical01, velocity),
    [instrument]
  );
  const glide = useCallback(
    (
      id: string,
      matter: MatterType,
      vertical01: number,
      motion?: number
    ) => instrument.glide(id, matter, vertical01, motion),
    [instrument]
  );
  const stop = useCallback(
    (id: string, tail?: number) => instrument.stop(id, tail),
    [instrument]
  );

  useEffect(() => () => instrument.stopAll(), [instrument]);

  return { enable, start, tap, glide, stop, stopAll: () => instrument.stopAll() };
}
