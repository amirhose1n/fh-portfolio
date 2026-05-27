import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { ROOM, WINDOW } = SCENE_CONFIG;

/**
 * Window frame placed in the cutout on the right wall (opposite the gallery).
 * The wall cutout itself is created by 4 strips in Ground.tsx; this component
 * just renders the frame bars around the opening, slightly protruding into the
 * room interior so they catch light and cast shadows.
 */
export function Window() {
  const cw = WINDOW.CUTOUT_WIDTH;
  const ch = WINDOW.CUTOUT_HEIGHT;
  const cy = WINDOW.CUTOUT_CENTER_Y;
  const t = WINDOW.FRAME_THICKNESS;
  const d = WINDOW.FRAME_DEPTH;
  const wallX = ROOM.HALF - ROOM.WALL_INSET; // right wall position
  // Sit half-embedded in the wall, half protruding into the room
  const frameX = wallX - d / 2;

  const material = (
    <meshStandardMaterial
      color={WINDOW.FRAME_COLOR}
      metalness={WINDOW.FRAME_METALNESS}
      roughness={WINDOW.FRAME_ROUGHNESS}
    />
  );

  // Box dimensions are [x_depth, y_height, z_width] in world axes
  return (
    <group>
      {/* Top bar */}
      <mesh position={[frameX, cy + ch / 2 + t / 2, 0]} castShadow>
        <boxGeometry args={[d, t, cw + 2 * t]} />
        {material}
      </mesh>

      {/* Bottom bar */}
      <mesh position={[frameX, cy - ch / 2 - t / 2, 0]} castShadow>
        <boxGeometry args={[d, t, cw + 2 * t]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Left bar (-Z side) */}
      <mesh position={[frameX, cy, -(cw / 2 + t / 2)]} castShadow>
        <boxGeometry args={[d, ch, t]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Right bar (+Z side) */}
      <mesh position={[frameX, cy, cw / 2 + t / 2]} castShadow>
        <boxGeometry args={[d, ch, t]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Horizontal cross divider */}
      <mesh position={[frameX, cy, 0]} castShadow>
        <boxGeometry args={[d * 0.8, t * 0.6, cw]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Vertical cross divider */}
      <mesh position={[frameX, cy, 0]} castShadow>
        <boxGeometry args={[d * 0.8, ch, t * 0.6]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Glass pane — alpha-blended, double-sided. Symmetric visibility from
          both sides (no screen-space refraction quirks) and stays sharp.
          depthWrite=false so the glass doesn't occlude transparent objects
          behind it (Stars) when the per-frame transparency sort flickers. */}
      <mesh position={[wallX, cy, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[cw, ch]} />
        <meshStandardMaterial
          color="#cfd9e8"
          transparent
          opacity={0.18}
          roughness={0.08}
          metalness={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
