import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;
const GRAVITY = 0.05;
const DRAG = 0.96;

export const Fireworks = ({ active }: { active: boolean }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Memoize physics data buffers
  const data = useMemo(() => {
    return {
      positions: new Float32Array(PARTICLE_COUNT * 3),
      velocities: new Float32Array(PARTICLE_COUNT * 3),
      colors: new Float32Array(PARTICLE_COUNT * 3),
      life: new Float32Array(PARTICLE_COUNT), // 0 to 1
    };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Reset/Explode function
  const explode = () => {
    const palette = ["#FFD700", "#00FFFF", "#FF00FF", "#32CD32"]; // Gold, Cyan, Magenta, Lime

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 1. Reset Position (center with slight variation)
      data.positions[i * 3] = (Math.random() - 0.5) * 2;
      data.positions[i * 3 + 1] = 5 + (Math.random() - 0.5) * 2;
      data.positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // 2. Random Explosive Velocity (Spherical distribution)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 0.8 + 0.2;

      data.velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      data.velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      data.velocities[i * 3 + 2] = speed * Math.cos(phi);

      // 3. Random Color
      color.set(palette[Math.floor(Math.random() * palette.length)]);
      data.colors[i * 3] = color.r;
      data.colors[i * 3 + 1] = color.g;
      data.colors[i * 3 + 2] = color.b;

      data.life[i] = 1.0; // Reset life to 100%
    }
  };

  useEffect(() => {
    if (active) explode();
  }, [active]);

  useFrame(() => {
    if (!meshRef.current || !active) return;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Physics: Gravity
      data.velocities[i * 3 + 1] -= GRAVITY * 0.1; 
      
      // Physics: Drag
      data.velocities[i * 3] *= DRAG;
      data.velocities[i * 3 + 1] *= DRAG;
      data.velocities[i * 3 + 2] *= DRAG;

      // Update Position
      data.positions[i * 3] += data.velocities[i * 3];
      data.positions[i * 3 + 1] += data.velocities[i * 3 + 1];
      data.positions[i * 3 + 2] += data.velocities[i * 3 + 2];

      // Update Life & Scale
      data.life[i] -= 0.01;
      const scale = Math.max(0, data.life[i]);

      // Update Instance Matrix
      dummy.position.set(
        data.positions[i * 3],
        data.positions[i * 3 + 1],
        data.positions[i * 3 + 2]
      );
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Update Color
      meshRef.current.setColorAt(i, new THREE.Color(
          data.colors[i * 3], 
          data.colors[i * 3 + 1], 
          data.colors[i * 3 + 2]
      ));
    }
    
    // Tell Three.js the data changed
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} visible={active}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial 
        toneMapped={false} 
        emissive="white" 
        emissiveIntensity={2} 
        color="white" 
      />
    </instancedMesh>
  );
};