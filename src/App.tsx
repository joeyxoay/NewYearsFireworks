import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Import our custom hooks and components
import { useHandControl } from './hooks/useHandControl';
import { CountdownDisplay } from './components/CountdownDisplay';
import { Fireworks } from './components/Fireworks';
import { Snow } from './components/Snow';
import { WebcamFeed } from './components/WebcamFeed';

// --- THE 3D SCENE COMPONENT ---
const Scene = ({ fingerCount, isShaking }: { fingerCount: number | null, isShaking: boolean }) => {
  
  // Logic: Show "2026" if shaking, otherwise show the finger count
  const showYear = isShaking;

  return (
    <>
      {/* 1. Camera & Lighting */}
      <PerspectiveCamera makeDefault position={[0, 2, 20]} fov={45} />
      <ambientLight intensity={0.2} />
      <Environment preset="city" background={false} />
      
      {/* 2. Atmosphere (Background) */}
      <color attach="background" args={['#020202']} />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Snow />

      {/* 3. The Floating Text (Countdown) */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[0, 1]}>
        <group position={[0, 1, 0]}>
          <CountdownDisplay count={fingerCount} isFireworks={showYear} />
        </group>
      </Float>

      {/* 4. The Fireworks Engine (Triggers on Shake) */}
      <Fireworks isShaking={isShaking} />

      {/* 5. Reflective Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.8} envMapIntensity={0.5} />
      </mesh>

      {/* 6. Post-Processing (The "Movie Look") */}
      <EffectComposer disableNormalPass>
        {/* Intense Bloom for the glowing sparks */}
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={2.5} radius={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  // Initialize our AI Logic
  const { fingerCount, isShaking, videoRef, isLoaded } = useHandControl();

  // Dynamic Instructions based on state
  let instructionText = "RAISE HAND TO START";
  if (fingerCount !== null) {
      // If holding a fist (0), tell them to shake
      instructionText = fingerCount === 0 ? "SHAKE FIST SIDE-TO-SIDE!" : "COUNT DOWN TO ZERO";
  }
  // If actively shaking, celebrate!
  if (isShaking) instructionText = "HAPPY NEW YEAR!";

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      
      {/* A. The 3D Canvas */}
      <Canvas 
        gl={{ toneMapping: THREE.ReinhardToneMapping, antialias: false }} 
        dpr={[1, 1.5]} // Optimize pixel ratio for performance
      >
        <Scene fingerCount={fingerCount} isShaking={isShaking} />
      </Canvas>
      
      {/* B. The Camera Feed (Top-Left) */}
      <WebcamFeed videoRef={videoRef} isLoaded={isLoaded} />
      
      {/* C. The Instructions Overlay (Bottom) */}
      <div style={{ 
        position: 'absolute', 
        bottom: '40px', 
        width: '100%', 
        textAlign: 'center', 
        color: isShaking ? '#D4AF37' : 'rgba(255,255,255,0.5)', 
        fontFamily: 'sans-serif', 
        fontSize: '0.9rem', 
        letterSpacing: '3px',
        textShadow: isShaking ? '0 0 20px #D4AF37' : 'none',
        transition: 'all 0.3s ease',
        pointerEvents: 'none' // Let clicks pass through to canvas
      }}>
        {instructionText}
      </div>

    </div>
  );
}