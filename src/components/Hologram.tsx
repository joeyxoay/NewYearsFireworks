import React, { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- CONFIG ---
const PARTICLE_COUNT = 15000;
const SPHERE_RADIUS = 6;

// --- SHADER (Modified for Fading instead of Exploding) ---
const HologramMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#8a2be2'), // Purple
    uColor2: new THREE.Color('#00ffff'), // Cyan
    uMorphTarget: 0, 
    uOpacity: 1.0, // <--- Controls visibility
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uMorphTarget;
    
    attribute vec3 aSpherePos;
    attribute vec3 aCurrentTextTarget; 

    varying float vDepth;

    void main() {
      // Morph between Sphere and Text
      vec3 pos = mix(aSpherePos, aCurrentTextTarget, uMorphTarget);

      // Subtle breathing animation (always active)
      vec3 dir = normalize(aSpherePos); 
      pos += dir * sin(uTime + pos.y) * 0.1; 

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = (80.0 / -mvPosition.z);
      vDepth = -mvPosition.z;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uOpacity; // <--- Fade control
    varying float vDepth;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      vec3 color = mix(uColor1, uColor2, smoothstep(10.0, 30.0, vDepth));
      
      // Apply the fade
      gl_FragColor = vec4(color, uOpacity);
    }
  `
);

extend({ HologramMaterial });

// --- MATH HELPER: Generate Points from Canvas Text ---
// This is the version you liked!
const generateTextPoints = (text: string) => {
  const size = 128; // Canvas resolution
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Draw black text on transparent background
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(text, size / 2, size / 2);

  const imgData = ctx.getImageData(0, 0, size, size);
  const validPixels: number[] = [];

  // Scan pixels to find the shape
  for (let i = 0; i < size * size; i++) {
    const alpha = imgData.data[i * 4 + 3]; // Check alpha channel
    if (alpha > 128) {
       validPixels.push(i);
    }
  }

  const data = new Float32Array(PARTICLE_COUNT * 3);
  
  // Map particles to the valid pixels
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Pick a random pixel from the text shape
    const pixelIndex = validPixels[Math.floor(Math.random() * validPixels.length)];
    const x = (pixelIndex % size);
    const y = Math.floor(pixelIndex / size);

    // Normalize to 3D world space (-10 to 10)
    // Flip Y because canvas coords are top-down
    const worldX = (x / size - 0.5) * 15; 
    const worldY = -(y / size - 0.5) * 15;
    
    data[i * 3] = worldX;
    data[i * 3 + 1] = worldY;
    data[i * 3 + 2] = (Math.random() - 0.5) * 2; // Slight depth thickness
  }
  return data;
};

// Helper: Sphere Points
const sampleSphere = () => {
  const data = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    data[i * 3] = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
    data[i * 3 + 1] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
    data[i * 3 + 2] = SPHERE_RADIUS * Math.cos(phi);
  }
  return data;
};

export const Hologram = ({ fingerCount }: { fingerCount: number | null }) => {
  const materialRef = useRef<any>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  // Generate shapes on load using the Canvas method
  const [spherePos, text3Pos, text2Pos, text1Pos] = useMemo(() => {
    return [
      sampleSphere(),
      generateTextPoints("3"),
      generateTextPoints("2"),
      generateTextPoints("1")
    ];
  }, []);

  useFrame((state, delta) => {
    if (!materialRef.current || !geometryRef.current) return;
    
    materialRef.current.uTime = state.clock.elapsedTime;

    let targetBuffer = spherePos;
    let morphLevel = 0;
    let opacityTarget = 1.0;

    // --- LOGIC MAP ---
    if (fingerCount === 5) {
        // FADE OUT (Fireworks take over)
        targetBuffer = spherePos;
        morphLevel = 0; 
        opacityTarget = 0.0; 
    } else if (fingerCount === 3) {
        targetBuffer = text3Pos;
        morphLevel = 1;
    } else if (fingerCount === 2) {
        targetBuffer = text2Pos;
        morphLevel = 1;
    } else if (fingerCount === 1) {
        targetBuffer = text1Pos;
        morphLevel = 1;
    } else {
        // Idle Sphere
        targetBuffer = spherePos;
        morphLevel = 0;
    }

    // Smooth Interpolation
    materialRef.current.uMorphTarget = THREE.MathUtils.lerp(materialRef.current.uMorphTarget, morphLevel, delta * 3);
    materialRef.current.uOpacity = THREE.MathUtils.lerp(materialRef.current.uOpacity, opacityTarget, delta * 5);

    // Update geometry only if morphing to text
    if (morphLevel > 0.01) {
       geometryRef.current.attributes.aCurrentTextTarget.needsUpdate = true;
       const array = geometryRef.current.attributes.aCurrentTextTarget.array as Float32Array;
       array.set(targetBuffer); 
    }
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={spherePos} itemSize={3} />
        <bufferAttribute attach="attributes-aSpherePos" count={PARTICLE_COUNT} array={spherePos} itemSize={3} />
        <bufferAttribute attach="attributes-aCurrentTextTarget" count={PARTICLE_COUNT} array={spherePos} itemSize={3} /> 
      </bufferGeometry>
      {/* @ts-ignore */}
      <hologramMaterial 
        ref={materialRef} 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
      />
    </points>
  );
};