import { Box, OrbitControls, Stars, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../constants/scene";
import { useCameraAnimation } from "../hooks/useCameraAnimation";
import { AudioCtx, useAudio } from "../hooks/useAudio";
import type { Area } from "../types/3d";

const RESUME_PDF = "/files/amirhosein-farhoodi.docx.pdf";
import { Gallery, Ground, LaptopScreen, Model, SpeakerAudio, Window } from "./3d";
import type { GalleryHandle } from "./3d/Gallery";
import type { LaptopScreenHandle } from "./3d/LaptopScreen";

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
const INTRO_START_POSITION: [number, number, number] = [0, 22, -20];
const INTRO_START_TARGET: [number, number, number] = [0, 0, 0];
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
    if (!laptopScreenRef.current || !cameraRef.current || !controlsRef.current) {
      return null;
    }
    const screenPos = laptopScreenRef.current.getWorldPosition();
    const screenNormal = laptopScreenRef.current.getWorldNormal();
    if (!screenPos || !screenNormal) return null;

    const fullZoomPos = screenPos
      .clone()
      .add(screenNormal.clone().multiplyScalar(LAPTOP_SCREEN.ZOOM_DISTANCE));

    const basePos = laptopBaseRef.current?.position ?? cameraRef.current.position;
    const baseTarget = laptopBaseRef.current?.target ?? controlsRef.current.target;

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

  const handleLaptopActivate = () => {
    if (laptopActive) return;
    if (areas[currentArea]?.name !== AREAS.PORTFOLIO.name) return;
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

  // Handle gallery frame activate / deactivate
  const handleFrameActivate = (
    worldPos: [number, number, number] | null,
    zoomPos: [number, number, number] | null,
  ) => {
    if (!cameraRef.current || !controlsRef.current) return;

    cancelAnimation();

    if (worldPos && zoomPos) {
      // Save gallery view position on first zoom
      if (!galleryBaseRef.current) {
        galleryBaseRef.current = {
          position: cameraRef.current.position.clone(),
          target: controlsRef.current.target.clone(),
        };
      }
      // Zoom to frame
      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        [zoomPos[0], worldPos[1], zoomPos[2]],
        worldPos,
        {
          duration: ANIMATION.GALLERY_ZOOM_DURATION,
          easingPower: ANIMATION.EASING_POWER,
        },
      );
    } else if (galleryBaseRef.current) {
      // Zoom back to gallery view
      const base = galleryBaseRef.current;
      galleryBaseRef.current = null;
      animateCamera(
        { camera: cameraRef.current, controls: controlsRef.current },
        base.position.toArray() as [number, number, number],
        base.target.toArray() as [number, number, number],
        {
          duration: ANIMATION.GALLERY_ZOOM_DURATION,
          easingPower: ANIMATION.EASING_POWER,
        },
      );
    }
  };

  // Move to a specific area
  const moveToArea = (areaIndex: number) => {
    if (isTransitioning || areaIndex === currentArea) return;

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
      <Canvas
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
          <pointLight
            intensity={LIGHTING.CEILING_LAMP.INTENSITY}
            color={LIGHTING.CEILING_LAMP.COLOR}
            decay={LIGHTING.CEILING_LAMP.DECAY}
            castShadow
            distance={LIGHTING.CEILING_LAMP.DISTANCE}
            shadow-mapSize-width={LIGHTING.CEILING_LAMP.SHADOW_MAP_SIZE}
            shadow-mapSize-height={LIGHTING.CEILING_LAMP.SHADOW_MAP_SIZE}
            shadow-camera-far={LIGHTING.CEILING_LAMP.DISTANCE}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
          {DEBUG.ENABLED && (
            <mesh>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial color={LIGHTING.CEILING_LAMP.COLOR} />
            </mesh>
          )}
        </group>

        {/* Moonlight — soft cool light on layer 1 only (rooftop + Starlink).
            Target is added as a child via attach="target" so its matrixWorld
            updates and the light actually aims at it (otherwise the light
            silently reverts to aiming at world origin). */}
        <directionalLight
          position={LIGHTING.MOONLIGHT.POSITION}
          intensity={LIGHTING.MOONLIGHT.INTENSITY}
          color={LIGHTING.MOONLIGHT.COLOR}
          onUpdate={(self) => self.layers.set(1)}
        >
          <object3D attach="target" position={LIGHTING.MOONLIGHT.TARGET} />
        </directionalLight>

        {/* Sky scatter on layer 1 only — moonlit-night atmosphere fill so the
            shadowed faces of the exterior shell don't read as solid black.
            Both `ref` and `onUpdate` set the layer to guarantee the constraint
            applies from frame zero (some three.js builds need both). */}
        <hemisphereLight
          args={["#b8c8e0", "#1a1a25", 1.2]}
          ref={(self) => {
            if (self) self.layers.set(1);
          }}
          onUpdate={(self) => self.layers.set(1)}
        />

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
              moveToArea(areas.findIndex((a) => a.name === AREAS.GALLERY.name))
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
          <Model
            url={MODELS.FH.URL}
            position={AREAS.OVERVIEW.componentPosition}
            rotation={MODELS.FH.ROTATION}
          />

          {/* Skateboard Model */}
          <Model
            url={MODELS.SKATEBOARD.URL}
            position={MODELS.SKATEBOARD.POSITION}
            rotation={MODELS.SKATEBOARD.ROTATION}
            scale={MODELS.SKATEBOARD.SCALE}
          />

          {/* Starlink dish on the roof — exclusive to layer 1 (moonlight only) */}
          <Model
            url={MODELS.STARLINK.URL}
            position={MODELS.STARLINK.POSITION}
            rotation={MODELS.STARLINK.ROTATION}
            scale={MODELS.STARLINK.SCALE}
            layer={1}
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
              <Model
                url={MODELS.SPEAKER.URL}
                scale={MODELS.SPEAKER.SCALE}
              />
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
            background: audioOn
              ? "rgba(184, 200, 224, 0.18)"
              : "rgba(0, 0, 0, 0.5)",
            border: audioOn
              ? "1px solid rgba(184, 200, 224, 0.6)"
              : "1px solid rgba(255, 255, 255, 0.15)",
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
          {freeMode ? "EXIT FREE MODE" : "FREE MODE"}
        </button>
      </div>

      {/* Area indicator (hidden during free mode) */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          fontSize: "18px",
          fontWeight: "500",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.5)",
          padding: "8px 8px",
          borderRadius: "20px",
          backdropFilter: "blur(10px)",
          opacity: introPhase === "ready" && !freeMode ? 1 : 0,
          transition: "opacity 500ms ease-in",
          pointerEvents: introPhase === "ready" && !freeMode ? "auto" : "none",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <button
          type="button"
          aria-label="Previous area"
          onClick={() =>
            moveToArea(nextAreaIndex(currentArea, -1, areas.length))
          }
          disabled={isTransitioning}
          style={{
            all: "unset",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isTransitioning ? "default" : "pointer",
            opacity: isTransitioning ? 0.4 : 1,
            transition: "background 120ms, opacity 200ms",
            fontSize: 18,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            if (!isTransitioning)
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          ‹
        </button>
        <span style={{ padding: "0 12px" }}>
          {areas[currentArea].name} ({currentArea + 1}/{areas.length})
        </span>
        <button
          type="button"
          aria-label="Next area"
          onClick={() =>
            moveToArea(nextAreaIndex(currentArea, 1, areas.length))
          }
          disabled={isTransitioning}
          style={{
            all: "unset",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isTransitioning ? "default" : "pointer",
            opacity: isTransitioning ? 0.4 : 1,
            transition: "background 120ms, opacity 200ms",
            fontSize: 18,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            if (!isTransitioning)
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          ›
        </button>
      </div>
    </div>
  );
}
