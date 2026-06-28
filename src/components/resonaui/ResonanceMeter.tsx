import styles from "./ResonanceMeter.module.css";

const BAR_HEIGHTS = [40, 70, 55, 90, 65, 80, 50, 75, 45];

export function ResonanceMeter({ resonance }: { resonance: number }) {
  const percent = Math.round(Math.min(Math.max(resonance, 0), 1) * 100);

  return (
    <div className={styles.meter}>
      <div className={styles.readout}>
        <span className={styles.label}>Resonance</span>
        <span className={styles.value}>{percent}%</span>
        <span className={styles.caption}>Syncing in harmony</span>
      </div>
      <div className={styles.bars} role="meter" aria-valuenow={percent}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={styles.bar}
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.12}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
