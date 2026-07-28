"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type CSSProperties } from "react";
import type { TouchPulse3D } from "@/lib/resonaui/matter3d/types";
import type { SoundMatterParams } from "@/lib/resonaui/visualMatter";
import styles from "./SoundMatterCanvas.module.css";

const SoundMatterScene = dynamic(() => import("./SoundMatterScene"), {
  ssr: false,
  loading: () => <div className={styles.sceneFallback} aria-hidden />
});

type Props = SoundMatterParams & {
  onPress?: (vertical01: number) => void;
  onHold?: (vertical01: number) => void;
  onRelease?: () => void;
};

let pulseId = 0;

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
  const [pressed, setPressed] = useState(false);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false });
  const [touches, setTouches] = useState<TouchPulse3D[]>([]);
  const holdTimerRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const addPulse = (
    x: number,
    y: number,
    rect: DOMRect,
    vx: number,
    vy: number,
    strength = 1
  ) => {
    const id = pulseId++;
    const pulse: TouchPulse3D = {
      id,
      x: rect.width > 0 ? x / rect.width : 0.5,
      y: rect.height > 0 ? y / rect.height : 0.5,
      vx,
      vy,
      strength,
      createdAt: performance.now()
    };
    setTouches((prev) => [...prev.slice(-14), pulse]);
    window.setTimeout(() => {
      setTouches((prev) => prev.filter((item) => item.id !== id));
    }, 1300);
  };

  const releasePointer = () => {
    setPressed(false);
    lastPointerRef.current = null;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    onRelease?.();
  };

  const updatePointer = (x: number, y: number, rect: DOMRect) => {
    setPointer({
      x: rect.width > 0 ? Math.min(1, Math.max(0, x / rect.width)) : 0.5,
      y: rect.height > 0 ? Math.min(1, Math.max(0, y / rect.height)) : 0.5,
      active: true
    });
  };

  const interactionStyle = {
    "--pointer-x": `${pointer.x * 100}%`,
    "--pointer-y": `${pointer.y * 100}%`,
    "--matter-level": level
  } as CSSProperties;

  return (
    <div
      className={styles.canvasWrap}
      data-pressed={pressed}
      data-pointer-active={pointer.active}
      data-matter={matter}
      data-mode={mode}
      style={interactionStyle}
      onPointerEnter={() => setPointer((current) => ({ ...current, active: true }))}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ny =
          rect.height > 0
            ? Math.min(1, Math.max(0, y / rect.height))
            : 0.5;
        updatePointer(x, y, rect);
        setPressed(true);
        lastPointerRef.current = { x, y, time: performance.now() };
        addPulse(x, y, rect, 0, -140, 0.95);
        onPress?.(ny);
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => {
          onHold?.(ny);
        }, 260);
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        updatePointer(x, y, rect);
        if (!pressed) return;
        const now = performance.now();
        const last = lastPointerRef.current;
        if (!last) {
          lastPointerRef.current = { x, y, time: now };
          return;
        }
        const elapsed = Math.max(16, now - last.time);
        const dx = x - last.x;
        const dy = y - last.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 8 || elapsed > 90) {
          const vx = (dx / elapsed) * 1000;
          const vy = (dy / elapsed) * 1000;
          addPulse(x, y, rect, vx, vy, Math.min(1.28, 0.74 + distance / 82));
          lastPointerRef.current = { x, y, time: now };
        }
      }}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerLeave={() => {
        if (pressed) releasePointer();
        setPointer((current) => ({ ...current, active: false }));
      }}
      onKeyDown={(e) => {
        if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setPressed(true);
        setPointer({ x: 0.5, y: 0.5, active: true });
        addPulse(rect.width / 2, rect.height / 2, rect, 0, -120, 0.95);
        onPress?.(0.5);
      }}
      onKeyUp={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        releasePointer();
      }}
      role="button"
      aria-label="Sound matter. Touch, drag, hold, or press Enter to play."
      aria-pressed={pressed}
      tabIndex={0}
    >
      <div className={styles.canvas}>
        <SoundMatterScene
          mode={mode}
          matter={matter}
          level={level}
          resonance={resonance}
          pitch={pitch}
          pitchConfidence={pitchConfidence}
          isRecording={isRecording}
          elapsedSeconds={elapsedSeconds}
          touches={touches}
        />
      </div>

      <div className={styles.interactionField} aria-hidden>
        <span className={`${styles.orbit} ${styles.orbitOuter}`} />
        <span className={`${styles.orbit} ${styles.orbitInner}`} />
        <span className={styles.pointerAura} />
        <span className={styles.pointerCore} />
        <span className={styles.scanLine} />
        <span className={styles.axisLabel}>Y / PITCH</span>
        <span className={styles.modeLabel}>{mode}</span>
      </div>
    </div>
  );
}
