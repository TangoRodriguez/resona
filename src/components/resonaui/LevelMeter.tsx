import styles from "./LevelMeter.module.css";

const SEGMENTS = 14;

export function LevelMeter({ level }: { level: number }) {
  const clamped = Math.min(Math.max(level, 0), 1);
  const active = Math.round(clamped * SEGMENTS);
  const percent = Math.round(clamped * 100);

  return (
    <div className={styles.levelMeter}>
      <svg
        className={styles.waveIcon}
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 11h2.5l1.5-5 2 9 2-12 2 16 2-9 1.5 1H20"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className={styles.bars} role="meter" aria-valuenow={percent}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const on = i < active;
          const height = 30 + (i / SEGMENTS) * 70;
          return (
            <span
              key={i}
              className={styles.bar}
              data-on={on}
              style={{
                height: `${height}%`,
                animationDelay: `${i * 0.06}s`
              }}
            />
          );
        })}
      </div>

      <div className={styles.readout}>
        <span className={styles.readoutLabel}>Level</span>
        <span className={styles.readoutValue}>{percent}%</span>
      </div>
    </div>
  );
}
