import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 2000;

export const Fireworks = ({ active }: { active: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Physics Data
  const data = useMemo(() => {
    return {
      positions: new Float32Array(PARTICLE_COUNT * 3),
      velocities: new Float32Array(PARTICLE_COUNT * 3),
      colors: new Float32Array(PARTICLE_COUNT * 3),
      life: new Float32Array(PARTICLE_COUNT),
    };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Reset/Explode Function
  useEffect(() => {
    if (active) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Start at center
        data.positions[i*3] = 0; 
        data.positions[i*3+1] = 5; 
        data.positions[i*3+2] = 0;

        // Explode outward (Sphere)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = Math.random() * 0.5 + 0.2;

        data.velocities[i*3] = speed * Math.sin(phi) * Math.cos(theta);
        data.velocities[i*3+1] = speed * Math.sin(phi) * Math.sin(theta);
        data.velocities[i*3+2] = speed * Math.cos(phi);

        // Random Gold/Neon Colors
        const isGold = Math.random() > 0.5;
        color.set(isGold ? '#D4AF37' : '#00FFFF');
        data.colors[i*3] = color.r;
        data.colors[i*3+1] = color.g;
        data.colors[i*3+2] = color.b;

        data.life[i] = 1.0;
      }
    }
  }, [active]);

  useFrame(() => {
    if (!meshRef.current || !active) return;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Physics
      data.positions[i*3] += data.velocities[i*3];
      data.positions[i*3+1] += data.velocities[i*3+1];
      data.positions[i*3+2] += data.velocities[i*3+2];
      
      // Gravity
      data.velocities[i*3+1] -= 0.005;
      
      // Friction
      data.velocities[i*3] *= 0.98;
      data.velocities[i*3+1] *= 0.98;
      data.velocities[i*3+2] *= 0.98;

      data.life[i] -= 0.01;
      
      const scale = Math.max(0, data.life[i]);

      dummy.position.set(
        data.positions[i*3],
        data.positions[i*3+1],
        data.positions[i*3+2]
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(data.colors[i*3], data.colors[i*3+1], data.colors[i*3+2]));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};