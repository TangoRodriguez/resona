import * as THREE from "three";

export function makeRibbonCurve(
  seed: number,
  radius = 1,
  height = 0,
  twist = 1
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80;
    const a = u * Math.PI * 2;
    const wobble = Math.sin(a * 3 + seed) * 0.12 + Math.cos(a * 5 - seed) * 0.05;
    const r = radius * (0.42 + wobble + 0.16 * Math.sin(a * 2 + seed));
    points.push(
      new THREE.Vector3(
        Math.cos(a + seed * 0.07) * r,
        Math.sin(a * twist + seed) * 0.32 + height,
        Math.sin(a + seed * 0.11) * r * 0.78
      )
    );
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.55);
}

export function createRibbonGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  width: number,
  segments = 96,
  twist = 0
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpForward = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const up =
      Math.abs(tangent.dot(tmpUp)) > 0.84
        ? tmpForward.clone()
        : tmpUp.clone();
    const side = new THREE.Vector3()
      .crossVectors(tangent, up)
      .normalize()
      .applyAxisAngle(tangent, twist + Math.sin(u * Math.PI * 2 + twist) * 0.22);
    const taper = 0.42 + 0.58 * Math.sin(u * Math.PI);
    const w = width * taper;
    const left = point.clone().addScaledVector(side, -w);
    const right = point.clone().addScaledVector(side, w);

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(u, 0, u, 1);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createVariableWidthRibbonGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  widthFunction: (u: number) => number,
  segments = 128,
  twist = 0,
  crossSegments = 4
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpForward = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const up =
      Math.abs(tangent.dot(tmpUp)) > 0.84
        ? tmpForward.clone()
        : tmpUp.clone();
    const phase = Math.sin(u * Math.PI * 2 + twist);
    const side = new THREE.Vector3()
      .crossVectors(tangent, up)
      .normalize()
      .applyAxisAngle(tangent, twist + phase * 0.28);
    const lift = new THREE.Vector3()
      .crossVectors(side, tangent)
      .normalize();
    const width = widthFunction(u);

    for (let j = 0; j <= crossSegments; j++) {
      const v = j / crossSegments;
      const centered = v * 2 - 1;
      const crown = Math.sin(v * Math.PI) * Math.sin(u * Math.PI);
      const p = point
        .clone()
        .addScaledVector(side, centered * width)
        .addScaledVector(lift, crown * width * 0.08 * Math.sin(u * 11 + twist));
      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < crossSegments; j++) {
      const a = i * (crossSegments + 1) + j;
      const b = a + 1;
      const c = a + crossSegments + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeVortexCurve(seed: number, radius = 1.05): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const u = i / 96;
    const a = u * Math.PI * 2 + seed;
    const spiral = radius * (0.9 - 0.35 * Math.sin(u * Math.PI));
    const y = Math.sin(a * 1.4 + seed) * 0.36 + (u - 0.5) * 0.32;
    points.push(
      new THREE.Vector3(
        Math.cos(a) * spiral * (0.9 + 0.08 * Math.sin(a * 3)),
        y,
        Math.sin(a) * spiral * 0.68
      )
    );
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.62);
}

export function makeOrbitPoints(
  radius: number,
  tilt: number,
  arc = Math.PI * 2,
  offset = 0
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segments = 144;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const a = offset + u * arc;
    points.push(
      new THREE.Vector3(
        Math.cos(a) * radius,
        Math.sin(a) * radius * tilt,
        Math.sin(a + offset * 0.2) * radius * 0.08
      )
    );
  }
  return points;
}

export function makeMelodyPoints(pitchNorm: number, time: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80;
    const x = (u - 0.5) * 2.45;
    const y =
      (0.5 - pitchNorm) * 0.75 +
      Math.sin(u * Math.PI * 4 + time * 1.4) * 0.12 +
      Math.sin(u * Math.PI * 9 - time * 0.9) * 0.035;
    const z = 0.9 + Math.sin(u * Math.PI * 2 + time) * 0.08;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export function makePetalShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.035);
  shape.bezierCurveTo(0.46, 0.18, 0.68, 0.7, 0.16, 1.12);
  shape.bezierCurveTo(0.07, 1.2, -0.07, 1.2, -0.16, 1.12);
  shape.bezierCurveTo(-0.68, 0.7, -0.46, 0.18, 0, 0.035);
  return shape;
}

export function createPetalMembraneGeometry({
  length,
  width,
  curvature,
  fold,
  seed,
  segments = 28,
  crossSegments = 10
}: {
  length: number;
  width: number;
  curvature: number;
  fold: number;
  seed: number;
  segments?: number;
  crossSegments?: number;
}): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const taper = Math.pow(Math.sin(Math.PI * u), 0.58) * (0.62 + u * 0.38);
    const edgeWarp = 1 + Math.sin(u * 8.3 + seed) * 0.08 + Math.sin(u * 17.1 - seed) * 0.035;
    const localWidth = width * taper * edgeWarp;

    for (let j = 0; j <= crossSegments; j++) {
      const v = j / crossSegments;
      const xNorm = v * 2 - 1;
      const veinWarp = Math.sin(u * 10.0 + xNorm * 3.2 + seed) * 0.016;
      const x = xNorm * localWidth * (1 + Math.sin(u * 5 + seed) * 0.04);
      const y = (u - 0.18) * length;
      const z =
        Math.sin(u * Math.PI) * curvature +
        xNorm * xNorm * fold +
        veinWarp +
        Math.sin((u + v) * 13.0 + seed) * 0.012;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < crossSegments; j++) {
      const a = i * (crossSegments + 1) + j;
      const b = a + 1;
      const c = a + crossSegments + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
