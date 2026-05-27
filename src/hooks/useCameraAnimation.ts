import { useRef } from "react";
import * as THREE from "three";

interface CameraAnimationOptions {
  duration?: number;
  easingPower?: number;
  onComplete?: () => void;
}

interface CameraRefs {
  camera: THREE.Camera | null;
  controls: any; // OrbitControls type
}

/**
 * Hook for animating camera position and target
 */
export function useCameraAnimation() {
  const animationIdRef = useRef<number | null>(null);

  const animate = (
    refs: CameraRefs,
    targetPosition: [number, number, number],
    targetLookAt: [number, number, number],
    options: CameraAnimationOptions = {}
  ) => {
    const { duration = 1000, easingPower = 3, onComplete } = options;

    if (!refs.camera || !refs.controls) {
      console.warn("Camera or controls not available");
      return;
    }

    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    const startPosition = refs.camera.position.clone();
    const startTarget = refs.controls.target.clone();
    const targetPos = new THREE.Vector3(...targetPosition);
    const targetLook = new THREE.Vector3(...targetLookAt);
    const startTime = Date.now();

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic easing function
      const easeProgress = 1 - Math.pow(1 - progress, easingPower);

      // Animate camera position
      refs.camera!.position.lerpVectors(startPosition, targetPos, easeProgress);

      // Animate camera target
      refs.controls.target.lerpVectors(startTarget, targetLook, easeProgress);

      // Update controls
      refs.controls.update();

      if (progress < 1) {
        const id = requestAnimationFrame(animateFrame);
        animationIdRef.current = id;
      } else {
        animationIdRef.current = null;
        if (onComplete) {
          onComplete();
        }
      }
    };

    const id = requestAnimationFrame(animateFrame);
    animationIdRef.current = id;
  };

  const cancel = () => {
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  return { animate, cancel };
}

