"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette
} from "@react-three/postprocessing";
import * as THREE from "three";
import { normalizePitch } from "@/lib/resonaui/visualMatter";
import { createGlowTexture } from "@/lib/resonaui/matter3d/materials";
import { matter3DPalettes } from "@/lib/resonaui/matter3d/palettes";
import {
  resolveVisualQuality,
  qualitySettings
} from "@/lib/resonaui/matter3d/performance";
import type {
  Matter3DRenderProps,
  VisualQuality
} from "@/lib/resonaui/matter3d/types";
import { BloomMatter } from "./matter3d/BloomMatter";
import { GlassMatter } from "./matter3d/GlassMatter";
import { LiquidMatter } from "./matter3d/LiquidMatter";
import { TouchRipples3D } from "./matter3d/TouchRipples3D";

type EnhancedRenderProps = Matter3DRenderProps & {
  glide?: number;
  participantCount?: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function Atmosphere({
  color,
  level,
  recording,
  glide
}: {
  color: string;
  level: number;
  recording: number;
  glide: number;
}) {
  const texture = useMemo(
    () => createGlowTexture("rgba(100,150,255,0.86)", "rgba(100,150,255,0)"),
    []
  );
  const ref = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse =
      1 + Math.sin(clock.elapsedTime * 0.9) * 0.035 + level * 0.11 + glide * 0.08;
    ref.current.scale.set(4.8 * pulse, 4.05 * pulse, 1);
    const material = ref.current.material as THREE.SpriteMaterial;
    material.color.set(color);
    material.opacity = 0.2 + level * 0.22 + recording * 0.1 + glide * 0.12;
  });

  return (
    <sprite ref={ref} position={[0, -0.05, -1.18]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.28}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function ContactGlow({ color, level }: { color: string; level: number }) {
  const texture = useMemo(
    () => createGlowTexture("rgba(120,160,255,0.62)", "rgba(120,160,255,0)"),
    []
  );
  const ref = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.035 + level * 0.075;
    ref.current.scale.set(2.75 * pulse, 0.76 * pulse, 1);
    const material = ref.current.material as THREE.SpriteMaterial;
    material.color.set(color);
    material.opacity = 0.26 + level * 0.2;
  });

  return (
    <sprite ref={ref} position={[0, -1.3, -0.28]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function EnergyDust({
  color,
  level,
  glide,
  quality
}: {
  color: string;
  level: number;
  glide: number;
  quality: VisualQuality;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = quality === "high" ? 110 : quality === "medium" ? 72 : 36;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.35 + Math.random() * 1.65;
      values[i * 3] = Math.cos(angle) * radius;
      values[i * 3 + 1] = Math.sin(angle) * radius * 0.72;
      values[i * 3 + 2] = -0.55 + Math.random() * 1.35;
    }
    return values;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.elapsedTime * (0.015 + glide * 0.045);
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.17) * 0.09;
    const material = ref.current.material as THREE.PointsMaterial;
    material.opacity = 0.2 + level * 0.34 + glide * 0.22;
    material.size = 0.018 + level * 0.016 + glide * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.025}
        transparent
        opacity={0.32}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function ResonanceWeb({
  count,
  resonance,
  color
}: {
  count: number;
  resonance: number;
  color: string;
}) {
  const group = useRef<THREE.Group>(null);
  const visibleCount = Math.max(1, Math.min(8, count));
  const points = useMemo(
    () =>
      Array.from({ length: visibleCount }, (_, index) => {
        const angle = (index / visibleCount) * Math.PI * 2 - Math.PI / 2;
        const radius = 1.85 + (index % 2) * 0.16;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.6,
          Math.sin(angle * 1.7) * 0.24
        );
      }),
    [visibleCount]
  );
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      vertices.push(point.x, point.y, point.z, next.x, next.y, next.z);
      vertices.push(point.x, point.y, point.z, 0, 0, -0.25);
    });
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    return nextGeometry;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = clock.elapsedTime * 0.035;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.19) * 0.12;
  });

  if (count < 2) return null;
  return (
    <group ref={group}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.12 + resonance * 0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.055 + resonance * 0.025, 18, 12]} />
          <meshBasicMaterial
            color={index % 2 ? "#a06cff" : color}
            transparent
            opacity={0.52 + resonance * 0.32}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function GlideHalo({
  glide,
  pitchNorm,
  color
}: {
  glide: number;
  pitchNorm: number;
  color: string;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = glide > 0.03;
    group.current.rotation.z = clock.elapsedTime * (0.25 + glide * 0.8);
    group.current.rotation.x = 0.9 + (pitchNorm - 0.5) * 0.8;
    const scale = 1 + glide * 0.18;
    group.current.scale.setScalar(scale);
  });
  if (glide <= 0.03) return null;
  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[1.55, 0.012 + glide * 0.018, 10, 128]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.28 + glide * 0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0.48, 0.18, 1.2]}>
        <torusGeometry args={[1.75, 0.007 + glide * 0.012, 8, 128]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.12 + glide * 0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SceneContent({
  mode,
  matter,
  level,
  resonance,
  pitch,
  pitchConfidence = 0,
  isRecording = false,
  elapsedSeconds = 0,
  quality,
  touches,
  glide = 0,
  participantCount = 1
}: EnhancedRenderProps & { quality: VisualQuality }) {
  const palette = matter3DPalettes[matter];
  const pitchNorm = pitch && pitchConfidence > 0.08 ? normalizePitch(pitch) : 0.5;
  const peerEnergy = Math.min(0.18, Math.max(0, participantCount - 1) * 0.035);
  const reactiveLevel = clamp01(
    level + (isRecording ? 0.08 : 0) + glide * 0.2 + peerEnergy
  );
  const recording = isRecording ? 1 : 0;
  const settings = qualitySettings(quality);

  return (
    <>
      <ambientLight intensity={0.11} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.85} color="#f0f5ff" />
      <pointLight position={[-2.5, 1.5, 2.5]} intensity={2.8} color="#5ea0ff" />
      <pointLight position={[2.2, -1.7, 2]} intensity={2.25} color="#a06cff" />
      <pointLight
        position={[0, 0.1, 2.2]}
        intensity={0.72 + reactiveLevel * 1.05}
        color={palette.core}
      />

      <Atmosphere
        color={palette.shadow}
        level={reactiveLevel}
        recording={recording}
        glide={glide}
      />
      <ContactGlow color={palette.rim} level={reactiveLevel} />
      <EnergyDust
        color={palette.rim}
        level={reactiveLevel}
        glide={glide}
        quality={quality}
      />

      {matter === "liquid" ? (
        <LiquidMatter
          level={reactiveLevel}
          resonance={resonance}
          pitchNorm={pitchNorm}
          isRecording={isRecording}
          elapsedSeconds={elapsedSeconds}
          quality={quality}
        />
      ) : matter === "bloom" ? (
        <BloomMatter
          level={reactiveLevel}
          resonance={resonance}
          pitchNorm={pitchNorm}
          isRecording={isRecording}
          elapsedSeconds={elapsedSeconds}
          quality={quality}
        />
      ) : (
        <GlassMatter
          level={reactiveLevel}
          resonance={resonance}
          pitchNorm={pitchNorm}
          isRecording={isRecording || mode === "capture"}
          elapsedSeconds={elapsedSeconds}
          quality={quality}
        />
      )}

      <ResonanceWeb
        count={mode === "merge" ? participantCount : 1}
        resonance={resonance}
        color={palette.rim}
      />
      <GlideHalo glide={glide} pitchNorm={pitchNorm} color={palette.rim} />
      <TouchRipples3D touches={touches} color={palette.rim} />

      <Environment resolution={64} environmentIntensity={0.44}>
        <Lightformer
          intensity={2.8}
          color="#e7efff"
          position={[0, 2.4, 3]}
          scale={[3.8, 0.65, 1]}
        />
        <Lightformer
          intensity={2}
          color="#65c9ff"
          position={[-2.6, 0.8, 2.2]}
          scale={[1.2, 2.8, 1]}
        />
        <Lightformer
          intensity={1.65}
          color="#b56cff"
          position={[2.5, -1.2, 2.2]}
          scale={[1.4, 2.2, 1]}
        />
      </Environment>

      {settings.effects && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0}>
          <Bloom
            intensity={0.58 + reactiveLevel * 0.34 + glide * 0.22}
            luminanceThreshold={0.42}
            luminanceSmoothing={0.72}
          />
          <ChromaticAberration
            offset={[0.00032 + glide * 0.00024, 0.00048 + glide * 0.00032]}
          />
          <Vignette eskil={false} offset={0.14} darkness={0.24} />
        </EffectComposer>
      )}
    </>
  );
}

export default function SoundMatterScene(props: EnhancedRenderProps) {
  const [quality, setQuality] = useState<VisualQuality>(props.quality ?? "high");

  useEffect(() => {
    setQuality(props.quality ?? resolveVisualQuality());
  }, [props.quality]);

  return (
    <Canvas
      dpr={quality === "high" ? [1, 2] : quality === "medium" ? [1, 1.55] : 1}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.14;
      }}
      camera={{ position: [0, 0, 5.15], fov: 38 }}
    >
      <SceneContent {...props} quality={quality} />
    </Canvas>
  );
}
