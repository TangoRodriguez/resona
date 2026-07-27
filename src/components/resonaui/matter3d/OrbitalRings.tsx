"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeOrbitPoints } from "@/lib/resonaui/matter3d/curves";

export function OrbitalRings({
  color,
  warm,
  level,
  resonance,
  recording = 0
}: {
  color: string;
  warm: string;
  level: number;
  resonance: number;
  recording?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const rings = useMemo(
    () =>
      [
        { r: 1.8, tilt: 0.62, rot: [0.7, 0.12, 0.18], color, opacity: 0.12 },
        { r: 2.02, tilt: 0.74, rot: [-0.24, 0.5, -0.16], color: warm, opacity: 0.09 },
        { r: 2.28, tilt: 0.55, rot: [0.18, -0.42, 0.34], color, opacity: 0.06 }
      ].map((ring, i) => ({
        ...ring,
        object: new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            makeOrbitPoints(ring.r, ring.tilt, Math.PI * (i === 1 ? 1.65 : 2), i * 0.62)
          ),
          new THREE.LineBasicMaterial({
            color: ring.color,
            transparent: true,
            opacity: ring.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false
          })
        )
      })),
    [color, warm]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.z = t * 0.035;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.1;
  });

  return (
    <group ref={group}>
      {rings.map((ring, i) => {
        ring.object.rotation.set(ring.rot[0], ring.rot[1], ring.rot[2]);
        (ring.object.material as THREE.LineBasicMaterial).opacity =
          ring.opacity + level * 0.035 + resonance * 0.03 + recording * 0.045;
        return <primitive key={i} object={ring.object} />;
      })}
    </group>
  );
}
