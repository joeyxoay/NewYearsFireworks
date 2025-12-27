import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Import your components
import { useHandControl } from './hooks/useHandControl';
import { WebcamFeed } from './components/WebcamFeed';
import { Hologram } from './components/Hologram';
import { Fireworks } from './components/Fireworks'; // <--- 1. Import this

export default function App() {
  const { fingerCount, videoRef, isLoaded } = useHandControl();

  // 2. Define the trigger (Open Hand = 5)
  const isFireworks = fingerCount === 5;

  let status = "SHOW HAND";
  if (fingerCount === 5) status = "✨ FIREWORKS SHOW ✨";
  if (fingerCount === 3) status = "COUNT: 3";
  if (fingerCount === 2) status = "COUNT: 2";
  if (fingerCount === 1) status = "COUNT: 1";

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', overflow: 'hidden' }}>
      
      <Canvas gl={{ toneMapping: THREE.ReinhardToneMapping, antialias: false }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={50} />
        
        <color attach="background" args={['#000']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        {/* The Hologram (Handles numbers 1, 2, 3) */}
        <Suspense fallback={null}>
           <Hologram fingerCount={fingerCount} />
        </Suspense>

        {/* 3. Add the Fireworks Component here */}
        {/* It handles the "Show" types internally, we just turn it on */}
        <Fireworks active={isFireworks} />

        <EffectComposer disableNormalPass>
           <Bloom luminanceThreshold={0.1} mipmapBlur intensity={2.0} radius={0.5} />
        </EffectComposer>

        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} />
      </Canvas>

      <WebcamFeed videoRef={videoRef} isLoaded={isLoaded} />

      <div style={{ 
        position: 'absolute', bottom: '50px', width: '100%', textAlign: 'center', 
        color: '#d8b4fe', fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '4px',
        textShadow: '0 0 20px #a855f7'
      }}>
        {status}
      </div>
    </div>
  );
}