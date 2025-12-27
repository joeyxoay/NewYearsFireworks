import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const CountdownDisplay = ({ count, isFireworks }: { count: number | null, isFireworks: boolean }) => {
  const textRef = useRef<any>();

  useFrame((state) => {
    if (textRef.current) {
      const t = state.clock.elapsedTime;
      // Gentle float
      textRef.current.position.y = Math.sin(t) * 0.5 + 4;
      
      // Pop effect logic
      const targetScale = 1; 
      // Smoothly interpolate current scale to target scale
      textRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  // --- THE FIX ---
  // If no hand is detected (count is null) AND no fireworks, render nothing.
  if (count === null && !isFireworks) return null;

  const display = isFireworks ? "2026" : count?.toString();
  const color = isFireworks ? "#D4AF37" : "#FFFFFF";

  return (
    <Text
      ref={textRef}
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      fontSize={6}
      maxWidth={20}
      lineHeight={1}
      letterSpacing={0.02}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.2}
      outlineColor={isFireworks ? "#D4AF37" : "#00FFFF"}
    >
      {display}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
    </Text>
  );
};