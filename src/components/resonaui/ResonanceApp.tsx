"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";
import { TopControls } from "./TopControls";
import { Header } from "./Header";
import { SoundMatterCanvas } from "./SoundMatterCanvas";
import { LevelMeter } from "./LevelMeter";
import { CaptureTimer } from "./CaptureTimer";
import { LoopChips } from "./LoopChips";
import { MatterSelector } from "./MatterSelector";
import { PrimaryActions } from "./PrimaryActions";
import { AmbientLayerControl } from "./AmbientLayerControl";
import { MergeRoomPanel } from "./MergeRoomPanel";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useGestureInstrument } from "@/hooks/useGestureInstrument";
import {
  useResonanceRoom,
  type SharedGesture
} from "@/hooks/useResonanceRoom";
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

const matterCopy: Record<MatterType, string> = {
  glass: "Crystalline response",
  liquid: "Fluid harmonic field",
  bloom: "Organic spectral bloom"
};

const pitchScales: Record<MatterType, { root: number; span: number }> = {
  glass: { root: 392, span: 19 },
  liquid: { root: 196, span: 19 },
  bloom: { root: 261.63, span: 23 }
};

function touchPitch(matter: MatterType, vertical01: number) {
  const scale = pitchScales[matter];
  const semitone = (1 - Math.min(1, Math.max(0, vertical01))) * scale.span;
  return scale.root * Math.pow(2, semitone / 12);
}

function cloneDefaultState(): ResonanceAppState {
  return {
    ...defaultResonanceState,
    loops: [...defaultResonanceState.loops],
    participants: [...defaultResonanceState.participants]
  };
}

export function ResonanceApp() {
  const [state, setState] = useState<ResonanceAppState>(cloneDefaultState);
  const [isFocused, setIsFocused] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [gesturePitch, setGesturePitch] = useState<number | null>(null);
  const [gestureEnergy, setGestureEnergy] = useState(0);
  const energyTimerRef = useRef<number | null>(null);
  const lastGestureRef = useRef({ x: 0.5, y: 0.5, motion: 0.5 });
  const audio = useAudioEngine();
  const instrument = useGestureInstrument();

  const handleRemoteGesture = (gesture: SharedGesture) => {
    const voiceId = `remote:${gesture.participantId}`;
    if (gesture.action === "tap") {
      instrument.tap(gesture.matter, gesture.y, Math.max(0.35, gesture.level * 0.72));
      return;
    }
    if (gesture.action === "hold") {
      instrument.start(voiceId, gesture.matter, gesture.y, Math.max(0.35, gesture.level * 0.66));
      return;
    }
    if (gesture.action === "glide") {
      instrument.glide(voiceId, gesture.matter, gesture.y, gesture.motion);
      return;
    }
    instrument.stop(voiceId, 0.48);
  };

  const room = useResonanceRoom(handleRemoteGesture);

  const pulseEnergy = (value: number, decay = 520) => {
    setGestureEnergy(value);
    if (energyTimerRef.current) window.clearTimeout(energyTimerRef.current);
    energyTimerRef.current = window.setTimeout(() => setGestureEnergy(0), decay);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matter = params.get("matter");
    if (matterTypes.includes(matter as MatterType)) {
      setState((previous) => ({ ...previous, matter: matter as MatterType }));
    }
    if (params.get("room")) {
      setState((previous) => ({ ...previous, mode: "merge" }));
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((previous) => {
        if (audio.state.micEnabled || gestureEnergy > 0.08) return previous;
        const target =
          previous.mode === "capture" ? 0.72 : previous.mode === "merge" ? 0.28 : 0.34;
        const wobble = (Math.random() - 0.5) * 0.14;
        const level = Math.min(0.82, Math.max(0.12, target + wobble));
        return { ...previous, level };
      });
    }, 460);
    return () => window.clearInterval(id);
  }, [audio.state.micEnabled, gestureEnergy]);

  useEffect(() => {
    if (!audio.state.micEnabled) return;
    setState((previous) => ({ ...previous, level: audio.state.micLevel }));
  }, [audio.state.micEnabled, audio.state.micLevel]);

  useEffect(() => {
    audio.syncMicMatter(state.matter);
  }, [audio.syncMicMatter, state.matter]);

  useEffect(() => {
    if (state.mode !== "capture") return;
    const id = window.setInterval(() => {
      setState((previous) => ({
        ...previous,
        elapsedSeconds: previous.elapsedSeconds + 1
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.mode]);

  useEffect(() => {
    if (state.mode !== "merge") return;
    setState((previous) => ({ ...previous, resonance: room.resonance }));
  }, [room.resonance, state.mode]);

  useEffect(() => {
    if (state.mode !== "merge") return;
    const timer = window.setTimeout(() => {
      room.publishPresence({
        matter: state.matter,
        level: Math.max(state.level, gestureEnergy),
        active: gestureEnergy > 0.16
      });
    }, 70);
    return () => window.clearTimeout(timer);
  }, [
    gestureEnergy,
    room.publishPresence,
    state.level,
    state.matter,
    state.mode
  ]);

  useEffect(
    () => () => {
      if (energyTimerRef.current) window.clearTimeout(energyTimerRef.current);
    },
    []
  );

  const setMode = (mode: AppMode) =>
    setState((previous) => ({
      ...previous,
      mode,
      elapsedSeconds: mode === "capture" ? 0 : previous.elapsedSeconds
    }));

  const setMatter = (matter: MatterType) => {
    audio.syncMicMatter(matter);
    setState((previous) => ({ ...previous, matter }));
  };

  const toggleCapture = async () => {
    if (audio.state.captureActive || state.mode === "capture") {
      const recording = await audio.stopCapture();
      setState((previous) => {
        const next = { ...previous, mode: "solo" as AppMode, elapsedSeconds: 0 };
        if (!recording || recording.blob.size === 0) return next;
        loopCounter += 1;
        return {
          ...next,
          loops: [
            ...previous.loops,
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

    if (state.mode === "merge") room.leaveRoom();
    const ok = await audio.startCapture(state.matter);
    setState((previous) => ({
      ...previous,
      mode: ok ? "capture" : "solo",
      elapsedSeconds: 0,
      level: ok ? 0 : previous.level
    }));
  };

  const toggleMerge = async () => {
    if (state.mode === "merge") {
      room.leaveRoom();
      instrument.stopAll();
      setMode("solo");
      return;
    }
    if (audio.state.captureActive) await audio.stopCapture();
    await Promise.all([audio.enable(), instrument.enable()]);
    setMode("merge");
  };

  const visualLevel = audio.state.micEnabled
    ? state.level
    : Math.min(1, Math.max(state.level, gestureEnergy));
  const touchVelocity = Math.max(0.58, visualLevel);

  const playTap = (vertical: number, horizontal: number) => {
    void instrument.enable();
    void audio.tap(state.matter, vertical, touchVelocity);
    const pitch = touchPitch(state.matter, vertical);
    setGesturePitch(pitch);
    lastGestureRef.current = { x: horizontal, y: vertical, motion: 0.5 };
    pulseEnergy(1, 420);
    room.sendGesture({
      action: "tap",
      matter: state.matter,
      x: horizontal,
      y: vertical,
      level: touchVelocity,
      motion: 0.5
    });
  };

  const startPortamento = (vertical: number, horizontal: number) => {
    void instrument.enable().then(() => {
      instrument.start("local", state.matter, vertical, touchVelocity);
    });
    setGesturePitch(touchPitch(state.matter, vertical));
    lastGestureRef.current = { x: horizontal, y: vertical, motion: 0.4 };
    setGestureEnergy(0.88);
    if (energyTimerRef.current) window.clearTimeout(energyTimerRef.current);
    room.sendGesture({
      action: "hold",
      matter: state.matter,
      x: horizontal,
      y: vertical,
      level: touchVelocity,
      motion: 0.4
    });
  };

  const glidePortamento = (
    vertical: number,
    horizontal: number,
    motion: number
  ) => {
    instrument.glide("local", state.matter, vertical, motion);
    setGesturePitch(touchPitch(state.matter, vertical));
    setGestureEnergy(0.72 + motion * 0.28);
    lastGestureRef.current = { x: horizontal, y: vertical, motion };
    room.sendGesture({
      action: "glide",
      matter: state.matter,
      x: horizontal,
      y: vertical,
      level: touchVelocity,
      motion
    });
  };

  const releasePortamento = () => {
    instrument.stop("local", state.matter === "glass" ? 0.55 : 0.82);
    pulseEnergy(0.28, 620);
    window.setTimeout(() => setGesturePitch(null), 680);
    room.sendGesture({
      action: "release",
      matter: state.matter,
      x: lastGestureRef.current.x,
      y: lastGestureRef.current.y,
      level: touchVelocity,
      motion: lastGestureRef.current.motion
    });
  };

  const removeLoop = (id: string) =>
    setState((previous) => {
      const loop = previous.loops.find((item) => item.id === id);
      if (loop?.url) URL.revokeObjectURL(loop.url);
      return {
        ...previous,
        loops: previous.loops.filter((item) => item.id !== id)
      };
    });

  const addLoop = () =>
    setState((previous) => {
      loopCounter += 1;
      const colors = ["blue", "purple", "magenta"] as const;
      return {
        ...previous,
        loops: [
          ...previous.loops,
          {
            id: `loop-${loopCounter}`,
            name: `Loop ${String(loopCounter).padStart(2, "0")}`,
            durationSeconds: 4 + Math.floor(Math.random() * 6),
            color: colors[loopCounter % colors.length]
          }
        ]
      };
    });

  const subtitle =
    state.mode === "merge"
      ? room.participants.length > 1
        ? `${room.participants.length} people shaping one field.`
        : "Open a shared resonance room."
      : getSubtitle(state.mode, state.matter);
  const activePitch = audio.state.micEnabled ? audio.state.micPitch : gesturePitch;
  const pitchLabel = activePitch ? `${Math.round(activePitch)} Hz` : "Touch field";
  const networkLabel =
    state.mode === "merge"
      ? room.participants.length > 0
        ? `${room.participants.length} peers`
        : "Room idle"
      : "Local";

  return (
    <AppShell>
      <div className={styles.app} data-focused={isFocused} data-mode={state.mode}>
        <TopControls
          mode={state.mode}
          isFocused={isFocused}
          infoOpen={infoOpen}
          onToggleFocus={() => setIsFocused((value) => !value)}
          onToggleInfo={() => setInfoOpen((value) => !value)}
        />
        <Header subtitle={subtitle} />

        <div className={styles.workspace}>
          <section className={styles.stage} aria-label="Interactive sound matter">
            <div className={styles.stageHeader}>
              <div>
                <span className={styles.eyebrow}>Active matter</span>
                <strong className={styles.matterName}>{state.matter}</strong>
              </div>
              <span className={styles.stageDescriptor}>
                {state.mode === "merge" ? "Realtime shared field" : matterCopy[state.matter]}
              </span>
            </div>

            <div className={styles.center}>
              <SoundMatterCanvas
                mode={state.mode}
                matter={state.matter}
                level={visualLevel}
                resonance={state.resonance}
                pitch={activePitch}
                pitchConfidence={activePitch ? 1 : 0}
                isRecording={state.mode === "capture"}
                elapsedSeconds={state.elapsedSeconds}
                onPress={playTap}
                onHold={startPortamento}
                onGlide={glidePortamento}
                onRelease={releasePortamento}
                externalTouches={room.remoteTouches}
                participantCount={Math.max(1, room.participants.length)}
              />

              {state.mode === "solo" && (
                <p className={styles.hint}>
                  <span className={styles.gestureIcon} aria-hidden>↕</span>
                  Tap for notes · hold and slide for portamento
                </p>
              )}

              {state.mode === "merge" && (
                <p className={styles.hint}>
                  <span className={styles.gestureIcon} aria-hidden>◎</span>
                  Every connected touch reshapes the same resonance field
                </p>
              )}

              {state.mode === "capture" && (
                <CaptureTimer elapsedSeconds={state.elapsedSeconds} />
              )}
            </div>

            <div className={styles.telemetry} aria-label="Live session telemetry">
              <div className={styles.telemetryItem}>
                <span>Input</span>
                <strong>{audio.state.micEnabled ? "Microphone" : "Gesture"}</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>Signal</span>
                <strong>{Math.round(visualLevel * 100)}%</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>Pitch</span>
                <strong>{pitchLabel}</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>Network</span>
                <strong>{networkLabel}</strong>
              </div>
            </div>
          </section>

          <aside className={styles.controlRail} aria-label="Sound controls">
            <div className={styles.railHeading}>
              <span>Session controls</span>
              <span>{String(state.loops.length).padStart(2, "0")} layers</span>
            </div>

            <div className={styles.stack}>
              {state.mode === "merge" ? (
                <MergeRoomPanel room={room} />
              ) : (
                <LevelMeter level={visualLevel} />
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

            {infoOpen && (
              <div className={styles.infoPanel} role="status">
                <div className={styles.infoPanelHeader}>
                  <span>Interaction map</span>
                  <span>RESONA / 0.4</span>
                </div>
                <p>
                  Tap creates a quantised note. Hold and move vertically for continuous
                  portamento. Merge creates an encrypted peer-to-peer room where gestures,
                  Matter, and energy are shared live.
                </p>
                <div className={styles.shortcutGrid}>
                  <span>Tap / Enter</span><strong>Trigger note</strong>
                  <span>Hold + slide</span><strong>Portamento</strong>
                  <span>Merge room</span><strong>Realtime P2P</strong>
                  <span>Focus icon</span><strong>Immersive view</strong>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
