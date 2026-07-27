import { fbm } from "./noise";
import {
  blobPath,
  drawCausticField,
  drawChromaticRim,
  drawContactShadow,
  drawHalo,
  drawOrbitRings,
  drawPitchTrace,
  drawReactiveSpectrum,
  drawRecordingRing,
  drawSphericalDepth,
  drawSpecularHighlight,
  withAlpha,
  type DrawCtx
} from "./visualMatter";

/**
 * Liquid Matter — a luminous electric-blue plasma sphere. Bright white/cyan
 * caustic filaments flow across a curved, foreshortened surface over a deep
 * indigo core, with a violet glow leaking at the base. Caustic density and
 * brightness grow with `level`.
 */
export function drawLiquidMatter(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  const energy = m.energy;
  const breath = 1 + Math.sin(t * 0.6) * 0.016 + m.press * 0.05;
  const RR = R * breath;
  const amp = 0.045 + energy * 0.05;

  const distort = (a: number, ux: number, uy: number) =>
    amp * Math.sin(a * 5 + t * 1.1) * 0.5 +
    0.05 * fbm(ux * 1.8 + t * 0.25, uy * 1.8 - t * 0.18);

  drawHalo(d, 1.7);
  drawOrbitRings(d);
  drawReactiveSpectrum(d, 1.48);
  drawContactShadow(d, 0.38);

  // Deep body fill — dark indigo so the bright caustics read as light.
  ctx.save();
  const grad = ctx.createRadialGradient(
    cx - RR * 0.18,
    cy - RR * 0.22,
    RR * 0.05,
    cx,
    cy,
    RR * 1.08
  );
  grad.addColorStop(0, "rgba(60,110,235,0.95)");
  grad.addColorStop(0.34, "rgba(40,70,210,0.92)");
  grad.addColorStop(0.66, "rgba(40,46,170,0.92)");
  grad.addColorStop(0.9, "rgba(46,30,150,0.9)");
  grad.addColorStop(1, "rgba(70,40,170,0.32)");
  blobPath(ctx, cx, cy, RR, distort);
  ctx.fillStyle = grad;
  ctx.fill();
  drawSphericalDepth(
    { ...d, R: RR },
    distort,
    {
      shade: "rgba(0,8,55,1)",
      gloss: "rgba(190,235,255,1)",
      latitude: "rgba(120,210,255,1)",
      alpha: 0.92
    }
  );

  // Everything internal is clipped to the body.
  ctx.save();
  blobPath(ctx, cx, cy, RR, distort);
  ctx.clip();

  // Inner depth glow (centre brighter, like light scattering in the fluid).
  const inner = ctx.createRadialGradient(
    cx - RR * 0.1,
    cy - RR * 0.05,
    RR * 0.05,
    cx,
    cy,
    RR * 1.0
  );
  inner.addColorStop(0, "rgba(120,180,255,0.5)");
  inner.addColorStop(0.55, "rgba(70,110,255,0.18)");
  inner.addColorStop(1, "rgba(70,110,255,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = inner;
  ctx.fillRect(cx - RR, cy - RR, RR * 2, RR * 2);
  ctx.restore();

  // HERO: bright flowing caustic filaments. Density scales with energy.
  const causticCount = Math.round(16 + energy * 10 + m.press * 4);
  drawCausticField(d, {
    count: causticCount,
    color: "rgba(200,235,255,1)",
    glow: "rgba(120,180,255,0.9)",
    intensity: 0.58 + energy * 0.55 + m.press * 0.18,
    speed: 1.25 + m.pitchNorm * 0.3,
    width: 1.8 + energy * 1.15,
    seed: 11
  });
  // A sparser, faster cross layer for crisscross plasma feel.
  drawCausticField(d, {
    count: Math.round(9 + energy * 5),
    color: "rgba(170,210,255,1)",
    glow: "rgba(90,140,255,0.8)",
    intensity: 0.35 + energy * 0.3,
    speed: -0.7,
    width: 1.1,
    seed: 53
  });

  // Subtle expanding ripple rings for depth.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.4 + i / 3) % 1;
    const rr = RR * (0.18 + phase * 0.92);
    ctx.beginPath();
    ctx.arc(cx - RR * 0.08, cy - RR * 0.06, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190,225,255,${(1 - phase) * 0.12})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();

  // Violet glow pooling at the base (matches the reference under-light).
  drawSpecularHighlight(d, 0.05, 0.5, 0.6, "rgba(150,90,255,1)", 0.4);
  // Bright specular cap, upper-left.
  drawSpecularHighlight(d, -0.28, -0.34, 0.34, "rgba(225,242,255,1)", 0.55);

  ctx.restore(); // unclip

  drawChromaticRim(d, distort, withAlpha(pal.rim, 1), "rgba(150,90,255,1)");
  ctx.restore();

  drawRecordingRing(d);
  drawPitchTrace(d);
}
