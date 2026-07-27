"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createGlowTexture } from "@/lib/resonaui/matter3d/materials";

export function SpecularHighlights({ level }: { level: number }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(
    () => createGlowTexture("rgba(255,255,255,0.92)", "rgba(255,255,255,0)"),
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.32) * 0.05;
    group.current.children.forEach((child, i) => {
      child.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4 + i) * 0.03 + level * 0.06);
    });
  });

  return (
    <group ref={group}>
      <sprite position={[-0.48, 0.66, 1.2]} scale={[1.02, 0.3, 1]} rotation={[0, 0, -0.34]}>
        <spriteMaterial
          map={texture}
          transparent
          opacity={0.76}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0.52, -0.48, 1.1]} scale={[0.7, 0.16, 1]} rotation={[0, 0, 0.48]}>
        <spriteMaterial
          map={texture}
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[-0.82, -0.5, 1.02]} scale={[0.42, 0.11, 1]} rotation={[0, 0, -0.72]}>
        <spriteMaterial
          map={texture}
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
