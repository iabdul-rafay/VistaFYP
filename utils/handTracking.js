import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

/*
========================================
VISTA HAND TRACKING MODULE (MOBILE & WEB)
Equivalent to realtime_gesture.py
========================================
*/

let handLandmarker = null;

/* ================================
   INIT MEDIAPIPE HANDS
================================ */
export async function initHandTracking() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numHands: 2,
  });
}

export async function sendToHands(image) {
  if (!handLandmarker) {
    throw new Error("HandLandmarker is not initialized");
  }
  const result = await handLandmarker.detect(image);
  return result;
}

/* =========================================
   FEATURE EXTRACTION (MATCHES PYTHON EXACTLY)
   Equivalent to extract_landmarks() in .py
========================================= */
export function extractLandmarks(results) {
  if (!results || !results.landmarks || results.landmarks.length === 0)
    return null;

  // Take first detected hand (same behavior as Python loop)
  const hand = results.landmarks[0];

  if (!hand) return null;

  // Step 1: convert to (x, y, z)
  const points = hand.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
  }));

  const baseX = points[0].x;
  const baseY = points[0].y;
  const baseZ = points[0].z;

  // Step 2: compute max distance (normalization in 3D space)
  let maxDist = 1e-6;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - baseX;
    const dy = points[i].y - baseY;
    const dz = points[i].z - baseZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) maxDist = dist;
  }

  // Step 3: normalize and flatten
  let flat = [];

  for (let i = 0; i < points.length; i++) {
    flat.push((points[i].x - baseX) / maxDist);
    flat.push((points[i].y - baseY) / maxDist);
    flat.push((points[i].z - baseZ) / maxDist);
  }

  // Convert to Float32Array for TFLite
  return new Float32Array(flat);
}

/* =========================================
   OPTIONAL: DEBUG FUNCTION (like cv2 view)
========================================= */
export function logLandmarks(results) {
  const data = extractLandmarks(results);
  if (data) {
    console.log("Landmarks (63-ish):", data);
  }
}
