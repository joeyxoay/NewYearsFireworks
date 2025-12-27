import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// DOUBLED COUNT for "Elegant" dense look
const PARTICLE_COUNT = 12000;

// Firework Types
const TYPE_PEONY = 0;   
const TYPE_WILLOW = 1;  // Gold, hang time, trails
const TYPE_PALM = 2;    
const TYPE_FISH = 3;    
const TYPE_CROSSETTE = 4; // Cracking trails
const TYPE_BROCADE = 5; 

const createTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32; // Smaller texture for performance
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Hot core
  gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.5)'); // Soft glow
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const Fireworks = ({ active }: { active: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createTexture(), []);
  
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
    const type = Math.floor(Math.random() * 6);
    
    // Position
    const cx = (Math.random() - 0.5) * 20;
    const cy = 8 + Math.random() * 6; // Higher up
    const cz = (Math.random() - 0.5) * 10;

    // Strict Elegant Colors
    const baseColor = new THREE.Color();
    if (type === TYPE_WILLOW) baseColor.set('#FFD700'); // Gold
    else if (type === TYPE_BROCADE) baseColor.set('#FFFFFF'); // White Diamond
    else if (type === TYPE_CROSSETTE) baseColor.set('#FFaa00'); // Orange/Gold
    else if (type === TYPE_PALM) baseColor.set(Math.random() > 0.5 ? '#00FF88' : '#FF0055'); // Neon Green/Red
    else if (type === TYPE_FISH) baseColor.set('#00FFFF'); // Cyan
    else baseColor.setHSL(Math.random(), 0.9, 0.6); // Peony

    // Particle Count per burst (More particles = fuller look)
    const count = type === TYPE_FISH ? 80 : 400; 

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
        
        // --- PHYSICS INITIALIZATION ---
        if (type === TYPE_PALM) {
            const arm = Math.floor(Math.random() * 6);
            const armAngle = (arm / 6) * Math.PI * 2;
            const spread = (Math.random() - 0.5) * 0.05; // Tight arms
            const speed = Math.random() * 0.8 + 0.5;
            data.vel[i*3] = Math.cos(armAngle + spread) * speed;
            data.vel[i*3+1] = (Math.random() - 0.5) * 0.1 * speed; 
            data.vel[i*3+2] = Math.sin(armAngle + spread) * speed;
        } 
        else if (type === TYPE_WILLOW) {
            // WILLOW: Low speed, will rely on gravity
            const speed = Math.random() * 0.3 + 0.1;
            data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
            data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
            data.vel[i*3+2] = Math.cos(phi) * speed;
        }
        else if (type === TYPE_CROSSETTE) {
             // CROSSETTE: Fast burst
             const speed = Math.random() * 0.6 + 0.3;
             data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
             data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
             data.vel[i*3+2] = Math.cos(phi) * speed;
        }
        else {
             // STANDARD
             const speed = Math.random() * 0.7 + 0.2;
             data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
             data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
             data.vel[i*3+2] = Math.cos(phi) * speed;
        }

        data.extra[i*3] = Math.random(); // Random seed
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
            timer.current = Math.random() * 0.4 + 0.2; // Rapid fire
        }
    }

    let activeParticles = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (data.life[i] > 0) {
        activeParticles++;
        const type = data.type[i];
        
        // 1. POSITION
        data.pos[i*3] += data.vel[i*3];
        data.pos[i*3+1] += data.vel[i*3+1];
        data.pos[i*3+2] += data.vel[i*3+2];

        // 2. BEHAVIOR
        if (type === TYPE_FISH) {
            // Fish wiggle
            data.vel[i*3] += Math.sin(time * 20 + data.extra[i*3]*10) * 0.03;
            data.vel[i*3+1] += Math.cos(time * 20 + data.extra[i*3]*10) * 0.03;
            data.vel[i*3+2] += Math.sin(time * 20) * 0.03;
            data.vel[i*3] *= 0.94; 
        } 
        else if (type === TYPE_WILLOW) {
            // WILLOW: Extreme Drag (Stops in air) + Gravity (Drips)
            data.vel[i*3] *= 0.90;  
            data.vel[i*3+1] *= 0.90;
            data.vel[i*3+2] *= 0.90;
            data.vel[i*3+1] -= 0.0025; // Gentle drip
        }
        else if (type === TYPE_CROSSETTE) {
             // CROSSETTE: Splits aggressively
             // We mimic splitting by adding jitter to velocity periodically
             if (Math.random() > 0.9) {
                 data.vel[i*3] += (Math.random()-0.5) * 0.05;
                 data.vel[i*3+1] += (Math.random()-0.5) * 0.05;
                 data.vel[i*3+2] += (Math.random()-0.5) * 0.05;
             }
             data.vel[i*3+1] -= 0.006; // Heavy gravity
        }
        else {
            // STANDARD
            data.vel[i*3+1] -= 0.006; 
            data.vel[i*3] *= 0.97;    
            data.vel[i*3+1] *= 0.97;
            data.vel[i*3+2] *= 0.97;
        }

        // 3. DECAY
        // Willows last very long
        const decayRate = (type === TYPE_WILLOW) ? 0.004 : 0.012;
        data.life[i] -= decayRate;

        // 4. VISUALS
        dummy.position.set(data.pos[i*3], data.pos[i*3+1], data.pos[i*3+2]);
        
        // Scale: Willow gets tiny to look like trails
        let scale = data.life[i];
        if (type === TYPE_WILLOW) scale *= 0.5; 
        
        dummy.scale.set(scale, scale, scale);
        dummy.lookAt(state.camera.position);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        colorHelper.setRGB(data.color[i*3], data.color[i*3+1], data.color[i*3+2]);
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
      {/* Tiny plane for elegant "dust" look */}
      <planeGeometry args={[0.2, 0.2]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};