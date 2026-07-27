"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createPetalMembraneGeometry } from "@/lib/resonaui/matter3d/curves";
import { matter3DPalettes } from "@/lib/resonaui/matter3d/palettes";
import { qualitySettings } from "@/lib/resonaui/matter3d/performance";
import type { VisualQuality } from "@/lib/resonaui/matter3d/types";
import { CausticField } from "./CausticField";
import { FresnelShell } from "./FresnelShell";
import { GlowCore } from "./GlowCore";
import { LocalEmissionPoints } from "./LocalEmissionPoints";
import { MelodyTrace3D } from "./MelodyTrace3D";
import { OrbitalRings } from "./OrbitalRings";
import { RecordingRing3D } from "./RecordingRing3D";
import { SparkParticles } from "./SparkParticles";

function PetalMembrane({
  geometry,
  color,
  edgeColor,
  opacity,
  level,
  phase
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  edgeColor: string;
  opacity: number;
  level: number;
  phase: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uEdgeColor: { value: new THREE.Color(edgeColor) },
          uOpacity: { value: opacity },
          uLevel: { value: level },
          uTime: { value: 0 },
          uPhase: { value: phase }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalView;
          void main() {
            vUv = uv;
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uEdgeColor;
          uniform float uOpacity;
          uniform float uLevel;
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          varying vec3 vNormalView;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(41.7, 289.3))) * 31821.151);
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
            float lengthFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
            float edge = pow(1.0 - center, 3.4);
            float tip = smoothstep(0.78, 1.0, vUv.x);
            float centerVein = 1.0 - smoothstep(0.015, 0.11, abs(vUv.y - 0.5));
            float sideVeins = smoothstep(0.82, 1.0, sin(vUv.x * 42.0 + vUv.y * 18.0 + uPhase + uTime * 0.16) * 0.5 + 0.5);
            float organic = noise(vec2(vUv.x * 5.0 + uTime * 0.045, vUv.y * 7.0 + uPhase));
            float body = smoothstep(0.08, 0.84, center) * (0.5 + organic * 0.42);
            float glow = edge * 0.78 + tip * 0.24 + centerVein * 0.18 + sideVeins * 0.1;
            float alpha = lengthFade * (body * 0.72 + glow * 0.82) * (uOpacity + uLevel * 0.11);
            vec3 color = mix(uColor, uEdgeColor, glow * 0.72 + sideVeins * 0.12);
            color = mix(color, vec3(1.0, 0.94, 1.0), centerVein * 0.14 + tip * 0.12);
            gl_FragColor = vec4(color, alpha);
          }
        `
      }),
    [color, edgeColor, level, opacity, phase]
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uLevel.value = level;
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uColor.value.set(color);
    material.uniforms.uEdgeColor.value.set(edgeColor);
  });

  return (
    <mesh geometry={geometry} material={material} />
  );
}

function PetalMembranes({
  level,
  pitchNorm,
  recording,
  quality
}: {
  level: number;
  pitchNorm: number;
  recording: number;
  quality: VisualQuality;
}) {
  const group = useRef<THREE.Group>(null);
  const pal = matter3DPalettes.bloom;
  const petals = useMemo(() => {
    const qualityScale = quality === "low" ? 0.62 : 1;
    const rings = [
      { name: "inner", count: Math.round(10 * qualityScale), radius: 0.04, length: 0.78, width: 0.22, z: 0.12, opacity: 0.34 },
      { name: "middle", count: Math.round(16 * qualityScale), radius: 0.2, length: 1.12, width: 0.29, z: 0.02, opacity: 0.28 },
      { name: "outer", count: Math.round(15 * qualityScale), radius: 0.42, length: 1.48, width: 0.36, z: -0.08, opacity: 0.19 },
      { name: "veil", count: Math.round(20 * qualityScale), radius: 0.55, length: 1.62, width: 0.27, z: -0.16, opacity: 0.11 }
    ];

    return rings.flatMap((ring, ringIndex) =>
      Array.from({ length: ring.count }, (_, i) => {
        const seed = ringIndex * 17.3 + i * 1.91;
        const base = (i / ring.count) * Math.PI * 2;
        const asymmetry = Math.sin(seed * 1.7) * 0.08 + Math.sin(seed * 0.37) * 0.045;
        const a = base + asymmetry + ringIndex * 0.18;
        const layer = (i + ringIndex) % 4;
        const color =
          layer === 0
            ? pal.ribbonA
            : layer === 1
              ? pal.ribbonB
              : layer === 2
                ? "#8e61ff"
                : "#6de9ff";
        const edgeColor = layer === 1 ? "#ffc6fb" : layer === 2 ? "#e0b6ff" : "#9ff4ff";
        const length = ring.length * (0.86 + Math.sin(seed) * 0.12 + Math.sin(seed * 0.41) * 0.08);
        const width = ring.width * (0.82 + Math.cos(seed * 1.23) * 0.14);
        const geometry = createPetalMembraneGeometry({
          length,
          width,
          curvature: 0.08 + ringIndex * 0.035 + Math.sin(seed) * 0.018,
          fold: 0.03 + ringIndex * 0.016 + Math.cos(seed) * 0.01,
          seed,
          segments: quality === "low" ? 18 : 30,
          crossSegments: quality === "low" ? 7 : 11
        });
        return {
          key: `${ring.name}-${i}`,
          geometry,
          color,
          edgeColor,
          phase: seed,
          opacity: ring.opacity * (0.84 + Math.sin(seed * 0.73) * 0.16),
          position: [
            Math.cos(a) * ring.radius,
            Math.sin(a) * ring.radius * 0.72,
            ring.z + Math.sin(seed) * 0.035
          ] as [number, number, number],
          rotation: [
            0.14 + ringIndex * 0.075 + Math.sin(seed * 0.31) * 0.045,
            Math.sin(a) * (0.12 + ringIndex * 0.035) + (pitchNorm - 0.5) * 0.06,
            a - Math.PI / 2 + Math.sin(seed * 0.53) * 0.08
          ] as [number, number, number],
          scale: 1 + ringIndex * 0.03
        };
      })
    );
  }, [pal.ribbonA, pal.ribbonB, pitchNorm, quality]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.12 + (pitchNorm - 0.5) * 0.12;
    group.current.rotation.z = Math.sin(t * 0.16) * 0.06;
    group.current.scale.setScalar(1.12 + level * 0.2 + recording * 0.06);
    group.current.children.forEach((child, i) => {
      const petal = petals[i];
      const open = 1 + Math.sin(t * 0.34 + petal.phase) * 0.025 + level * 0.035;
      child.scale.setScalar(petal.scale * open);
    });
  });

  return (
    <group ref={group}>
      {petals.map((petal) => (
        <group
          key={petal.key}
          position={petal.position}
          rotation={petal.rotation}
          scale={[petal.scale, petal.scale, petal.scale]}
        >
          <PetalMembrane
            geometry={petal.geometry}
            color={petal.color}
            edgeColor={petal.edgeColor}
            opacity={petal.opacity}
            level={level}
            phase={petal.phase}
          />
        </group>
      ))}
    </group>
  );
}

export function BloomMatter({
  level,
  resonance,
  pitchNorm,
  isRecording = false,
  elapsedSeconds = 0,
  quality = "high"
}: {
  level: number;
  resonance: number;
  pitchNorm: number;
  isRecording?: boolean;
  elapsedSeconds?: number;
  quality?: VisualQuality;
}) {
  const group = useRef<THREE.Group>(null);
  const pal = matter3DPalettes.bloom;
  const q = qualitySettings(quality);
  const rec = isRecording ? 1 : 0;
  const bloomGlints = useMemo(
    () => [
      { position: [-0.46, 0.28, 0.62] as [number, number, number], color: "#9ff4ff", size: 0.13, phase: 0.2, opacity: 0.32 },
      { position: [0.52, 0.18, 0.54] as [number, number, number], color: "#ff9be8", size: 0.12, phase: 1.1, opacity: 0.34 },
      { position: [-0.18, -0.5, 0.5] as [number, number, number], color: "#dbb2ff", size: 0.1, phase: 2.4, opacity: 0.3 },
      { position: [0.18, 0.02, 0.72] as [number, number, number], color: "#fff0fb", size: 0.09, phase: 3.2, opacity: 0.36 }
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.x = Math.sin(t * 0.18) * 0.1;
    group.current.rotation.y = t * 0.06;
    group.current.scale.setScalar(1 + resonance * 0.06);
  });

  return (
    <group ref={group}>
      <GlowCore color={pal.core} level={level + 0.06} pitchNorm={pitchNorm} recording={rec} radius={0.28} baseOpacity={0.11} levelOpacity={0.15} recordingOpacity={0.06} />
      <PetalMembranes level={level} pitchNorm={pitchNorm} recording={rec} quality={quality} />
      <mesh scale={[1.16, 1.16, 1.16]}>
        <sphereGeometry args={[0.78, q.sphereSegments, Math.floor(q.sphereSegments * 0.54)]} />
        <meshBasicMaterial
          color={pal.inner}
          transparent
          opacity={0.045 + level * 0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <FresnelShell color={pal.rim} opacity={0.28 + level * 0.12} power={2.45} scale={1.34} segments={q.sphereSegments} />
      <LocalEmissionPoints points={bloomGlints} level={level} speed={0.55} />
      <CausticField colors={[pal.ribbonA, pal.ribbonB, pal.ribbonC]} level={level * 0.95} count={quality === "low" ? 7 : 15} radius={0.8} />
      <OrbitalRings color={pal.rim} warm={pal.rimWarm} level={level} resonance={resonance} recording={rec} />
      <SparkParticles color={pal.particle} count={Math.max(8, q.particleCount - 2)} level={level} recording={rec} radius={1.65} />
      <RecordingRing3D visible={isRecording} elapsedSeconds={elapsedSeconds} level={level} />
      <MelodyTrace3D visible={isRecording} pitchNorm={pitchNorm} level={level} />
    </group>
  );
}
