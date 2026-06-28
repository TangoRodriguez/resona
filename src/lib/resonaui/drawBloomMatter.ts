import { fbm } from "./noise";
import {
  drawHalo,
  drawOrbitRings,
  drawPitchTrace,
  drawRecordingRing,
  withAlpha,
  type DrawCtx
} from "./visualMatter";

/**
 * Bloom Matter — a glowing flower of overlapping translucent membranes. Each
 * petal is filled (not outlined) with a soft gradient, only the petal rim
 * glows, and the layers stack from a bright core outward. Petals open with
 * `level`; pitch nudges the rotation. During capture a melody line threads
 * between the petals.
 */
export function drawBloomMatter(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  const energy = m.energy;
  const breath = 1 + Math.sin(t * 0.8) * 0.03 + m.press * 0.06;
  const open = 0.58 + energy * 0.42;
  const petals = 7;

  drawHalo(d, 1.75);
  drawOrbitRings(d);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.04 + (m.pitchNorm - 0.5) * 0.4);
  ctx.globalCompositeOperation = "lighter";

  // Three stacked petal rings build translucent depth (back → front).
  const layers = [
    { scale: 1.0, rot: 0, color: pal.mid, edge: pal.rim, alpha: 0.34 },
    { scale: 0.74, rot: Math.PI / petals, color: pal.inner, edge: pal.ribbon, alpha: 0.4 },
    { scale: 0.5, rot: 0, color: pal.core, edge: pal.highlight, alpha: 0.46 }
  ];

  for (const layer of layers) {
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + layer.rot;
      const wobble = 1 + fbm(i * 1.3, t * 0.3 + layer.scale) * 0.12;
      const len = R * open * breath * layer.scale * wobble;
      const width = R * 0.36 * layer.scale;

      ctx.save();
      ctx.rotate(ang);

      // Translucent membrane fill — brighter near the core, fading at the tip.
      const grad = ctx.createLinearGradient(0, 0, 0, -len);
      grad.addColorStop(0, withAlpha(layer.color, layer.alpha * 1.1));
      grad.addColorStop(0.45, withAlpha(layer.color, layer.alpha * 0.7));
      grad.addColorStop(1, withAlpha(layer.color, 0));

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width, -len * 0.3, width * 0.5, -len * 0.9, 0, -len);
      ctx.bezierCurveTo(-width * 0.5, -len * 0.9, -width, -len * 0.3, 0, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Only the petal rim glows (thin luminous edge).
      ctx.strokeStyle = withAlpha(layer.edge, 0.32);
      ctx.lineWidth = 1;
      ctx.shadowColor = withAlpha(layer.edge, 0.6);
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // Glowing core — bright bloom that pulses with energy.
  const coreR = R * (0.16 + energy * 0.08) * breath;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  cg.addColorStop(0, withAlpha(pal.core, 0.85));
  cg.addColorStop(0.35, withAlpha("rgba(255,190,240,1)", 0.42));
  cg.addColorStop(1, withAlpha("rgba(255,190,240,1)", 0));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Capture melody line threading between the petals.
  if (m.rec > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    const seg = 80;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const a = u * Math.PI * 2;
      const rr =
        R * (0.5 + 0.18 * Math.sin(u * Math.PI * petals + t * 1.4)) +
        fbm(u * 3 + t * 0.5, t * 0.3) * R * 0.1;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,200,238,${0.55 * m.rec})`;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "rgba(255,120,210,0.7)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  drawRecordingRing(d);
  drawPitchTrace(d);
}
