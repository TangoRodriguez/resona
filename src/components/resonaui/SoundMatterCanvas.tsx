"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
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

  return (
    <div
      className={styles.canvasWrap}
      data-pressed={pressed}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ny =
          rect.height > 0
            ? Math.min(1, Math.max(0, y / rect.height))
            : 0.5;
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
        if (!pressed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
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
      }}
      role="button"
      aria-label="Sound matter - touch or hum"
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
    </div>
  );
}

