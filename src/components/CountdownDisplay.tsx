import { Text } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface Props {
  value: string | number;
  isCelebration: boolean;
}

export const CountdownDisplay = ({ value, isCelebration }: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRef = useRef<any>(null);
  
  useFrame((state) => {
    if (textRef.current) {
      const time = state.clock.getElapsedTime();
      
      // Float up and down (Gentle float)
      textRef.current.position.y = Math.sin(time) * 0.1 + 1;
      
      // Pulse scale (Much more subtle now)
      // Normal size = 1.0, Celebration size = 1.5
      const scaleBase = isCelebration ? 1.5 : 1.0;
      const pulseSpeed = isCelebration ? 10 : 3;
      
      // Adds a small heartbeat effect (+/- 0.05 scale)
      const pulse = Math.sin(time * pulseSpeed) * 0.05 + scaleBase;
      
      textRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const color = isCelebration ? "#FFD700" : "#00FFFF"; // Gold or Neon Blue

  return (
    <Text
      ref={textRef}
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      fontSize={2.5} // Reduced from 5 to 2.5
      position={[0, 1, 0]}
      maxWidth={10} // Reduced width constraint
      lineHeight={1}
      letterSpacing={0.02}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
    >
      {value}
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={isCelebration ? 2 : 1.5} 
        toneMapped={false} 
      />
    </Text>
  );
};