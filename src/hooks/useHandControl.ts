import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Settings for shake detection
const SHAKE_HISTORY_LENGTH = 15; 
const SHAKE_THRESHOLD = 0.15;    

export const useHandControl = () => {
  const [fingerCount, setFingerCount] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const wristXHistory = useRef<number[]>([]);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const setup = async () => {
      console.log("🚀 Starting Vision (Safe Mode)...");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        // FORCE CPU DELEGATE: This prevents the 3D graphics from killing the Vision process
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU" 
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        console.log("✅ Model Ready");

        if (navigator.mediaDevices?.getUserMedia) {
          // Request specific low-res video to save processing power
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Force play and wait for it to actually start
            await videoRef.current.play();
            
            videoRef.current.addEventListener('loadeddata', () => {
              console.log("📹 Camera Feed Active");
              setIsLoaded(true);
              predict();
            });
          }
        }
      } catch (error) {
        console.error("❌ CRITICAL VISION ERROR:", error);
      }
    };

    const countFingers = (landmarks: any[], handedness: 'Left' | 'Right') => {
        let count = 0;
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        
        if (handedness === 'Right') { 
            if (thumbTip.x < thumbIp.x) count++;
        } else {
            if (thumbTip.x > thumbIp.x) count++;
        }

        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        tips.forEach((tipIdx, i) => {
            if (landmarks[tipIdx].y < landmarks[pips[i]].y) count++;
        });
        return count;
    };

    const predict = () => {
      if (!landmarkerRef.current || !videoRef.current) return;

      // SAFETY CHECK: Only predict if video has valid data
      if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
         try {
             const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());

             if (result.landmarks.length > 0) {
                 const hand = result.landmarks[0];
                 const count = countFingers(hand, result.handedness[0][0].categoryName as any);
                 setFingerCount(count);

                 // --- SHAKE LOGIC ---
                 const wristX = hand[0].x;
                 wristXHistory.current.push(wristX);
                 if (wristXHistory.current.length > SHAKE_HISTORY_LENGTH) {
                     wristXHistory.current.shift();
                 }

                 if (count === 0 && wristXHistory.current.length === SHAKE_HISTORY_LENGTH) {
                     const minX = Math.min(...wristXHistory.current);
                     const maxX = Math.max(...wristXHistory.current);
                     if ((maxX - minX) > SHAKE_THRESHOLD) {
                         setIsShaking(true);
                     } else if ((maxX - minX) < SHAKE_THRESHOLD * 0.8) {
                         setIsShaking(false);
                     }
                 } else {
                     setIsShaking(false);
                 }
                 // -------------------

             } else {
                 setFingerCount(null);
                 setIsShaking(false);
                 wristXHistory.current = [];
             }
         } catch (e) {
             console.warn("Frame dropped:", e);
         }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    setup();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
    };
  }, []);

  return { fingerCount, isShaking, videoRef, isLoaded };
};