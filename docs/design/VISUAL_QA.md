# RESONA Visual QA

Reference targets:

- `docs/design/references/05-target-glass-orb.png`
- `docs/design/references/06-target-liquid-orb.png`
- `docs/design/references/07-target-bloom-membrane.png`

Use a smartphone screenshot as the primary comparison surface. Desktop can be used for fast iteration, but final quality should be judged on the phone viewport.

## Glass

- [ ] The canvas area has no visible square background.
- [ ] The orb reads as layered transparent glass, not a flat blue sphere.
- [ ] A strong white/cyan Fresnel rim is visible on the outer edge.
- [ ] Purple/cyan chromatic edge accents appear subtly, without turning into a cartoon outline.
- [ ] At least two internal lens sheets are visible.
- [ ] Wide translucent ribbon surfaces cross inside the orb.
- [ ] Thin caustic filaments add fine internal detail.
- [ ] Specular highlights look like soft reflected light on glass.

## Liquid

- [ ] Liquid is structurally different from Glass, not just a softer color variant.
- [ ] The outer volume is irregular and slowly wave-deformed.
- [ ] Vortex-like flowing bands are visible inside the body.
- [ ] Soft caustics and small bubbles/droplets are visible.
- [ ] The look suggests living water or luminous fluid.

## Bloom

- [ ] Bloom reads as a translucent membrane flower, not a flat flower icon.
- [ ] Inner and outer petal membranes overlap in 3D.
- [ ] The central emissive core glows without blowing out the whole image.
- [ ] Violet, pink, cyan, and blue layers remain distinct.
- [ ] Fine vein-like light and aurora sheets are visible.

## Shared Checks

- [ ] Glass / Liquid / Bloom differ by structure, not only by color.
- [ ] Orbit arcs stay subtle and do not become the main subject.
- [ ] Bloom/postprocessing affects bright parts, not the entire UI.
- [ ] Touch ripples appear dynamic and directional.
- [ ] Capture mode shows a magenta recording ring and melody trace.
- [ ] The app remains responsive on smartphone.
- [ ] `npm run build` passes.

## Phase 0.2.10 Lookdev Checks

- [ ] Glass reads as a transparent resonant lens, not a white glowing sphere.
- [ ] Glass internal ribbons read as variable-width luminous bands, not tubes or thin lines.
- [ ] Glass includes visible dark inner volume, lens sheets, sharp white/cyan rim, and local specular glints.
- [ ] Liquid reads as a vortexing fluid body, not a blue/glass sphere.
- [ ] Liquid includes large flowing bands, rim-like fluid crests, transparent bubbles, and soft caustic crossings.
- [ ] Bloom reads as layered translucent membrane bloom, not a flat flower icon.
- [ ] Bloom petals vary in count, length, width, tilt, opacity, hue, and phase.
- [ ] Bloom includes glowing membrane edges, internal vein-like shimmer, and a controlled core that does not wash out the petals.
- [ ] All modes preserve deep navy shadow while using saturated cyan, electric blue, violet, and magenta only in local emission areas.
- [ ] Animation is multi-speed: shell, ribbons, caustics, particles, core, membranes, and specular highlights drift independently.
