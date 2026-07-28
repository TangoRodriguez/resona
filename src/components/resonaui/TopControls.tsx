import type { AppMode } from "@/lib/resonaui/types";
import styles from "./TopControls.module.css";

const STATUS_LABEL: Record<AppMode, string> = {
  solo: "Solo",
  capture: "Listening",
  merge: "Room"
};

type Props = {
  mode: AppMode;
  isFocused: boolean;
  infoOpen: boolean;
  onToggleFocus: () => void;
  onToggleInfo: () => void;
};

export function TopControls({
  mode,
  isFocused,
  infoOpen,
  onToggleFocus,
  onToggleInfo
}: Props) {
  return (
    <div className={styles.topControls}>
      <button
        className={styles.iconButton}
        data-active={isFocused}
        aria-label={isFocused ? "Exit focus mode" : "Enter focus mode"}
        aria-pressed={isFocused}
        title={isFocused ? "Exit focus mode" : "Focus on sound matter"}
        type="button"
        onClick={onToggleFocus}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M6.2 2H3.8A1.8 1.8 0 0 0 2 3.8v2.4M11.8 2h2.4A1.8 1.8 0 0 1 16 3.8v2.4M16 11.8v2.4a1.8 1.8 0 0 1-1.8 1.8h-2.4M6.2 16H3.8A1.8 1.8 0 0 1 2 14.2v-2.4"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.35" />
        </svg>
      </button>

      <span className={styles.statusPill} aria-live="polite">
        <span className={styles.statusDot} data-mode={mode} />
        <span>{STATUS_LABEL[mode]}</span>
        <span className={styles.statusMeta}>Live</span>
      </span>

      <button
        className={styles.iconButton}
        data-active={infoOpen}
        aria-label={infoOpen ? "Close session details" : "Open session details"}
        aria-pressed={infoOpen}
        title="Session details"
        type="button"
        onClick={onToggleInfo}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.35" />
          <path d="M9 8v4" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <circle cx="9" cy="5.4" r="0.9" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
