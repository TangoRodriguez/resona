"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { normalizePitch } from "@/lib/resonaui/visualMatter";
import { createGlowTexture } from "@/lib/resonaui/matter3d/materials";
import { matter3DPalettes } from "@/lib/resonaui/matter3d/palettes";
import { resolveVisualQuality, qualitySettings } from "@/lib/resonaui/matter3d/performance";
import type { Matter3DRenderProps, VisualQuality } from "@/lib/resonaui/matter3d/types";
import { BloomMatter } from "./matter3d/BloomMatter";
import { GlassMatter } from "./matter3d/GlassMatter";
import { LiquidMatter } from "./matter3d/LiquidMatter";
import { TouchRipples3D } from "./matter3d/TouchRipples3D";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function Atmosphere({
  color,
  level,
  recording
}: {
  color: string;
  level: number;
  recording: number;
}) {
  const texture = useMemo(
    () => createGlowTexture("rgba(100,150,255,0.72)", "rgba(100,150,255,0)"),
    []
  );
  const ref = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.9) * 0.025 + level * 0.08;
    ref.current.scale.set(4.2 * pulse, 3.5 * pulse, 1);
    const material = ref.current.material as THREE.SpriteMaterial;
    material.color.set(color);
    material.opacity = 0.18 + level * 0.18 + recording * 0.08;
  });

  return (
    <sprite ref={ref} position={[0, -0.08, -1.12]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.24}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function ContactGlow({
  color,
  level
}: {
  color: string;
  level: number;
}) {
  const texture = useMemo(
    () => createGlowTexture("rgba(120,160,255,0.55)", "rgba(120,160,255,0)"),
    []
  );
  const ref = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.03 + level * 0.06;
    ref.current.scale.set(2.45 * pulse, 0.68 * pulse, 1);
    const material = ref.current.material as THREE.SpriteMaterial;
    material.color.set(color);
    material.opacity = 0.24 + level * 0.18;
  });

  return (
    <sprite ref={ref} position={[0, -1.28, -0.28]}>
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

function MergeSatellites({
  visible,
  resonance,
  level,
  color
}: {
  visible: boolean;
  resonance: number;
  level: number;
  color: string;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = visible;
    group.current.rotation.y = clock.elapsedTime * 0.18;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.23) * 0.08;
  });

  if (!visible) return null;

  return (
    <group ref={group}>
      {Array.from({ length: 4 }, (_, i) => {
        const a = (i / 4) * Math.PI * 2;
        const r = 1.9 + resonance * 0.18;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.56, Math.sin(a) * 0.28]}>
            <sphereGeometry args={[0.075 + level * 0.018, 18, 12]} />
            <meshBasicMaterial
              color={i % 2 ? "#a06cff" : color}
              transparent
              opacity={0.44 + resonance * 0.26}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
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
  touches
}: Matter3DRenderProps & { quality: VisualQuality }) {
  const pal = matter3DPalettes[matter];
  const pitchNorm = pitch && pitchConfidence > 0.08 ? normalizePitch(pitch) : 0.5;
  const reactiveLevel = clamp01(level + (isRecording ? 0.08 : 0));
  const rec = isRecording ? 1 : 0;
  const q = qualitySettings(quality);
  const effectsEnabled = false;

  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.6} color="#eaf2ff" />
      <pointLight position={[-2.5, 1.5, 2.5]} intensity={2.4} color="#5ea0ff" />
      <pointLight position={[2.2, -1.7, 2]} intensity={1.9} color="#a06cff" />
      <pointLight position={[0, 0.1, 2.2]} intensity={0.55 + reactiveLevel * 0.75} color={pal.core} />

      <Atmosphere color={pal.shadow} level={reactiveLevel} recording={rec} />
      <ContactGlow color={pal.rim} level={reactiveLevel} />

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

      <MergeSatellites visible={mode === "merge"} resonance={resonance} level={reactiveLevel} color={pal.rim} />
      <TouchRipples3D touches={touches} color={pal.rim} />
      <Environment resolution={64} environmentIntensity={0.36}>
        <Lightformer intensity={2.4} color="#d7e7ff" position={[0, 2.4, 3]} scale={[3.8, 0.65, 1]} />
        <Lightformer intensity={1.7} color="#65baff" position={[-2.6, 0.8, 2.2]} scale={[1.2, 2.8, 1]} />
        <Lightformer intensity={1.3} color="#a06cff" position={[2.5, -1.2, 2.2]} scale={[1.4, 2.2, 1]} />
      </Environment>

      {effectsEnabled && q.effects && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0}>
          <Bloom intensity={0.72 + reactiveLevel * 0.38} luminanceThreshold={0.24} luminanceSmoothing={0.7} />
          <ChromaticAberration offset={[0.00055, 0.00085]} />
          <Vignette eskil={false} offset={0.08} darkness={0.32} />
        </EffectComposer>
      )}
    </>
  );
}

export default function SoundMatterScene(props: Matter3DRenderProps) {
  const [quality, setQuality] = useState<VisualQuality>(props.quality ?? "high");

  useEffect(() => {
    setQuality(props.quality ?? resolveVisualQuality());
  }, [props.quality]);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
      camera={{
        position: [0, 0, 5.15],
        fov: 38
      }}
    >
      <SceneContent {...props} quality={quality} />
    </Canvas>
  );
}
