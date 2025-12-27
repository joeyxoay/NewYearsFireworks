import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 15000;

// Firework Types
const TYPE_BROCADE = 0;   
const TYPE_WILLOW = 1;    
const TYPE_PEARLS = 2;    
const TYPE_FISH = 3;      
const TYPE_CROSSETTE = 4; 

// Texture: Soft Glow
const createTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
  gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.4)'); 
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
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
    maxLife: new Float32Array(PARTICLE_COUNT),
    type: new Float32Array(PARTICLE_COUNT), 
    color: new Float32Array(PARTICLE_COUNT * 3), 
    extra: new Float32Array(PARTICLE_COUNT * 3)
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);
  const timer = useRef(0);

  const launchFirework = () => {
    let type = Math.floor(Math.random() * 5);
    
    // Position
    const cx = (Math.random() - 0.5) * 20;
    const cy = 4 + Math.random() * 6;
    const cz = (Math.random() - 0.5) * 8;

    const baseColor = new THREE.Color();
    if (type === TYPE_WILLOW) baseColor.set('#FFD700'); // Gold
    else if (type === TYPE_BROCADE) baseColor.set('#FFDDDD'); // Pale Pink/White
    else if (type === TYPE_CROSSETTE) baseColor.set('#FFaa00'); // Amber
    else if (type === TYPE_FISH) baseColor.set('#00FFFF'); // Cyan
    else if (type === TYPE_PEARLS) baseColor.setHSL(Math.random(), 0.9, 0.6); // Rainbow

    const count = type === TYPE_FISH ? 80 : 400;

    let spawned = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (spawned >= count) break;
      if (data.life[i] <= 0) {
        
        data.type[i] = type;
        data.life[i] = 1.0;
        data.maxLife[i] = 1.0;
        
        data.pos[i*3] = cx; data.pos[i*3+1] = cy; data.pos[i*3+2] = cz;
        data.color[i*3] = baseColor.r; data.color[i*3+1] = baseColor.g; data.color[i*3+2] = baseColor.b;

        // VELOCITY (INCREASED for more energy)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        // Faster initial burst (was 0.1 - 0.3, now 0.2 - 0.6)
        let speed = Math.random() * 0.4 + 0.2;
        
        if (type === TYPE_CROSSETTE) speed += 0.2; 
        if (type === TYPE_WILLOW) speed *= 0.8;    

        data.vel[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
        data.vel[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
        data.vel[i*3+2] = Math.cos(phi) * speed;

        data.extra[i*3] = Math.random(); 
        data.extra[i*3+1] = Math.random(); 
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
            // FASTER PACE: 0.3s to 0.8s
            timer.current = Math.random() * 0.5 + 0.3; 
        }
    }

    let activeParticles = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (data.life[i] > 0) {
        activeParticles++;
        const type = data.type[i];
        
        // --- PHYSICS UPDATE ---
        data.pos[i*3] += data.vel[i*3];
        data.pos[i*3+1] += data.vel[i*3+1];
        data.pos[i*3+2] += data.vel[i*3+2];

        // Specific Physics Tuning
        if (type === TYPE_WILLOW) {
            // WILLOW: Slightly less drag than before so they move out
            data.vel[i*3] *= 0.94;    
            data.vel[i*3+2] *= 0.94;
            data.vel[i*3+1] *= 0.94;
            
            // GRAVITY: Heavier fall
            data.vel[i*3+1] -= 0.003; 
        }
        else if (type === TYPE_FISH) {
            data.vel[i*3] += Math.sin(time * 15 + data.extra[i*3]*100) * 0.03;
            data.vel[i*3+1] += Math.cos(time * 15 + data.extra[i*3+1]*100) * 0.03;
            data.vel[i*3+2] += Math.sin(time * 15) * 0.03;
            data.vel[i*3] *= 0.96;
        }
        else if (type === TYPE_CROSSETTE) {
            if (data.life[i] < 0.7 && Math.random() > 0.96) {
                 data.vel[i*3] += (Math.random()-0.5) * 0.08;
                 data.vel[i*3+1] += (Math.random()-0.5) * 0.08;
                 data.vel[i*3+2] += (Math.random()-0.5) * 0.08;
            }
            data.vel[i*3+1] -= 0.005; 
        }
        else {
            // Standard Physics (Faster Gravity)
            data.vel[i*3+1] -= 0.004; // Fall faster
            data.vel[i*3] *= 0.96;    // Less drag = keeps moving out
            data.vel[i*3+1] *= 0.96;
            data.vel[i*3+2] *= 0.96;
        }

        // --- LIFE DECAY (FASTER) ---
        // Willows 0.006 (was 0.003), others 0.012
        const decay = (type === TYPE_WILLOW) ? 0.006 : 0.012;
        data.life[i] -= decay;

        // --- RENDER ---
        dummy.position.set(data.pos[i*3], data.pos[i*3+1], data.pos[i*3+2]);
        
        // Scale
        let scale = data.life[i];
        if (type === TYPE_PEARLS) scale = scale * 1.5;
        if (type === TYPE_WILLOW) scale = scale * 0.9; 
        
        dummy.scale.set(scale, scale, scale);
        dummy.lookAt(state.camera.position);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        // --- COLOR COOLING ---
        const T = data.life[i] / data.maxLife[i];
        colorHelper.setRGB(data.color[i*3], data.color[i*3+1], data.color[i*3+2]);

        if (type === TYPE_WILLOW || type === TYPE_BROCADE) {
            if (T > 0.9) colorHelper.set('#FFFFFF'); 
            else if (T > 0.6) colorHelper.set('#FFD700'); 
            else if (T > 0.3) colorHelper.set('#FF4500'); 
            else colorHelper.set('#220000');
        } 
        else if (type === TYPE_CROSSETTE) {
             if (T > 0.8) colorHelper.set('#FFFF88'); 
             else colorHelper.lerp(new THREE.Color('#FF0000'), 1 - T);
        }
        else if (type === TYPE_PEARLS) {
            colorHelper.multiplyScalar(T);
        }

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
      <planeGeometry args={[0.3, 0.3]} />
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