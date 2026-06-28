"use client";

import type { MatterType } from "@/lib/resonaui/types";
import styles from "./MatterSelector.module.css";

const OPTIONS: { value: MatterType; label: string }[] = [
  { value: "glass", label: "Glass" },
  { value: "liquid", label: "Liquid" },
  { value: "bloom", label: "Bloom" }
];

function MatterIcon({ type }: { type: MatterType }) {
  if (type === "glass") {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <path
          d="M13 2 4 8v10l9 6 9-6V8l-9-6Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M13 2v22M4 8l9 5 9-5M4 18l9-5 9 5"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    );
  }
  if (type === "liquid") {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
        <path
          d="M13 3c4 5 6.5 8.2 6.5 11.5A6.5 6.5 0 0 1 6.5 14.5C6.5 11.2 9 8 13 3Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // bloom — flower of overlapping circles
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.1">
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (Math.PI * 2 * i) / 6;
          // Round to avoid SSR/client float hydration mismatches.
          const cx = Math.round((13 + Math.cos(a) * 5) * 1000) / 1000;
          const cy = Math.round((13 + Math.sin(a) * 5) * 1000) / 1000;
          return <circle key={i} cx={cx} cy={cy} r={4} />;
        })}
        <circle cx={13} cy={13} r={3} />
      </g>
    </svg>
  );
}

export function MatterSelector({
  matter,
  onChange
}: {
  matter: MatterType;
  onChange: (matter: MatterType) => void;
}) {
  return (
    <div className={styles.selector} role="tablist" aria-label="Sound matter">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={matter === opt.value}
          data-active={matter === opt.value}
          className={styles.option}
          onClick={() => onChange(opt.value)}
        >
          <span className={styles.icon}>
            <MatterIcon type={opt.value} />
          </span>
          <span className={styles.label}>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
