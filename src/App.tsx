import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { useHandControl } from './hooks/useHandControl';
import { WebcamFeed } from './components/WebcamFeed';
import { Hologram } from './components/Hologram';
import { Fireworks } from './components/Fireworks';

export default function App() {
  const { fingerCount, videoRef, isLoaded } = useHandControl();

  const isFireworks = fingerCount === 5;

  let status = "CLICK TO START FULLSCREEN"; // Changed initial text
  if (isLoaded) status = "SHOW HAND";
  if (fingerCount === 5) status = "✨ HAPPY NEW YEAR ✨";
  if (fingerCount === 3) status = "COUNT: 3";
  if (fingerCount === 2) status = "COUNT: 2";
  if (fingerCount === 1) status = "COUNT: 1";

  // --- NEW: Full Screen Logic ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.log(e); // Catch errors if user denies permission
      });
    }
  };

  return (
    // Added onClick handler here
    <div 
      onClick={toggleFullScreen}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#050505', 
        overflow: 'hidden',
        cursor: 'pointer' // Shows hand cursor to indicate clickable
      }}
    >
      
      <Canvas gl={{ toneMapping: THREE.ReinhardToneMapping, antialias: false }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={50} />
        
        <color attach="background" args={['#000']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        <Suspense fallback={null}>
           <Hologram fingerCount={fingerCount} />
        </Suspense>

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
        textShadow: '0 0 20px #a855f7',
        pointerEvents: 'none' // Allows clicks to pass through text
      }}>
        {status}
      </div>
    </div>
  );
}