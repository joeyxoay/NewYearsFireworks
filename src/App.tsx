import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { useHandControl } from './hooks/useHandControl';
import { CountdownDisplay } from './components/CountdownDisplay';
import { Fireworks } from './components/Fireworks';
import { Snow } from './components/Snow'; // Import Snow
import { WebcamFeed } from './components/WebcamFeed';

const Scene = ({ fingerCount }: { fingerCount: number | null }) => {
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (fingerCount === 0) setCelebrate(true);
    if (fingerCount === 5) setCelebrate(false);
  }, [fingerCount]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={45} />
      <ambientLight intensity={0.5} />
      
      <Environment preset="city" background={false} />
      <color attach="background" args={['#050505']} />
      
      {/* BACKGROUND ELEMENTS */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Snow /> {/* Added Snow Here */}

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group>
          <CountdownDisplay count={fingerCount} isFireworks={celebrate} />
        </group>
      </Float>

      <Fireworks active={celebrate} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.8} />
      </mesh>

      <EffectComposer>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={2.0} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

export default function App() {
  const { fingerCount, videoRef, isLoaded } = useHandControl();

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas gl={{ toneMapping: THREE.ReinhardToneMapping }}>
        <Scene fingerCount={fingerCount} />
      </Canvas>
      <WebcamFeed videoRef={videoRef} isLoaded={isLoaded} />
      
      {/* Subtle UI Instructions */}
      <div style={{ 
        position: 'absolute', bottom: '30px', width: '100%', textAlign: 'center', 
        color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', fontSize: '0.8rem', letterSpacing: '2px' 
      }}>
        {fingerCount === null ? "RAISE HAND TO START" : "MAKE A FIST FOR FIREWORKS"}
      </div>
    </div>
  );
}