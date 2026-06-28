"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `cb(dt, t)` every animation frame while `active` is true.
 * dt = seconds since last frame (capped), t = seconds since start.
 */
export function useAnimationFrame(
  cb: (dt: number, t: number) => void,
  active = true
) {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const start = last;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cbRef.current(dt, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
