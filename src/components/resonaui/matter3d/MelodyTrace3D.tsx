"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeMelodyPoints } from "@/lib/resonaui/matter3d/curves";

export function MelodyTrace3D({
  visible,
  pitchNorm,
  level
}: {
  visible: boolean;
  pitchNorm: number;
  level: number;
}) {
  const ref = useRef<THREE.Line>(null);
  const line = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color: "#ffb7eb",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      ),
    []
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = visible;
    ref.current.geometry.setFromPoints(makeMelodyPoints(pitchNorm, clock.elapsedTime));
    const material = ref.current.material as THREE.LineBasicMaterial;
    material.opacity = visible ? 0.5 + level * 0.28 : 0;
  });

  return <primitive ref={ref} object={line} />;
}
