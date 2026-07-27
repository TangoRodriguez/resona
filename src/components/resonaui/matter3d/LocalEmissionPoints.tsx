"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createGlowTexture } from "@/lib/resonaui/matter3d/materials";

type EmissionPoint = {
  position: [number, number, number];
  color: string;
  size?: number;
  phase?: number;
  opacity?: number;
};

export function LocalEmissionPoints({
  points,
  level,
  speed = 0.7
}: {
  points: EmissionPoint[];
  level: number;
  speed?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(
    () => createGlowTexture("rgba(255,255,255,0.94)", "rgba(255,255,255,0)"),
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const point = points[i];
      const phase = point.phase ?? i * 0.83;
      const pulse = 1 + Math.sin(t * speed + phase) * 0.16 + level * 0.18;
      child.scale.setScalar((point.size ?? 0.12) * pulse);
      const material = (child as THREE.Sprite).material as THREE.SpriteMaterial;
      material.opacity = (point.opacity ?? 0.5) + level * 0.18 + Math.max(0, Math.sin(t * 1.3 + phase)) * 0.12;
      material.color.set(point.color);
    });
  });

  return (
    <group ref={group}>
      {points.map((point, i) => (
        <sprite key={i} position={point.position}>
          <spriteMaterial
            map={texture}
            color={point.color}
            transparent
            opacity={point.opacity ?? 0.58}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
