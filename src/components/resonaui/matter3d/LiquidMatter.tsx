"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fbm3 } from "@/lib/resonaui/matter3d/noise3d";
import { matter3DPalettes } from "@/lib/resonaui/matter3d/palettes";
import { qualitySettings } from "@/lib/resonaui/matter3d/performance";
import type { VisualQuality } from "@/lib/resonaui/matter3d/types";
import { CausticField } from "./CausticField";
import { FluidBubbles } from "./FluidBubbles";
import { FresnelShell } from "./FresnelShell";
import { GlowCore } from "./GlowCore";
import { InternalRibbons } from "./InternalRibbons";
import { LocalEmissionPoints } from "./LocalEmissionPoints";
import { MelodyTrace3D } from "./MelodyTrace3D";
import { OrbitalRings } from "./OrbitalRings";
import { RecordingRing3D } from "./RecordingRing3D";
import { RibbonSurface } from "./RibbonSurface";
import { SparkParticles } from "./SparkParticles";
import { SpecularHighlights } from "./SpecularHighlights";

function LiquidCrest({
  color,
  level,
  opacity,
  radius,
  tube,
  arc,
  rotation,
  position = [0, 0, 0]
}: {
  color: string;
  level: number;
  opacity: number;
  radius: number;
  tube: number;
  arc: number;
  rotation: [number, number, number];
  position?: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.32 + radius) * 0.08;
    ref.current.scale.setScalar(1 + Math.sin(t * 0.7 + arc) * 0.018 + level * 0.035);
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <torusGeometry args={[radius, tube, 14, 128, arc]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity + level * 0.1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function FluidShell({
  level,
  pitchNorm,
  quality
}: {
  level: number;
  pitchNorm: number;
  quality: VisualQuality;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const pal = matter3DPalettes.liquid;
  const q = qualitySettings(quality);
  const geometry = useMemo(
    () => new THREE.SphereGeometry(1.14, q.sphereSegments, Math.floor(q.sphereSegments * 0.62)),
    [q.sphereSegments]
  );
  const base = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>),
    [geometry]
  );

  useFrame(({ clock }) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      const len = Math.max(0.001, Math.sqrt(x * x + y * y + z * z));
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;
      const wave =
        Math.sin((ny + pitchNorm) * 7 + t * 1.5) * 0.046 +
        Math.sin(Math.atan2(nz, nx) * 5 + t * 1.35) * (0.036 + level * 0.03) +
        fbm3(nx * 2.1 + t * 0.28, ny * 2.0, nz * 2.1 - t * 0.2) * (0.095 + level * 0.075);
      pos.setXYZ(i, x + nx * wave, y + ny * wave, z + nz * wave);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    if (mesh.current) {
      mesh.current.rotation.y = t * 0.16;
      mesh.current.rotation.x = Math.sin(t * 0.28) * 0.1;
      const material = mesh.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = 0.46 + level * 0.12;
      material.emissiveIntensity = 0.14 + level * 0.18;
    }
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshPhysicalMaterial
        color={pal.shell}
        transparent
        opacity={0.46}
        roughness={0.1}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.08}
        transmission={0.52}
        thickness={1.18}
        ior={1.34}
        emissive={pal.inner}
        emissiveIntensity={0.16}
        depthWrite={false}
      />
    </mesh>
  );
}

export function LiquidMatter({
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
  const pal = matter3DPalettes.liquid;
  const q = qualitySettings(quality);
  const rec = isRecording ? 1 : 0;
  const liquidGlints = useMemo(
    () => [
      { position: [-0.52, 0.36, 0.72] as [number, number, number], color: "#dffaff", size: 0.14, phase: 0.4, opacity: 0.42 },
      { position: [0.62, 0.08, 0.64] as [number, number, number], color: "#38e8ff", size: 0.12, phase: 1.4, opacity: 0.38 },
      { position: [0.1, -0.54, 0.66] as [number, number, number], color: "#9b6dff", size: 0.11, phase: 2.8, opacity: 0.34 },
      { position: [-0.22, -0.1, 0.82] as [number, number, number], color: "#bff7ff", size: 0.09, phase: 3.7, opacity: 0.36 }
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.z = Math.sin(t * 0.18) * 0.07;
    group.current.scale.set(1 + level * 0.06, 0.96 + Math.sin(t * 0.7) * 0.025, 1 + level * 0.03);
  });

  return (
    <group ref={group}>
      <GlowCore color={pal.core} level={level * 0.9} pitchNorm={pitchNorm} recording={rec} radius={0.34} baseOpacity={0.16} levelOpacity={0.24} recordingOpacity={0.08} />
      <RibbonSurface color={pal.ribbonB} seed={1.3} level={level} pitchNorm={pitchNorm} opacity={0.46} width={0.34} radius={1.2} twist={0.55} speed={0.22} vortex blend="normal" />
      <RibbonSurface color={pal.ribbonA} seed={3.1} level={level} pitchNorm={pitchNorm} opacity={0.4} width={0.3} radius={1.08} twist={-0.38} speed={-0.18} vortex blend="normal" />
      <RibbonSurface color={pal.ribbonC} seed={5.2} level={level} pitchNorm={pitchNorm} opacity={0.34} width={0.26} radius={1.0} twist={0.9} speed={0.2} vortex blend="normal" />
      <RibbonSurface color="#e7fbff" seed={7.9} level={level} pitchNorm={pitchNorm} opacity={0.16} width={0.14} radius={1.18} twist={-0.82} speed={0.14} vortex />
      <InternalRibbons
        colors={[pal.ribbonA, pal.ribbonB, pal.ribbonC]}
        count={quality === "low" ? 1 : 2}
        level={level}
        pitchNorm={pitchNorm}
        recording={rec}
        liquid
      />
      <FluidShell level={level} pitchNorm={pitchNorm} quality={quality} />
      <FresnelShell color={pal.rim} opacity={0.44 + level * 0.16} power={2.35} scale={1.22} segments={q.sphereSegments} />
      <FresnelShell color={pal.rimWarm} opacity={0.28 + level * 0.1} power={3.0} scale={1.27} segments={q.sphereSegments} />
      <LiquidCrest color="#79ecff" level={level} opacity={0.62} radius={1.06} tube={0.032} arc={Math.PI * 0.88} rotation={[0.72, -0.24, 2.35]} position={[0, 0.02, 0.12]} />
      <LiquidCrest color="#2fc9ff" level={level} opacity={0.5} radius={1.0} tube={0.026} arc={Math.PI * 0.78} rotation={[0.34, 0.38, 4.52]} position={[0.04, -0.04, 0.1]} />
      <LiquidCrest color="#a66cff" level={level} opacity={0.42} radius={0.94} tube={0.025} arc={Math.PI * 0.7} rotation={[0.58, -0.5, 0.92]} position={[-0.02, -0.02, 0.08]} />
      <LiquidCrest color="#effdff" level={level} opacity={0.34} radius={0.86} tube={0.018} arc={Math.PI * 0.58} rotation={[0.46, 0.12, 3.4]} position={[0, 0, 0.16]} />
      <LocalEmissionPoints points={liquidGlints} level={level} speed={0.7} />
      <CausticField colors={[pal.ribbonA, pal.ribbonB, pal.ribbonC]} level={level * 0.62} count={quality === "low" ? 5 : 9} radius={1.18} vortex />
      <FluidBubbles color={pal.particle} count={quality === "low" ? 10 : 22} level={level} />
      <SpecularHighlights level={level} />
      <OrbitalRings color={pal.rim} warm={pal.rimWarm} level={level} resonance={resonance} recording={rec} />
      <SparkParticles color={pal.particle} count={Math.max(6, q.particleCount - 4)} level={level} recording={rec} radius={1.72} />
      <RecordingRing3D visible={isRecording} elapsedSeconds={elapsedSeconds} level={level} />
      <MelodyTrace3D visible={isRecording} pitchNorm={pitchNorm} level={level} />
    </group>
  );
}
