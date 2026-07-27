"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function LensSheet({
  color,
  level,
  pitchNorm,
  position,
  rotation,
  scale,
  opacity = 0.16,
  speed = 0.08
}: {
  color: string;
  level: number;
  pitchNorm: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  opacity?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uLevel: { value: level }
        },
        vertexShader: `
          varying vec3 vLocalPosition;
          varying vec3 vNormalView;
          void main() {
            vLocalPosition = position;
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uLevel;
          varying vec3 vLocalPosition;
          varying vec3 vNormalView;
          void main() {
            float radial = length(vLocalPosition.xy);
            float body = smoothstep(1.05, 0.08, radial);
            float edge = smoothstep(0.42, 1.0, radial);
            float diagonal = smoothstep(0.02, 0.22, abs(vLocalPosition.x * 0.62 - vLocalPosition.y));
            float facing = pow(abs(vNormalView.z), 0.6);
            float sheet = body * 0.46 + edge * 0.72 + (1.0 - diagonal) * 0.18;
            float alpha = sheet * facing * (uOpacity + uLevel * 0.065);
            vec3 color = mix(uColor, vec3(0.92, 0.98, 1.0), edge * 0.28 + (1.0 - diagonal) * 0.2);
            gl_FragColor = vec4(color, alpha);
          }
        `
      }),
    [color, level, opacity]
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = rotation[1] + Math.sin(t * speed + rotation[2]) * 0.08 + pitchNorm * 0.12;
    ref.current.rotation.z = rotation[2] + Math.cos(t * speed * 0.9) * 0.05;
    ref.current.position.y = position[1] + (pitchNorm - 0.5) * 0.12;
    material.uniforms.uColor.value.set(color);
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uLevel.value = level;
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
      <sphereGeometry args={[1, 56, 18]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
