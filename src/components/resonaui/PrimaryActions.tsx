"use client";

import type { AppMode } from "@/lib/resonaui/types";
import styles from "./PrimaryActions.module.css";

function CaptureIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden>
      <circle cx="8" cy="10" r="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="10" r="6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function PrimaryActions({
  mode,
  onCapture,
  onMerge
}: {
  mode: AppMode;
  onCapture: () => void;
  onMerge: () => void;
}) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.capture}`}
        data-active={mode === "capture"}
        onClick={onCapture}
      >
        <span className={styles.icon}><CaptureIcon /></span>
        {mode === "capture" ? "Stop Capture" : "Capture"}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.merge}`}
        data-active={mode === "merge"}
        onClick={onMerge}
      >
        <span className={styles.icon}><MergeIcon /></span>
        {mode === "merge" ? "Leave Merge" : "Live Merge"}
      </button>
    </div>
  );
}
