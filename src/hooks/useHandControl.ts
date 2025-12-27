import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const useHandControl = () => {
  const [fingerCount, setFingerCount] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // We keep track of the loaded status in a ref to avoid re-triggering effects
  const isModelLoaded = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;

    const setup = async () => {
      console.log("🚀 Starting Vision Setup...");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        // --- CHANGE: Using CPU first to guarantee it works ---
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU" 
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3, // Super sensitive
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });

        console.log("✅ Model Loaded!");
        isModelLoaded.current = true;

        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Force play just in case
            videoRef.current.play(); 
            
            videoRef.current.addEventListener('loadeddata', () => {
              console.log("📹 Camera Feed Ready");
              setIsLoaded(true);
              predict();
            });
          }
        }
      } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
      }
    };

    const countFingers = (landmarks: any[], handedness: 'Left' | 'Right') => {
        let count = 0;
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        
        // Check Thumb (X-axis depends on hand)
        if (handedness === 'Right') { 
            if (thumbTip.x < thumbIp.x) count++;
        } else {
            if (thumbTip.x > thumbIp.x) count++;
        }

        // Check Fingers (Y-axis: Tip must be higher than Pip)
        // Note: Y=0 is top, so "Lower Value" means "Higher on Screen"
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
      if (videoRef.current && landmarker && isModelLoaded.current) {
        
        // Only run if video is actually playing and has size
        if (videoRef.current.currentTime > 0 && videoRef.current.videoWidth > 0) {
            
            try {
                const result = landmarker.detectForVideo(videoRef.current, performance.now());

                if (result.landmarks.length > 0) {
                    // console.log("🖐 Hand Found!"); // Uncomment to spam console with success
                    const hand = result.landmarks[0];
                    const handedness = result.handedness[0][0].categoryName as 'Left' | 'Right';
                    const count = countFingers(hand, handedness);
                    setFingerCount(count);
                } else {
                    // console.log("... Searching ..."); 
                    setFingerCount(null);
                }
            } catch (e) {
                console.warn("Detection glitch:", e);
            }
        }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    setup();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarker) landmarker.close();
    };
  }, []);

  return { fingerCount, videoRef, isLoaded };
};