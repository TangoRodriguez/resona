"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function FresnelShell({
  color,
  opacity = 0.72,
  power = 2.4,
  scale = 1.2,
  segments = 64
}: {
  color: string;
  opacity?: number;
  power?: number;
  scale?: number;
  segments?: number;
}) {
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
          uOpacity: { value: opacity },
          uPower: { value: power }
        },
        vertexShader: `
          varying vec3 vWorldNormal;
          varying vec3 vViewDir;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPosition.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uPower;
          varying vec3 vWorldNormal;
          varying vec3 vViewDir;
          void main() {
            float ndv = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
            float rim = pow(1.0 - clamp(ndv, 0.0, 1.0), uPower);
            float band = smoothstep(0.18, 0.96, rim);
            float glassEdge = band * (0.55 + rim * 0.45);
            gl_FragColor = vec4(uColor, glassEdge * uOpacity);
          }
        `
      }),
    [color, opacity, power]
  );

  material.uniforms.uColor.value.set(color);
  material.uniforms.uOpacity.value = opacity;
  material.uniforms.uPower.value = power;

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[1, segments, Math.floor(segments * 0.68)]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
