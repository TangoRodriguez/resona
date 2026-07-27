"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatterType } from "@/lib/resonaui/types";
import {
  DEFAULT_TRACKS,
  DEFAULT_TRANSFORM_SETTINGS,
  getAudioEngine,
  type DefaultTrack,
  type RecordedCapture,
  type TransformSettings
} from "@/lib/audio/audioEngine";

export type AudioState = {
  enabled: boolean;
  ambientEnabled: boolean;
  ambientVolume: number;
  selectedTrack: string; // track id
  masterVolume: number;
  micEnabled: boolean;
  captureActive: boolean;
  micLevel: number;
  micPitch: number | null;
  pitchConfidence: number;
  transform: TransformSettings;
  error: string | null;
};

const INITIAL: AudioState = {
  enabled: false,
  ambientEnabled: false,
  ambientVolume: 0.6,
  selectedTrack: DEFAULT_TRACKS[0]?.id ?? "",
  masterVolume: 1,
  micEnabled: false,
  captureActive: false,
  micLevel: 0,
  micPitch: null,
  pitchConfidence: 0,
  transform: DEFAULT_TRANSFORM_SETTINGS,
  error: null
};

function trackById(id: string): DefaultTrack | undefined {
  return DEFAULT_TRACKS.find((t) => t.id === id);
}

/**
 * React surface for the shared AudioEngine. Owns the AudioState and exposes
 * gesture-driven actions. The engine itself is a module singleton, so audio
 * keeps playing across re-renders.
 */
export function useAudioEngine() {
  const engine = getAudioEngine();
  const [state, setState] = useState<AudioState>(INITIAL);
  const stateRef = useRef(state);
  const currentMicMatterRef = useRef<MatterType>("glass");
  stateRef.current = state;

  // Enable audio (must be called from a user gesture). Starts ambient if it
  // was requested before unlock.
  const enable = useCallback(async () => {
    const ok = await engine.enable();
    if (!ok) return false;
    engine.setMasterVolume(stateRef.current.masterVolume);
    engine.setAmbientVolume(stateRef.current.ambientVolume);
    setState((s) => ({ ...s, enabled: true }));

    if (stateRef.current.ambientEnabled) {
      const track = trackById(stateRef.current.selectedTrack);
      if (track) await engine.playAmbient(track.url);
    }
    return true;
  }, [engine]);

  const toggleAmbient = useCallback(async () => {
    // Unlock on demand if needed.
    if (!stateRef.current.enabled) {
      const ok = await engine.enable();
      if (ok) {
        engine.setMasterVolume(stateRef.current.masterVolume);
        engine.setAmbientVolume(stateRef.current.ambientVolume);
        setState((s) => ({ ...s, enabled: true }));
      }
    }

    const next = !stateRef.current.ambientEnabled;
    setState((s) => ({ ...s, ambientEnabled: next }));

    if (next) {
      const track = trackById(stateRef.current.selectedTrack);
      if (track) await engine.playAmbient(track.url);
    } else {
      engine.stopAmbient();
    }
  }, [engine]);

  const setAmbientVolume = useCallback(
    (v: number) => {
      engine.setAmbientVolume(v);
      setState((s) => ({ ...s, ambientVolume: v }));
    },
    [engine]
  );

  const setMasterVolume = useCallback(
    (v: number) => {
      engine.setMasterVolume(v);
      setState((s) => ({ ...s, masterVolume: v }));
    },
    [engine]
  );

  const setSelectedTrack = useCallback(
    async (id: string) => {
      setState((s) => ({ ...s, selectedTrack: id }));
      const track = trackById(id);
      if (track && stateRef.current.ambientEnabled && stateRef.current.enabled) {
        await engine.playAmbient(track.url);
      }
    },
    [engine]
  );

  const tap = useCallback(
    async (matter: MatterType, vertical01: number, velocity = 0.7) => {
      const ok = await engine.tap(matter, vertical01, Math.max(0.9, velocity));
      if (!ok) return;
      if (!stateRef.current.enabled) {
        engine.setMasterVolume(stateRef.current.masterVolume);
        engine.setAmbientVolume(stateRef.current.ambientVolume);
        setState((s) => ({ ...s, enabled: true, error: null }));
      }
    },
    [engine]
  );

  const startDrone = useCallback(
    async (matter: MatterType, vertical01: number, velocity = 0.7) => {
      const ok = await engine.startDrone(
        matter,
        vertical01,
        Math.max(0.9, velocity)
      );
      if (!ok) return;
      if (!stateRef.current.enabled) {
        engine.setMasterVolume(stateRef.current.masterVolume);
        engine.setAmbientVolume(stateRef.current.ambientVolume);
        setState((s) => ({ ...s, enabled: true, error: null }));
      }
    },
    [engine]
  );

  const stopDrone = useCallback(() => {
    engine.stopDrone();
  }, [engine]);

  const updateTransform = useCallback(
    <K extends keyof TransformSettings>(key: K, value: TransformSettings[K]) => {
      setState((s) => {
        const transform = { ...s.transform, [key]: value };
        if (s.micEnabled) {
          engine.setMicTransform(currentMicMatterRef.current, transform);
        }
        return { ...s, transform };
      });
    },
    [engine]
  );

  const syncMicMatter = useCallback(
    (matter: MatterType) => {
      currentMicMatterRef.current = matter;
      if (!stateRef.current.micEnabled) return;
      engine.setMicTransform(matter, stateRef.current.transform);
    },
    [engine]
  );

  const startCapture = useCallback(
    async (matter: MatterType): Promise<boolean> => {
      try {
        currentMicMatterRef.current = matter;
        const ok = await engine.startCapture(
          matter,
          stateRef.current.transform,
          (analysis) => {
            setState((s) => ({
              ...s,
              micLevel: analysis.level,
              micPitch: analysis.pitch,
              pitchConfidence: analysis.pitchConfidence
            }));
          }
        );
        if (!ok) return false;
        engine.setMasterVolume(stateRef.current.masterVolume);
        engine.setAmbientVolume(stateRef.current.ambientVolume);
        setState((s) => ({
          ...s,
          enabled: true,
          micEnabled: true,
          captureActive: true,
          error: null
        }));
        return true;
      } catch (error) {
        engine.stopMic();
        setState((s) => ({
          ...s,
          micEnabled: false,
          captureActive: false,
          error: error instanceof Error ? error.message : "Could not start capture."
        }));
        return false;
      }
    },
    [engine]
  );

  const stopCapture = useCallback(async (): Promise<RecordedCapture | null> => {
    const recording = await engine.stopCapture();
    engine.stopMic();
    setState((s) => ({
      ...s,
      micEnabled: false,
      captureActive: false,
      micLevel: 0,
      micPitch: null,
      pitchConfidence: 0
    }));
    return recording;
  }, [engine]);

  // Stop the drone if the component unmounts while held.
  useEffect(() => {
    return () => {
      engine.stopDrone();
      void engine.stopCapture();
      engine.stopMic();
    };
  }, [engine]);

  return {
    state,
    tracks: DEFAULT_TRACKS,
    enable,
    toggleAmbient,
    setAmbientVolume,
    setMasterVolume,
    setSelectedTrack,
    tap,
    startDrone,
    stopDrone,
    updateTransform,
    syncMicMatter,
    startCapture,
    stopCapture
  };
}

export type UseAudioEngine = ReturnType<typeof useAudioEngine>;
