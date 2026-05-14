/**
 * useGestureDetection Hook
 * 
 * Manages hand gesture detection and recognition
 * - Detects hand landmarks from camera frames
 * - Recognizes gestures (fist, palm, thumbs up, etc.)
 * - Sends commands to ESP32 via Bluetooth
 */

import { useCallback, useRef, useState } from 'react';

export interface GestureState {
  isDetecting: boolean;
  detectedGesture: string | null;
  confidence: number;
  handsDetected: number;
}

const GESTURE_THRESHOLDS = {
  fist: 0.7,
  palm: 0.6,
  thumbsUp: 0.75,
  pointingFinger: 0.7,
  ok: 0.65,
};

/**
 * Recognize gesture from landmarks
 */
function recognizeGesture(landmarks: any): { gesture: string; confidence: number } {
  if (!landmarks || !landmarks.landmarks || landmarks.landmarks.length === 0) {
    return { gesture: 'no_hand', confidence: 0 };
  }

  // Simple gesture recognition based on hand landmarks
  // This is a placeholder - real implementation would use ML model

  const hand = landmarks.landmarks[0];
  
  // Calculate hand openness (distance between palm and fingers)
  const palmCenter = hand[9]; // Palm center
  const fingerTips = [4, 8, 12, 16, 20]; // Thumb, index, middle, ring, pinky tips
  
  let avgFingerDistance = 0;
  fingerTips.forEach((idx) => {
    const dx = hand[idx].x - palmCenter.x;
    const dy = hand[idx].y - palmCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    avgFingerDistance += distance;
  });
  avgFingerDistance /= fingerTips.length;

  // Simple heuristic: closed hand vs open hand
  if (avgFingerDistance < 0.15) {
    return { gesture: 'fist', confidence: 0.8 };
  } else if (avgFingerDistance > 0.25) {
    return { gesture: 'palm_open', confidence: 0.75 };
  } else {
    return { gesture: 'neutral', confidence: 0.6 };
  }
}

export const useGestureDetection = () => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isDetecting: false,
    detectedGesture: null,
    confidence: 0,
    handsDetected: 0,
  });

  const lastGestureRef = useRef<string | null>(null);
  const gestureDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process frame and detect gestures
   */
  const processFrame = useCallback(async (landmarks: any) => {
    try {
      const { gesture, confidence } = recognizeGesture(landmarks);

      // Debounce gesture updates (prevent spam)
      if (gestureDebounceRef.current) {
        clearTimeout(gestureDebounceRef.current);
      }

      gestureDebounceRef.current = setTimeout(() => {
        if (confidence > GESTURE_THRESHOLDS[gesture as keyof typeof GESTURE_THRESHOLDS] ?? 0.6) {
          setGestureState((prev) => ({
            ...prev,
            detectedGesture: gesture,
            confidence,
            handsDetected: landmarks.landmarks?.length ?? 0,
          }));

          // Trigger action if gesture changed
          if (gesture !== lastGestureRef.current) {
            lastGestureRef.current = gesture;
            console.log(`[Gesture] Detected: ${gesture} (confidence: ${confidence.toFixed(2)})`);
          }
        }
      }, 100); // 100ms debounce
    } catch (error) {
      console.error('[GestureDetection] Error processing frame:', error);
    }
  }, []);

  return {
    gestureState,
    processFrame,
    setIsDetecting: (isDetecting: boolean) =>
      setGestureState((prev) => ({ ...prev, isDetecting })),
  };
};
