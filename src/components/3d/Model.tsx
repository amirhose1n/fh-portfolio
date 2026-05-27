import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

interface ModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Exclusive render/light layer for every node in the loaded model */
  layer?: number;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

function isFbx(url: string) {
  return url.toLowerCase().endsWith(".fbx");
}

const GltfBody = forwardRef<
  THREE.Group,
  ModelProps & { groupRef: React.RefObject<THREE.Group | null> }
>(({ url, position, rotation, scale, layer, onPointerOver, onPointerOut, groupRef }, ref) => {
  const { scene, animations } = useGLTF(url);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (layer === undefined) return;
    scene.traverse((obj) => obj.layers.set(layer));
  }, [layer, scene]);

  useEffect(() => {
    if (animations && animations.length > 0 && groupRef.current) {
      const mixer = new THREE.AnimationMixer(groupRef.current);
      mixerRef.current = mixer;
      animations.forEach((clip) => mixer.clipAction(clip).play());
    }
  }, [animations, groupRef]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <primitive
        ref={groupRef}
        object={scene}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
    </group>
  );
});
GltfBody.displayName = "GltfBody";

const FbxBody = forwardRef<
  THREE.Group,
  ModelProps & { groupRef: React.RefObject<THREE.Group | null> }
>(({ url, position, rotation, scale, layer, onPointerOver, onPointerOut, groupRef }, ref) => {
  const original = useLoader(FBXLoader, url);
  // Clone so multiple <Model> instances of the same FBX don't share a graph.
  const fbx = useMemo(() => original.clone(true), [original]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (layer === undefined) return;
    fbx.traverse((obj) => obj.layers.set(layer));
  }, [layer, fbx]);

  useEffect(() => {
    if (fbx.animations && fbx.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(fbx);
      mixerRef.current = mixer;
      fbx.animations.forEach((clip) => mixer.clipAction(clip).play());
    }
  }, [fbx]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <primitive
        ref={groupRef}
        object={fbx}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
    </group>
  );
});
FbxBody.displayName = "FbxBody";

export const Model = forwardRef<THREE.Group, ModelProps>((props, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  return isFbx(props.url) ? (
    <FbxBody {...props} ref={ref} groupRef={groupRef} />
  ) : (
    <GltfBody {...props} ref={ref} groupRef={groupRef} />
  );
});

Model.displayName = "Model";
