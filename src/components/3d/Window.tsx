import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { ROOM, WINDOW } = SCENE_CONFIG;

/**
 * Round "spaceship porthole" window in the right-wall cutout (opposite the
 * gallery). The circular hole through the wall and its reveal tunnel are built
 * in Ground.tsx; this component adds the flush mounting bezel, the raised
 * metallic rim, and the glass pane. No muntin bars / cross dividers — a clean
 * porthole.
 */
export function Window() {
  const r = WINDOW.RADIUS;
  const cy = WINDOW.CENTER_Y;
  const tube = WINDOW.FRAME_TUBE;
  const seg = WINDOW.SEGMENTS;
  const wallX = ROOM.HALF - ROOM.WALL_INSET; // interior wall face

  return (
    <group>
      {/* Flat mounting bezel — flush on the interior wall around the opening */}
      <mesh
        position={[wallX - 0.002, cy, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
      >
        <ringGeometry args={[r, r + tube * 1.6, seg]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Raised metallic rim ring straddling the opening edge */}
      <mesh
        position={[wallX - tube * 0.5, cy, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <torusGeometry args={[r, tube, 20, seg]} />
        <meshStandardMaterial
          color={WINDOW.FRAME_COLOR}
          metalness={WINDOW.FRAME_METALNESS}
          roughness={WINDOW.FRAME_ROUGHNESS}
        />
      </mesh>

      {/* Glass pane — alpha-blended, double-sided. depthWrite=false so it
          doesn't occlude the Stars behind it when the per-frame transparency
          sort flickers. */}
      <mesh position={[wallX, cy, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[r * 0.99, seg]} />
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
