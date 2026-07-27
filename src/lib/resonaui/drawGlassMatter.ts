import { fbm } from "./noise";
import {
  blobPath,
  drawChromaticRim,
  drawContactShadow,
  drawHalo,
  drawOrbitRings,
  drawOrganicContour,
  drawPitchTrace,
  drawReactiveSpectrum,
  drawRecordingRing,
  drawRefractiveRibbon,
  drawSphericalDepth,
  drawSpecularHighlight,
  withAlpha,
  type DrawCtx
} from "./visualMatter";

/**
 * Glass Matter — a refractive crystal sphere. A deep blue→violet body holds
 * several translucent refractive ribbons and fine contour striations, a
 * bright window-like specular highlight, a violet inner reflection, and a
 * soft multi-pass chromatic rim. Distortion is small so it reads as solid.
 */
export function drawGlassMatter(d: DrawCtx) {
  const { ctx, cx, cy, R, t, m, pal } = d;
  const energy = m.energy;
  const breath = 1 + Math.sin(t * 0.7) * 0.012 + m.press * 0.04;
  const RR = R * breath;

  const distort = (a: number, ux: number, uy: number) =>
    (0.016 + energy * 0.02) * Math.sin(a * 3 + t * 0.5) +
    0.02 * fbm(ux * 1.4 + t * 0.05, uy * 1.4);

  drawHalo(d, 1.6);
  drawOrbitRings(d);
  drawReactiveSpectrum(d, 1.46);
  drawContactShadow(d, 0.34);

  // Body fill — luminous blue centre fading to deep violet at the rim.
  ctx.save();
  const grad = ctx.createRadialGradient(
    cx - RR * 0.26,
    cy - RR * 0.3,
    RR * 0.06,
    cx,
    cy,
    RR * 1.06
  );
  grad.addColorStop(0, "rgba(196,224,255,0.96)");
  grad.addColorStop(0.24, "rgba(120,170,255,0.8)");
  grad.addColorStop(0.58, "rgba(70,90,235,0.78)");
  grad.addColorStop(0.85, "rgba(74,40,180,0.74)");
  grad.addColorStop(1, "rgba(58,28,150,0.55)");
  blobPath(ctx, cx, cy, RR, distort);
  ctx.fillStyle = grad;
  ctx.fill();
  drawSphericalDepth(
    { ...d, R: RR },
    distort,
    {
      shade: "rgba(3,6,38,1)",
      gloss: "rgba(240,248,255,1)",
      latitude: "rgba(180,215,255,1)",
      alpha: 1
    }
  );

  // Internal refraction, clipped to the body.
  ctx.save();
  blobPath(ctx, cx, cy, RR, distort);
  ctx.clip();

  // Stacked translucent refractive ribbons — light bending inside the glass.
  drawRefractiveRibbon(d, {
    radius: 0.76 + energy * 0.03,
    thickness: 0.05,
    color: "rgba(180,215,255,1)",
    alpha: 0.4,
    phase: 0.4,
    speed: 0.5,
    tilt: 0.9
  });
  drawRefractiveRibbon(d, {
    radius: 0.56 + m.pitchNorm * 0.04,
    thickness: 0.06,
    color: "rgba(150,120,255,1)",
    alpha: 0.34,
    phase: 2.1,
    speed: -0.4,
    tilt: 1.05
  });
  drawRefractiveRibbon(d, {
    radius: 0.38 + energy * 0.04,
    thickness: 0.05,
    color: "rgba(210,230,255,1)",
    alpha: 0.4,
    phase: 4.0,
    speed: 0.62,
    tilt: 0.96
  });

  // Fine internal striation.
  drawOrganicContour(d, 4, "rgba(190,215,255,1)", 0.08);
  drawOrganicContour(d, 5, "rgba(255,255,255,1)", 0.045 + energy * 0.03);

  // Violet inner reflection low-right.
  drawSpecularHighlight(d, 0.32, 0.36, 0.8, "rgba(150,90,255,1)", 0.4);

  // Cyan refraction glint, mid-right.
  drawSpecularHighlight(d, 0.34, -0.06, 0.4, "rgba(125,231,255,1)", 0.3);

  ctx.restore(); // unclip internal

  // Bright window-like specular highlight (kept above the rim, source-over).
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const hl = ctx.createRadialGradient(
    cx - RR * 0.34,
    cy - RR * 0.4,
    2,
    cx - RR * 0.34,
    cy - RR * 0.4,
    RR * 0.5
  );
  hl.addColorStop(0, withAlpha(pal.highlight, 0.92));
  hl.addColorStop(0.5, withAlpha(pal.highlight, 0.28));
  hl.addColorStop(1, withAlpha(pal.highlight, 0));
  ctx.fillStyle = hl;
  // clip again so the highlight stays on the glass
  blobPath(ctx, cx, cy, RR, distort);
  ctx.clip();
  ctx.fillRect(cx - RR, cy - RR, RR * 2, RR * 2);
  ctx.restore();

  drawChromaticRim(d, distort, withAlpha(pal.rim, 1), "rgba(255,110,210,1)");
  ctx.restore();

  drawRecordingRing(d);
  drawPitchTrace(d);
}
