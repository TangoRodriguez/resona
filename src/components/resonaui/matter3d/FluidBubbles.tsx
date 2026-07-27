"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function FluidBubbles({
  color,
  count,
  level
}: {
  color: string;
  count: number;
  level: number;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uLevel: { value: level },
          uTime: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormalView;
          void main() {
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uLevel;
          uniform float uTime;
          varying vec3 vNormalView;
          void main() {
            float rim = pow(1.0 - abs(vNormalView.z), 2.2);
            float glint = smoothstep(0.86, 1.0, sin(vNormalView.x * 9.0 + vNormalView.y * 6.0 + uTime) * 0.5 + 0.5);
            float alpha = rim * (0.42 + uLevel * 0.22) + glint * 0.12;
            vec3 c = mix(uColor, vec3(0.96, 1.0, 1.0), rim * 0.45 + glint * 0.3);
            gl_FragColor = vec4(c, alpha);
          }
        `
      }),
    [color, level]
  );
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const big = i < Math.min(6, Math.max(3, Math.floor(count * 0.28)));
        const r = 0.22 + (i % 6) * 0.13;
        return {
          position: new THREE.Vector3(
            Math.cos(a + i * 0.23) * r,
            Math.sin(a * 1.7) * 0.52,
            Math.sin(a - i * 0.18) * r * 0.68
          ),
          radius: big ? 0.055 + (i % 3) * 0.018 : 0.022 + (i % 5) * 0.008,
          phase: i * 0.8
        };
      }),
    [count]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    material.uniforms.uLevel.value = level;
    material.uniforms.uColor.value.set(color);
    group.current.children.forEach((child, i) => {
      const bubble = bubbles[i];
      child.position.y = bubble.position.y + Math.sin(t * 0.72 + bubble.phase) * (0.06 + level * 0.04);
      child.position.x = bubble.position.x + Math.sin(t * 0.34 + bubble.phase) * 0.025;
      child.scale.setScalar(1 + Math.sin(t * 1.25 + bubble.phase) * 0.1 + level * 0.14);
    });
  });

  return (
    <group ref={group}>
      {bubbles.map((bubble, i) => (
        <mesh key={i} position={bubble.position}>
          <sphereGeometry args={[bubble.radius, 18, 12]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
