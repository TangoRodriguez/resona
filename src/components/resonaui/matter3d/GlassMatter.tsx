"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { matter3DPalettes } from "@/lib/resonaui/matter3d/palettes";
import { qualitySettings } from "@/lib/resonaui/matter3d/performance";
import type { VisualQuality } from "@/lib/resonaui/matter3d/types";
import { GlowCore } from "./GlowCore";
import { CausticField } from "./CausticField";
import { FresnelShell } from "./FresnelShell";
import { InternalRibbons } from "./InternalRibbons";
import { LensSheet } from "./LensSheet";
import { LocalEmissionPoints } from "./LocalEmissionPoints";
import { MelodyTrace3D } from "./MelodyTrace3D";
import { OrbitalRings } from "./OrbitalRings";
import { RecordingRing3D } from "./RecordingRing3D";
import { RibbonSurface } from "./RibbonSurface";
import { SparkParticles } from "./SparkParticles";
import { SpecularHighlights } from "./SpecularHighlights";

function ChromaticRim({
  level,
  recording
}: {
  level: number;
  recording: number;
}) {
  const group = useRef<THREE.Group>(null);
  const pal = matter3DPalettes.glass;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * 0.06;
    group.current.rotation.x = Math.sin(t * 0.2) * 0.08;
  });

  return (
    <group ref={group}>
      {[
        { color: pal.rim, scale: 1.17, opacity: 0.13, power: 2.1 },
        { color: "#7de7ff", scale: 1.2, opacity: 0.1, power: 2.35 },
        { color: "#d49bff", scale: 1.23, opacity: 0.08 + recording * 0.04, power: 2.75 }
      ].map((pass, i) => (
        <FresnelShell
          key={i}
          color={pass.color}
          opacity={pass.opacity + level * 0.025}
          power={pass.power}
          scale={pass.scale}
          segments={64}
        />
      ))}
    </group>
  );
}

function RimCrescent({
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
    ref.current.scale.setScalar(1 + Math.sin(t * 0.9 + arc) * 0.012 + level * 0.025);
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <torusGeometry args={[radius, tube, 14, 112, arc]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity + level * 0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function RefractiveLensLayers({
  level,
  pitchNorm
}: {
  level: number;
  pitchNorm: number;
}) {
  const group = useRef<THREE.Group>(null);
  const pal = matter3DPalettes.glass;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = -t * 0.08 + pitchNorm * 0.25;
    group.current.rotation.z = Math.sin(t * 0.17) * 0.14;
  });

  return (
    <group ref={group}>
      <LensSheet color={pal.ribbonA} level={level} pitchNorm={pitchNorm} position={[-0.05, 0.16, 0.18]} rotation={[0.92, 0.28, 0.28]} scale={[1.42, 0.38, 0.07]} opacity={0.34} />
      <LensSheet color={pal.ribbonB} level={level} pitchNorm={pitchNorm} position={[0.08, -0.1, 0.12]} rotation={[0.82, -0.22, -0.42]} scale={[1.18, 0.3, 0.06]} opacity={0.28} />
      <LensSheet color={pal.ribbonC} level={level} pitchNorm={pitchNorm} position={[0.02, -0.28, 0.04]} rotation={[0.78, 0.36, 0.72]} scale={[0.94, 0.24, 0.05]} opacity={0.23} />
    </group>
  );
}

export function GlassMatter({
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
  const shell = useRef<THREE.Mesh>(null);
  const pal = matter3DPalettes.glass;
  const q = qualitySettings(quality);
  const rec = isRecording ? 1 : 0;
  const glassGlints = useMemo(
    () => [
      { position: [-0.74, 0.68, 0.78] as [number, number, number], color: "#f7fbff", size: 0.12, phase: 0.1, opacity: 0.5 },
      { position: [0.74, -0.46, 0.58] as [number, number, number], color: "#73ddff", size: 0.1, phase: 1.7, opacity: 0.42 },
      { position: [-0.18, -0.72, 0.68] as [number, number, number], color: "#b986ff", size: 0.09, phase: 2.4, opacity: 0.34 },
      { position: [0.36, 0.42, 0.82] as [number, number, number], color: "#e9f8ff", size: 0.075, phase: 3.8, opacity: 0.4 }
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * 0.12 + pitchNorm * 0.22;
    group.current.rotation.x = Math.sin(t * 0.3) * 0.06;
    group.current.scale.setScalar(1 + level * 0.085 + rec * 0.04);
    if (shell.current) {
      const material = shell.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = 0.25 + level * 0.08;
      material.emissiveIntensity = 0.07 + level * 0.08 + rec * 0.05;
    }
  });

  return (
    <group ref={group}>
      <GlowCore
        color="#b9d8ff"
        level={level}
        pitchNorm={pitchNorm}
        recording={rec}
        radius={0.26}
        baseOpacity={0.07}
        levelOpacity={0.09}
        recordingOpacity={0.035}
        pulseAmount={0.08}
      />

      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[1.0, q.sphereSegments, Math.floor(q.sphereSegments * 0.62)]} />
        <meshBasicMaterial
          color="#07133a"
          transparent
          opacity={0.24 + level * 0.02}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={[0.88, 0.9, 0.88]} rotation={[0.18, -0.28, 0.12]}>
        <sphereGeometry args={[1.0, q.sphereSegments, Math.floor(q.sphereSegments * 0.58)]} />
        <meshPhysicalMaterial
          color="#14327e"
          transparent
          opacity={0.12 + level * 0.025}
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.03}
          transmission={0.72}
          thickness={0.9}
          ior={1.42}
          emissive="#06113d"
          emissiveIntensity={0.04}
          depthWrite={false}
        />
      </mesh>

      <RibbonSurface color="#7de7ff" seed={0.9} level={level} pitchNorm={pitchNorm} opacity={0.34} width={0.36} radius={1.1} twist={0.42} speed={0.075} blend="normal" />
      <RibbonSurface color="#dceaff" seed={2.2} level={level} pitchNorm={pitchNorm} opacity={0.3} width={0.32} radius={1.02} height={0.04} twist={-0.46} speed={-0.065} blend="normal" />
      <RibbonSurface color="#a06cff" seed={4.1} level={level} pitchNorm={pitchNorm} opacity={0.26} width={0.27} radius={0.93} height={-0.05} twist={0.78} speed={0.085} blend="normal" />
      <RibbonSurface color="#f4f8ff" seed={5.7} level={level} pitchNorm={pitchNorm} opacity={0.2} width={0.21} radius={0.84} height={0.0} twist={-0.82} speed={-0.05} blend="normal" />
      <RibbonSurface color="#85f0ff" seed={7.2} level={level} pitchNorm={pitchNorm} opacity={0.13} width={0.17} radius={1.0} height={0.08} twist={1.05} speed={0.048} />

      <InternalRibbons
        colors={[pal.ribbonA, pal.ribbonB, pal.ribbonC]}
        count={quality === "low" ? 1 : 1}
        level={level}
        pitchNorm={pitchNorm}
        recording={rec}
      />

      <RefractiveLensLayers level={level} pitchNorm={pitchNorm} />
      <CausticField colors={["#dceaff", "#7de7ff", "#a06cff"]} level={level * 0.38} count={quality === "low" ? 3 : 5} radius={0.86} />

      <mesh ref={shell}>
        <sphereGeometry args={[1.15, q.sphereSegments, Math.floor(q.sphereSegments * 0.68)]} />
        <meshPhysicalMaterial
          color={pal.shell}
          transparent
          opacity={0.22 + level * 0.04}
          roughness={0.03}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.025}
          transmission={0.86}
          thickness={1.15}
          ior={1.45}
          emissive={pal.inner}
          emissiveIntensity={0.025 + level * 0.025}
          depthWrite={false}
        />
      </mesh>

      <FresnelShell color="#f4f8ff" opacity={0.72 + level * 0.08} power={2.05} scale={1.205} segments={q.sphereSegments} />
      <FresnelShell color="#7de7ff" opacity={0.48 + level * 0.07} power={2.55} scale={1.235} segments={q.sphereSegments} />
      <FresnelShell color="#a06cff" opacity={0.24 + rec * 0.08} power={3.25} scale={1.265} segments={q.sphereSegments} />
      <RimCrescent color="#f7fbff" level={level} opacity={0.62} radius={1.16} tube={0.018} arc={Math.PI * 0.72} rotation={[0.36, -0.34, 2.28]} position={[-0.02, 0.02, 0.16]} />
      <RimCrescent color="#73ddff" level={level} opacity={0.48} radius={1.18} tube={0.014} arc={Math.PI * 0.56} rotation={[0.2, 0.22, 4.55]} position={[0.0, -0.02, 0.14]} />
      <RimCrescent color="#b986ff" level={level} opacity={0.3} radius={1.13} tube={0.012} arc={Math.PI * 0.46} rotation={[0.24, -0.44, 3.75]} position={[0.02, -0.04, 0.12]} />
      <ChromaticRim level={level} recording={rec} />
      <LocalEmissionPoints points={glassGlints} level={level} speed={0.62} />
      <SpecularHighlights level={level} />
      <OrbitalRings color={pal.rim} warm={pal.rimWarm} level={level} resonance={resonance} recording={rec} />
      <SparkParticles color={pal.particle} count={q.particleCount} level={level} recording={rec} />
      <RecordingRing3D visible={isRecording} elapsedSeconds={elapsedSeconds} level={level} />
      <MelodyTrace3D visible={isRecording} pitchNorm={pitchNorm} level={level} />
    </group>
  );
}
