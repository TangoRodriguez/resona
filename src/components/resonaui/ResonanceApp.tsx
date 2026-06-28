"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { TopControls } from "./TopControls";
import { Header } from "./Header";
import { SoundMatterCanvas } from "./SoundMatterCanvas";
import { MergeNetwork } from "./MergeNetwork";
import { LevelMeter } from "./LevelMeter";
import { CaptureTimer } from "./CaptureTimer";
import { LoopChips } from "./LoopChips";
import { ResonanceMeter } from "./ResonanceMeter";
import { MatterSelector } from "./MatterSelector";
import { PrimaryActions } from "./PrimaryActions";
import { AmbientLayerControl } from "./AmbientLayerControl";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { defaultResonanceState, getSubtitle } from "@/lib/resonaui/mockState";
import type {
  AppMode,
  MatterType,
  ResonanceAppState
} from "@/lib/resonaui/types";
import styles from "./ResonanceApp.module.css";

let loopCounter = defaultResonanceState.loops.length;

export function ResonanceApp() {
  const [state, setState] = useState<ResonanceAppState>(defaultResonanceState);
  const audio = useAudioEngine();

  // Mock animated level meter (Phase 0.2).
  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const target = prev.mode === "capture" ? 0.72 : 0.55;
        const wobble = (Math.random() - 0.5) * 0.22;
        const level = Math.min(0.95, Math.max(0.15, target + wobble));
        return { ...prev, level };
      });
    }, 420);
    return () => window.clearInterval(id);
  }, []);

  // Mock capture timer.
  useEffect(() => {
    if (state.mode !== "capture") return;
    const id = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.mode]);

  const setMode = (mode: AppMode) =>
    setState((prev) => ({
      ...prev,
      mode,
      elapsedSeconds: mode === "capture" ? 0 : prev.elapsedSeconds
    }));

  const setMatter = (matter: MatterType) =>
    setState((prev) => ({ ...prev, matter }));

  const toggleCapture = () =>
    setMode(state.mode === "capture" ? "solo" : "capture");

  const toggleMerge = () => setMode(state.mode === "merge" ? "solo" : "merge");

  const removeLoop = (id: string) =>
    setState((prev) => ({
      ...prev,
      loops: prev.loops.filter((l) => l.id !== id)
    }));

  const addLoop = () =>
    setState((prev) => {
      loopCounter += 1;
      const colors = ["blue", "purple", "magenta"] as const;
      return {
        ...prev,
        loops: [
          ...prev.loops,
          {
            id: `loop-${loopCounter}`,
            name: `Loop ${String(loopCounter).padStart(2, "0")}`,
            durationSeconds: 4 + Math.floor(Math.random() * 6),
            color: colors[loopCounter % colors.length]
          }
        ]
      };
    });

  const subtitle = getSubtitle(state.mode, state.matter);

  return (
    <AppShell>
      <div className={styles.app}>
        <TopControls mode={state.mode} />
        <Header subtitle={subtitle} />

        <div className={styles.center}>
          {state.mode === "merge" ? (
            <MergeNetwork participants={state.participants} />
          ) : (
            <SoundMatterCanvas
              mode={state.mode}
              matter={state.matter}
              level={state.level}
              resonance={state.resonance}
              isRecording={state.mode === "capture"}
              elapsedSeconds={state.elapsedSeconds}
              onPress={(ny) => audio.tap(state.matter, ny, state.level)}
              onHold={(ny) => audio.startDrone(state.matter, ny, state.level)}
              onRelease={() => audio.stopDrone()}
            />
          )}

          {state.mode === "solo" && (
            <p className={styles.hint}>
              <svg
                className={styles.hintIcon}
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 2v9M9 11a2.5 2.5 0 0 0 2.5-2.5V5a2.5 2.5 0 0 0-5 0v3.5A2.5 2.5 0 0 0 9 11Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.5 8.5A4.5 4.5 0 0 0 9 13a4.5 4.5 0 0 0 4.5-4.5M9 13v3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Touch / Hum
            </p>
          )}

          {state.mode === "capture" && (
            <CaptureTimer elapsedSeconds={state.elapsedSeconds} />
          )}
        </div>

        <div className={styles.stack}>
          {state.mode === "merge" ? (
            <ResonanceMeter resonance={state.resonance} />
          ) : (
            <LevelMeter level={state.level} />
          )}

          {state.mode !== "merge" && <AmbientLayerControl audio={audio} />}

          {state.mode === "capture" && (
            <LoopChips
              loops={state.loops}
              onRemove={removeLoop}
              onAdd={addLoop}
            />
          )}
        </div>

        <div className={styles.footer}>
          <MatterSelector matter={state.matter} onChange={setMatter} />
          <PrimaryActions
            mode={state.mode}
            onCapture={toggleCapture}
            onMerge={toggleMerge}
          />
        </div>
      </div>
    </AppShell>
  );
}
