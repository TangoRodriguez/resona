// RESONA core state model — see instructions section 7.

export type AppMode = "solo" | "capture" | "merge";

export type MatterType = "glass" | "liquid" | "bloom";

export type LoopColor = "blue" | "purple" | "magenta";

export type ParticipantColor = "blue" | "purple" | "magenta" | "cyan";

export type LoopItem = {
  id: string;
  name: string;
  durationSeconds: number;
  color?: LoopColor;
  matter?: MatterType;
  url?: string;
  mimeType?: string;
};

export type Participant = {
  id: string;
  name: string;
  role: string;
  color: ParticipantColor;
};

export type ResonanceAppState = {
  mode: AppMode;
  matter: MatterType;
  level: number;
  resonance: number;
  elapsedSeconds: number;
  loops: LoopItem[];
  participants: Participant[];
};
