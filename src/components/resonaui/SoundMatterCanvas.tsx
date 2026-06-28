"use client";

import { useEffect, useRef, useState } from "react";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import { drawGlassMatter } from "@/lib/resonaui/drawGlassMatter";
import { drawLiquidMatter } from "@/lib/resonaui/drawLiquidMatter";
import { drawBloomMatter } from "@/lib/resonaui/drawBloomMatter";
import {
  createMotion,
  damp,
  normalizePitch,
  palettes,
  type DrawCtx,
  type SoundMatterParams
} from "@/lib/resonaui/visualMatter";
import styles from "./SoundMatterCanvas.module.css";

type Props = SoundMatterParams & {
  onPress?: (vertical01: number) => void;
  onHold?: (vertical01: number) => void;
  onRelease?: () => void;
};

export function SoundMatterCanvas({
  mode,
  matter,
  level,
  resonance,
  pitch = null,
  pitchConfidence = 0,
  isRecording = false,
  elapsedSeconds = 0,
  onPress,
  onHold,
  onRelease
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionRef = useRef(createMotion());
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [pressed, setPressed] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  // Keep the latest params in a ref so the animation loop reads fresh values
  // without re-subscribing every render. This is the seam where real audio
  // (mic level / pitch) will flow in later.
  const paramsRef = useRef<SoundMatterParams>({
    mode,
    matter,
    level,
    resonance,
    pitch,
    pitchConfidence,
    isRecording,
    elapsedSeconds
  });
  paramsRef.current = {
    mode,
    matter,
    level,
    resonance,
    pitch,
    pitchConfidence,
    isRecording,
    elapsedSeconds
  };

  const pressRef = useRef(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return;

    const p = paramsRef.current;
    const m = motionRef.current;

    // Advance the clock (slower when reduced motion is requested).
    const timeScale = reducedRef.current ? 0.25 : 1;
    m.time += dt * timeScale;

    // Smooth the audio-driven values so motion stays premium, never jittery.
    m.energy = damp(m.energy, p.level, 4, dt);
    m.rec = damp(m.rec, p.isRecording ? 1 : 0, 5, dt);
    m.pitchNorm = damp(
      m.pitchNorm,
      p.pitch ? normalizePitch(p.pitch) : 0.5,
      6,
      dt
    );
    m.press = damp(m.press, pressRef.current ? 1 : 0, 8, dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.3;

    const d: DrawCtx = {
      ctx,
      cx,
      cy,
      R,
      t: m.time,
      m,
      params: p,
      pal: palettes[p.matter]
    };

    if (p.matter === "liquid") drawLiquidMatter(d);
    else if (p.matter === "bloom") drawBloomMatter(d);
    else drawGlassMatter(d);
  });

  return (
    <div
      className={styles.canvasWrap}
      data-pressed={pressed}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ny =
          rect.height > 0
            ? Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
            : 0.5;
        pressRef.current = true;
        setPressed(true);
        onPress?.(ny);
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => {
          if (pressRef.current) onHold?.(ny);
        }, 260);
      }}
      onPointerUp={() => {
        pressRef.current = false;
        setPressed(false);
        if (holdTimerRef.current) {
          window.clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        onRelease?.();
      }}
      onPointerLeave={() => {
        pressRef.current = false;
        setPressed(false);
        if (holdTimerRef.current) {
          window.clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        onRelease?.();
      }}
      role="button"
      aria-label="Sound matter — touch or hum"
      tabIndex={0}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
    </div>
  );
}
