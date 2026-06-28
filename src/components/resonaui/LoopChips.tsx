"use client";

import { formatTimer } from "@/lib/resonaui/mockState";
import type { LoopItem } from "@/lib/resonaui/types";
import styles from "./LoopChips.module.css";

export function LoopChips({
  loops,
  onRemove,
  onAdd
}: {
  loops: LoopItem[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className={styles.loops}>
      <p className={styles.label}>Loops</p>
      <div className={styles.chipRow}>
        {loops.map((loop) => (
          <span key={loop.id} className={styles.chip}>
            <span className={styles.chipDot} data-color={loop.color ?? "blue"} />
            {loop.name}
            <span className={styles.chipTime}>
              {formatTimer(loop.durationSeconds)}
            </span>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${loop.name}`}
              onClick={() => onRemove?.(loop.id)}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path
                  d="M1 1l8 8M9 1l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}
        <button
          type="button"
          className={styles.add}
          aria-label="Add loop"
          onClick={onAdd}
        >
          +
        </button>
      </div>
    </div>
  );
}
