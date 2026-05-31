import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { SCENE_CONFIG } from "../../../constants/scene";

// RectAreaLight needs its BRDF lookup textures initialised once before it
// renders correctly (otherwise it lights nothing). Safe to call at module load.
RectAreaLightUniformsLib.init();

const { MONITOR_GLOW, DESK_RGB } = SCENE_CONFIG.LIGHTING;

/**
 * Cool blue screen-glow off the laptop. A RectAreaLight sits just in front of
 * the display and is aimed back into the room so it lights the desk, chair and
 * the user's seat with a soft cinematic monitor light. RectAreaLight can't be
 * oriented by a `rotation` prop the way a spotlight target works, so we point
 * it with `lookAt` once mounted.
 */
export function MonitorGlow() {
  const ref = useRef<THREE.RectAreaLight>(null);

  useEffect(() => {
    ref.current?.lookAt(new THREE.Vector3(...MONITOR_GLOW.TARGET));
  }, []);

  return (
    <rectAreaLight
      ref={ref}
      position={MONITOR_GLOW.POSITION}
      color={MONITOR_GLOW.COLOR}
      intensity={MONITOR_GLOW.INTENSITY}
      width={MONITOR_GLOW.WIDTH}
      height={MONITOR_GLOW.HEIGHT}
    />
  );
}

/**
 * Hidden RGB LED strip behind the desk — three emissive bars (blue, purple,
 * cyan) each paired with a coloured point light that washes the wall behind
 * the desk, adding depth and a cyber glow. The bars themselves are unlit
 * emissive (toneMapped off) so they read as the actual LEDs.
 */
export function DeskRgbStrip() {
  return (
    <group>
      {DESK_RGB.SEGMENTS.map((s) => (
        <group key={s.color} position={[s.x, DESK_RGB.Y, DESK_RGB.Z]}>
          <mesh>
            <boxGeometry args={DESK_RGB.SEGMENT} />
            <meshStandardMaterial
              color="#000000"
              emissive={s.color}
              emissiveIntensity={DESK_RGB.EMISSIVE_INTENSITY}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color={s.color}
            intensity={DESK_RGB.LIGHT.INTENSITY}
            distance={DESK_RGB.LIGHT.DISTANCE}
            decay={DESK_RGB.LIGHT.DECAY}
          />
        </group>
      ))}
    </group>
  );
}
