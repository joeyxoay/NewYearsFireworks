import { useEffect, useRef, useState } from "react";
import {
  HandLandmarker,
  FilesetResolver,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export const useHandControl = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fingerCount, setFingerCount] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      // Load the WASM files
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      // Initialize the Landmarker
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      startWebcam();
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
            setIsLoaded(true);
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    const countFingers = (landmarks: NormalizedLandmark[], handedness: "Left" | "Right") => {
      let count = 0;

      // 1. Thumb Logic (X-axis comparison)
      // Tip (4) vs IP Joint (3)
      const thumbTip = landmarks[4];
      const thumbIP = landmarks[3]; 
      
      // Note: Logic depends on if you are viewing mirrored video or not. 
      // MediaPipe "Left" hand appears on the Left side of the screen in mirrored mode.
      if (handedness === "Right") {
        if (thumbTip.x < thumbIP.x) count++;
      } else {
        if (thumbTip.x > thumbIP.x) count++;
      }

      // 2. Fingers Logic (Y-axis comparison)
      // If Tip Y is less than Pip Y, finger is UP (0,0 is top-left)
      const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
      const fingerPips = [6, 10, 14, 18]; // Knuckles

      fingerTips.forEach((tipIdx, i) => {
        if (landmarks[tipIdx].y < landmarks[fingerPips[i]].y) {
          count++;
        }
      });

      return count;
    };

    const predictWebcam = () => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        let startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const handLabel = results.handedness[0][0].categoryName as "Left" | "Right";
          const count = countFingers(landmarks, handLabel);
          setFingerCount(count);
        }
        // If no hand is detected, we keep the last known state or could set to null
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      handLandmarker?.close();
    };
  }, []);

  return { videoRef, fingerCount, isLoaded };
};