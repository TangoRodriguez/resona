import type { VisualQuality } from "./types";

export type QualitySettings = {
  sphereSegments: number;
  ribbonSegments: number;
  ribbonCount: number;
  particleCount: number;
  petals: number;
  effects: boolean;
};

export function resolveVisualQuality(): VisualQuality {
  if (typeof window === "undefined") return "high";
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const narrow = window.innerWidth < 430;
  if (memory <= 3) return "low";
  if (narrow || memory <= 4) return "medium";
  return "high";
}

export function qualitySettings(quality: VisualQuality): QualitySettings {
  if (quality === "low") {
    return {
      sphereSegments: 32,
      ribbonSegments: 48,
      ribbonCount: 3,
      particleCount: 8,
      petals: 8,
      effects: false
    };
  }
  if (quality === "medium") {
    return {
      sphereSegments: 48,
      ribbonSegments: 64,
      ribbonCount: 4,
      particleCount: 12,
      petals: 10,
      effects: true
    };
  }
  return {
    sphereSegments: 64,
    ribbonSegments: 80,
    ribbonCount: 5,
    particleCount: 18,
    petals: 12,
    effects: true
  };
}

