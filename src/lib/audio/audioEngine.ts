// RESONA audio engine — a single AudioContext with a master bus, a soft
// limiter, a synth bus (taps / drones per Matter) and an ambient bus (the
// default looping bed track). Designed to be created lazily and resumed on
// the first user gesture, as mobile browsers require.

import type { MatterType } from "@/lib/resonaui/types";
import { DefaultTrackPlayer } from "./defaultTrackPlayer";
import { pitchForMatter, playMatterVoice, type VoiceHandle } from "./synthPresets";

export type DefaultTrack = {
  id: string;
  label: string;
  url: string;
};

export const DEFAULT_TRACKS: DefaultTrack[] = [
  {
    id: "june21",
    label: "June 21",
    url: "/audio/defaults/June21.wav"
  }
];

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private synthBus: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private trackPlayer: DefaultTrackPlayer | null = null;
  private drone: VoiceHandle | null = null;
  private masterVolume = 0.8;

  /** Whether the context exists and is running. */
  get isReady(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** Create the audio graph lazily. Safe to call repeatedly. */
  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ||
      (window as WindowWithWebkitAudio).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    // Master gain → soft limiter → output. The limiter keeps taps + ambient
    // from ever clipping, even when many voices stack up.
    const master = ctx.createGain();
    master.gain.value = this.masterVolume;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    master.connect(limiter).connect(ctx.destination);

    const synthBus = ctx.createGain();
    synthBus.gain.value = 0.9;
    synthBus.connect(master);

    const ambientBus = ctx.createGain();
    ambientBus.gain.value = 1;
    ambientBus.connect(master);

    this.master = master;
    this.limiter = limiter;
    this.synthBus = synthBus;
    this.ambientBus = ambientBus;
    this.trackPlayer = new DefaultTrackPlayer(ctx, ambientBus);

    return ctx;
  }

  /** Unlock / resume audio after a user gesture. Returns true when running. */
  async enable(): Promise<boolean> {
    const ctx = this.ensure();
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === "running";
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  // ---- Synth (tap / drone) -------------------------------------------------

  /** Play a one-shot tap note for a matter. `vertical01` (0=top..1=bottom). */
  tap(matter: MatterType, vertical01: number, velocity = 0.7) {
    if (!this.ctx || !this.synthBus || this.ctx.state !== "running") return;
    // Top of screen = higher pitch, so invert.
    const freq = pitchForMatter(matter, 1 - vertical01);
    playMatterVoice({
      ctx: this.ctx,
      destination: this.synthBus,
      matter,
      freq,
      velocity
    });
  }

  /** Begin a sustained drone (long-press). Replaces any existing drone. */
  startDrone(matter: MatterType, vertical01: number, velocity = 0.7) {
    if (!this.ctx || !this.synthBus || this.ctx.state !== "running") return;
    this.stopDrone();
    const freq = pitchForMatter(matter, 1 - vertical01);
    this.drone = playMatterVoice({
      ctx: this.ctx,
      destination: this.synthBus,
      matter,
      freq,
      sustain: true,
      velocity
    });
  }

  stopDrone() {
    if (this.drone) {
      this.drone.release();
      this.drone = null;
    }
  }

  // ---- Ambient layer -------------------------------------------------------

  async playAmbient(url: string) {
    this.ensure();
    if (!this.trackPlayer) return;
    await this.trackPlayer.play(url);
  }

  stopAmbient() {
    this.trackPlayer?.stop();
  }

  setAmbientVolume(v: number) {
    this.trackPlayer?.setVolume(v);
  }

  isAmbientPlaying(): boolean {
    return this.trackPlayer?.isPlaying() ?? false;
  }
}

// Module-level singleton so every hook/component shares one AudioContext.
let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
