"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import type { TouchPulse3D } from "@/lib/resonaui/matter3d/types";
import type { SoundMatterParams } from "@/lib/resonaui/visualMatter";
import styles from "./SoundMatterCanvas.module.css";

const SoundMatterScene = dynamic(() => import("./SoundMatterScene"), {
  ssr: false,
  loading: () => <div className={styles.sceneFallback} aria-hidden />
});

type Props = SoundMatterParams & {
  onPress?: (vertical01: number, horizontal01: number) => void;
  onHold?: (vertical01: number, horizontal01: number) => void;
  onGlide?: (
    vertical01: number,
    horizontal01: number,
    motion: number
  ) => void;
  onRelease?: () => void;
  externalTouches?: TouchPulse3D[];
  participantCount?: number;
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
  onGlide,
  onRelease,
  externalTouches = [],
  participantCount = 1
}: Props) {
  const [pressed, setPressed] = useState(false);
  const [gliding, setGliding] = useState(false);
  const [glideEnergy, setGlideEnergy] = useState(0);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false });
  const [touches, setTouches] = useState<TouchPulse3D[]>([]);
  const holdTimerRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const lastGlideRef = useRef(0);
  const lastPointerRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const allTouches = useMemo(
    () => [...externalTouches.slice(-20), ...touches.slice(-16)],
    [externalTouches, touches]
  );

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
    setTouches((prev) => [...prev.slice(-16), pulse]);
    window.setTimeout(() => {
      setTouches((prev) => prev.filter((item) => item.id !== id));
    }, 1300);
  };

  const releasePointer = () => {
    setPressed(false);
    setGliding(false);
    setGlideEnergy(0);
    holdActiveRef.current = false;
    lastPointerRef.current = null;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    onRelease?.();
  };

  const updatePointer = (x: number, y: number, rect: DOMRect) => {
    const next = {
      x: rect.width > 0 ? Math.min(1, Math.max(0, x / rect.width)) : 0.5,
      y: rect.height > 0 ? Math.min(1, Math.max(0, y / rect.height)) : 0.5,
      active: true
    };
    setPointer(next);
    return next;
  };

  const interactionStyle = {
    "--pointer-x": `${pointer.x * 100}%`,
    "--pointer-y": `${pointer.y * 100}%`,
    "--matter-level": level,
    "--glide-energy": glideEnergy,
    "--peer-energy": Math.min(1, Math.max(0, (participantCount - 1) / 5))
  } as CSSProperties;

  return (
    <div
      className={styles.canvasWrap}
      data-pressed={pressed}
      data-gliding={gliding}
      data-pointer-active={pointer.active}
      data-matter={matter}
      data-mode={mode}
      style={interactionStyle}
      onPointerEnter={() => setPointer((current) => ({ ...current, active: true }))}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const next = updatePointer(x, y, rect);
        setPressed(true);
        holdActiveRef.current = false;
        lastPointerRef.current = { x, y, time: performance.now() };
        addPulse(x, y, rect, 0, -140, 0.98);
        onPress?.(next.y, next.x);
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = window.setTimeout(() => {
          holdActiveRef.current = true;
          setGliding(true);
          setGlideEnergy(0.42);
          onHold?.(next.y, next.x);
        }, 240);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const next = updatePointer(x, y, rect);
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
        const motion = Math.min(1, distance / Math.max(18, elapsed * 0.28));

        if (distance > 7 || elapsed > 82) {
          const vx = (dx / elapsed) * 1000;
          const vy = (dy / elapsed) * 1000;
          addPulse(x, y, rect, vx, vy, Math.min(1.34, 0.76 + distance / 76));
          lastPointerRef.current = { x, y, time: now };
        }

        if (holdActiveRef.current && now - lastGlideRef.current > 28) {
          lastGlideRef.current = now;
          setGliding(true);
          setGlideEnergy(Math.max(0.34, motion));
          onGlide?.(next.y, next.x, motion);
        }
      }}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerLeave={() => {
        if (pressed) releasePointer();
        setPointer((current) => ({ ...current, active: false }));
      }}
      onKeyDown={(event) => {
        if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setPressed(true);
        setPointer({ x: 0.5, y: 0.5, active: true });
        addPulse(rect.width / 2, rect.height / 2, rect, 0, -120, 0.95);
        onPress?.(0.5, 0.5);
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        releasePointer();
      }}
      role="button"
      aria-label="Sound matter. Tap for notes, hold and slide for portamento."
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
          touches={allTouches}
          glide={gliding ? Math.max(0.35, glideEnergy) : 0}
          participantCount={participantCount}
        />
      </div>

      <div className={styles.interactionField} aria-hidden>
        <span className={`${styles.orbit} ${styles.orbitOuter}`} />
        <span className={`${styles.orbit} ${styles.orbitMid}`} />
        <span className={`${styles.orbit} ${styles.orbitInner}`} />
        <span className={styles.spectralVeil} />
        <span className={styles.pointerAura} />
        <span className={styles.pointerCore} />
        <span className={styles.glideTrail} />
        <span className={styles.scanLine} />
        <span className={styles.axisLabel}>Y / PITCH</span>
        <span className={styles.modeLabel}>
          {gliding ? "PORTAMENTO" : mode}
        </span>
      </div>
    </div>
  );
}
