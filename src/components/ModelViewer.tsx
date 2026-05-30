import { Box, OrbitControls, Stars, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../constants/scene";
import { AudioCtx, useAudio } from "../hooks/useAudio";
import { useCameraAnimation } from "../hooks/useCameraAnimation";
import type { Area } from "../types/3d";
import {
  Gallery,
  Ground,
  LaptopScreen,
  Model,
  Nebula,
  SpeakerAudio,
  Window,
} from "./3d";
import type { GalleryHandle } from "./3d/Gallery";
import type { LaptopScreenHandle } from "./3d/LaptopScreen";

const RESUME_PDF = "/files/amirhosein-farhoodi.docx.pdf";

const {
  DEBUG,
  AREAS,
  CAMERA,
  LIGHTING,
  MONITOR,
  GALLERY,
  MODELS,
  ANIMATION,
  LAPTOP_SCREEN,
} = SCENE_CONFIG;

// Intro flythrough — camera starts very far away on the same sight-line as
// Overview and dollies straight in. Strong ease-out so it visibly slows down
// near the end before settling into the final view.
const INTRO_START_POSITION: [number, number, number] = [-12, 11, -17];
const INTRO_START_TARGET: [number, number, number] = [0, 0.3, 0];
const INTRO_DURATION = 3800;
const INTRO_FADE_DELAY = 400;
const INTRO_EASING_POWER = 5;

function LoadingOverlay({ visible }: { visible: boolean }) {
  const { progress } = useProgress();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: CAMERA.BACKGROUND_COLOR,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 600ms ease-out",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: "12px",
          letterSpacing: "0.4em",
          marginBottom: "28px",
          opacity: 0.85,
        }}
      >
        LOADING
      </div>
      <div
        style={{
          width: "220px",
          height: "2px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          borderRadius: "1px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "white",
            transition: "width 200ms ease-out",
          }}
        />
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "10px",
          letterSpacing: "0.15em",
          marginTop: "14px",
        }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
}

// DEBUG-only HUD: polls the live camera + orbit target and prints them as
// ready-to-paste arrays. Orbit to the framing you want, then copy these two
// lines into an AREAS entry (e.g. OVERVIEW.position / .target).
function CameraReadout({
  cameraRef,
  controlsRef,
}: {
  cameraRef: React.RefObject<THREE.Camera | null>;
  controlsRef: React.RefObject<{ target: THREE.Vector3 } | null>;
}) {
  const [text, setText] = useState("…");
  useEffect(() => {
    const f = (v: number) => v.toFixed(2);
    const id = window.setInterval(() => {
      const cam = cameraRef.current;
      const ctr = controlsRef.current;
      if (!cam || !ctr) return;
      const p = cam.position;
      const t = ctr.target;
      setText(
        `position: [${f(p.x)}, ${f(p.y)}, ${f(p.z)}],\n` +
          `target:   [${f(t.x)}, ${f(t.y)}, ${f(t.z)}],`,
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [cameraRef, controlsRef]);

  return (
    <pre
      style={{
        position: "fixed",
        bottom: 12,
        left: 12,
        zIndex: 10001,
        margin: 0,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.65)",
        color: "#9effa0",
        font: "11px/1.45 monospace",
        borderRadius: 6,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {text}
    </pre>
  );
}

// Fires once the Suspense boundary's contents are mounted AND a frame has
// actually been rendered with the room geometry present. React only mounts
// Suspense children after every suspending sibling resolves, so this is a
// reliable "the room is on screen" signal — unlike useProgress, which reports
// download completion before models are parsed and uploaded to the GPU.
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    // Wait two frames so the first paint containing the room is on screen
    // before we start fading the loading overlay out.
    if (frames.current === 2) onReady();
  });
  return null;
}

// Tracks whether the viewport is phone-sized so the bottom nav can swap the
// (too-wide) per-area pill row for a compact arrow stepper.
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

// All areas (including Overview at index 0) cycle freely — wheel/arrow keys
// wrap through every view in both directions.
function nextAreaIndex(current: number, direction: number, total: number) {
  return (current + direction + total) % total;
}

// Convert AREAS config to Area[] type
const areas: Area[] = [
  {
    name: AREAS.OVERVIEW.name,
    position: AREAS.OVERVIEW.position,
    target: AREAS.OVERVIEW.target,
    component: AREAS.OVERVIEW.name,
    componentPosition: AREAS.OVERVIEW.componentPosition,
    minPolarAngle: AREAS.OVERVIEW.minPolarAngle,
    maxPolarAngle: AREAS.OVERVIEW.maxPolarAngle,
  },
  {
    name: AREAS.GALLERY.name,
    position: AREAS.GALLERY.position,
    target: AREAS.GALLERY.target,
    component: AREAS.GALLERY.name,
    componentPosition: AREAS.GALLERY.componentPosition,
    minPolarAngle: AREAS.GALLERY.minPolarAngle,
    maxPolarAngle: AREAS.GALLERY.maxPolarAngle,
  },
  {
    name: AREAS.PORTFOLIO.name,
    position: AREAS.PORTFOLIO.position,
    target: AREAS.PORTFOLIO.target,
    component: AREAS.PORTFOLIO.name,
    componentPosition: AREAS.PORTFOLIO.componentPosition,
    minPolarAngle: AREAS.PORTFOLIO.minPolarAngle,
    maxPolarAngle: AREAS.PORTFOLIO.maxPolarAngle,
  },
  {
    name: AREAS.AVATAR.name,
    position: AREAS.AVATAR.position,
    target: AREAS.AVATAR.target,
    component: AREAS.AVATAR.name,
    componentPosition: AREAS.AVATAR.componentPosition,
    minPolarAngle: AREAS.AVATAR.minPolarAngle,
    maxPolarAngle: AREAS.AVATAR.maxPolarAngle,
  },
  {
    name: AREAS.WINDOW.name,
    position: AREAS.WINDOW.position,
    target: AREAS.WINDOW.target,
    component: AREAS.WINDOW.name,
    componentPosition: AREAS.WINDOW.componentPosition,
    minPolarAngle: AREAS.WINDOW.minPolarAngle,
    maxPolarAngle: AREAS.WINDOW.maxPolarAngle,
  },
];

// Left-side desktop navigation. Each label flies the camera to one of the
// existing areas — edit the `areaName` here to remap a menu item to a
// different view.
type MenuIconName = "home" | "about" | "skills" | "projects" | "contact";

const MENU_ITEMS: { label: string; areaName: string; icon: MenuIconName }[] = [
  { label: "HOME", areaName: AREAS.OVERVIEW.name, icon: "home" },
  { label: "ABOUT", areaName: AREAS.AVATAR.name, icon: "about" },
  { label: "SKILLS", areaName: AREAS.GALLERY.name, icon: "skills" },
  { label: "PROJECTS", areaName: AREAS.PORTFOLIO.name, icon: "projects" },
  { label: "CONTACT", areaName: AREAS.WINDOW.name, icon: "contact" },
];

const NAV_GOLD = "#e3a92e";
const NAV_IDLE = "#aeb4bc";

function NavIcon({ name }: { name: MenuIconName }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9h13v-9" />
        </svg>
      );
    case "about":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        </svg>
      );
    case "skills":
      return (
        <svg {...common}>
          <polyline points="8 8 4 12 8 16" />
          <polyline points="16 8 20 12 16 16" />
          <line x1="13.5" y1="5.5" x2="10.5" y2="18.5" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <path d="M3 6.5h6l2 2.5h10v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "contact":
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
  }
}

export default function ModelViewer() {
  const cameraRef = useRef<THREE.Camera>(null);
  const controlsRef = useRef<any>(null);
  const galleryRef = useRef<GalleryHandle>(null);
  const laptopScreenRef = useRef<LaptopScreenHandle>(null);

  const [currentArea, setCurrentArea] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [introPhase, setIntroPhase] = useState<"loading" | "intro" | "ready">(
    "loading",
  );
  const [freeMode, setFreeMode] = useState(false);
  const isMobile = useIsMobile();
  // True once the Suspense room content has mounted and rendered a frame.
  const [sceneReady, setSceneReady] = useState(false);
  const audioCtx = useAudio();
  const { isOn: audioOn, toggle: toggleAudio } = audioCtx;

  const { animate: animateCamera, cancel: cancelAnimation } =
    useCameraAnimation();

  // Saved gallery camera position (to return to after frame zoom)
  const galleryBaseRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);

  // Laptop interaction state. `laptopActive` is the "zoomed in, using the
  // OS" state; `laptopHovered` is the in-between hover-nudge state.
  const [laptopActive, setLaptopActive] = useState(false);
  const laptopHoveredRef = useRef(false);
  // Saved portfolio camera pose, captured on first hover/click so the exit
  // animation always lands back on the exact view we came from.
  const laptopBaseRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);

  /** Pose computed from the laptop screen's current world transform. */
  const computeLaptopPose = (fraction: number) => {
    if (
      !laptopScreenRef.current ||
      !cameraRef.current ||
      !controlsRef.current
    ) {
      return null;
    }
    const screenPos = laptopScreenRef.current.getWorldPosition();
    const screenNormal = laptopScreenRef.current.getWorldNormal();
    if (!screenPos || !screenNormal) return null;

    const fullZoomPos = screenPos
      .clone()
      .add(screenNormal.clone().multiplyScalar(LAPTOP_SCREEN.ZOOM_DISTANCE));

    const basePos =
      laptopBaseRef.current?.position ?? cameraRef.current.position;
    const baseTarget =
      laptopBaseRef.current?.target ?? controlsRef.current.target;

    const lerpedPos = basePos.clone().lerp(fullZoomPos, fraction);
    const lerpedTarget = baseTarget.clone().lerp(screenPos, fraction);

    return { position: lerpedPos, target: lerpedTarget };
  };

  const captureLaptopBase = () => {
    if (laptopBaseRef.current) return;
    if (!cameraRef.current || !controlsRef.current) return;
    laptopBaseRef.current = {
      position: cameraRef.current.position.clone(),
      target: controlsRef.current.target.clone(),
    };
  };

  const handleLaptopHover = (hovered: boolean) => {
    if (laptopActive) return;
    if (areas[currentArea]?.name !== AREAS.PORTFOLIO.name) return;
    if (isTransitioning) return;

    laptopHoveredRef.current = hovered;
    if (!cameraRef.current || !controlsRef.current) return;

    captureLaptopBase();
    const pose = computeLaptopPose(hovered ? LAPTOP_SCREEN.HOVER_FRACTION : 0);
    if (!pose) return;

    cancelAnimation();
    animateCamera(
      { camera: cameraRef.current, controls: controlsRef.current },
      pose.position.toArray() as [number, number, number],
      pose.target.toArray() as [number, number, number],
      {
        duration: LAPTOP_SCREEN.HOVER_DURATION,
        easingPower: ANIMATION.EASING_POWER,
      },
    );
  };

  // Zoom the camera into the laptop screen from wherever it currently sits.
  // No area guard — callers are responsible for being on (or arriving at) the
  // Portfolio view so the captured base pose is correct.
  const zoomIntoLaptop = () => {
    if (laptopActive) return;
    if (!cameraRef.current || !controlsRef.current) return;

    captureLaptopBase();
    const pose = computeLaptopPose(1);
    if (!pose) return;

    setLaptopActive(true);
    setIsTransitioning(true);
    cancelAnimation();
    animateCamera(
      { camera: cameraRef.current, controls: controlsRef.current },
      pose.position.toArray() as [number, number, number],
      pose.target.toArray() as [number, number, number],
      {
        duration: LAPTOP_SCREEN.ZOOM_DURATION,
        easingPower: ANIMATION.EASING_POWER,
        onComplete: () => setIsTransitioning(false),
      },
    );
  };

  const handleLaptopActivate = () => {
    if (areas[currentArea]?.name !== AREAS.PORTFOLIO.name) return;
    zoomIntoLaptop();
  };

  const handleLaptopExit = () => {
    if (!laptopActive && !laptopBaseRef.current) return;
    if (!cameraRef.current || !controlsRef.current) return;

    const base = laptopBaseRef.current;
    laptopBaseRef.current = null;
    laptopHoveredRef.current = false;
    document.body.style.cursor = "";

    if (!base) {
      setLaptopActive(false);
      return;
    }

    setIsTransitioning(true);
    cancelAnimation();
    animateCamera(
      { camera: cameraRef.current, controls: controlsRef.current },
      base.position.toArray() as [number, number, number],
      base.target.toArray() as [number, number, number],
      {
        duration: LAPTOP_SCREEN.ZOOM_DURATION,
        easingPower: ANIMATION.EASING_POWER,
        onComplete: () => {
          setIsTransitioning(false);
          setLaptopActive(false);
        },
      },
    );
  };

  // Handle gallery frame activate / deactivate. Manages `isTransitioning` on
  // both legs: the animation hook's cancel() never fires onComplete, so if we
  // don't reset the flag here a cancelled tween would leave it stuck true and
  // freeze all scroll/keyboard navigation.
  const handleFrameActivate = (
    worldPos: [number, number, number] | null,
    zoomPos: [number, number, number] | null,
  ) => {
    if (!cameraRef.current || !controlsRef.current) return;

    cancelAnimation();

    if (worldPos && zoomPos) {
      // Anchor zoom-back to the canonical gallery pose so it always returns to
      // the overview, even if a frame was clicked mid-transition.
      if (!galleryBaseRef.current) {
        galleryBaseRef.current = {
          position: new THREE.Vector3(...AREAS.GALLERY.position),
          target: new THREE.Vector3(...AREAS.GALLERY.target),
        };
      }
      setIsTransitioning(true);
      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        [zoomPos[0], worldPos[1], zoomPos[2]],
        worldPos,
        {
          duration: ANIMATION.GALLERY_ZOOM_DURATION,
          easingPower: ANIMATION.EASING_POWER,
          onComplete: () => setIsTransitioning(false),
        },
      );
    } else if (galleryBaseRef.current) {
      // Zoom back to gallery view
      const base = galleryBaseRef.current;
      galleryBaseRef.current = null;
      setIsTransitioning(true);
      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        base.position.toArray() as [number, number, number],
        base.target.toArray() as [number, number, number],
        {
          duration: ANIMATION.GALLERY_ZOOM_DURATION,
          easingPower: ANIMATION.EASING_POWER,
          onComplete: () => setIsTransitioning(false),
        },
      );
    }
  };

  // Move to a specific area. Navigating away from the laptop first drops any
  // zoom/hover state — otherwise `laptopActive` stays stuck "on" off-screen and
  // blocks ever re-entering the laptop.
  const moveToArea = (areaIndex: number) => {
    if (isTransitioning || areaIndex === currentArea) return;

    if (laptopActive || laptopBaseRef.current) {
      laptopBaseRef.current = null;
      laptopHoveredRef.current = false;
      document.body.style.cursor = "";
      setLaptopActive(false);
    }

    setCurrentArea(areaIndex);
    setIsTransitioning(true);

    if (cameraRef.current && controlsRef.current) {
      const targetArea = areas[areaIndex];

      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        targetArea.position,
        targetArea.target,
        {
          duration: ANIMATION.AREA_TRANSITION_DURATION,
          easingPower: ANIMATION.EASING_POWER,
          onComplete: () => {
            setIsTransitioning(false);
            // Apply polar angle constraints after animation
            if (targetArea.minPolarAngle !== undefined) {
              controlsRef.current.minPolarAngle = targetArea.minPolarAngle;
            }
            if (targetArea.maxPolarAngle !== undefined) {
              controlsRef.current.maxPolarAngle = targetArea.maxPolarAngle;
            }
            controlsRef.current.update();
          },
        },
      );

      // Apply polar angle constraints during animation
      if (targetArea.minPolarAngle !== undefined) {
        controlsRef.current.minPolarAngle = targetArea.minPolarAngle;
      }
      if (targetArea.maxPolarAngle !== undefined) {
        controlsRef.current.maxPolarAngle = targetArea.maxPolarAngle;
      }
    } else {
      setIsTransitioning(false);
    }
  };

  // Set initial camera position — start outside the room for the intro flythrough.
  // Polar bounds stay at the Overview clamp (1.3) so the camera traces the same
  // sight-line during intro and lands exactly on the final view — no snap.
  useEffect(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...INTRO_START_POSITION);
      controlsRef.current.target.set(...INTRO_START_TARGET);
      controlsRef.current.update();
    }
  }, []);

  // Loading → intro flythrough → ready.
  // Gated on `sceneReady` (the room is actually rendered) rather than download
  // progress, so the overlay never lifts onto an empty starfield while the
  // models are still parsing/uploading.
  useEffect(() => {
    if (introPhase !== "loading") return;
    if (!sceneReady) return;

    const fadeTimer = window.setTimeout(() => {
      if (!cameraRef.current || !controlsRef.current) return;

      setIntroPhase("intro");
      setIsTransitioning(true);

      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        AREAS.OVERVIEW.position,
        AREAS.OVERVIEW.target,
        {
          duration: INTRO_DURATION,
          easingPower: INTRO_EASING_POWER,
          onComplete: () => {
            const initialArea = areas[0];
            if (controlsRef.current) {
              if (initialArea.minPolarAngle !== undefined) {
                controlsRef.current.minPolarAngle = initialArea.minPolarAngle;
              }
              if (initialArea.maxPolarAngle !== undefined) {
                controlsRef.current.maxPolarAngle = initialArea.maxPolarAngle;
              }
              controlsRef.current.update();
            }
            setIsTransitioning(false);
            setIntroPhase("ready");
          },
        },
      );
    }, INTRO_FADE_DELAY);

    return () => window.clearTimeout(fadeTimer);
  }, [introPhase, sceneReady, animateCamera]);

  // SpeakerAudio is mounted from the start so the mp3 loads alongside the rest
  // of the scene and the track is armed "on" from the first frame (see
  // useAudio). SpeakerAudio handles the autoplay-policy unlock itself — it
  // resumes immediately when allowed, otherwise on the first user gesture — so
  // playback no longer waits for the intro flythrough to finish.

  // Handle wheel and keyboard navigation
  useEffect(() => {
    if (DEBUG.ENABLED) return;

    const handleWheel = (event: WheelEvent) => {
      if (freeMode) return; // let OrbitControls handle the zoom natively
      event.preventDefault();
      event.stopPropagation();

      if (isTransitioning || introPhase !== "ready") return;

      // If zoomed into the laptop, scroll-out exits first
      if (laptopActive || laptopBaseRef.current) {
        handleLaptopExit();
        return;
      }

      // If zoomed into a gallery frame, zoom out first
      if (galleryBaseRef.current) {
        galleryRef.current?.deactivate();
        handleFrameActivate(null, null);
        return;
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      moveToArea(nextAreaIndex(currentArea, direction, areas.length));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (laptopActive || laptopBaseRef.current)) {
        event.preventDefault();
        handleLaptopExit();
        return;
      }

      // Left/Right step between photos while in the Gallery (works from the
      // overview too — the first press zooms into a photo).
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (introPhase !== "ready" || freeMode || laptopActive) return;
        const galleryIndex = areas.findIndex(
          (a) => a.name === AREAS.GALLERY.name,
        );
        if (currentArea !== galleryIndex) return;
        event.preventDefault();
        galleryRef.current?.step(event.key === "ArrowRight" ? 1 : -1);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();

        if (introPhase !== "ready" || freeMode) return;

        if (laptopActive || laptopBaseRef.current) {
          handleLaptopExit();
          return;
        }

        if (galleryBaseRef.current) {
          galleryRef.current?.deactivate();
          handleFrameActivate(null, null);
          return;
        }

        const direction = event.key === "ArrowDown" ? 1 : -1;
        moveToArea(nextAreaIndex(currentArea, direction, areas.length));
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentArea, isTransitioning, introPhase, freeMode, laptopActive]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <LoadingOverlay visible={introPhase === "loading"} />
      {DEBUG.ENABLED && (
        <CameraReadout cameraRef={cameraRef} controlsRef={controlsRef} />
      )}
      <Canvas
        shadows="soft"
        camera={{ position: INTRO_START_POSITION, fov: CAMERA.FOV }}
        style={{ background: CAMERA.BACKGROUND_COLOR }}
        onCreated={({ camera, raycaster }) => {
          cameraRef.current = camera;
          // Camera renders every layer (so layer-1 rooftop objects stay visible)
          camera.layers.enableAll();
          // The shared raycaster defaults to layer-0 only. Enable all layers
          // so drei's <Html occlude> can hit the layer-1 exterior walls —
          // otherwise the laptop screen renders through them when looking
          // at the room from outside.
          raycaster.layers.enableAll();
        }}
      >
        {/* Bridge the audio context across the r3f reconciler boundary so
            LaptopOS (mounted via drei's <Html> portal) can read useAudio. */}
        <AudioCtx.Provider value={audioCtx}>
          {/* Night sky */}
          <Nebula />
          <Stars
            radius={50}
            depth={40}
            count={1500}
            factor={3}
            saturation={0.2}
            fade
            speed={0.5}
          />

          {/* Ceiling Lamp */}
          <group position={LIGHTING.CEILING_LAMP.POSITION}>
            {/* Omnidirectional bulb — a room ceiling lamp radiates in every
                direction, so a pointLight (not a spotLight) is the right
                fixture: it throws each object's shadow radially outward, giving
                natural shadows on all sides instead of one downward cone.
                shadow-camera-far is a tight 6 (just encloses the room). A far
                plane far past the geometry wastes shadow-map depth precision
                over empty space, which reads as shadow acne / dark speckling
                and gets WORSE at higher SHADOW_MAP_SIZE. */}

            {/* Flush-mount ceiling puck — a thick disc hanging a little below
                the ceiling (a "chandelier"). The dark cylindrical rim gives it
                visible thickness; the warm glowing face points down into the
                room. Local +0.13 drops the body so it sits ~0.12 below the
                ceiling plane with its top almost touching it. */}
            <group position={[0, 0.1, 0]}>
              {/* Puck body / rim — dark, supplies the visible thickness */}
              <mesh>
                <cylinderGeometry args={[0.34, 0.34, 0.1, 64]} />
                <meshStandardMaterial
                  color="#1c1c20"
                  roughness={0.5}
                  metalness={0.4}
                  opacity={100}
                />
              </mesh>
              {/* Warm glowing diffuser face, just beneath the body, facing down.
                  FrontSide (not DoubleSide): the disc only emits toward the room
                  below it. Its normal points -Y (down), so from above (Overview
                  camera) it is back-face culled and invisible — you can't see the
                  "bulb" from on top of the fixture, like a real recessed lamp. */}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.051, 0]}>
                <circleGeometry args={[0.31, 64]} />
                <meshBasicMaterial
                  color="#ffe9cc"
                  toneMapped={false}
                  side={THREE.FrontSide}
                />
              </mesh>
              <pointLight
                intensity={LIGHTING.CEILING_LAMP.INTENSITY}
                color={LIGHTING.CEILING_LAMP.COLOR}
                decay={LIGHTING.CEILING_LAMP.DECAY}
                distance={LIGHTING.CEILING_LAMP.DISTANCE}
                castShadow
                shadow-mapSize-width={LIGHTING.CEILING_LAMP.SHADOW_MAP_SIZE}
                shadow-mapSize-height={LIGHTING.CEILING_LAMP.SHADOW_MAP_SIZE}
                shadow-camera-near={0.5}
                shadow-camera-far={6}
                shadow-bias={-0.0005}
                shadow-normalBias={0.03}
                shadow-radius={6}
              />
            </group>

            {DEBUG.ENABLED && (
              <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={LIGHTING.CEILING_LAMP.COLOR} />
              </mesh>
            )}
          </group>

          {/* Gentle warm room light at the centre — lifts the whole interior
            from the middle outward so it isn't just a pool under the lamp.
            Positional + inside → it can't reach the exterior; kept low so the
            lamp's cast shadows still read. */}
          <pointLight
            position={LIGHTING.CENTER_LIGHT.POSITION}
            color={LIGHTING.CENTER_LIGHT.COLOR}
            intensity={LIGHTING.CENTER_LIGHT.INTENSITY}
            decay={LIGHTING.CENTER_LIGHT.DECAY}
            distance={LIGHTING.CENTER_LIGHT.DISTANCE}
          />

          {/* Moonlight — cool light for the exterior shell + Starlink. It casts
            shadows, and the room shell (walls + ceiling) casts shadows too, so
            the moonlight is physically occluded from the interior: the walls
            block it exactly like a real wall would. (Light layers can't confine
            illumination in three.js, so occlusion is how we keep it outside.)
            Target via attach="target" so its matrixWorld updates. */}
          <directionalLight
            position={LIGHTING.MOONLIGHT.POSITION}
            intensity={LIGHTING.MOONLIGHT.INTENSITY}
            color={LIGHTING.MOONLIGHT.COLOR}
            castShadow
            shadow-mapSize-width={LIGHTING.MOONLIGHT.SHADOW_MAP_SIZE}
            shadow-mapSize-height={LIGHTING.MOONLIGHT.SHADOW_MAP_SIZE}
            shadow-camera-near={LIGHTING.MOONLIGHT.SHADOW_NEAR}
            shadow-camera-far={LIGHTING.MOONLIGHT.SHADOW_FAR}
            shadow-camera-left={-LIGHTING.MOONLIGHT.SHADOW_BOUNDS}
            shadow-camera-right={LIGHTING.MOONLIGHT.SHADOW_BOUNDS}
            shadow-camera-top={LIGHTING.MOONLIGHT.SHADOW_BOUNDS}
            shadow-camera-bottom={-LIGHTING.MOONLIGHT.SHADOW_BOUNDS}
            shadow-normalBias={0.03}
          >
            <object3D attach="target" position={LIGHTING.MOONLIGHT.TARGET} />
          </directionalLight>

          {/* (No exterior hemisphere fill — a hemisphere has no position, so
            three.js can't keep it off the interior; it was the cool "moonlight
            inside" bleed. The exterior is lit by the moonlight above instead.) */}

          {/* Faint window moonbeam — kept very dim so it's barely perceptible.
            Narrow cone aimed through the window cutout, light dies off quickly
            so it just kisses the floor near the window, not the whole room. */}
          <spotLight
            position={[2.5, 0.9, 0]}
            intensity={0.35}
            color={LIGHTING.MOONLIGHT.COLOR}
            angle={Math.PI / 10}
            penumbra={0.85}
            decay={2}
            distance={3.5}
          >
            <object3D attach="target" position={[0.3, -0.2, 0]} />
          </spotLight>
          {DEBUG.ENABLED && (
            <>
              {/* Debug box at moonlight source — tweak LIGHTING.MOONLIGHT.POSITION
                in scene.ts to move the light, this marker follows it. */}
              <mesh position={LIGHTING.MOONLIGHT.POSITION}>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshBasicMaterial color={LIGHTING.MOONLIGHT.COLOR} />
              </mesh>
              {/* Debug marker at moonlight target (where the light is aimed) */}
              <mesh position={LIGHTING.MOONLIGHT.TARGET}>
                <boxGeometry args={[0.12, 0.12, 0.12]} />
                <meshBasicMaterial color="cyan" wireframe />
              </mesh>
            </>
          )}

          <Suspense fallback={null}>
            <SceneReadySignal onReady={() => setSceneReady(true)} />
            <Ground />
            <Window />
            <Gallery
              ref={galleryRef}
              isActive={areas[currentArea]?.name === AREAS.GALLERY.name}
              onFrameActivate={handleFrameActivate}
              onWallClick={() =>
                moveToArea(
                  areas.findIndex((a) => a.name === AREAS.GALLERY.name),
                )
              }
              wallPosition={GALLERY.WALL_POSITION}
              wallRotation={GALLERY.WALL_ROTATION}
            />

            {/* Debug: Camera position indicators */}
            {DEBUG.ENABLED && (
              <>
                {areas.map((area, index) => (
                  <Box
                    key={`camera-${index}`}
                    args={[DEBUG.BOX_SIZE, DEBUG.BOX_SIZE, DEBUG.BOX_SIZE]}
                    position={area.position}
                  >
                    <meshBasicMaterial color="red" />
                  </Box>
                ))}
                <Box
                  args={[DEBUG.BOX_SIZE, DEBUG.BOX_SIZE, DEBUG.BOX_SIZE]}
                  position={MONITOR.POSITION}
                >
                  <meshBasicMaterial color="orange" />
                </Box>
                {areas.map((area, index) => (
                  <Box
                    key={`target-${index}`}
                    args={[
                      DEBUG.TARGET_BOX_SIZE,
                      DEBUG.TARGET_BOX_SIZE,
                      DEBUG.TARGET_BOX_SIZE,
                    ]}
                    position={area.target}
                  >
                    <meshBasicMaterial color="blue" />
                  </Box>
                ))}
                <primitive
                  object={
                    new THREE.Line(
                      new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(...areas[0].componentPosition),
                        new THREE.Vector3(...areas[1].componentPosition),
                      ]),
                      new THREE.LineBasicMaterial({ color: "yellow" }),
                    )
                  }
                />
                <primitive
                  object={
                    new THREE.Line(
                      new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(...areas[0].position),
                        new THREE.Vector3(...areas[1].position),
                      ]),
                      new THREE.LineBasicMaterial({ color: "orange" }),
                    )
                  }
                />
              </>
            )}

            {/* FH Model */}
            {/* <Model
              url={MODELS.FH.URL}
              position={AREAS.OVERVIEW.componentPosition}
              rotation={MODELS.FH.ROTATION}
            /> */}

            {/* Skateboard Model */}
            <Model
              url={MODELS.SKATEBOARD.URL}
              position={MODELS.SKATEBOARD.POSITION}
              rotation={MODELS.SKATEBOARD.ROTATION}
              scale={MODELS.SKATEBOARD.SCALE}
            />

            {/* Ceramic pot in the gallery-wall floor corner (pot only — no plant) */}
            <Model
              url={MODELS.FLOWERS.URL}
              position={MODELS.FLOWERS.POSITION}
              rotation={MODELS.FLOWERS.ROTATION}
              scale={MODELS.FLOWERS.SCALE}
            />

            {/* Animated pet cat — idle loop plays via the GLB's baked clip.
                Sits on the floor in the overview corner near the skateboard. */}
            <Model
              url={MODELS.PET.URL}
              position={MODELS.PET.POSITION}
              rotation={MODELS.PET.ROTATION}
              scale={MODELS.PET.SCALE}
            />

            {/* Cool rim/back light for the cat — traces a moonlit edge along
                its back so it pops off the dark corner, especially from behind.
                Tight cone + short distance keep the spill off the rest of the
                room. Target via attach="target" so its matrixWorld updates. */}
            <spotLight
              position={LIGHTING.PET_RIM.POSITION}
              intensity={LIGHTING.PET_RIM.INTENSITY}
              color={LIGHTING.PET_RIM.COLOR}
              angle={LIGHTING.PET_RIM.ANGLE}
              penumbra={LIGHTING.PET_RIM.PENUMBRA}
              decay={LIGHTING.PET_RIM.DECAY}
              distance={LIGHTING.PET_RIM.DISTANCE}
            >
              <object3D attach="target" position={LIGHTING.PET_RIM.TARGET} />
            </spotLight>

            {DEBUG.ENABLED && (
              <>
                {/* Solid cube at the pet rim light source — tweak
                    LIGHTING.PET_RIM.POSITION in scene.ts to move it, this marker
                    follows. Wire cube marks where the rim is aimed (TARGET). */}
                <mesh position={LIGHTING.PET_RIM.POSITION}>
                  <boxGeometry args={[0.12, 0.12, 0.12]} />
                  <meshBasicMaterial color="lime" />
                </mesh>
                <mesh position={LIGHTING.PET_RIM.TARGET}>
                  <boxGeometry args={[0.08, 0.08, 0.08]} />
                  <meshBasicMaterial color="magenta" wireframe />
                </mesh>
              </>
            )}

            {/* Starlink dish on the roof — exclusive to layer 1 (moonlight
                only). No shadows: it's outside and must not throw or catch any
                shadow from the interior lamp. */}
            <Model
              url={MODELS.STARLINK.URL}
              position={MODELS.STARLINK.POSITION}
              rotation={MODELS.STARLINK.ROTATION}
              scale={MODELS.STARLINK.SCALE}
              layer={1}
              castShadow={false}
              receiveShadow={false}
            />

            {/* Portfolio Area - Computer Setup */}
            <group
              position={AREAS.PORTFOLIO.componentPosition}
              rotation={[0, Math.PI, 0]}
            >
              {/* Monitor / Computer (FBX) */}
              <group
                position={MONITOR.POSITION}
                scale={MONITOR.SCALE}
                rotation={MONITOR.ROTATION}
              >
                <Model
                  url={MODELS.COMPUTER.URL}
                  position={MODELS.COMPUTER.POSITION}
                  rotation={MODELS.COMPUTER.ROTATION}
                  scale={MODELS.COMPUTER.SCALE}
                />

                {/* Interactive DOM "screen" overlaid on the macbook display. */}
                <LaptopScreen
                  ref={laptopScreenRef}
                  isActive={laptopActive}
                  onHoverChange={handleLaptopHover}
                  onActivate={handleLaptopActivate}
                />
              </group>

              {/* Desk Model */}
              <Model
                scale={MODELS.DESK.SCALE}
                position={MODELS.DESK.POSITION}
                url={MODELS.DESK.URL}
              />

              {/* Chair — in front of the desk */}
              <Model
                url={MODELS.CHAIR.URL}
                position={MODELS.CHAIR.POSITION}
                rotation={MODELS.CHAIR.ROTATION}
                scale={MODELS.CHAIR.SCALE}
              />

              {/* Speaker — sits on the desk. Wrapped in a group so the
                PositionalAudio shares its world position but isn't scaled by
                the speaker's tiny 0.0005 (which would shrink the audio
                rolloff to nothing). The audio loader is isolated in its
                own Suspense so the multi-MB mp3 download doesn't black out
                the rest of the room while it streams. */}
              <group
                position={MODELS.SPEAKER.POSITION}
                rotation={MODELS.SPEAKER.ROTATION}
              >
                <Model url={MODELS.SPEAKER.URL} scale={MODELS.SPEAKER.SCALE} />
                <SpeakerAudio
                  url={MODELS.SPEAKER.AUDIO.URL}
                  distance={MODELS.SPEAKER.AUDIO.DISTANCE}
                  volume={MODELS.SPEAKER.AUDIO.VOLUME}
                />
              </group>
            </group>
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enablePan={DEBUG.ENABLED || freeMode}
            enableRotate={DEBUG.ENABLED || freeMode}
            autoRotate={false}
            enableZoom={DEBUG.ENABLED || freeMode}
            minDistance={DEBUG.ENABLED || freeMode ? 0.4 : undefined}
            maxDistance={DEBUG.ENABLED || freeMode ? 35 : undefined}
            minPolarAngle={
              DEBUG.ENABLED || freeMode
                ? 0
                : (areas[currentArea]?.minPolarAngle ?? 1.3)
            }
            maxPolarAngle={
              DEBUG.ENABLED || freeMode
                ? Math.PI
                : (areas[currentArea]?.maxPolarAngle ?? 1.3)
            }
            target={areas[0].target}
          />
        </AudioCtx.Provider>
      </Canvas>

      {/* Top-left control row: Resume / Audio / Free Mode */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 1000,
          display: "flex",
          gap: "10px",
          opacity: introPhase === "ready" ? 1 : 0,
          pointerEvents: introPhase === "ready" ? "auto" : "none",
          transition: "opacity 500ms ease-in",
        }}
      >
        <a
          href={RESUME_PDF}
          download
          style={{
            color: "white",
            fontSize: "12px",
            letterSpacing: "0.15em",
            fontWeight: 500,
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "8px 14px",
            borderRadius: "16px",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            textDecoration: "none",
            transition: "background 200ms, border 200ms",
          }}
        >
          RESUME
        </a>

        <button
          type="button"
          onClick={toggleAudio}
          aria-label={audioOn ? "Mute audio" : "Unmute audio"}
          style={{
            all: "unset",
            color: "white",
            fontSize: "14px",
            letterSpacing: "0.15em",
            fontWeight: 500,
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "8px 14px",
            borderRadius: "16px",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxSizing: "border-box",
            transition: "background 200ms, border 200ms",
          }}
        >
          <span style={{ fontSize: "14px", lineHeight: 1 }}>
            {audioOn ? "🔊" : "🔇"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            // Exiting free mode is instant — the user is already wherever
            // they panned to, and snapping back would feel jarring.
            if (freeMode) {
              setFreeMode(false);
              return;
            }
            // Entering free mode: relax the camera into the Overview pose
            // first, then unlock OrbitControls once we've landed. Skipped in
            // DEBUG mode so a developer toggling the button doesn't lose
            // their carefully-positioned camera.
            if (DEBUG.ENABLED || !cameraRef.current || !controlsRef.current) {
              setFreeMode(true);
              return;
            }
            cancelAnimation();
            setIsTransitioning(true);
            setCurrentArea(0);
            animateCamera(
              { camera: cameraRef.current, controls: controlsRef.current },
              AREAS.OVERVIEW.position,
              AREAS.OVERVIEW.target,
              {
                duration: ANIMATION.AREA_TRANSITION_DURATION,
                easingPower: ANIMATION.EASING_POWER,
                onComplete: () => {
                  setIsTransitioning(false);
                  setFreeMode(true);
                },
              },
            );
          }}
          style={{
            all: "unset",
            color: "white",
            fontSize: "12px",
            letterSpacing: "0.15em",
            fontWeight: 500,
            background: freeMode
              ? "rgba(184, 200, 224, 0.18)"
              : "rgba(0, 0, 0, 0.5)",
            border: freeMode
              ? "1px solid rgba(184, 200, 224, 0.6)"
              : "1px solid rgba(255, 255, 255, 0.15)",
            padding: "8px 14px",
            borderRadius: "16px",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            transition: "background 200ms, border 200ms",
          }}
        >
          {freeMode ? "AUTO VIEW MODE" : "MANUAL MODE"}
        </button>
      </div>

      {/* Left-side vertical navigation (desktop only). Icon + label per menu
          item; the active view is gold with an underline. Maps to camera areas
          via MENU_ITEMS. Mobile uses the bottom arrow stepper instead. */}
      {!isMobile && (
        <nav
          style={{
            position: "absolute",
            left: "34px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            opacity: introPhase === "ready" && !freeMode ? 1 : 0,
            pointerEvents:
              introPhase === "ready" && !freeMode ? "auto" : "none",
            transition: "opacity 500ms ease-in",
          }}
        >
          {MENU_ITEMS.map((item) => {
            const index = areas.findIndex((a) => a.name === item.areaName);
            const isActive = currentArea === index;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => moveToArea(index)}
                disabled={isTransitioning}
                style={{
                  all: "unset",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "9px 2px",
                  width: "fit-content",
                  cursor: isTransitioning ? "default" : "pointer",
                  color: isActive ? NAV_GOLD : NAV_IDLE,
                  borderBottom: isActive
                    ? `1.5px solid ${NAV_GOLD}`
                    : "1.5px solid transparent",
                  transition: "color 200ms",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#e8ebef";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = NAV_IDLE;
                }}
              >
                <NavIcon name={item.icon} />
                <span
                  style={{
                    fontSize: "15px",
                    letterSpacing: "0.22em",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Bottom navigation — mobile only now (desktop uses the left menu).
          A compact arrow stepper that cycles through the camera areas. */}
      {(() => {
        const containerStyle: CSSProperties = {
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          maxWidth: "100vw",
          opacity: introPhase === "ready" && !freeMode ? 1 : 0,
          transition: "opacity 500ms ease-in",
          pointerEvents: introPhase === "ready" && !freeMode ? "auto" : "none",
        };

        if (isMobile) {
          const arrowStyle: CSSProperties = {
            all: "unset",
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: isTransitioning ? "default" : "pointer",
            opacity: isTransitioning ? 0.4 : 1,
          };
          const chevron = (points: string) => (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points={points} />
            </svg>
          );
          return (
            <div style={containerStyle}>
              <div
                style={{
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 500,
                  background: "rgba(0, 0, 0, 0.5)",
                  padding: "6px 8px",
                  borderRadius: "20px",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous area"
                  onClick={() =>
                    moveToArea(nextAreaIndex(currentArea, -1, areas.length))
                  }
                  disabled={isTransitioning}
                  style={arrowStyle}
                >
                  {chevron("15 18 9 12 15 6")}
                </button>
                <span style={{ padding: "0 6px", whiteSpace: "nowrap" }}>
                  {areas[currentArea].name} ({currentArea + 1}/{areas.length})
                </span>
                <button
                  type="button"
                  aria-label="Next area"
                  onClick={() =>
                    moveToArea(nextAreaIndex(currentArea, 1, areas.length))
                  }
                  disabled={isTransitioning}
                  style={arrowStyle}
                >
                  {chevron("9 18 15 12 9 6")}
                </button>
              </div>
            </div>
          );
        }

        // Desktop navigation is the left-side vertical menu above; no bottom
        // row there.
        return null;
      })()}
    </div>
  );
}
