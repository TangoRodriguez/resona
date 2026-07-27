"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { TopControls } from "./TopControls";
import { Header } from "./Header";
import { SoundMatterCanvas } from "./SoundMatterCanvas";
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
  LoopColor,
  MatterType,
  ResonanceAppState
} from "@/lib/resonaui/types";
import styles from "./ResonanceApp.module.css";

let loopCounter = defaultResonanceState.loops.length;

const loopColorForMatter: Record<MatterType, LoopColor> = {
  glass: "blue",
  liquid: "purple",
  bloom: "magenta"
};

const matterTypes = ["glass", "liquid", "bloom"] satisfies MatterType[];

function cloneDefaultState(): ResonanceAppState {
  return {
    ...defaultResonanceState,
    loops: [...defaultResonanceState.loops]
  };
}

function readMatterQuery(): MatterType | null {
  if (typeof window === "undefined") return null;
  const matter = new URLSearchParams(window.location.search).get("matter");
  if (!matterTypes.includes(matter as MatterType)) return null;
  return matter as MatterType;
}

export function ResonanceApp() {
  const [state, setState] = useState<ResonanceAppState>(cloneDefaultState);
  const audio = useAudioEngine();

  useEffect(() => {
    const matter = readMatterQuery();
    if (!matter) return;
    setState((prev) => ({ ...prev, matter }));
  }, []);

  // Mock animated level meter while the real mic is idle.
  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        if (audio.state.micEnabled) return prev;
        const target = prev.mode === "capture" ? 0.72 : 0.55;
        const wobble = (Math.random() - 0.5) * 0.22;
        const level = Math.min(0.95, Math.max(0.15, target + wobble));
        return { ...prev, level };
      });
    }, 420);
    return () => window.clearInterval(id);
  }, [audio.state.micEnabled]);

  useEffect(() => {
    if (!audio.state.micEnabled) return;
    setState((prev) => ({ ...prev, level: audio.state.micLevel }));
  }, [audio.state.micEnabled, audio.state.micLevel]);

  useEffect(() => {
    audio.syncMicMatter(state.matter);
  }, [audio.syncMicMatter, state.matter]);

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

  const setMatter = (matter: MatterType) => {
    audio.syncMicMatter(matter);
    setState((prev) => ({ ...prev, matter }));
  };

  const toggleCapture = async () => {
    if (audio.state.captureActive || state.mode === "capture") {
      const recording = await audio.stopCapture();
      setState((prev) => {
        const next = { ...prev, mode: "solo" as AppMode, elapsedSeconds: 0 };
        if (!recording || recording.blob.size === 0) return next;
        loopCounter += 1;
        return {
          ...next,
          loops: [
            ...prev.loops,
            {
              id: `loop-${loopCounter}`,
              name: `${state.matter[0].toUpperCase()}${state.matter.slice(1)} ${String(loopCounter).padStart(2, "0")}`,
              durationSeconds: recording.durationSeconds,
              color: loopColorForMatter[state.matter],
              matter: state.matter,
              url: recording.url,
              mimeType: recording.mimeType
            }
          ]
        };
      });
      return;
    }

    const ok = await audio.startCapture(state.matter);
    setState((prev) => ({
      ...prev,
      mode: ok ? "capture" : "solo",
      elapsedSeconds: 0,
      level: ok ? 0 : prev.level
    }));
  };

  const toggleMerge = () => setMode(state.mode === "merge" ? "solo" : "merge");
  const touchVelocity = Math.max(0.9, state.level);

  const removeLoop = (id: string) =>
    setState((prev) => {
      const loop = prev.loops.find((l) => l.id === id);
      if (loop?.url) URL.revokeObjectURL(loop.url);
      return {
        ...prev,
        loops: prev.loops.filter((l) => l.id !== id)
      };
    });

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
          <SoundMatterCanvas
            mode={state.mode}
            matter={state.matter}
            level={state.level}
            resonance={state.resonance}
            pitch={audio.state.micEnabled ? audio.state.micPitch : null}
            pitchConfidence={
              audio.state.micEnabled ? audio.state.pitchConfidence : 0
            }
            isRecording={state.mode === "capture"}
            elapsedSeconds={state.elapsedSeconds}
            onPress={(ny) => void audio.tap(state.matter, ny, touchVelocity)}
            onHold={(ny) => void audio.startDrone(state.matter, ny, touchVelocity)}
            onRelease={() => audio.stopDrone()}
          />

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

          {state.mode !== "merge" && (
            <LoopChips
              loops={state.loops}
              onRemove={removeLoop}
              onAdd={addLoop}
              playbackDisabled={audio.state.captureActive}
            />
          )}

          {audio.state.error && (
            <p className={styles.error}>{audio.state.error}</p>
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
