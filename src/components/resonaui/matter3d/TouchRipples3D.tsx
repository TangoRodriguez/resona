"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TouchPulse3D } from "@/lib/resonaui/matter3d/types";

function TouchPulseMesh({ pulse, color }: { pulse: TouchPulse3D; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const age = Math.max(0, (performance.now() - pulse.createdAt) / 1000);
    const p = Math.min(1, age / 1.05);
    const dir = Math.atan2(pulse.vy, pulse.vx || 0.001);
    const x = (pulse.x - 0.5) * 2.9 + pulse.vx * age * 0.00032;
    const y = (0.5 - pulse.y) * 2.35 - pulse.vy * age * 0.00024;
    const scale = 0.22 + p * 1.35 * pulse.strength;
    ref.current.position.set(x, y, 1.18);
    ref.current.rotation.set(0.82, 0.18, -dir);
    ref.current.scale.set(scale * (1 + Math.min(0.28, Math.abs(pulse.vx) / 2500)), scale * 0.34, scale);
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, (1 - p) * 0.42);
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.42, 0.006, 8, 96]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function TouchRipples3D({
  touches,
  color
}: {
  touches: TouchPulse3D[];
  color: string;
}) {
  return (
    <group>
      {touches.map((pulse) => (
        <TouchPulseMesh key={pulse.id} pulse={pulse} color={color} />
      ))}
    </group>
  );
}

