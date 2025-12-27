import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 12000;

// Firework Types
const TYPE_PEONY = 0;   
const TYPE_WILLOW = 1;  
const TYPE_PALM = 2;    
const TYPE_FISH = 3;    
const TYPE_CROSSETTE = 4; 
const TYPE_BROCADE = 5; 

// NEW: Generate a soft, warm GOLDEN glow texture
const createGoldTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  // Radial gradient for a soft point
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 240, 1)'); // Hot white-gold center
  gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)'); // Rich amber mid
  gradient.addColorStop(0.6, 'rgba(100, 50, 0, 0.1)'); // Brownish falloff
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const Fireworks = ({ active }: { active: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createGoldTexture(), []);
  
  const data = useMemo(() => ({
    pos: new Float32Array(PARTICLE_COUNT * 3),
    vel: new Float32Array(PARTICLE_COUNT * 3),
    life: new Float32Array(PARTICLE_COUNT).fill(0),
    color: new Float32Array(PARTICLE_COUNT * 3),
    type: new Float32Array(PARTICLE_COUNT), 
    extra: new Float32Array(PARTICLE_COUNT * 3) 
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);
  const timer = useRef(0);

  const launchFirework = () => {
    // High chance of Willow for the elegant curtain look
    let type = Math.floor(Math.random() * 6);
    if (Math.random() > 0.6) type = TYPE_WILLOW;

    const cx = (Math.random() - 0.5) * 20;
    const cy = 5 + Math.random() * 8; 
    const cz = (Math.random() - 0.5) * 10;

    // --- NEW COLOR PALETTE (Strictly Golden/Warm) ---
    const baseColor = new THREE.Color();
    if (type === TYPE_WILLOW) baseColor.set('#ffcc00'); // Rich Gold
    else if (type === TYPE_BROCADE) baseColor.set('#ffffff'); // Diamond White
    else if (type === TYPE_CROSSETTE) baseColor.set('#ffaa33'); // Amber Gold
    else if (type === TYPE_PALM) baseColor.set('#ffdd88'); // Pale Gold
    else if (type === TYPE_FISH) baseColor.set('#ffbb00'); // Orange Gold
    // Peony: Restrict to warm hues (Red to Yellow)
    else baseColor.setHSL(Math.random() * 0.15, 0.9, 0.6); 

    const count = type === TYPE_FISH ? 80 : 350; 

    let spawned = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (spawned >= count) break;

      if (data.life[i] <= 0) {
        data.type[i] = type;
        data.life[i] = 1.0;
        data.pos[i*3] = cx; data.pos[i*3+1] = cy; data.pos[i*3+2] = cz;

        data.color[i*3] = baseColor.r;
        data.color[i*3+1] = baseColor.g;
        data.color[i*3+2] = baseColor.b;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        if (type === TYPE_WILLOW) {
            const speed = Math.random() * 0.2 + 0.05;
            data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
            data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
            data.vel[i*3+2] = Math.cos(phi) * speed;
        }
        else if (type === TYPE_PALM) {
            const arm = Math.floor(Math.random() * 6);
            const armAngle = (arm / 6) * Math.PI * 2;
            const spread = (Math.random() - 0.5) * 0.05; 
            const speed = Math.random() * 0.8 + 0.5;
            data.vel[i*3] = Math.cos(armAngle + spread) * speed;
            data.vel[i*3+1] = (Math.random() - 0.5) * 0.1 * speed; 
            data.vel[i*3+2] = Math.sin(armAngle + spread) * speed;
        } 
        else {
             const speed = Math.random() * 0.7 + 0.2;
             data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
             data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
             data.vel[i*3+2] = Math.cos(phi) * speed;
        }

        data.extra[i*3] = Math.random(); 
        spawned++;
      }
    }
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    if (active) {
        timer.current -= delta;
        if (timer.current <= 0) {
            launchFirework();
            timer.current = Math.random() * 0.5 + 0.2; 
        }
    }

    let activeParticles = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (data.life[i] > 0) {
        activeParticles++;
        const type = data.type[i];
        
        data.pos[i*3] += data.vel[i*3];
        data.pos[i*3+1] += data.vel[i*3+1];
        data.pos[i*3+2] += data.vel[i*3+2];

        if (type === TYPE_WILLOW) {
            data.vel[i*3] *= 0.85;  
            data.vel[i*3+2] *= 0.85;
            data.vel[i*3+1] -= 0.005; 
        }
        else if (type === TYPE_FISH) {
            data.vel[i*3] += Math.sin(time * 20 + data.extra[i*3]*10) * 0.03;
            data.vel[i*3+1] += Math.cos(time * 20 + data.extra[i*3]*10) * 0.03;
            data.vel[i*3+2] += Math.sin(time * 20) * 0.03;
            data.vel[i*3] *= 0.94; 
        } 
        else {
            data.vel[i*3+1] -= 0.006; 
            data.vel[i*3] *= 0.97;    
            data.vel[i*3+1] *= 0.97;
            data.vel[i*3+2] *= 0.97;
        }

        // --- LIFE DECAY (FASTER NOW) ---
        // Was 0.003 for willow, now 0.008 to make trails shorter
        const decayRate = (type === TYPE_WILLOW) ? 0.008 : 0.015;
        data.life[i] -= decayRate;

        dummy.position.set(data.pos[i*3], data.pos[i*3+1], data.pos[i*3+2]);
        
        // Stretch Logic (Comet Tail)
        dummy.lookAt(
            data.pos[i*3] + data.vel[i*3], 
            data.pos[i*3+1] + data.vel[i*3+1], 
            data.pos[i*3+2] + data.vel[i*3+2]
        );

        const speed = Math.sqrt(data.vel[i*3]**2 + data.vel[i*3+1]**2 + data.vel[i*3+2]**2);
        let width = data.life[i] * 0.4; // Slightly fatter for soft texture
        let length = width; 

        if (type === TYPE_WILLOW) {
            length = speed * 6.0; 
            width *= 0.6; 
        } else if (type === TYPE_PALM || type === TYPE_CROSSETTE) {
            length = speed * 4.0;
        }

        dummy.scale.set(width, width, length);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        colorHelper.setRGB(data.color[i*3], data.color[i*3+1], data.color[i*3+2]);
        // Fade color intensity with life
        colorHelper.multiplyScalar(data.life[i]);
        meshRef.current.setColorAt(i, colorHelper);

      } else {
        meshRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      {/* Use the soft texture on the stretched geometry */}
      <tetrahedronGeometry args={[0.3, 0]} />
      <meshBasicMaterial 
        map={texture} // Apply the gold texture
        color="#ffffff" 
        transparent={true}
        blending={THREE.AdditiveBlending} // Makes them glow and merge softly
        depthWrite={false} 
        toneMapped={false}
      />
    </instancedMesh>
  );
};