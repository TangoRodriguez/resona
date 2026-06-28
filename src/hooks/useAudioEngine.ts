"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatterType } from "@/lib/resonaui/types";
import {
  DEFAULT_TRACKS,
  getAudioEngine,
  type DefaultTrack
} from "@/lib/audio/audioEngine";

export type AudioState = {
  enabled: boolean;
  ambientEnabled: boolean;
  ambientVolume: number;
  selectedTrack: string; // track id
  masterVolume: number;
};

const INITIAL: AudioState = {
  enabled: false,
  ambientEnabled: false,
  ambientVolume: 0.6,
  selectedTrack: DEFAULT_TRACKS[0]?.id ?? "",
  masterVolume: 0.8
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
    (matter: MatterType, vertical01: number, velocity = 0.7) => {
      engine.tap(matter, vertical01, velocity);
    },
    [engine]
  );

  const startDrone = useCallback(
    (matter: MatterType, vertical01: number, velocity = 0.7) => {
      engine.startDrone(matter, vertical01, velocity);
    },
    [engine]
  );

  const stopDrone = useCallback(() => {
    engine.stopDrone();
  }, [engine]);

  // Stop the drone if the component unmounts while held.
  useEffect(() => {
    return () => engine.stopDrone();
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
    stopDrone
  };
}

export type UseAudioEngine = ReturnType<typeof useAudioEngine>;
