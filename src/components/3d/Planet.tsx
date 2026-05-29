import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";
import { Model } from "./Model";

const { PLANET } = SCENE_CONFIG.MODELS;

/**
 * Distant planet floating in the space the porthole looks out onto. The source
 * FBX has an unknown native size, so on the first frame we measure its bounding
 * box and normalise it to PLANET.DIAMETER world units, then spin it slowly on Y.
 */
export function Planet() {
  const ref = useRef<THREE.Group>(null);
  const normalized = useRef(false);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;

    if (!normalized.current) {
      const size = new THREE.Box3().setFromObject(group).getSize(
        new THREE.Vector3(),
      );
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0 && Number.isFinite(maxDim)) {
        group.scale.multiplyScalar(PLANET.DIAMETER / maxDim);
        normalized.current = true;
      }
    }

    group.rotation.y += delta * PLANET.SPIN_SPEED;
  });

  return (
    <Model
      ref={ref}
      url={PLANET.URL}
      position={PLANET.POSITION}
      rotation={PLANET.ROTATION}
    />
  );
}
