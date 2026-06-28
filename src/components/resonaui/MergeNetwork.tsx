import type { Participant, ParticipantColor } from "@/lib/resonaui/types";
import styles from "./MergeNetwork.module.css";

const COLOR_HEX: Record<ParticipantColor, string> = {
  blue: "#5EA0FF",
  purple: "#A06CFF",
  magenta: "#FF5AAE",
  cyan: "#7DE7FF"
};

const C = 150;

// Fixed orbit positions for up to 3 participant nodes.
const POSITIONS = [
  { x: 150, y: 44, labelDy: -22 },
  { x: 58, y: 214, labelDy: 30 },
  { x: 244, y: 206, labelDy: 30 }
];

export function MergeNetwork({
  participants
}: {
  participants: Participant[];
}) {
  const nodes = participants.slice(0, 3);

  return (
    <div className={styles.networkWrap}>
      <svg className={styles.svg} viewBox="0 0 300 300" aria-hidden>
        <defs>
          <radialGradient id="sharedOrb" cx="46%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(245,247,255,0.95)" />
            <stop offset="40%" stopColor="rgba(94,160,255,0.6)" />
            <stop offset="100%" stopColor="rgba(74,29,155,0.6)" />
          </radialGradient>
          <radialGradient id="mergeHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(122,61,255,0.4)" />
            <stop offset="70%" stopColor="rgba(122,61,255,0.06)" />
            <stop offset="100%" stopColor="rgba(122,61,255,0)" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={130} fill="url(#mergeHalo)" />

        {/* Orbital paths */}
        <ellipse
          cx={C}
          cy={C}
          rx={118}
          ry={108}
          fill="none"
          stroke="rgba(160,190,255,0.18)"
          strokeWidth={1}
        />

        {/* Connection lines */}
        {nodes.map((p, i) => {
          const pos = POSITIONS[i];
          const hex = COLOR_HEX[p.color];
          return (
            <path
              key={`link-${p.id}`}
              className={styles.link}
              d={`M ${C} ${C} Q ${(C + pos.x) / 2 + (i === 0 ? 24 : -24)} ${
                (C + pos.y) / 2
              } ${pos.x} ${pos.y}`}
              fill="none"
              stroke={hex}
              strokeWidth={1.6}
              strokeLinecap="round"
              opacity={0.7}
            />
          );
        })}

        {/* Central shared orb */}
        <g className={styles.centerOrb}>
          <circle cx={C} cy={C} r={42} fill="url(#sharedOrb)" />
          <circle
            cx={C}
            cy={C}
            r={42}
            fill="none"
            stroke="rgba(160,190,255,0.5)"
            strokeWidth={1.2}
          />
          <ellipse
            cx={C - 12}
            cy={C - 12}
            rx={11}
            ry={6}
            fill="rgba(255,255,255,0.5)"
          />
        </g>

        {/* Participant nodes */}
        {nodes.map((p, i) => {
          const pos = POSITIONS[i];
          const hex = COLOR_HEX[p.color];
          const below = pos.labelDy > 0;
          return (
            <g key={p.id}>
              <g
                className={styles.nodeGroup}
                style={{ animationDelay: `${i * 0.7}s` }}
              >
                <circle cx={pos.x} cy={pos.y} r={26} fill={`${hex}22`} />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={20}
                  fill={`${hex}55`}
                  stroke={hex}
                  strokeWidth={1.4}
                />
                <circle cx={pos.x - 5} cy={pos.y - 5} r={5} fill={`${hex}cc`} />
              </g>
              <text
                className={styles.nodeLabel}
                x={pos.x}
                y={pos.y + (below ? pos.labelDy : pos.labelDy)}
                textAnchor="middle"
              >
                {p.name}
              </text>
              <text
                className={styles.nodeRole}
                x={pos.x}
                y={pos.y + pos.labelDy + (below ? 15 : -15)}
                textAnchor="middle"
              >
                {p.role}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
