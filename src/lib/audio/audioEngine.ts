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

export type TransformSettings = {
  input: number;
  mix: number;
  reverb: number;
  tone: number;
  motion: number;
};

export type MicAnalysis = {
  level: number;
  pitch: number | null;
  pitchConfidence: number;
};

export type RecordedCapture = {
  blob: Blob;
  url: string;
  durationSeconds: number;
  mimeType: string;
};

export const DEFAULT_TRANSFORM_SETTINGS: TransformSettings = {
  input: 0.92,
  mix: 0.62,
  reverb: 0.36,
  tone: 0.62,
  motion: 0.58
};

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

type MicGraph = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  inputGain: GainNode;
  analyser: AnalyserNode;
  output: GainNode;
  nodes: AudioNode[];
  lfos: OscillatorNode[];
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function chooseRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac"
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function createSaturationCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const curve = new Float32Array(n);
  const drive = 1 + amount * 24;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

function createImpulse(
  ctx: AudioContext,
  matter: MatterType,
  settings: TransformSettings
): AudioBuffer {
  const lengthSeconds =
    matter === "glass" ? 0.75 + settings.reverb * 0.65 :
    matter === "liquid" ? 1.25 + settings.reverb * 1.05 :
    1.7 + settings.reverb * 1.8;
  const length = Math.max(1, Math.floor(ctx.sampleRate * lengthSeconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const brightness =
    matter === "glass" ? 0.95 :
    matter === "liquid" ? 0.56 :
    0.72;
  const decay =
    matter === "glass" ? 7.5 :
    matter === "liquid" ? 4.6 :
    3.2;

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const shimmer = Math.sin(t * Math.PI * (matter === "glass" ? 16 : 7));
      const noise = Math.random() * 2 - 1;
      const stereoTilt = channel === 0 ? 1 - t * 0.12 : 0.88 + t * 0.12;
      data[i] =
        noise *
        Math.pow(1 - t, decay) *
        (brightness + shimmer * 0.08) *
        stereoTilt;
    }
  }

  return buffer;
}

function analyzeVoiceFrame(
  buffer: Float32Array,
  sampleRate: number
): MicAnalysis {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / buffer.length);
  const level = clamp01((rms - 0.008) * 9.6);

  if (rms < 0.018) {
    return { level, pitch: null, pitchConfidence: 0 };
  }

  const minLag = Math.floor(sampleRate / 900);
  const maxLag = Math.min(Math.floor(sampleRate / 80), Math.floor(buffer.length / 2));
  let bestLag = 0;
  let best = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let energyA = 0;
    let energyB = 0;
    const limit = buffer.length - lag;
    for (let i = 0; i < limit; i++) {
      const a = buffer[i];
      const b = buffer[i + lag];
      corr += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const norm = corr / Math.sqrt(Math.max(energyA * energyB, 0.000001));
    if (norm > best) {
      best = norm;
      bestLag = lag;
    }
  }

  const confidence = clamp01((best - 0.42) * 1.7);
  const pitch = confidence > 0.14 && bestLag > 0 ? sampleRate / bestLag : null;
  return { level, pitch, pitchConfidence: confidence };
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private synthBus: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private micBus: GainNode | null = null;
  private mixDestination: MediaStreamAudioDestinationNode | null = null;
  private trackPlayer: DefaultTrackPlayer | null = null;
  private drone: VoiceHandle | null = null;
  private micGraph: MicGraph | null = null;
  private recorder: MediaRecorder | null = null;
  private captureChunks: Blob[] = [];
  private captureStartedAt = 0;
  private analysisFrame: number | null = null;
  private analysisBuffer: Float32Array<ArrayBuffer> | null = null;
  private masterVolume = 1;

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
    limiter.threshold.value = -4;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    master.connect(limiter).connect(ctx.destination);

    const mixDestination = ctx.createMediaStreamDestination();
    master.connect(mixDestination);

    const synthBus = ctx.createGain();
    synthBus.gain.value = 1.25;
    synthBus.connect(master);

    const ambientBus = ctx.createGain();
    ambientBus.gain.value = 1;
    ambientBus.connect(master);

    const micBus = ctx.createGain();
    micBus.gain.value = 0.42;
    micBus.connect(master);

    this.master = master;
    this.limiter = limiter;
    this.synthBus = synthBus;
    this.ambientBus = ambientBus;
    this.micBus = micBus;
    this.mixDestination = mixDestination;
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

  private unlockForGesture(): AudioContext | null {
    const ctx = this.ensure();
    if (ctx.state !== "running") {
      // Prime mobile browsers inside the same pointer gesture. The gain is
      // silent, but starting a source makes the first audible tap reliable.
      try {
        const primer = ctx.createOscillator();
        const silent = ctx.createGain();
        silent.gain.value = 0;
        primer.connect(silent).connect(ctx.destination);
        primer.start();
        primer.stop(ctx.currentTime + 0.03);
      } catch {
        /* best-effort unlock primer */
      }
      void ctx.resume().catch(() => {
        /* handled by the next user gesture */
      });
    }
    return ctx;
  }

  /** Play a one-shot tap note for a matter. `vertical01` (0=top..1=bottom). */
  tap(matter: MatterType, vertical01: number, velocity = 0.7) {
    const ctx = this.unlockForGesture();
    if (!ctx || !this.synthBus) return false;
    // Top of screen = higher pitch, so invert.
    const freq = pitchForMatter(matter, 1 - vertical01);
    playMatterVoice({
      ctx,
      destination: this.synthBus,
      matter,
      freq,
      velocity: Math.max(0.82, velocity)
    });
    return true;
  }

  /** Begin a sustained drone (long-press). Replaces any existing drone. */
  startDrone(matter: MatterType, vertical01: number, velocity = 0.7) {
    const ctx = this.unlockForGesture();
    if (!ctx || !this.synthBus) return false;
    this.stopDrone();
    const freq = pitchForMatter(matter, 1 - vertical01);
    this.drone = playMatterVoice({
      ctx,
      destination: this.synthBus,
      matter,
      freq,
      sustain: true,
      velocity: Math.max(0.82, velocity)
    });
    return true;
  }

  stopDrone() {
    if (this.drone) {
      this.drone.release();
      this.drone = null;
    }
  }

  // ---- Microphone / recording ---------------------------------------------

  get isMicActive(): boolean {
    return !!this.micGraph;
  }

  async startMic(
    matter: MatterType,
    settings: TransformSettings,
    onAnalysis?: (analysis: MicAnalysis) => void
  ): Promise<boolean> {
    const ctx = this.ensure();
    const ok = await this.enable();
    if (!ok || !this.micBus) return false;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone is not available in this browser.");
    }

    if (!this.micGraph) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const source = ctx.createMediaStreamSource(stream);
      const inputGain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      const output = ctx.createGain();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.18;
      source.connect(inputGain);
      inputGain.connect(analyser);
      output.connect(this.micBus);

      this.micGraph = {
        stream,
        source,
        inputGain,
        analyser,
        output,
        nodes: [source, inputGain, analyser, output],
        lfos: []
      };
    }

    this.setMicTransform(matter, settings);
    this.startAnalysis(onAnalysis);
    return true;
  }

  setMicTransform(matter: MatterType, settings: TransformSettings) {
    if (!this.ctx || !this.micGraph) return;
    const graph = this.micGraph;

    for (const lfo of graph.lfos) {
      try {
        lfo.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const node of graph.nodes) {
      if (node !== graph.source && node !== graph.inputGain && node !== graph.analyser && node !== graph.output) {
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
      }
    }

    graph.inputGain.disconnect();
    graph.output.disconnect();
    graph.inputGain.gain.setTargetAtTime(
      0.28 + clamp01(settings.input) * 1.7,
      this.ctx.currentTime,
      0.03
    );
    graph.output.gain.setTargetAtTime(
      0.08 + clamp01(settings.mix) * 0.42,
      this.ctx.currentTime,
      0.05
    );
    graph.inputGain.connect(graph.analyser);
    graph.output.connect(this.micBus as AudioNode);

    const chain = this.createMatterTransform(matter, settings, graph.output);
    graph.inputGain.connect(chain.input);
    graph.nodes = [graph.source, graph.inputGain, graph.analyser, graph.output, ...chain.nodes];
    graph.lfos = chain.lfos;
  }

  stopMic() {
    if (this.analysisFrame !== null) {
      window.cancelAnimationFrame(this.analysisFrame);
      this.analysisFrame = null;
    }
    this.analysisBuffer = null;

    if (!this.micGraph) return;
    for (const lfo of this.micGraph.lfos) {
      try {
        lfo.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const node of this.micGraph.nodes) {
      try {
        node.disconnect();
      } catch {
        /* noop */
      }
    }
    this.micGraph.stream.getTracks().forEach((track) => track.stop());
    this.micGraph = null;
  }

  async startCapture(
    matter: MatterType,
    settings: TransformSettings,
    onAnalysis?: (analysis: MicAnalysis) => void
  ): Promise<boolean> {
    const micOk = await this.startMic(matter, settings, onAnalysis);
    if (!micOk || !this.mixDestination) return false;

    if (typeof MediaRecorder === "undefined") {
      throw new Error("Audio recording is not supported in this browser.");
    }

    if (this.recorder && this.recorder.state !== "inactive") return true;

    const mimeType = chooseRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(this.mixDestination.stream, { mimeType })
      : new MediaRecorder(this.mixDestination.stream);

    this.captureChunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.captureChunks.push(event.data);
    };
    recorder.start(250);
    this.captureStartedAt = performance.now();
    this.recorder = recorder;
    return true;
  }

  stopCapture(): Promise<RecordedCapture | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(this.captureChunks, { type: mimeType });
        const durationSeconds = Math.max(
          1,
          Math.round((performance.now() - this.captureStartedAt) / 1000)
        );
        this.recorder = null;
        this.captureChunks = [];
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          durationSeconds,
          mimeType
        });
      };
      try {
        recorder.requestData();
      } catch {
        /* noop */
      }
      recorder.stop();
    });
  }

  private startAnalysis(onAnalysis?: (analysis: MicAnalysis) => void) {
    if (!this.ctx || !this.micGraph || !onAnalysis) return;
    if (!this.analysisBuffer) {
      this.analysisBuffer = new Float32Array(this.micGraph.analyser.fftSize);
    }

    const tick = () => {
      if (!this.ctx || !this.micGraph || !this.analysisBuffer) return;
      this.micGraph.analyser.getFloatTimeDomainData(this.analysisBuffer);
      onAnalysis(analyzeVoiceFrame(this.analysisBuffer, this.ctx.sampleRate));
      this.analysisFrame = window.requestAnimationFrame(tick);
    };

    if (this.analysisFrame !== null) window.cancelAnimationFrame(this.analysisFrame);
    this.analysisFrame = window.requestAnimationFrame(tick);
  }

  private createMatterTransform(
    matter: MatterType,
    settings: TransformSettings,
    destination: AudioNode
  ): { input: GainNode; nodes: AudioNode[]; lfos: OscillatorNode[] } {
    const ctx = this.ensure();
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const reverbWet = ctx.createGain();
    const convolver = ctx.createConvolver();
    const shaper = ctx.createWaveShaper();
    const lfos: OscillatorNode[] = [];

    dry.gain.value = 0.06 + (1 - clamp01(settings.mix)) * 0.24;
    wet.gain.value = 0.22 + clamp01(settings.mix) * 0.58;
    reverbWet.gain.value = clamp01(settings.reverb) * 0.46;
    convolver.buffer = createImpulse(ctx, matter, settings);
    shaper.curve = createSaturationCurve(matter === "liquid" ? 0.18 : 0.1);
    shaper.oversample = "2x";

    input.connect(dry).connect(destination);

    if (matter === "glass") {
      const highpass = ctx.createBiquadFilter();
      const sparkle = ctx.createBiquadFilter();
      const delay = ctx.createDelay(0.08);
      const feedback = ctx.createGain();
      const delayMix = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      highpass.type = "highpass";
      highpass.frequency.value = 160 + settings.tone * 220;
      sparkle.type = "peaking";
      sparkle.frequency.value = 2100 + settings.tone * 3600;
      sparkle.Q.value = 2.8;
      sparkle.gain.value = 5 + settings.tone * 7;
      delay.delayTime.value = 0.014 + settings.motion * 0.016;
      feedback.gain.value = 0.04 + settings.motion * 0.08;
      delayMix.gain.value = 0.08 + settings.motion * 0.12;
      lfo.frequency.value = 0.8 + settings.motion * 2.2;
      lfoGain.gain.value = 0.003 + settings.motion * 0.007;

      lfo.connect(lfoGain).connect(delay.delayTime);
      lfo.start();
      input.connect(highpass).connect(sparkle).connect(shaper).connect(wet).connect(destination);
      sparkle.connect(delay).connect(feedback).connect(delay);
      delay.connect(delayMix).connect(destination);
      sparkle.connect(convolver).connect(reverbWet).connect(destination);
      lfos.push(lfo);
      return {
        input,
        nodes: [input, dry, wet, reverbWet, convolver, shaper, highpass, sparkle, delay, feedback, delayMix, lfoGain],
        lfos
      };
    }

    if (matter === "liquid") {
      const lowpass = ctx.createBiquadFilter();
      const body = ctx.createBiquadFilter();
      const delay = ctx.createDelay(0.25);
      const feedback = ctx.createGain();
      const delayTone = ctx.createBiquadFilter();
      const delayMix = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lowpass.type = "lowpass";
      lowpass.frequency.value = 520 + settings.tone * 1700;
      lowpass.Q.value = 4 + settings.motion * 6;
      body.type = "peaking";
      body.frequency.value = 320 + settings.tone * 560;
      body.Q.value = 1.7;
      body.gain.value = 2.5;
      delay.delayTime.value = 0.055 + settings.motion * 0.11;
      feedback.gain.value = 0.08 + settings.motion * 0.16;
      delayTone.type = "lowpass";
      delayTone.frequency.value = 900 + settings.tone * 1600;
      delayMix.gain.value = 0.1 + settings.motion * 0.14;
      lfo.frequency.value = 0.18 + settings.motion * 0.75;
      lfoGain.gain.value = 90 + settings.motion * 520;

      lfo.connect(lfoGain).connect(lowpass.frequency);
      lfo.start();
      input.connect(lowpass).connect(body).connect(shaper).connect(wet).connect(destination);
      body.connect(delay).connect(delayTone).connect(feedback).connect(delay);
      delayTone.connect(delayMix).connect(destination);
      body.connect(convolver).connect(reverbWet).connect(destination);
      lfos.push(lfo);
      return {
        input,
        nodes: [input, dry, wet, reverbWet, convolver, shaper, lowpass, body, delay, feedback, delayTone, delayMix, lfoGain],
        lfos
      };
    }

    const highpass = ctx.createBiquadFilter();
    const warm = ctx.createBiquadFilter();
    const chorusA = ctx.createDelay(0.08);
    const chorusB = ctx.createDelay(0.1);
    const chorusGain = ctx.createGain();
    const lfoA = ctx.createOscillator();
    const lfoB = ctx.createOscillator();
    const lfoGainA = ctx.createGain();
    const lfoGainB = ctx.createGain();

    highpass.type = "highpass";
    highpass.frequency.value = 70;
    warm.type = "lowpass";
    warm.frequency.value = 850 + settings.tone * 2300;
    warm.Q.value = 1.1;
    chorusA.delayTime.value = 0.026;
    chorusB.delayTime.value = 0.044;
    chorusGain.gain.value = 0.18 + settings.motion * 0.22;
    lfoA.frequency.value = 0.22 + settings.motion * 0.5;
    lfoB.frequency.value = 0.31 + settings.motion * 0.55;
    lfoGainA.gain.value = 0.004 + settings.motion * 0.009;
    lfoGainB.gain.value = 0.005 + settings.motion * 0.011;

    lfoA.connect(lfoGainA).connect(chorusA.delayTime);
    lfoB.connect(lfoGainB).connect(chorusB.delayTime);
    lfoA.start();
    lfoB.start();
    input.connect(highpass).connect(warm).connect(shaper).connect(wet).connect(destination);
    warm.connect(chorusA).connect(chorusGain).connect(destination);
    warm.connect(chorusB).connect(chorusGain);
    warm.connect(convolver).connect(reverbWet).connect(destination);
    lfos.push(lfoA, lfoB);
    return {
      input,
      nodes: [input, dry, wet, reverbWet, convolver, shaper, highpass, warm, chorusA, chorusB, chorusGain, lfoGainA, lfoGainB],
      lfos
    };
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
