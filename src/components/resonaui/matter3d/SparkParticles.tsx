"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function SparkParticles({
  color,
  count,
  level,
  recording = 0,
  radius = 1.85
}: {
  color: string;
  count: number;
  level: number;
  recording?: number;
  radius?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const lane = 0.78 + (i % 5) * 0.07;
      array[i * 3] = Math.cos(a) * radius * lane;
      array[i * 3 + 1] = Math.sin(a * 1.7) * 0.62;
      array[i * 3 + 2] = Math.sin(a) * radius * lane * 0.52;
    }
    return array;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.12;
    ref.current.rotation.z = Math.sin(t * 0.21) * 0.18;
    const material = ref.current.material as THREE.PointsMaterial;
    material.opacity = 0.35 + level * 0.32 + recording * 0.2;
    material.size = 0.035 + level * 0.018;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.042}
        transparent
        opacity={0.52}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

