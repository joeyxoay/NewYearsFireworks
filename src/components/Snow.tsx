import React, { useMemo, useRef } from 'react';
import { useFrame, extend, ReactThreeFiber } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const SnowMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#FFFFFF'),
  },
  // Vertex Shader
  `
    uniform float uTime;
    attribute vec3 aRandom;
    varying float vAlpha;

    void main() {
      vec3 pos = position;
      
      // Fall animation
      float fallOffset = uTime * aRandom.x * 5.0; 
      float heightRange = 60.0;
      pos.y = mod(pos.y - fallOffset + heightRange/2.0, heightRange) - heightRange/2.0;

      // Sway animation
      pos.x += sin(uTime * aRandom.y + aRandom.z) * 0.5;
      pos.z += cos(uTime * aRandom.y + aRandom.z) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = (150.0 / -mvPosition.z) * aRandom.x;
      
      // Fade out at edges
      vAlpha = smoothstep(0.0, 10.0, -mvPosition.z) * (1.0 - smoothstep(40.0, 50.0, -mvPosition.z));
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if(d > 0.5) discard;
      gl_FragColor = vec4(uColor, vAlpha * 0.8);
    }
  `
);

extend({ SnowMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      snowMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof SnowMaterial>;
    }
  }
}

export const Snow = () => {
  const count = 2000;
  const materialRef = useRef<any>();

  const [positions, randomData] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60; 
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      data[i * 3 + 0] = Math.random() * 0.5 + 0.5; // Speed
      data[i * 3 + 1] = Math.random();             // Random sway
      data[i * 3 + 2] = Math.random() * Math.PI;   // Phase
    }
    return [pos, data];
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randomData} itemSize={3} />
      </bufferGeometry>
      <snowMaterial ref={materialRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};