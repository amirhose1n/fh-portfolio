/**
 * CSS3D bridge — runs a `CSS3DRenderer` alongside r3f's `WebGLRenderer`.
 *
 * The DOM tree:
 *   <App>
 *     <div ref={cssLayerRef}>            ← CSS3DRenderer.domElement appended here
 *     <Canvas>                            ← WebGL renderer (transparent clear)
 *     <ui overlays>
 *
 * Why two layers, and why this order? We want **per-pixel occlusion** of CSS3D
 * content by 3D meshes. The trick (lifted from Heffernan's portfolio):
 *
 *   1. CSS3D canvas sits BELOW the WebGL canvas in DOM stacking.
 *   2. WebGL canvas is transparent (alpha clear), so where nothing is drawn
 *      the CSS3D layer shows through.
 *   3. Where a 3D mesh IS drawn, the opaque mesh pixels cover the CSS3D
 *      pixels behind them — proper per-pixel occlusion, free, on the GPU.
 *   4. A separate invisible "depth-mask" plane sits in the WebGL scene at
 *      the screen's world position to give the depth buffer a value there
 *      (without writing color), so other meshes can be tested against it.
 *
 * Pointer events: WebGL canvas defaults to pointer-events:auto so r3f can
 * dispatch onClick / onPointerOver on meshes. When the laptop is "active",
 * ModelViewer flips the canvas to pointer-events:none so clicks pass through
 * to the CSS3D DOM (the live LaptopOS) underneath.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { useFrame, useThree } from "@react-three/fiber";

interface CSS3DBridgeValue {
  cssScene: THREE.Scene;
  cssRenderer: CSS3DRenderer;
}

const CSS3DCtx = createContext<CSS3DBridgeValue | null>(null);

export function CSS3DBridgeProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const value = useMemo<CSS3DBridgeValue>(() => {
    return {
      cssScene: new THREE.Scene(),
      cssRenderer: new CSS3DRenderer(),
    };
  }, []);

  // Attach the renderer's DOM to our container and keep it sized to the
  // viewport. The container itself sits absolutely behind the Canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const el = value.cssRenderer.domElement;
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    // Keep the CSS3D chain pointer-events:auto. Chromium has known
    // hit-test descent issues through multiple `none` ancestors into
    // 3D-transformed descendants; the OS DOM hostEl is the deepest
    // `auto` element at the laptop screen pixel, and the browser picks
    // it. Empty areas of the chain (no CSS3DObject under cursor) hit the
    // renderer's own divs which have no handlers — harmless.
    el.style.pointerEvents = "auto";
    container.appendChild(el);

    // CSS3DRenderer hard-codes `pointer-events: none` on its internal
    // viewElement (the first child of `el`). That one `none` ancestor is
    // enough to block events on the 3D-transformed hostEl underneath in
    // Chromium. Override it to `auto`.
    const viewEl = el.firstElementChild as HTMLElement | null;
    if (viewEl) viewEl.style.pointerEvents = "auto";

    const onResize = () => {
      value.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (el.parentNode === container) container.removeChild(el);
    };
  }, [value]);

  return (
    <CSS3DCtx.Provider value={value}>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          // Sits below the WebGL canvas so meshes occlude CSS3D content.
          zIndex: 0,
          // Visual background of the world — shows through wherever the
          // WebGL canvas is transparent (and no CSS3D object is rendered).
          background: "#070710",
          // The container itself MUST be pointer-events:auto. With `none`
          // here, Chromium fails to descend into the 3D-transformed
          // hostEl below in some scenarios. Empty pixels just hit this
          // div, which has no handlers — fine.
          pointerEvents: "auto",
        }}
      />
      {children}
    </CSS3DCtx.Provider>
  );
}

export function useCSS3D() {
  const ctx = useContext(CSS3DCtx);
  if (!ctx)
    throw new Error("useCSS3D must be used inside <CSS3DBridgeProvider>");
  return ctx;
}

/**
 * Drives the CSS3DRenderer each frame. Must be mounted inside a `<Canvas>`
 * (uses r3f's `useFrame`/`useThree`). The render is queued at the default
 * priority so it happens alongside r3f's own WebGL render — no conflict.
 */
export function CSS3DRenderLoop() {
  const { cssScene, cssRenderer } = useCSS3D();
  const { camera } = useThree();

  useFrame(() => {
    cssRenderer.render(cssScene, camera);
  });

  return null;
}
