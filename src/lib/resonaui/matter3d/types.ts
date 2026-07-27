import type { AppMode, MatterType } from "@/lib/resonaui/types";

export type VisualQuality = "high" | "medium" | "low";

export type Matter3DParams = {
  mode: AppMode;
  matter: MatterType;
  level: number;
  resonance: number;
  pitch?: number | null;
  pitchConfidence?: number;
  isRecording?: boolean;
  elapsedSeconds?: number;
  quality?: VisualQuality;
};

export type TouchPulse3D = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  strength: number;
  createdAt: number;
};

export type Matter3DRenderProps = Matter3DParams & {
  touches: TouchPulse3D[];
};

