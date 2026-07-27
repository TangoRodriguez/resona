"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimer } from "@/lib/resonaui/mockState";
import type { LoopItem } from "@/lib/resonaui/types";
import styles from "./LoopChips.module.css";

export function LoopChips({
  loops,
  onRemove,
  onAdd,
  playbackDisabled = false
}: {
  loops: LoopItem[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  playbackDisabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playLoop = (loop: LoopItem) => {
    if (!loop.url || playbackDisabled) return;
    if (playingId === loop.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(loop.url);
    audioRef.current = audio;
    setPlayingId(loop.id);
    audio.onended = () => setPlayingId(null);
    void audio.play().catch(() => setPlayingId(null));
  };

  useEffect(() => {
    if (!playbackDisabled) return;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  }, [playbackDisabled]);

  return (
    <div className={styles.loops}>
      <p className={styles.label}>Loops</p>
      <div className={styles.chipRow}>
        {loops.map((loop) => (
          <span key={loop.id} className={styles.chip}>
            <span className={styles.chipDot} data-color={loop.color ?? "blue"} />
            {loop.name}
            {loop.url && (
              <button
                type="button"
                className={styles.play}
                data-playing={playingId === loop.id}
                disabled={playbackDisabled}
                aria-label={`${playingId === loop.id ? "Pause" : "Play"} ${loop.name}`}
                onClick={() => playLoop(loop)}
              >
                {playingId === loop.id ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                    <path d="M2.4 1.5v7M7.6 1.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                    <path d="M3 1.8 8 5 3 8.2V1.8Z" fill="currentColor" />
                  </svg>
                )}
              </button>
            )}
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
