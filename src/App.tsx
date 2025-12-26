import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  MeshReflectorMaterial, 
  Environment, 
  PerspectiveCamera 
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

import { useHandControl } from './hooks/useHandControl';
import { CountdownDisplay } from './components/CountdownDisplay';
import { Fireworks } from './components/Fireworks';

export default function App() {
  const { videoRef, fingerCount, isLoaded } = useHandControl();
  const [displayValue, setDisplayValue] = useState<string>("WAITING");
  const [celebrate, setCelebrate] = useState(false);

  // --- Logic Loop ---
  useEffect(() => {
    // If MediaPipe hasn't found a hand yet
    if (fingerCount === null) {
        setDisplayValue("SHOW HAND");
        return;
    }

    // Once celebration triggers, lock it
    if (celebrate) {
        setDisplayValue("2026");
        return;
    }

    // Trigger celebration on Fist (0 fingers)
    if (fingerCount === 0) {
        setCelebrate(true);
    } else {
        setDisplayValue(fingerCount.toString());
    }
  }, [fingerCount, celebrate]);

  return (
    <>
      {/* 1. HTML Overlay: Hidden Video for Computer Vision */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: '160px',
          height: '120px',
          zIndex: 10,
          borderRadius: '8px',
          opacity: 0.8,
          transform: 'scaleX(-1)', // Mirror preview for user feel
          objectFit: 'cover'
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Loading Indicator */}
      {!isLoaded && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          color: '#00FFFF', 
          fontFamily: 'sans-serif',
          zIndex: 20,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          Initializing Vision Engine...
        </div>
      )}

      {/* 2. The 3D Scene */}
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} color="#ff00ff" />
        <pointLight position={[-10, 5, -10]} intensity={10} color="#00ffff" />

        {/* Content Group */}
        <group position={[0, 0, 0]}>
          <CountdownDisplay value={displayValue} isCelebration={celebrate} />
          <Fireworks active={celebrate} />
        </group>

        {/* Reflective Cyberpunk Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={80}
            roughness={0.1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#050505"
            metalness={0.9}
            mirror={1} 
          />
        </mesh>

        {/* Post Processing Effects */}
        <EffectComposer disableNormalPass>
          {/* Intense Bloom for the Neon look */}
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
          
          {/* @ts-ignore: Typings mismatch in library, safe to ignore */}
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        {/* Background Environment (City Night) */}
        <Environment preset="city" />
        
        {/* Camera Controls */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2} // Prevent going below floor
        />
      </Canvas>
    </>
  );
}