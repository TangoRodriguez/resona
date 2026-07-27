"use client";

import { useState } from "react";
import type { UseAudioEngine } from "@/hooks/useAudioEngine";
import type { TransformSettings } from "@/lib/audio/audioEngine";
import { AudioEnableButton } from "./AudioEnableButton";
import styles from "./AmbientLayerControl.module.css";

type Props = {
  audio: UseAudioEngine;
};

const TRANSFORM_CONTROLS: Array<{
  key: keyof TransformSettings;
  label: string;
}> = [
  { key: "input", label: "Mic Input" },
  { key: "mix", label: "Transform" },
  { key: "reverb", label: "Reverb" },
  { key: "tone", label: "Tone" },
  { key: "motion", label: "Motion" }
];

/**
 * Compact Ambient Layer control: a small "Ambient ON/OFF" pill plus an
 * expandable detail panel (Enable Audio, track, ambient + master volume).
 * Kept intentionally small so it never competes with the central matter.
 */
export function AmbientLayerControl({ audio }: Props) {
  const [open, setOpen] = useState(false);
  const { state, tracks } = audio;
  const activeTrack =
    tracks.find((t) => t.id === state.selectedTrack) ?? tracks[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.compact}>
        <button
          type="button"
          className={styles.toggle}
          data-on={state.ambientEnabled}
          onClick={() => void audio.toggleAmbient()}
          aria-pressed={state.ambientEnabled}
        >
          <span className={styles.waveIcon} aria-hidden>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path
                d="M1 7h1.6M4.4 4v6M7 1.5v11M9.6 4v6M12 6.2v1.6M14.6 5v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.label}>Ambient</span>
          <span className={styles.statePill} data-on={state.ambientEnabled}>
            {state.ambientEnabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          type="button"
          className={styles.expand}
          data-open={open}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close audio settings" : "Open audio settings"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M3.5 5.25 7 8.75l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Audio settings">
          {!state.enabled && (
            <div className={styles.row}>
              <AudioEnableButton onEnable={() => void audio.enable()} />
            </div>
          )}

          <div className={styles.row}>
            <span className={styles.rowLabel}>Ambient Layer</span>
            <div className={styles.segmented}>
              <button
                type="button"
                data-active={state.ambientEnabled}
                onClick={() => {
                  if (!state.ambientEnabled) void audio.toggleAmbient();
                }}
              >
                ON
              </button>
              <button
                type="button"
                data-active={!state.ambientEnabled}
                onClick={() => {
                  if (state.ambientEnabled) void audio.toggleAmbient();
                }}
              >
                OFF
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Default Track</span>
            <div className={styles.tracks}>
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.trackBtn}
                  data-active={t.id === state.selectedTrack}
                  onClick={() => void audio.setSelectedTrack(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.sliderRow}>
            <span className={styles.rowLabel}>Ambient Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.ambientVolume}
              onChange={(e) =>
                audio.setAmbientVolume(Number(e.target.value))
              }
            />
          </label>

          <label className={styles.sliderRow}>
            <span className={styles.rowLabel}>Master Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.masterVolume}
              onChange={(e) => audio.setMasterVolume(Number(e.target.value))}
            />
          </label>

          <div className={styles.divider} />

          {TRANSFORM_CONTROLS.map((control) => (
            <label className={styles.sliderRow} key={control.key}>
              <span className={styles.sliderHeader}>
                <span className={styles.rowLabel}>{control.label}</span>
                <span className={styles.valuePill}>
                  {Math.round(state.transform[control.key] * 100)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={state.transform[control.key]}
                onChange={(e) =>
                  audio.updateTransform(control.key, Number(e.target.value))
                }
              />
            </label>
          ))}

          {activeTrack && (
            <p className={styles.hint}>
              Capture records the shaped mic mix. Mic access needs HTTPS.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
