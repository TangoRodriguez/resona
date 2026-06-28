import type { MatterType, ResonanceAppState } from "./types";

// Default mock state — see instructions section 7.
export const defaultResonanceState: ResonanceAppState = {
  mode: "solo",
  matter: "glass",
  level: 0.63,
  resonance: 0.72,
  elapsedSeconds: 8,
  loops: [
    { id: "loop-01", name: "Loop 01", durationSeconds: 7, color: "magenta" },
    { id: "loop-02", name: "Loop 02", durationSeconds: 5, color: "purple" }
  ],
  participants: [
    { id: "luna", name: "Luna", role: "Vocals", color: "blue" },
    { id: "kai", name: "Kai", role: "Keys", color: "purple" },
    { id: "you", name: "You", role: "Ambient", color: "cyan" }
  ]
};

// Mode + matter aware subtitle copy — see UI spec section 5 / 9.
export function getSubtitle(
  mode: ResonanceAppState["mode"],
  matter: MatterType
): string {
  if (mode === "capture") return "Tracing your melody.";
  if (mode === "merge") return "3 people resonating.";
  if (matter === "liquid") return "Shape sound as liquid.";
  if (matter === "bloom") return "Let sound bloom.";
  return "Touch your voice.";
}

export function formatTimer(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}
