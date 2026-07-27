"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createVariableWidthRibbonGeometry, makeRibbonCurve, makeVortexCurve } from "@/lib/resonaui/matter3d/curves";

export function RibbonSurface({
  color,
  seed,
  level,
  pitchNorm,
  opacity = 0.24,
  width = 0.14,
  radius = 1,
  height = 0,
  twist = 0,
  speed = 0.12,
  vortex = false,
  blend = "additive"
}: {
  color: string;
  seed: number;
  level: number;
  pitchNorm: number;
  opacity?: number;
  width?: number;
  radius?: number;
  height?: number;
  twist?: number;
  speed?: number;
  vortex?: boolean;
  blend?: "additive" | "normal";
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const curve = vortex
      ? makeVortexCurve(seed, radius)
      : makeRibbonCurve(seed, radius, height, 1 + seed * 0.04);
    return createVariableWidthRibbonGeometry(
      curve,
      (u) => {
        const taper = 0.34 + 0.66 * Math.sin(Math.PI * u);
        const swell =
          1 +
          Math.sin(u * Math.PI * 4.0 + seed) * 0.22 +
          Math.sin(u * Math.PI * 9.0 - seed * 0.7) * 0.09;
        return width * taper * swell;
      },
      vortex ? 144 : 128,
      twist,
      5
    );
  }, [height, radius, seed, twist, vortex, width]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        blending: blend === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uTime: { value: 0 },
          uLevel: { value: level },
          uSeed: { value: seed }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uTime;
          uniform float uLevel;
          uniform float uSeed;
          varying vec2 vUv;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }
          void main() {
            float center = 1.0 - abs(vUv.y * 2.0 - 1.0);
            float body = smoothstep(0.0, 0.52, center);
            float edge = pow(1.0 - center, 2.15);
            float lengthFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
            float lowNoise = noise(vec2(vUv.x * 3.0 + uTime * 0.08, vUv.y * 2.0 + uSeed));
            float fineNoise = noise(vec2(vUv.x * 18.0 - uTime * 0.16, vUv.y * 7.0 + uSeed));
            float wave = 0.66 + 0.34 * sin(vUv.x * 10.5 + uTime * 1.05 + uSeed);
            float crossing = smoothstep(0.78, 1.0, sin(vUv.x * 6.283 + uSeed) * 0.5 + 0.5);
            float caustic = smoothstep(0.76, 1.0, sin(vUv.x * 24.0 + vUv.y * 5.0 + uTime * 0.9 + uSeed) * 0.5 + 0.5);
            float glow = body * 0.5 + edge * 0.34 + caustic * 0.16 + crossing * 0.18;
            float alpha = lengthFade * glow * wave * (0.82 + lowNoise * 0.28) * (uOpacity + uLevel * 0.12);
            vec3 hot = vec3(0.92, 0.98, 1.0);
            vec3 glintColor = mix(uColor, hot, edge * 0.46 + caustic * 0.32 + crossing * 0.22 + fineNoise * 0.08);
            gl_FragColor = vec4(glintColor, alpha);
          }
        `
      }),
    [blend, color, level, opacity]
  );

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    material.uniforms.uLevel.value = level;
    material.uniforms.uOpacity.value = opacity + level * 0.08;
    material.uniforms.uSeed.value = seed;
    mesh.current.rotation.y = t * speed + pitchNorm * 0.42;
    mesh.current.rotation.x = Math.sin(t * 0.18 + seed) * 0.16 + (pitchNorm - 0.5) * 0.18;
    mesh.current.rotation.z = Math.sin(t * 0.15 + seed) * 0.08;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} />;
}
