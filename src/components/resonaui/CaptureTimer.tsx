import { formatTimer } from "@/lib/resonaui/mockState";
import styles from "./CaptureTimer.module.css";

export function CaptureTimer({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className={styles.timerWrap}>
      <span className={styles.timer}>
        <span className={styles.dot} aria-hidden />
        {formatTimer(elapsedSeconds)}
      </span>
      <p className={styles.status}>Recording and shaping your voice</p>
    </div>
  );
}
