import { Html } from "@react-three/drei";
import { forwardRef, useImperativeHandle, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";
import { AudioCtx, useAudio } from "../../hooks/useAudio";
import { LaptopOS } from "../laptop-os/LaptopOS";

const { LAPTOP_SCREEN } = SCENE_CONFIG;

export interface LaptopScreenHandle {
  /** World-space position of the screen's center. */
  getWorldPosition: () => THREE.Vector3 | null;
  /** World-space outward normal of the screen face (unit vector). */
  getWorldNormal: () => THREE.Vector3 | null;
}

interface LaptopScreenProps {
  isActive: boolean;
  /** Refs to objects that should block the laptop's CSS3D html via a
   *  raycast — typically the room walls/ceiling so the screen vanishes when
   *  a wall sits between camera and screen. drei recurses into each ref. */
  occluders?: RefObject<THREE.Object3D | null>[];
  onHoverChange: (hovered: boolean) => void;
  onActivate: () => void;
}

// drei's <Html transform> applies a hidden 1/40 factor to the matrix's scale
// components in CSS pixel space (see getObjectCSSMatrix with default
// distanceFactor = 10 → factor = 1/((10/400)) = 40). So to make a
// PIXEL_WIDTH × PIXEL_HEIGHT DOM element occupy WIDTH × HEIGHT world units,
// we need scale = (WIDTH * 40) / PIXEL_WIDTH per axis.
const DREI_HTML_PIXEL_FACTOR = 40;
const HTML_SCALE: [number, number, number] = [
  (LAPTOP_SCREEN.WIDTH * DREI_HTML_PIXEL_FACTOR) / LAPTOP_SCREEN.PIXEL_WIDTH,
  (LAPTOP_SCREEN.HEIGHT * DREI_HTML_PIXEL_FACTOR) / LAPTOP_SCREEN.PIXEL_HEIGHT,
  1,
];

export const LaptopScreen = forwardRef<LaptopScreenHandle, LaptopScreenProps>(
  function LaptopScreen(
    { isActive, occluders, onHoverChange, onActivate },
    ref,
  ) {
    const groupRef = useRef<THREE.Group>(null);
    // drei's <Html> mounts its children via ReactDOM.createRoot — a new,
    // isolated React tree that doesn't inherit any context from outside.
    // We read the audio context here (we're inside the Canvas tree where
    // ModelViewer's AudioCtx bridge is visible) and re-provide it as part
    // of the JSX passed to <Html> so LaptopOS can read useAudio().
    const audio = useAudio();

    useImperativeHandle(ref, () => ({
      getWorldPosition: () => {
        if (!groupRef.current) return null;
        return groupRef.current.getWorldPosition(new THREE.Vector3());
      },
      getWorldNormal: () => {
        if (!groupRef.current) return null;
        const n = new THREE.Vector3(0, 0, 1);
        n.applyQuaternion(groupRef.current.getWorldQuaternion(new THREE.Quaternion()));
        return n.normalize();
      },
    }));

    const handlePointerOver = (e: any) => {
      e.stopPropagation();
      if (isActive) return;
      onHoverChange(true);
      document.body.style.cursor = "pointer";
    };

    const handlePointerOut = (e: any) => {
      e.stopPropagation();
      if (isActive) return;
      onHoverChange(false);
      document.body.style.cursor = "";
    };

    const handleClick = (e: any) => {
      e.stopPropagation();
      if (isActive) return;
      onActivate();
    };

    return (
      <group
        ref={groupRef}
        position={LAPTOP_SCREEN.POSITION}
        rotation={LAPTOP_SCREEN.ROTATION}
      >
        {/* Hit area for hover/click — invisible (or debug-colored) plane.
            Only present before zoom-in; once active, the DOM handles its
            own pointer events. */}
        {!isActive && (
          <mesh
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <planeGeometry args={[LAPTOP_SCREEN.WIDTH, LAPTOP_SCREEN.HEIGHT]} />
            <meshBasicMaterial
              color={
                LAPTOP_SCREEN.DEBUG_VISIBLE_BACKPLATE
                  ? LAPTOP_SCREEN.DEBUG_BACKPLATE_COLOR
                  : "#000000"
              }
              transparent
              opacity={LAPTOP_SCREEN.DEBUG_VISIBLE_BACKPLATE ? 0.5 : 0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* The actual DOM screen content. `transform` mounts it in 3D space
            via CSS3D. `occlude` raycasts against the provided refs and
            hides the html when something blocks the line of sight — we
            pass the room walls so the screen disappears behind a wall but
            stays visible from any in-room angle (and through the open
            back of the room from Overview). A tiny forward Z offset
            (0.005) keeps it visually in front of the macbook lid. */}
        <Html
          transform
          // drei's <Html> types insist on a non-null ref shape, but React's
          // RefObject is `T | null`. The runtime only reads `.current` so
          // the cast is safe.
          occlude={
            occluders as
              | RefObject<THREE.Object3D>[]
              | undefined
          }
          position={[0, 0, 0.005]}
          scale={HTML_SCALE}
          // `pointerEvents` is drei's own prop — it controls the wrapper
          // that actually catches DOM events. Setting it on `style` only
          // affects the innermost child, leaving the wrapper to swallow
          // clicks before they ever reach the 3D hit-area mesh below.
          pointerEvents={isActive ? "auto" : "none"}
          // Cap the portal'd DOM's z-index well below the loading overlay
          // (z=10000). Drei defaults to ~16.7M, which leaks through any
          // sibling overlay — including the intro loader.
          zIndexRange={[100, 0]}
          style={{
            width: `${LAPTOP_SCREEN.PIXEL_WIDTH}px`,
            height: `${LAPTOP_SCREEN.PIXEL_HEIGHT}px`,
          }}
        >
          <AudioCtx.Provider value={audio}>
            <LaptopOS isActive={isActive} />
          </AudioCtx.Provider>
        </Html>
      </group>
    );
  },
);
