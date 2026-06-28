# RESONA

> Touch your voice. Sound becomes matter.

RESONA is a mobile-first interactive web music app where **voice, touch, melody, and synced users become visual matter**. Sound is shaped into glass, liquid, or bloom — a luminous central object that reacts to what you do, and (in upcoming phases) to real audio.

Built with **Next.js (App Router) + React 19 + TypeScript** and a custom **Canvas 2D Visual Matter Engine**. Audio uses the **Web Audio API** (no heavy DSP libraries).

---

## Features

- **Sound Matter Canvas** — a premium, organic, noise-distorted central visual (Glass / Liquid / Bloom), architected so real audio can drive it.
- **Three matters** with distinct physicality and distinct synth voices.
- **Capture mode** — recording ring, melody/pitch trace, loop chips.
- **Merge mode** — multi-user resonance network.
- **Ambient Layer** — a default bed track (`June21.wav`) you can toggle and mix.
- Mobile-first layout, dark UI, designed for iOS Safari / Android Chrome.

---

## Local development

Requirements: Node.js 18.18+ (Node 20/22 recommended) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Build

```bash
npm run build
npm run start   # serve the production build locally
```

`npm run lint` runs the Next.js lint pass.

---

## Audio notes

- Audio starts **muted** until the first user gesture. Tap **Enable Audio** (or the central matter) to unlock the `AudioContext` — this is required by mobile browsers.
- The default ambient track lives in [`public/audio/defaults/June21.wav`](public/audio/defaults/June21.wav) and is served at `/audio/defaults/June21.wav`.
- Tapping the central matter plays a per-matter synth note; the vertical tap position controls pitch.
- **Microphone input requires HTTPS** (a secure context). It will not work over a plain `http://192.168.x.x` LAN address — deploy to Vercel (HTTPS) to test mic features on a phone.

---

## Deploy to Vercel

Full step-by-step guide: [docs/deploy/VERCEL_DEPLOY.md](docs/deploy/VERCEL_DEPLOY.md).

Quick version:

```bash
git init
git add .
git commit -m "RESONA"
# create a GitHub repo, then:
git remote add origin <your-repo-url>
git push -u origin main
```

Then in Vercel: **Import Git Repository** → it auto-detects Next.js.

| Setting          | Value           |
| ---------------- | --------------- |
| Framework        | Next.js         |
| Build Command    | `npm run build` |
| Install Command  | `npm install`   |
| Output Directory | (default)       |
| Env Variables    | none (for now)  |

---

## Phone testing checklist

- Open the Vercel **HTTPS** URL on your phone.
- UI should be centered, with no horizontal scroll and no accidental zoom.
- Tap **Enable Audio** first so sound can play.
- For future mic features, allow microphone permission (HTTPS only).

---

## Project structure (high level)

```
public/audio/defaults/June21.wav   # default ambient bed
src/app/                           # Next.js App Router (layout, page, globals)
src/components/resonaui/           # UI components (canvas, controls, meters…)
src/hooks/                         # useAnimationFrame, useAudioEngine
src/lib/resonaui/                  # Visual Matter Engine (noise, palettes, draw fns)
src/lib/audio/                     # Web Audio engine, synth presets, track player
```
