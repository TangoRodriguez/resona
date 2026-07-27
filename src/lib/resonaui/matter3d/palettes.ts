import type { MatterType } from "@/lib/resonaui/types";

export type Matter3DPalette = {
  shell: string;
  core: string;
  inner: string;
  rim: string;
  rimWarm: string;
  ribbonA: string;
  ribbonB: string;
  ribbonC: string;
  particle: string;
  shadow: string;
};

export const matter3DPalettes: Record<MatterType, Matter3DPalette> = {
  glass: {
    shell: "#8fb8ff",
    core: "#f5faff",
    inner: "#245cff",
    rim: "#f4f8ff",
    rimWarm: "#a06cff",
    ribbonA: "#dceaff",
    ribbonB: "#7de7ff",
    ribbonC: "#7a3dff",
    particle: "#7de7ff",
    shadow: "#061c5f"
  },
  liquid: {
    shell: "#49baff",
    core: "#dffaff",
    inner: "#0e5cff",
    rim: "#7de7ff",
    rimWarm: "#a06cff",
    ribbonA: "#bff7ff",
    ribbonB: "#3bdcff",
    ribbonC: "#8f5dff",
    particle: "#b9f7ff",
    shadow: "#07133a"
  },
  bloom: {
    shell: "#ffb7ef",
    core: "#fff5fb",
    inner: "#d49bff",
    rim: "#ffd9fb",
    rimWarm: "#7de7ff",
    ribbonA: "#ffd6f7",
    ribbonB: "#ff79c6",
    ribbonC: "#7a3dff",
    particle: "#ffd0ef",
    shadow: "#24115f"
  }
};
