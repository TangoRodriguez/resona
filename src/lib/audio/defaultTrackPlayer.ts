// Default ambient track player. Loads an audio file (mp3/wav) into an
// AudioBuffer and plays it on a loop through its own gain node, which feeds
// the engine's ambient bus. Pure Web Audio API.

export class DefaultTrackPlayer {
  private ctx: AudioContext;
  private destination: AudioNode;
  private gain: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();
  private currentUrl: string | null = null;
  private playing = false;
  private volume = 0.6;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(destination);
  }

  /** Fetch + decode a track URL into an AudioBuffer (cached). */
  async load(url: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(url);
    if (cached) return cached;

    const inFlight = this.loadingPromises.get(url);
    if (inFlight) return inFlight;

    const promise = (async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load audio: ${url} (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(url, buffer);
      this.loadingPromises.delete(url);
      return buffer;
    })();

    this.loadingPromises.set(url, promise);
    return promise;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /** Start looping the given URL. Stops any current playback first. */
  async play(url: string) {
    await this.load(url);
    this.stop();

    const buffer = this.buffers.get(url);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gain);

    // Fade in to avoid clicks.
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.linearRampToValueAtTime(this.volume, now + 0.6);

    source.start();
    this.source = source;
    this.currentUrl = url;
    this.playing = true;
  }

  /** Stop playback immediately (with a tiny fade to avoid clicks). */
  stop() {
    if (!this.source) {
      this.playing = false;
      return;
    }
    const source = this.source;
    this.source = null;
    this.playing = false;

    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + 0.18);
    try {
      source.stop(now + 0.2);
    } catch {
      /* already stopped */
    }
    // Restore gain target for next play.
    window.setTimeout(() => {
      this.gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }, 260);
  }

  dispose() {
    this.stop();
    try {
      this.gain.disconnect();
    } catch {
      /* noop */
    }
  }
}
