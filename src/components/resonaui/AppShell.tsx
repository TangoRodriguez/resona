import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell}>
      <div className={styles.shellAura} aria-hidden />
      <svg
        className={styles.shellContour}
        viewBox="0 0 430 900"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="contourGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(125, 231, 255, 0.18)" />
            <stop offset="100%" stopColor="rgba(122, 61, 255, 0.05)" />
          </linearGradient>
        </defs>
        {Array.from({ length: 7 }).map((_, i) => {
          const y = 120 + i * 110;
          return (
            <path
              key={i}
              d={`M -20 ${y} C 110 ${y - 40}, 320 ${y + 46}, 450 ${y - 10}`}
              fill="none"
              stroke="url(#contourGrad)"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      {children}
    </main>
  );
}
