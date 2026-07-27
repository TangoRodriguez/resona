"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeRibbonCurve } from "@/lib/resonaui/matter3d/curves";

export function InternalRibbons({
  colors,
  count,
  level,
  pitchNorm,
  recording = 0,
  liquid = false
}: {
  colors: string[];
  count: number;
  level: number;
  pitchNorm: number;
  recording?: number;
  liquid?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const curves = useMemo(
    () =>
      Array.from({ length: count }, (_, i) =>
        makeRibbonCurve(i * 1.71 + (liquid ? 3.4 : 0), liquid ? 1.16 : 1, (i - count / 2) * 0.035, liquid ? 1.45 : 1)
      ),
    [count, liquid]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * (liquid ? 0.14 : 0.08) + pitchNorm * 0.4;
    group.current.rotation.x = Math.sin(t * 0.22) * 0.14 + (pitchNorm - 0.5) * 0.16;
    group.current.scale.setScalar(1 + level * 0.08 + recording * 0.035);
  });

  return (
    <group ref={group}>
      {curves.map((curve, i) => (
        <mesh key={i} rotation={[i * 0.28, i * 0.52, i * 0.33]}>
          <tubeGeometry args={[curve, 72, liquid ? 0.012 : 0.016, 8, true]} />
          <meshBasicMaterial
            color={colors[i % colors.length]}
            transparent
            opacity={liquid ? 0.14 + level * 0.16 + recording * 0.08 : 0.1 + level * 0.12 + recording * 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
