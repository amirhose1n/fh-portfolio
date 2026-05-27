import { useLoader } from "@react-three/fiber";
import { forwardRef, useRef } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../../constants/scene";

const { SIZE, HALF, FLOOR_Y, CEILING_Y, CENTER_Y, WALL_INSET, WALL_THICKNESS } =
  SCENE_CONFIG.ROOM;
const WINDOW = SCENE_CONFIG.WINDOW;

// Forwarded ref points at the top-level group that owns every wall, floor,
// and ceiling mesh. <Html occlude={[ref]}> raycasts recursively against this
// subtree so the laptop screen vanishes when a wall sits between camera and
// screen — without false-positives from the macbook lid (not under here).
export const Ground = forwardRef<THREE.Group>(function Ground(_, ref) {
  const groundRef = useRef<THREE.Mesh>(null);

  // Black painted MDF planks — diffuse-only (no normal / metalness /
  // roughness maps), so metalness/roughness are constants on the material.
  const floorMap = useLoader(
    THREE.TextureLoader,
    "/textures/ground/MDF/black_painted_planks_diff_4k.jpg",
  );
  floorMap.colorSpace = THREE.SRGBColorSpace;

  // Interior wall textures (unchanged from original)
  const [wallMap, wallNormalMap, wallMetalnessMap, wallRoughnessMap] =
    useLoader(THREE.TextureLoader, [
      "/textures/wall/Poliigon_PlasticMoldWorn_7486_BaseColor.jpg",
      "/textures/wall/Poliigon_PlasticMoldWorn_7486_Normal.png",
      "/textures/wall/Poliigon_PlasticMoldWorn_7486_Metallic.jpg",
      "/textures/wall/Poliigon_PlasticMoldWorn_7486_Roughness.jpg",
    ]);

  // Exterior wall texture (wallOutside). Only color + normal from the
  // DirtWindowStains005 set are wired; gloss/refl maps are skipped.
  const [outerMap, outerNormalMap] = useLoader(THREE.TextureLoader, [
    "/textures/wallOutside/DirtWindowStains005_COL_2K.jpg",
    "/textures/wallOutside/DirtWindowStains005_NRM_2K.jpg",
  ]);

  // Configure ground texture properties
  floorMap.wrapS = THREE.RepeatWrapping;
  floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(4, 4);
  // Anisotropic filtering — floors viewed at oblique angles need this to
  // stay sharp into the distance. 16 is the GPU max on basically anything
  // modern; three.js clamps automatically on weaker hardware.
  floorMap.anisotropy = 16;

  // Configure wall texture properties
  [wallMap, wallNormalMap, wallMetalnessMap, wallRoughnessMap].forEach(
    (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
    },
  );

  // Configure outer wall texture properties
  [outerMap, outerNormalMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
  });

  // ── Geometry constants ────────────────────────────────────────────
  const wallInset = HALF - WALL_INSET; // 1.49 — interior face of walls
  const t = WALL_THICKNESS; // 0.06
  const ext = HALF + t; // 1.56 — exterior cube boundary in X/Z
  const cubeY0 = FLOOR_Y - t; // -1.06 — cube bottom (Y)
  const cubeY1 = CEILING_Y + t; // +2.06 — cube top (Y)
  const cubeSize = 2 * ext; // 3.12 — exterior cube horizontal extent
  const revealSpan = ext - wallInset; // 0.07 — wall slab depth (incl. inset)
  const revealCenterX = (wallInset + ext) / 2; // midpoint of wall slab in X

  const innerMatProps = {
    map: wallMap,
    normalMap: wallNormalMap,
    metalnessMap: wallMetalnessMap,
    roughnessMap: wallRoughnessMap,
    metalness: 0,
    roughness: 1,
  };

  const outerMatProps = {
    map: outerMap,
    normalMap: outerNormalMap,
    color: "#d8d0c4",
    roughness: 0.85,
  };

  // Slab-edge bands + window cutout reveal use a solid dark material (no
  // map) so the visible wall/slab thickness reads as a flat dark band
  // rather than a textured surface that looks washed-out or transparent.
  const thicknessMatProps = {
    color: "#0a0a0c",
    roughness: 1,
    metalness: 0,
  };

  const setLayer1 = (self: THREE.Object3D) => self.layers.set(1);

  return (
    <group ref={ref}>
      {/* ── INTERIOR (layer 0, unchanged textures) ───────────────── */}

      {/* Black painted MDF plank floor (interior, visible from above) */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial
          map={floorMap}
          metalness={0.05}
          roughness={0.75}
        />
      </mesh>

      {/* Back wall (interior) */}
      <mesh position={[0, CENTER_Y, -wallInset]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial {...innerMatProps} />
      </mesh>

      {/* Left wall — gallery side (interior) */}
      <mesh
        position={[-wallInset, CENTER_Y, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial {...innerMatProps} />
      </mesh>

      {/* Right wall — split into 4 strips around the window cutout */}
      {(() => {
        const cw = WINDOW.CUTOUT_WIDTH;
        const ch = WINDOW.CUTOUT_HEIGHT;
        const cy = WINDOW.CUTOUT_CENTER_Y;
        const topH = CEILING_Y - (cy + ch / 2);
        const topCenterY = CEILING_Y - topH / 2;
        const bottomH = cy - ch / 2 - FLOOR_Y;
        const bottomCenterY = FLOOR_Y + bottomH / 2;
        const sideW = (SIZE - cw) / 2;
        const nearZ = -(HALF - sideW / 2);
        const farZ = HALF - sideW / 2;
        const rot: [number, number, number] = [0, -Math.PI / 2, 0];
        return (
          <>
            <mesh
              position={[wallInset, topCenterY, 0]}
              rotation={rot}
              receiveShadow
            >
              <planeGeometry args={[SIZE, topH]} />
              <meshStandardMaterial {...innerMatProps} />
            </mesh>
            <mesh
              position={[wallInset, bottomCenterY, 0]}
              rotation={rot}
              receiveShadow
            >
              <planeGeometry args={[SIZE, bottomH]} />
              <meshStandardMaterial {...innerMatProps} />
            </mesh>
            <mesh
              position={[wallInset, cy, nearZ]}
              rotation={rot}
              receiveShadow
            >
              <planeGeometry args={[sideW, ch]} />
              <meshStandardMaterial {...innerMatProps} />
            </mesh>
            <mesh position={[wallInset, cy, farZ]} rotation={rot} receiveShadow>
              <planeGeometry args={[sideW, ch]} />
              <meshStandardMaterial {...innerMatProps} />
            </mesh>

            {/* Window cutout reveal — 4 strips spanning the wall slab depth.
                Uses interior wall texture so the cutout wraps into a doorway
                reveal. */}
            <mesh
              position={[revealCenterX, cy + ch / 2, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[revealSpan, cw]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            <mesh
              position={[revealCenterX, cy - ch / 2, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[revealSpan, cw]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            <mesh position={[revealCenterX, cy, -cw / 2]} rotation={[0, 0, 0]}>
              <planeGeometry args={[revealSpan, ch]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            <mesh
              position={[revealCenterX, cy, cw / 2]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[revealSpan, ch]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
          </>
        );
      })()}

      {/* Front wall (interior) */}
      <mesh
        position={[0, CENTER_Y, wallInset]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial {...innerMatProps} />
      </mesh>

      {/* Ceiling (interior, visible from below) */}
      <mesh
        position={[0, CEILING_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial {...innerMatProps} />
      </mesh>

      {/* ── EXTERIOR (layer 1) ───────────────────────────────────
          Cube exterior split into three vertical bands:
          1. Floor slab side band (cubeY0 → FLOOR_Y) — thickness strip
          2. Wall band (FLOOR_Y → CEILING_Y) — main exterior face
          3. Roof slab side band (CEILING_Y → cubeY1) — thickness strip
          + Underside and roof faces (full cube footprint).
          BACK exterior face omitted so Overview can see through. */}

      {/* Exterior underside (visible only from below) */}
      <mesh
        position={[0, cubeY0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, cubeSize]} />
        <meshStandardMaterial {...outerMatProps} />
      </mesh>

      {/* Exterior roof (visible only from above — Starlink mount surface) */}
      <mesh
        position={[0, cubeY1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, cubeSize]} />
        <meshStandardMaterial {...outerMatProps} />
      </mesh>

      {/* ── Front side (faces +Z) ── */}
      {/* Floor slab side band */}
      <mesh
        position={[0, (cubeY0 + FLOOR_Y) / 2, ext]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>
      {/* Wall band */}
      <mesh position={[0, CENTER_Y, ext]} receiveShadow onUpdate={setLayer1}>
        <planeGeometry args={[cubeSize, SIZE]} />
        <meshStandardMaterial {...outerMatProps} />
      </mesh>
      {/* Roof slab side band */}
      <mesh
        position={[0, (CEILING_Y + cubeY1) / 2, ext]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>

      {/* ── Left side (faces -X) ── */}
      {/* Floor slab side band */}
      <mesh
        position={[-ext, (cubeY0 + FLOOR_Y) / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>
      {/* Wall band */}
      <mesh
        position={[-ext, CENTER_Y, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, SIZE]} />
        <meshStandardMaterial {...outerMatProps} />
      </mesh>
      {/* Roof slab side band */}
      <mesh
        position={[-ext, (CEILING_Y + cubeY1) / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>

      {/* ── Right side (faces +X, with window cutout) ── */}
      {/* Floor slab side band (continuous, below window) */}
      <mesh
        position={[ext, (cubeY0 + FLOOR_Y) / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>
      {/* Roof slab side band (continuous, above window) */}
      <mesh
        position={[ext, (CEILING_Y + cubeY1) / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <planeGeometry args={[cubeSize, t]} />
        <meshStandardMaterial {...thicknessMatProps} />
      </mesh>
      {/* Wall band — 4 strips around the cutout */}
      {(() => {
        const cw = WINDOW.CUTOUT_WIDTH;
        const ch = WINDOW.CUTOUT_HEIGHT;
        const cy = WINDOW.CUTOUT_CENTER_Y;
        const topH = CEILING_Y - (cy + ch / 2);
        const topCenterY = CEILING_Y - topH / 2;
        const bottomH = cy - ch / 2 - FLOOR_Y;
        const bottomCenterY = FLOOR_Y + bottomH / 2;
        const sideW = (cubeSize - cw) / 2;
        const nearZ = -(ext - sideW / 2);
        const farZ = ext - sideW / 2;
        const rot: [number, number, number] = [0, Math.PI / 2, 0];
        return (
          <>
            <mesh
              position={[ext, topCenterY, 0]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[cubeSize, topH]} />
              <meshStandardMaterial {...outerMatProps} />
            </mesh>
            <mesh
              position={[ext, bottomCenterY, 0]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[cubeSize, bottomH]} />
              <meshStandardMaterial {...outerMatProps} />
            </mesh>
            <mesh
              position={[ext, cy, nearZ]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[sideW, ch]} />
              <meshStandardMaterial {...outerMatProps} />
            </mesh>
            <mesh
              position={[ext, cy, farZ]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[sideW, ch]} />
              <meshStandardMaterial {...outerMatProps} />
            </mesh>
          </>
        );
      })()}

      {/* ── Back-opening framing (faces -Z) ──────────────────────
          The back exterior face is intentionally omitted so the Overview
          camera can see into the room. Without geometry around the
          opening, the wall/slab thickness is invisible from that angle.
          These 4 strips frame the opening at z=-ext, revealing the wall
          slab depth around the central see-through area (which stays
          open from x=-wallInset to +wallInset, y=FLOOR_Y to CEILING_Y). */}
      {(() => {
        const rot: [number, number, number] = [0, Math.PI, 0];
        // Top frame — roof slab back edge
        return (
          <>
            <mesh
              position={[0, (CEILING_Y + cubeY1) / 2, -ext]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[cubeSize, t]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Bottom frame — floor slab back edge */}
            <mesh
              position={[0, (cubeY0 + FLOOR_Y) / 2, -ext]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[cubeSize, t]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Left frame — left wall slab back edge */}
            <mesh
              position={[-(ext + wallInset) / 2, CENTER_Y, -ext]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[revealSpan, SIZE]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Right frame — right wall slab back edge */}
            <mesh
              position={[(ext + wallInset) / 2, CENTER_Y, -ext]}
              rotation={rot}
              receiveShadow
              onUpdate={setLayer1}
            >
              <planeGeometry args={[revealSpan, SIZE]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
          </>
        );
      })()}
    </group>
  );
});
