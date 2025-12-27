import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const useHandControl = () => {
  const [fingerCount, setFingerCount] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setup = async () => {
      try {
        console.log("🚀 Starting Vision...");
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

        // FORCE START: Don't wait for permission if it hangs
        if (navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // CRITICAL FIX: Just play. Don't wait for metadata.
            // Modern browsers handle the promise automatically.
            await videoRef.current.play();
            
            setIsLoaded(true); // Force UI to show immediately
            predict();
          }
        }
      } catch (error) {
        console.error("Camera failed:", error);
        // Even if it fails, set loaded to true so the 3D scene appears
        setIsLoaded(true); 
      }
    };

    const countFingers = (landmarks: any[]) => {
        let count = 0;
        const thumbTip = landmarks[4];
        const pinkyMCP = landmarks[17];
        const distance = Math.sqrt(Math.pow(thumbTip.x - pinkyMCP.x, 2) + Math.pow(thumbTip.y - pinkyMCP.y, 2));
        if (distance > 0.25) count++;

        const tips = [8, 12, 16, 20];
        const pips = [6, 10, 14, 18];
        tips.forEach((tipIdx, i) => {
            if (landmarks[tipIdx].y < landmarks[pips[i]].y) count++;
        });
        return count;
    };

    const predict = () => {
      if (videoRef.current && landmarkerRef.current && videoRef.current.readyState >= 2) {
         try {
             const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
             if (result.landmarks.length > 0) {
                 setFingerCount(countFingers(result.landmarks[0]));
             } else {
                 setFingerCount(null);
             }
         } catch(e) {
             // Ignore frame errors
         }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    setup();

    // FAILSAFE: If camera takes too long, just start the app anyway (3 seconds)
    const timeout = setTimeout(() => setIsLoaded(true), 3000);

    return () => {
      clearTimeout(timeout);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { fingerCount, videoRef, isLoaded };
};