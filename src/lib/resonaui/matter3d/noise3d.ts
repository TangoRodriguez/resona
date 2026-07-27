export function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return h - Math.floor(h);
}

export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), ux);
  const x10 = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), ux);
  const x01 = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), ux);
  const x11 = lerp(
    hash3(ix, iy + 1, iz + 1),
    hash3(ix + 1, iy + 1, iz + 1),
    ux
  );
  const y0 = lerp(x00, x10, uy);
  const y1 = lerp(x01, x11, uy);
  return lerp(y0, y1, uz) * 2 - 1;
}

export function fbm3(x: number, y: number, z: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += noise3(x * freq, y * freq, z * freq) * amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}

