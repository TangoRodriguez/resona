"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeRibbonCurve, makeVortexCurve } from "@/lib/resonaui/matter3d/curves";

export function CausticField({
  colors,
  level,
  count = 10,
  vortex = false,
  radius = 0.92
}: {
  colors: string[];
  level: number;
  count?: number;
  vortex?: boolean;
  radius?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = i * 1.43 + 0.4;
        const curve = vortex
          ? makeVortexCurve(seed, radius * (0.84 + (i % 4) * 0.045))
          : makeRibbonCurve(seed, radius, (i - count / 2) * 0.018, 1.2);
        const geometry = new THREE.TubeGeometry(curve, 72, 0.004 + (i % 3) * 0.0016, 5, true);
        const material = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        });
        return { geometry, material, seed };
      }),
    [colors, count, radius, vortex]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * (vortex ? 0.18 : 0.09);
    group.current.rotation.x = Math.sin(t * 0.2) * 0.12;
    items.forEach((item, i) => {
      item.material.opacity =
        0.09 + level * 0.2 + Math.max(0, Math.sin(t * 1.2 + item.seed)) * 0.08;
      const child = group.current?.children[i];
      if (child) {
        child.rotation.z = Math.sin(t * 0.24 + item.seed) * 0.22;
      }
    });
  });

  return (
    <group ref={group}>
      {items.map((item, i) => (
        <mesh key={i} geometry={item.geometry} material={item.material} />
      ))}
    </group>
  );
}

