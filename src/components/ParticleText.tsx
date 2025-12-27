import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshSurfaceSampler } from 'three-stdlib';

const PARTICLE_COUNT = 3000;

interface Props {
  text: string;
  isExploding: boolean;
}

export const ParticleText = ({ text, isExploding }: Props) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [targetPositions, setTargetPositions] = useState<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  
  const currentPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3).fill(0), []);
  const attributes = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i] = Math.random();
    return arr;
  }, []);

  useEffect(() => {
    // --- FIX: Smaller Radius (1.8 instead of 4) to fit screen center ---
    const geometry = new THREE.TorusKnotGeometry(1.8, 0.6, 100, 16);
    
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geometry)).build();
    const newTargets = new Float32Array(PARTICLE_COUNT * 3);
    const tempPos = new THREE.Vector3();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sampler.sample(tempPos);
      newTargets[i * 3] = tempPos.x;
      newTargets[i * 3 + 1] = tempPos.y;
      newTargets[i * 3 + 2] = tempPos.z;
    }
    setTargetPositions(newTargets);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      let x = currentPositions[idx];
      let y = currentPositions[idx + 1];
      let z = currentPositions[idx + 2];
      let vx = velocities[idx];
      let vy = velocities[idx + 1];
      let vz = velocities[idx + 2];

      if (isExploding) {
        if (vx === 0 && vy === 0 && vz === 0) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = (Math.random() * 0.5) + 0.2;
            vx = speed * Math.sin(phi) * Math.cos(theta);
            vy = speed * Math.sin(phi) * Math.sin(theta);
            vz = speed * Math.cos(phi);
        }
        vy -= 0.005; 
        vx *= 0.98; vy *= 0.98; vz *= 0.98;
        color.setHSL(0.1 + (attributes[i] * 0.1), 1.0, 0.6); 
      } else {
        const tx = targetPositions[idx];
        const ty = targetPositions[idx + 1];
        const tz = targetPositions[idx + 2];

        vx += (tx - x) * 0.03;
        vy += (ty - y) * 0.03;
        vz += (tz - z) * 0.03;

        const noiseScale = 0.015;
        vx += Math.sin(time * 2 + y * 0.5 + attributes[i] * 10) * noiseScale;
        vy += Math.cos(time * 1.5 + x * 0.5 + attributes[i] * 10) * noiseScale;
        vz += Math.sin(time * 2.5 + z * 0.5 + attributes[i] * 10) * noiseScale;

        vx *= 0.85; vy *= 0.85; vz *= 0.85;

        // Color based on shape position
        const hue = 0.5 + (Math.sin(x * 0.2 + time) * 0.2); 
        color.setHSL(hue, 0.9, 0.6);
      }

      x += vx; y += vy; z += vz;

      currentPositions[idx] = x;
      currentPositions[idx + 1] = y;
      currentPositions[idx + 2] = z;
      velocities[idx] = vx;
      velocities[idx + 1] = vy;
      velocities[idx + 2] = vz;

      dummy.position.set(x, y, z);
      dummy.lookAt(0, 0, 15); 
      const scale = isExploding ? 0.15 : 0.06;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={2} />
    </instancedMesh>
  );
};