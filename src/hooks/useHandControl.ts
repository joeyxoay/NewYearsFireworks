import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// --- CONFIGURATION ---
const SHAKE_HISTORY_LENGTH = 10;
const SHAKE_THRESHOLD = 0.02;

export const useHandControl = () => {
  const [fingerCount, setFingerCount] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const wristXHistory = useRef<number[]>([]);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

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

        if (navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // FIX: Wait for metadata before playing to prevent AbortError
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => {
                    console.log("Play interrupted (harmless in dev):", e);
                });
            };

            videoRef.current.onloadeddata = () => {
              setIsLoaded(true);
              predict();
            };
          }
        }
      } catch (error) {
        console.error("Vision Error:", error);
      }
    };

    const countFingers = (landmarks: any[]) => {
        let count = 0;

        // 1. THUMB LOGIC (Distance Based)
        const thumbTip = landmarks[4];
        const pinkyMCP = landmarks[17];
        
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - pinkyMCP.x, 2) + 
            Math.pow(thumbTip.y - pinkyMCP.y, 2)
        );

        if (distance > 0.25) {
            count++;
        }

        // 2. FINGERS LOGIC (Y-Axis Check)
        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];

        tips.forEach((tipIdx, i) => {
            if (landmarks[tipIdx].y < landmarks[pips[i]].y) {
                count++;
            }
        });

        return count;
    };

    const predict = () => {
      if (!landmarkerRef.current || !videoRef.current) return;

      if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
         try {
             const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());

             if (result.landmarks.length > 0) {
                 const hand = result.landmarks[0];
                 const count = countFingers(hand);
                 setFingerCount(count);

                 // Shake Logic
                 const wristX = hand[0].x;
                 wristXHistory.current.push(wristX);
                 
                 if (wristXHistory.current.length > SHAKE_HISTORY_LENGTH) {
                     wristXHistory.current.shift();
                 }

                 if (count <= 1 && wristXHistory.current.length === SHAKE_HISTORY_LENGTH) {
                     const minX = Math.min(...wristXHistory.current);
                     const maxX = Math.max(...wristXHistory.current);
                     
                     if ((maxX - minX) > SHAKE_THRESHOLD) {
                         setIsShaking(true);
                     } else if ((maxX - minX) < SHAKE_THRESHOLD * 0.5) {
                         setIsShaking(false);
                     }
                 } else {
                     setIsShaking(false);
                 }

             } else {
                 setFingerCount(null);
                 setIsShaking(false);
                 wristXHistory.current = [];
             }
         } catch (e) {
             console.warn(e);
         }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    setup();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
      // Cleanup stream to stop camera light when component unmounts
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return { fingerCount, isShaking, videoRef, isLoaded };
};