// Visual Matter Engine — shared types, smoothing, palettes and common
// canvas helpers. Designed so audio (level / pitch) can drive the visuals
// later without touching the matter draw functions.

import { fbm } from "./noise";
import type { AppMode, MatterType } from "./types";

export type SoundMatterParams = {
  mode: AppMode;
  matter: MatterType;
  level: number; // 0..1 — will be fed by mic RMS later
  resonance: number; // 0..1
  pitch?: number | null; // Hz, optional (Phase 0.3B)
  pitchConfidence?: number; // 0..1
  isRecording?: boolean;
  elapsedSeconds?: number;
};

export type MatterPalette = {
  core: string;
  inner: string;
  mid: string;
  edge: string;
  highlight: string;
  ribbon: string;
  rim: string;
  haloRGB: [number, number, number];
  particle: string;
};

export const palettes: Record<MatterType, MatterPalette> = {
  glass: {
    core: "rgba(245,247,255,0.96)",
    inner: "rgba(170,225,255,0.62)",
    mid: "rgba(70,120,255,0.55)",
    edge: "rgba(74,29,155,0.5)",
    highlight: "rgba(255,255,255,0.85)",
    ribbon: "rgba(190,215,255,1)",
    rim: "rgba(160,200,255,0.9)",
    haloRGB: [94, 150, 255],
    particle: "rgba(125,231,255,1)"
  },
  liquid: {
    core: "rgba(225,240,255,0.95)",
    inner: "rgba(120,170,255,0.7)",
    mid: "rgba(60,90,255,0.7)",
    edge: "rgba(86,40,190,0.7)",
    highlight: "rgba(220,240,255,0.9)",
    ribbon: "rgba(150,200,255,1)",
    rim: "rgba(150,190,255,0.85)",
    haloRGB: [88, 110, 255],
    particle: "rgba(150,200,255,1)"
  },
  bloom: {
    core: "rgba(255,225,245,0.92)",
    inner: "rgba(220,160,255,0.6)",
    mid: "rgba(160,108,255,0.55)",
    edge: "rgba(122,61,255,0.45)",
    highlight: "rgba(255,235,250,0.85)",
    ribbon: "rgba(255,200,235,1)",
    rim: "rgba(220,170,255,0.85)",
    haloRGB: [150, 110, 255],
    particle: "rgba(255,180,230,1)"
  }
};

// Smoothed motion state, persisted across frames in a ref.
export type MatterMotion = {
  energy: number; // smoothed level
  rec: number; // smoothed recording amount 0..1
  pitchNorm: number; // smoothed normalized pitch 0..1
  press: number; // pointer press boost 0..1
  time: number; // animation clock (seconds)
};

export function createMotion(): MatterMotion {
  return { energy: 0.22, rec: 0, pitchNorm: 0.5, press: 0, time: 0 };
}

/** Frame-rate independent exponential damping. */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Map a pitch in Hz onto 0..1 (log scale, vocal range). */
export function normalizePitch(pitch: number): number {
  const min = Math.log(80);
  const max = Math.log(900);
  return clamp((Math.log(clamp(pitch, 80, 900)) - min) / (max - min), 0, 1);
}

export type DrawCtx = {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  R: number;
  t: number;
  m: MatterMotion;
  params: SoundMatterParams;
  pal: MatterPalette;
};

/** Build a closed, noise-distorted "blob" outline path. */
export function blobPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  distort: (angle: number, ux: number, uy: number) => number,
  segments = 96
) {
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const r = R * (1 + distort(a, ux, uy));
    const x = cx + ux * r;
    const y = cy + uy * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Soft radial glow behind the matter. */
export function drawHalo(d: DrawCtx, scale = 1.5) {
  const { ctx, cx, cy, R, m, pal } = d;
  const [r, g, b] = pal.haloRGB;
  const intensity = 0.28 + m.energy * 0.4 + m.rec * 0.12;
  const grad = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * scale);
  grad.addColorStop(0, `rgba(${r},${g},${b},${intensity})`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},${intensity * 0.25})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, R * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Distorted orbital rings + travelling light particles. */
export function drawOrbitRings(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  ctx.save();
  const ringCount = 5;
  for (let k = 0; k < ringCount; k++) {
    const baseR = R * (1.12 + k * 0.13);
    const tilt = 0.82 - k * 0.015;
    const rot = t * (0.05 + k * 0.012) * (k % 2 === 0 ? 1 : -1);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    const seg = 120;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const wob =
        1 + 0.04 * fbm(Math.cos(a) * 1.4 + k, Math.sin(a) * 1.4 + t * 0.1);
      const x = Math.cos(a) * baseR * wob;
      const y = Math.sin(a) * baseR * tilt * wob;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(160,190,255,${0.16 - k * 0.02})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Travelling particles
  ctx.globalCompositeOperation = "lighter";
  const particles = 4;
  for (let i = 0; i < particles; i++) {
    const ringR = R * (1.14 + (i % 3) * 0.13);
    const tilt = 0.82 - (i % 3) * 0.015;
    const speed = 0.18 + i * 0.05;
    const a = t * speed + (i / particles) * Math.PI * 2;
    const x = cx + Math.cos(a) * ringR;
    const y = cy + Math.sin(a) * ringR * tilt;
    const pr = 2 + (i % 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, pr * 3);
    g.addColorStop(0, pal.particle);
    g.addColorStop(1, "rgba(125,231,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, pr * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Soft contact glow under the matter, giving the orb a physical stage. */
export function drawContactShadow(d: DrawCtx, alpha = 0.32) {
  const { ctx, cx, cy, R, m, pal } = d;
  const [r, g, b] = pal.haloRGB;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const y = cy + R * (0.88 + m.press * 0.06);
  const gnd = ctx.createRadialGradient(cx, y, 0, cx, y, R * 1.22);
  gnd.addColorStop(0, `rgba(${r},${g},${b},${alpha * (0.45 + m.energy * 0.8)})`);
  gnd.addColorStop(0.42, `rgba(${r},${g},${b},${alpha * 0.28})`);
  gnd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.translate(cx, y);
  ctx.scale(1.08, 0.18);
  ctx.fillStyle = gnd;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** NCS-like reactive bars wrapped around the matter without crowding the UI. */
export function drawReactiveSpectrum(d: DrawCtx, scale = 1.42) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  const [r, g, b] = pal.haloRGB;
  const count = 72;
  const baseR = R * scale;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wave =
      0.5 +
      0.5 *
        Math.sin(i * 0.53 + t * 2.3 + m.pitchNorm * Math.PI * 3);
    const noise = 0.5 + 0.5 * fbm(i * 0.08, t * 0.42);
    const amp = 0.12 + m.energy * (0.58 * wave + 0.28 * noise) + m.press * 0.2;
    const len = R * 0.02 + R * 0.18 * amp;
    const tilt = 0.83;
    const x1 = cx + Math.cos(a) * baseR;
    const y1 = cy + Math.sin(a) * baseR * tilt;
    const x2 = cx + Math.cos(a) * (baseR + len);
    const y2 = cy + Math.sin(a) * (baseR + len) * tilt;
    const visible = 0.18 + 0.42 * Math.max(0, Math.sin(a + Math.PI * 0.2));

    ctx.strokeStyle = `rgba(${r},${g},${b},${visible * (0.18 + m.energy * 0.42)})`;
    ctx.lineWidth = 0.8 + amp * 1.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Shared inner 3D shell: refraction bands, lower shade, and surface gloss. */
export function drawSphericalDepth(
  d: DrawCtx,
  distort: (angle: number, ux: number, uy: number) => number,
  opts: {
    shade: string;
    gloss: string;
    latitude: string;
    alpha?: number;
  }
) {
  const { ctx, cx, cy, R, t, m } = d;
  const alpha = opts.alpha ?? 1;

  ctx.save();
  blobPath(ctx, cx, cy, R, distort);
  ctx.clip();

  const lower = ctx.createRadialGradient(
    cx + R * 0.18,
    cy + R * 0.58,
    R * 0.08,
    cx,
    cy,
    R * 1.08
  );
  lower.addColorStop(0, withAlpha(opts.shade, 0.28 * alpha));
  lower.addColorStop(0.58, withAlpha(opts.shade, 0.12 * alpha));
  lower.addColorStop(1, withAlpha(opts.shade, 0));
  ctx.fillStyle = lower;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const y = cy + (k - 0.5) * R * 1.22;
    const width = R * Math.sqrt(Math.max(0.05, 1 - Math.pow(k * 2 - 1, 2)));
    const wob = Math.sin(t * 0.65 + i * 1.2 + m.pitchNorm * 2) * R * 0.035;
    ctx.beginPath();
    ctx.ellipse(
      cx + wob,
      y,
      width * (0.75 + m.energy * 0.1),
      R * (0.055 + 0.018 * Math.sin(t + i)),
      Math.sin(t * 0.16 + i) * 0.2,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = withAlpha(opts.latitude, (0.045 + m.energy * 0.07) * alpha);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const gloss = ctx.createRadialGradient(
    cx - R * 0.3,
    cy - R * 0.48,
    0,
    cx - R * 0.3,
    cy - R * 0.48,
    R * 0.92
  );
  gloss.addColorStop(0, withAlpha(opts.gloss, 0.52 * alpha));
  gloss.addColorStop(0.3, withAlpha(opts.gloss, 0.14 * alpha));
  gloss.addColorStop(0.68, withAlpha(opts.gloss, 0.02 * alpha));
  gloss.addColorStop(1, withAlpha(opts.gloss, 0));
  ctx.fillStyle = gloss;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

/** Internal flowing ribbon highlights (used by Glass & Liquid). */
export function drawRibbons(d: DrawCtx, count: number, alpha: number) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const phase = i * 1.7;
    ctx.beginPath();
    const seg = 48;
    for (let j = 0; j <= seg; j++) {
      const u = j / seg;
      const ang = u * Math.PI * 2;
      const rr =
        R * (0.28 + 0.52 * (i / count)) +
        fbm(Math.cos(ang) * 1.3 + phase + t * 0.18, Math.sin(ang) * 1.3) *
          R *
          (0.16 + m.energy * 0.12);
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr * 0.96;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const a = alpha * (0.5 + 0.5 * Math.sin(t * 0.9 + i));
    ctx.strokeStyle = pal.ribbon.replace(/1\)$/, `${a.toFixed(3)})`);
    ctx.lineWidth = 1.1 + m.energy * 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

/** Rim light with subtle chromatic aberration. */
export function drawRim(
  d: DrawCtx,
  distort: (angle: number, ux: number, uy: number) => number
) {
  const { ctx, cx, cy, R, pal } = d;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = pal.rim;
  ctx.shadowBlur = 10;

  // chromatic offsets (cyan / magenta) + main rim — kept soft & luminous,
  // never a hard cartoon outline.
  const passes: { dx: number; dy: number; color: string; w: number }[] = [
    { dx: -1.4, dy: -0.7, color: "rgba(125,231,255,0.3)", w: 1 },
    { dx: 1.4, dy: 0.7, color: "rgba(255,120,210,0.24)", w: 1 },
    { dx: 0, dy: 0, color: pal.rim.replace(/0\.\d+\)$/, "0.5)"), w: 1.1 }
  ];
  for (const p of passes) {
    blobPath(ctx, cx + p.dx, cy + p.dy, R, distort);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.w;
    ctx.stroke();
  }
  ctx.restore();
}

/** Magenta recording ring + progress arc (capture mode). */
export function drawRecordingRing(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m, params } = d;
  if (m.rec < 0.01) return;
  const ringR = R * 1.28;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // dashed rotating ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.setLineDash([2, 9]);
  ctx.strokeStyle = `rgba(255,90,174,${0.4 * m.rec})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // progress arc
  const prog = ((params.elapsedSeconds ?? 0) % 20) / 20;
  const grad = ctx.createLinearGradient(
    cx - ringR,
    cy - ringR,
    cx + ringR,
    cy + ringR
  );
  grad.addColorStop(0, "rgba(255,90,174,1)");
  grad.addColorStop(0.55, "rgba(160,108,255,1)");
  grad.addColorStop(1, "rgba(94,160,255,1)");
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
  ctx.strokeStyle = grad;
  ctx.globalAlpha = m.rec;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/** Pitch trace line crossing the orb (capture mode). */
export function drawPitchTrace(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m } = d;
  if (m.rec < 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - R, cy - R, R * 2, R * 2);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";

  const seg = 64;
  ctx.beginPath();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const x = cx - R + u * R * 2;
    // pitch drives vertical center; noise adds life
    const base = cy + (0.5 - m.pitchNorm) * R * 0.8;
    const y =
      base +
      Math.sin(u * Math.PI * 3 + t * 1.6) * R * 0.18 +
      fbm(u * 3 + t * 0.6, t * 0.3) * R * 0.12;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(255,185,228,${0.85 * m.rec})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,90,174,0.8)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Phase 0.2.6 — premium quality helpers (refraction / caustics / membranes).
// All additive, kept performant, and tuned to read like generated reference
// imagery: refractive glass, flowing liquid caustics, glowing membranes.
// ---------------------------------------------------------------------------

/** Replace the trailing alpha of an `rgba(r,g,b,a)` string. */
export function withAlpha(rgba: string, a: number): string {
  const v = clamp(a, 0, 1).toFixed(3);
  if (rgba.startsWith("rgba")) return rgba.replace(/[\d.]+\)$/, `${v})`);
  if (rgba.startsWith("rgb")) return rgba.replace(/\)$/, `, ${v})`).replace("rgb", "rgba");
  return rgba;
}

/**
 * Flowing caustic field — the bright, luminous filaments that make liquid /
 * glass read as light refracting through a curved surface. Streaks hug the
 * sphere (amplitude tapers near the poles) and crisscross organically.
 * Must be called inside an existing clip to the matter body.
 */
export function drawCausticField(
  d: DrawCtx,
  opts: {
    count: number;
    color: string;
    glow: string;
    intensity: number; // 0..1 overall brightness
    speed: number;
    width: number;
    seed?: number;
  }
) {
  const { ctx, cx, cy, R, t } = d;
  const { count, color, glow, intensity, speed, width } = opts;
  const seed = opts.seed ?? 0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = glow;

  for (let i = 0; i < count; i++) {
    // Each streak rides a latitude band across the sphere.
    const band = (i + 0.5) / count; // 0..1
    const yBase = cy + (band - 0.5) * R * 1.7;
    // Sphere foreshortening: bands near the centre are wider.
    const lat = (band - 0.5) * 2; // -1..1
    const halfW = R * Math.sqrt(Math.max(0.04, 1 - lat * lat));
    const phase = i * 1.37 + seed;
    const pulse = 0.45 + 0.55 * Math.sin(t * speed + phase * 1.7);

    ctx.beginPath();
    const segs = 44;
    for (let j = 0; j <= segs; j++) {
      const u = j / segs;
      const x = cx - halfW + u * halfW * 2;
      const warp =
        fbm(u * 2.4 + t * speed * 0.5 + phase, band * 3 + t * 0.22) * R * 0.28 +
        Math.sin(u * Math.PI * 3 + t * speed + phase) * R * 0.05;
      // Taper amplitude toward the chord ends so streaks curve with the body.
      const taper = Math.sin(u * Math.PI);
      const y = yBase + warp * taper;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const a = intensity * pulse;
    // Bright thin core with a soft glow underneath.
    ctx.shadowBlur = 10;
    ctx.strokeStyle = withAlpha(color, a * 0.9);
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha("rgba(255,255,255,1)", a * 0.5);
    ctx.lineWidth = width * 0.4;
    ctx.stroke();
  }
  ctx.restore();
}

/** Soft specular highlight blob (e.g. the bright window on glass). */
export function drawSpecularHighlight(
  d: DrawCtx,
  ox: number,
  oy: number,
  radius: number,
  color: string,
  alpha: number
) {
  const { ctx, cx, cy, R } = d;
  const x = cx + ox * R;
  const y = cy + oy * R;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * R);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.5, withAlpha(color, alpha * 0.32));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius * R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A single translucent refractive ribbon — a wide, gradient-filled band that
 * curves through the body, giving the sense of light bending inside glass.
 */
export function drawRefractiveRibbon(
  d: DrawCtx,
  opts: {
    radius: number; // 0..1 of R, mean distance from centre
    thickness: number; // 0..1 of R
    color: string;
    alpha: number;
    phase: number;
    speed: number;
    tilt?: number;
  }
) {
  const { ctx, cx, cy, R, t } = d;
  const { radius, thickness, color, alpha, phase, speed } = opts;
  const tilt = opts.tilt ?? 0.94;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const segs = 80;
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const wob =
      fbm(Math.cos(a) * 1.3 + phase + t * speed * 0.4, Math.sin(a) * 1.3) *
      0.22;
    const rr = R * (radius + wob);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * tilt;
    const w = (thickness * R) * (0.5 + 0.5 * Math.sin(a * 2 + phase));
    pts.push([x, y, w]);
  }
  // Outer edge forward, inner edge back, to build a closed ribbon.
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y, w] = pts[i];
    const a = (i / segs) * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a) * tilt;
    const px = x + nx * w;
    const py = y + ny * w;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const [x, y, w] = pts[i];
    const a = (i / segs) * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a) * tilt;
    ctx.lineTo(x - nx * w, y - ny * w);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, R * radius * 0.6, cx, cy, R);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.7, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, alpha * 0.2));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/**
 * Multi-pass chromatic rim — several luminous, slightly offset outlines
 * (cyan / magenta split + warm + main) that read as a glowing edge rather
 * than a hard line.
 */
export function drawChromaticRim(
  d: DrawCtx,
  distort: (angle: number, ux: number, uy: number) => number,
  rim: string,
  warm: string
) {
  const { ctx, cx, cy, R } = d;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const passes: Array<{ dx: number; dy: number; color: string; w: number; blur: number }> = [
    { dx: -1.6, dy: -0.8, color: "rgba(120,235,255,0.30)", w: 1.0, blur: 8 },
    { dx: 1.6, dy: 0.8, color: "rgba(255,110,210,0.26)", w: 1.0, blur: 8 },
    { dx: 0, dy: 0, color: withAlpha(rim, 0.55), w: 1.4, blur: 14 },
    { dx: 0, dy: 1.2, color: withAlpha(warm, 0.4), w: 1.0, blur: 16 }
  ];
  for (const p of passes) {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.blur;
    blobPath(ctx, cx + p.dx, cy + p.dy, R, distort);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.w;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Layered translucent membrane — a soft, filled, noise-distorted blob used
 * to build up depth (stacked glass shells / bloom petals). Filled with a
 * radial gradient and an optional luminous edge.
 */
export function drawLayeredMembrane(
  d: DrawCtx,
  opts: {
    radius: number; // 0..1 of R
    color: string;
    alpha: number;
    edge?: string;
    edgeAlpha?: number;
    distortAmount: number;
    phase: number;
    speed: number;
    tilt?: number;
  }
) {
  const { ctx, cx, cy, R, t } = d;
  const tilt = opts.tilt ?? 1;
  const rr = R * opts.radius;
  const distort = (a: number, ux: number, uy: number) =>
    opts.distortAmount *
    (Math.sin(a * 3 + opts.phase + t * opts.speed) * 0.5 +
      fbm(ux * 1.5 + opts.phase, uy * 1.5 + t * opts.speed * 0.3));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  const segs = 72;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const r = rr * (1 + distort(a, ux, uy));
    const x = cx + ux * r;
    const y = cy + uy * r * tilt;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, rr * 0.1, cx, cy, rr * 1.05);
  g.addColorStop(0, withAlpha(opts.color, opts.alpha));
  g.addColorStop(0.7, withAlpha(opts.color, opts.alpha * 0.5));
  g.addColorStop(1, withAlpha(opts.color, 0));
  ctx.fillStyle = g;
  ctx.fill();
  if (opts.edge) {
    ctx.strokeStyle = withAlpha(opts.edge, opts.edgeAlpha ?? 0.4);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Fine organic contour lines (subtle internal striation). */
export function drawOrganicContour(
  d: DrawCtx,
  count: number,
  color: string,
  alpha: number
) {
  const { ctx, cx, cy, R, t } = d;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const base = 0.24 + 0.62 * (i / count);
    ctx.beginPath();
    const segs = 80;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const rr =
        R * base +
        fbm(Math.cos(a) * 1.6 + i * 0.7 + t * 0.05, Math.sin(a) * 1.6) *
          R *
          0.07;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = withAlpha(color, alpha * (0.5 + 0.5 * Math.sin(t + i)));
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
