"use client";

import styles from "./AudioEnableButton.module.css";

type Props = {
  onEnable: () => void;
};

/**
 * Shown until the AudioContext is unlocked. Mobile browsers require a user
 * gesture before any sound can play, so this is the explicit "turn on" tap.
 */
export function AudioEnableButton({ onEnable }: Props) {
  return (
    <button
      type="button"
      className={styles.enable}
      onClick={onEnable}
      aria-label="Enable Audio"
    >
      <span className={styles.icon} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 6.2v3.6h2.2L8.4 12V4L5.2 6.2H3Z"
            fill="currentColor"
          />
          <path
            d="M10.6 5.4a3.4 3.4 0 0 1 0 5.2M12.4 3.8a5.8 5.8 0 0 1 0 8.4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      Enable Audio
    </button>
  );
}
