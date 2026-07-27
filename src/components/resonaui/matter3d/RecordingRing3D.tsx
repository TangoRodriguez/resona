"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeOrbitPoints } from "@/lib/resonaui/matter3d/curves";

export function RecordingRing3D({
  visible,
  elapsedSeconds = 0,
  level
}: {
  visible: boolean;
  elapsedSeconds?: number;
  level: number;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(makeOrbitPoints(1.54, 0.72, Math.PI * 2)),
        new THREE.LineBasicMaterial({
          color: "#ff62d7",
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      ),
    []
  );
  const progress = useMemo(() => {
    const p = ((elapsedSeconds % 20) / 20) * Math.PI * 2;
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(makeOrbitPoints(1.58, 0.74, p, -Math.PI / 2)),
      new THREE.LineBasicMaterial({
        color: "#ffc2f2",
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
  }, [elapsedSeconds]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = visible;
    group.current.rotation.z = clock.elapsedTime * 0.28;
    group.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.012 + level * 0.04);
  });

  return (
    <group ref={group} rotation={[0.62, 0.08, 0]}>
      <primitive object={ring} />
      <primitive object={progress} />
    </group>
  );
}
