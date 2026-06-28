# Deploying RESONA to Vercel

This guide takes RESONA from your local machine to a public **HTTPS** URL you can
open on a phone. HTTPS matters because future microphone features require a
secure context (`getUserMedia` does not work over plain `http://` LAN IPs).

---

## 1. Prerequisites

- A [GitHub](https://github.com) account.
- A [Vercel](https://vercel.com) account (free Hobby plan is enough).
- Git installed locally.
- The app builds cleanly: run `npm run build` and confirm it succeeds.

---

## 2. Push to GitHub

From the project root (`RESONA/`):

```bash
git init
git add .
git commit -m "RESONA prototype"
```

Create an **empty** repository on GitHub (no README/license, to avoid conflicts),
then connect and push:

```bash
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> The `.gitignore` already excludes `node_modules`, `.next`, and local env files.
> The default audio file in `public/audio/defaults/` **is** committed so the
> ambient layer works in production.

---

## 3. Import into Vercel

1. Go to the Vercel dashboard → **Add New… → Project**.
2. **Import Git Repository** and pick your RESONA repo.
3. Vercel auto-detects **Next.js**. Confirm these settings:

   | Setting           | Value           |
   | ----------------- | --------------- |
   | Framework Preset  | Next.js         |
   | Build Command     | `npm run build` |
   | Install Command   | `npm install`   |
   | Output Directory  | (leave default) |
   | Root Directory    | `./`            |

4. **Environment Variables:** none required for this phase.
5. Click **Deploy**.

When the build finishes, Vercel gives you a URL like
`https://resona-xxxx.vercel.app`.

---

## 4. Automatic deployments

Once linked, every `git push` triggers a deploy:

- Pushes to `main` → **Production** deployment.
- Pushes to other branches / PRs → **Preview** deployments with their own URL.

---

## 5. Test on your phone

1. Open the **HTTPS** Vercel URL on your phone.
2. Confirm:
   - The layout is centered, no horizontal scrolling, no pinch-zoom drift.
   - The central matter animates smoothly.
   - Tapping **Enable Audio** unlocks sound, then tapping the matter plays notes.
3. For future microphone features, grant mic permission when prompted (HTTPS only).

---

## 6. Troubleshooting

- **No sound on mobile:** browsers block audio until a user gesture. Tap
  **Enable Audio** (this calls `AudioContext.resume()`), then interact.
- **Build fails on Vercel but works locally:** ensure Node version matches.
  RESONA targets Node 18.18+/20/22; set it under **Project → Settings → Node.js Version** if needed.
- **404 on the audio file:** confirm `public/audio/defaults/June21.wav` is
  committed (not ignored) and the path is `/audio/defaults/June21.wav`.
