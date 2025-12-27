import React, { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- CONFIG ---
const PARTICLE_COUNT = 15000;
const SPHERE_RADIUS = 6;

// --- SHADER (Same as before) ---
const HologramMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#8a2be2'), // Purple
    uColor2: new THREE.Color('#00ffff'), // Cyan
    uMorphTarget: 0, 
    uExplode: 0,     
  },
  `
    uniform float uTime;
    uniform float uMorphTarget;
    uniform float uExplode;
    
    attribute vec3 aSpherePos;
    attribute vec3 aCurrentTextTarget; 

    varying float vDepth;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // Morph between Sphere and Text
      vec3 pos = mix(aSpherePos, aCurrentTextTarget, uMorphTarget);

      // Explosion Logic
      vec3 dir = normalize(aSpherePos); 
      if (uExplode > 0.5) {
          pos += dir * (sin(uTime * 5.0 + random(pos.xy)) * 2.0 + 1.0) * uExplode;
      } else {
          pos += dir * sin(uTime + pos.y) * 0.1; 
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = (80.0 / -mvPosition.z);
      vDepth = -mvPosition.z;
    }
  `,
  `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying float vDepth;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      vec3 color = mix(uColor1, uColor2, smoothstep(10.0, 30.0, vDepth));
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ HologramMaterial });

// --- MATH HELPER: Generate Points from Canvas Text ---
// This replaces the need for a font file.
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
  
  // Generate shapes on load (No external files needed!)
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
    let explodeLevel = 0;

    // Logic Map
    if (fingerCount === 5) {
        targetBuffer = spherePos;
        morphLevel = 0; 
        explodeLevel = 2.0; // Explosion
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
        targetBuffer = spherePos;
        morphLevel = 0;
    }

    materialRef.current.uMorphTarget = THREE.MathUtils.lerp(materialRef.current.uMorphTarget, morphLevel, delta * 3);
    materialRef.current.uExplode = THREE.MathUtils.lerp(materialRef.current.uExplode, explodeLevel, delta * 2);

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