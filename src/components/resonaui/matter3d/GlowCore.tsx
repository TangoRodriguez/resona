"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function GlowCore({
  color,
  level,
  pitchNorm,
  recording = 0,
  radius = 0.44,
  baseOpacity = 0.28,
  levelOpacity = 0.32,
  recordingOpacity = 0.12,
  pulseAmount = 0.16
}: {
  color: string;
  level: number;
  pitchNorm: number;
  recording?: number;
  radius?: number;
  baseOpacity?: number;
  levelOpacity?: number;
  recordingOpacity?: number;
  pulseAmount?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2.2) * 0.035 + level * pulseAmount + recording * 0.08;
    ref.current.scale.setScalar(pulse);
    ref.current.position.y = (pitchNorm - 0.5) * 0.12;
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.opacity = baseOpacity + level * levelOpacity + recording * recordingOpacity;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={baseOpacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
