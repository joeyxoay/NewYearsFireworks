import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Significantly increased count for "elegant swarm" look
const PARTICLE_COUNT = 6000;

// Generate a soft spark texture programmatically so we don't need an image file
const createSparkTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Hot white center
  gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.8)'); // Gold mid
  gradient.addColorStop(0.5, 'rgba(200, 100, 50, 0.1)'); // Reddish falloff
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const Fireworks = ({ isShaking }: { isShaking: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const sparkTexture = useMemo(() => createSparkTexture(), []);
  
  // Physics Data Buffers
  const data = useMemo(() => ({
      positions: new Float32Array(PARTICLE_COUNT * 3),
      velocities: new Float32Array(PARTICLE_COUNT * 3),
      colors: new Float32Array(PARTICLE_COUNT * 3),
      life: new Float32Array(PARTICLE_COUNT).fill(0), // 0 = dead, 1 = just born
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // Main Animation Loop
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    // --- EMISSION LOGIC ---
    // If shaking, spawn new mini-explosions constantly
    if (isShaking) {
        // Spawn X particles per frame
        let spawnCount = 0;
        const particlesToSpawn = 30; // Adjust for density of new bursts

        // Find a random starting point for this burst in the sky
        const startX = (Math.random() - 0.5) * 15;
        const startY = 5 + Math.random() * 8;
        const startZ = (Math.random() - 0.5) * 10;
        
        // Pick a color palette for this burst
        const palette = Math.random() > 0.5 ? 
          [new THREE.Color('#FFD700'), new THREE.Color('#FF4500')] : // Gold/Orange
          [new THREE.Color('#00FFFF'), new THREE.Color('#FF00FF')]; // Cyan/Magenta

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if (spawnCount >= particlesToSpawn) break;

            // Find dead particles to recycle
            if (data.life[i] <= 0) {
                // Reset position
                data.positions[i*3] = startX;
                data.positions[i*3+1] = startY;
                data.positions[i*3+2] = startZ;

                // Spherical explosion velocity
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                // Smaller speed for elegant sparks
                const speed = Math.random() * 0.3 + 0.1; 

                data.velocities[i*3] = speed * Math.sin(phi) * Math.cos(theta);
                data.velocities[i*3+1] = speed * Math.sin(phi) * Math.sin(theta);
                data.velocities[i*3+2] = speed * Math.cos(phi);

                // Assign Color
                colorHelper.lerpColors(palette[0], palette[1], Math.random());
                data.colors[i*3] = colorHelper.r;
                data.colors[i*3+1] = colorHelper.g;
                data.colors[i*3+2] = colorHelper.b;

                // Reset life (add slight variance)
                data.life[i] = 1.0 + Math.random() * 0.2;
                spawnCount++;
            }
        }
    }

    // --- PHYSICS & RENDERING LOOP ---
    let activeParticles = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (data.life[i] > 0) {
        activeParticles++;

        // 1. Physics
        data.positions[i*3] += data.velocities[i*3];
        data.positions[i*3+1] += data.velocities[i*3+1];
        data.positions[i*3+2] += data.velocities[i*3+2];
        
        // Gravity (slight)
        data.velocities[i*3+1] -= 0.002;
        
        // Drag (Air resistance - makes them slow down elegantly)
        data.velocities[i*3] *= 0.96;
        data.velocities[i*3+1] *= 0.96;
        data.velocities[i*3+2] *= 0.96;

        // Decay life
        data.life[i] -= 0.008; // Slower fade out

        // 2. Rendering
        // Scale based on life (fade in quickly, fade out slowly)
        let scale;
        if (data.life[i] > 0.8) {
             scale = (1.0 - data.life[i]) * 5.0 * 0.25; // Grow
        } else {
             scale = data.life[i] * 0.25; // Shrink
        }
        
        dummy.position.set(
          data.positions[i*3],
          data.positions[i*3+1],
          data.positions[i*3+2]
        );
        // Billboarding: make particles face camera
        dummy.lookAt(state.camera.position); 
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        
        meshRef.current.setMatrixAt(i, dummy.matrix);
        // Fade color to black as it dies
        colorHelper.setRGB(data.colors[i*3], data.colors[i*3+1], data.colors[i*3+2]);
        colorHelper.multiplyScalar(data.life[i]); // Dim over time
        meshRef.current.setColorAt(i, colorHelper);
      } else {
        // Hide dead particles
        meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
      }
    }
    
    if (activeParticles > 0) {
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.visible = activeParticles > 0;
  });

  return (
    <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false} // Prevent flickering at screen edges
    >
      <planeGeometry args={[1, 1]} /> {/* Using planes instead of spheres for texture */}
      <meshBasicMaterial 
        map={sparkTexture}
        transparent={true}
        // Additive blending makes overlapping particles glow intensely
        blending={THREE.AdditiveBlending} 
        depthWrite={false} // Crucial for transparent particles overlapping correctly
        toneMapped={false} // Keep colors overly bright for bloom
      />
    </instancedMesh>
  );
};