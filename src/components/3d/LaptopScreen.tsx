import { Html } from "@react-three/drei";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { LAPTOP_SCREEN } = SCENE_CONFIG;

// Dev: http://localhost:5174 (fh-portfolio-inner). Prod: built into /inner/.
const INNER_URL =
  (import.meta.env.VITE_INNER_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:5174" : "/inner/");

export interface LaptopScreenHandle {
  /** World-space position of the screen's center. */
  getWorldPosition: () => THREE.Vector3 | null;
  /** World-space outward normal of the screen face (unit vector). */
  getWorldNormal: () => THREE.Vector3 | null;
}

interface LaptopScreenProps {
  isActive: boolean;
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
  function LaptopScreen({ isActive, onHoverChange, onActivate }, ref) {
    const groupRef = useRef<THREE.Group>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

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

    // Tell the inner app when the user has zoomed in / is interacting with
    // the OS, so it can hide transient UI in idle mode.
    useEffect(() => {
      const send = () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "fh:setActive", value: isActive },
          "*",
        );
      };
      // The inner app might still be loading the first time isActive flips.
      // Send now AND on load so it gets the message either way.
      send();
      const iframe = iframeRef.current;
      if (!iframe) return;
      iframe.addEventListener("load", send);
      return () => iframe.removeEventListener("load", send);
    }, [isActive]);

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

        {/* The OS lives in a sibling Vite app (fh-portfolio-inner) and is
            embedded via iframe. `occlude="blending"` gives per-pixel
            occlusion against the WebGL scene — drei renders an invisible
            depth-only proxy and the CSS3D Html sits *behind* the canvas,
            so walls and other meshes correctly hide the screen. */}
        <Html
          transform
          occlude="blending"
          position={[0, 0, 0.005]}
          scale={HTML_SCALE}
          pointerEvents={isActive ? "auto" : "none"}
          zIndexRange={[100, 0]}
          style={{
            width: `${LAPTOP_SCREEN.PIXEL_WIDTH}px`,
            height: `${LAPTOP_SCREEN.PIXEL_HEIGHT}px`,
          }}
        >
          <iframe
            ref={iframeRef}
            src={INNER_URL}
            title="LaptopOS"
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
              background: "#000",
            }}
          />
        </Html>
      </group>
    );
  },
);
