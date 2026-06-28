import type { AppMode } from "@/lib/resonaui/types";
import styles from "./TopControls.module.css";

const STATUS_LABEL: Record<AppMode, string> = {
  solo: "Solo",
  capture: "Listening",
  merge: "Room"
};

export function TopControls({ mode }: { mode: AppMode }) {
  return (
    <div className={styles.topControls}>
      <button className={styles.iconButton} aria-label="Focus" type="button">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M9 1.5v2.2M9 14.3v2.2M1.5 9h2.2M14.3 9h2.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <span className={styles.statusPill}>
        <span className={styles.statusDot} data-mode={mode} />
        {STATUS_LABEL[mode]}
      </span>

      <button className={styles.iconButton} aria-label="More" type="button">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="4" cy="9" r="1.4" fill="currentColor" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" />
          <circle cx="14" cy="9" r="1.4" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
