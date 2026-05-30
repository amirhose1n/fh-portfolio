import { useLoader } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../../constants/scene";

// A rectangular wall plane (centered at origin) with a circular hole punched
// through its center. ShapeGeometry seeds UVs from raw vertex positions, so we
// remap them to 0..1 across the bounding box — that way the wall texture tiles
// exactly like the surrounding plane-geometry walls.
function makeHoledWall(
  width: number,
  height: number,
  radius: number,
  segments: number,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.lineTo(-width / 2, -height / 2);

  const hole = new THREE.Path();
  hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ShapeGeometry(shape, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

const { SIZE, HALF, FLOOR_Y, CEILING_Y, CENTER_Y, WALL_INSET, WALL_THICKNESS } =
  SCENE_CONFIG.ROOM;
const WINDOW = SCENE_CONFIG.WINDOW;
const { SHOW_WALLS } = SCENE_CONFIG.DEBUG;

// Forwarded ref points at the top-level group that owns every wall, floor,
// and ceiling mesh. <Html occlude={[ref]}> raycasts recursively against this
// subtree so the laptop screen vanishes when a wall sits between camera and
// screen — without false-positives from the macbook lid (not under here).
export const Ground = forwardRef<THREE.Group>(function Ground(_, ref) {
  const groundRef = useRef<THREE.Mesh>(null);
  const rootRef = useRef<THREE.Group | null>(null);

  // Merge the forwarded ref with a local one so we can traverse the shell.
  const setRootRef = (g: THREE.Group | null) => {
    rootRef.current = g;
    if (typeof ref === "function") ref(g);
    else if (ref) ref.current = g;
  };

  // Every shell mesh casts shadows so the exterior moonlight is physically
  // occluded from the interior (the walls/ceiling block it like real walls),
  // and the lamp's shadows land on the walls. receiveShadow is left as authored
  // per mesh.
  useEffect(() => {
    rootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) obj.castShadow = true;
    });
  }, []);

  // Black painted MDF planks — diffuse-only (no normal / metalness /
  // roughness maps), so metalness/roughness are constants on the material.
  const floorMap = useLoader(
    THREE.TextureLoader,
    "/textures/ground/MDF/black_painted_planks_diff_4k.jpg",
  );
  floorMap.colorSpace = THREE.SRGBColorSpace;

  // Interior walls are a flat warm-grey colour now (see innerMatProps) — no
  // texture maps, matching the smooth plaster look of the design reference.

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

  // Right-wall planes carrying the round porthole cutout (interior + exterior).
  const interiorWallGeo = useMemo(
    () => makeHoledWall(SIZE, SIZE, WINDOW.RADIUS, WINDOW.SEGMENTS),
    [],
  );
  const exteriorWallGeo = useMemo(
    () => makeHoledWall(cubeSize, SIZE, WINDOW.RADIUS, WINDOW.SEGMENTS),
    [cubeSize],
  );

  // Smooth matte warm-grey plaster to match the reference interior. No maps —
  // the only variation comes from the warm lighting gradient across the walls.
  const innerMatProps = {
    color: "#857b70",
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
    <group ref={setRootRef}>
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

      {/* Walls, ceiling, and exterior shell — hidden when DEBUG.SHOW_WALLS is
          false so the interior / model placement can be inspected. The floor
          above always stays visible. */}
      {SHOW_WALLS && (
        <>
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

      {/* Right wall (interior) — single plane with a round porthole cutout */}
      <mesh
        geometry={interiorWallGeo}
        position={[wallInset, CENTER_Y, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial {...innerMatProps} />
      </mesh>

      {/* Porthole reveal — open cylinder spanning the wall slab depth so the
          cutout reads as a tunnel through the wall thickness. */}
      <mesh
        position={[revealCenterX, WINDOW.CENTER_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry
          args={[
            WINDOW.RADIUS,
            WINDOW.RADIUS,
            revealSpan,
            WINDOW.SEGMENTS,
            1,
            true,
          ]}
        />
        <meshStandardMaterial {...thicknessMatProps} side={THREE.DoubleSide} />
      </mesh>

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

      {/* ── Wall trim lines ──────────────────────────────────────
          Thin slightly-lit-black strips hugging the bottom (baseboard) and
          top (crown) edge of every interior wall — the dark accent lines from
          the design reference. Each strip protrudes a hair into the room so
          the ceiling lamp catches it as a crisp horizontal line framing the
          walls. Built as 8 boxes: 4 walls × 2 edges. The right wall's window
          sits at CENTER_Y (well clear of both edges), so the lines run full
          width without intersecting the porthole. */}
      {(() => {
        const { COLOR, HEIGHT: th, PROTRUSION: pr } = SCENE_CONFIG.WALL_TRIM;
        const inner = wallInset; // interior wall face (±1.49)
        const strips: {
          pos: [number, number, number];
          args: [number, number, number];
        }[] = [];
        // Baseboard sits on the floor, crown tucks under the ceiling.
        for (const y of [FLOOR_Y + th / 2, CEILING_Y - th / 2]) {
          // Back & front walls run along X; left & right run along Z. Each box
          // is offset by pr/2 so its back face is flush with the wall and it
          // protrudes `pr` into the room.
          strips.push({ pos: [0, y, -inner + pr / 2], args: [SIZE, th, pr] });
          strips.push({ pos: [0, y, inner - pr / 2], args: [SIZE, th, pr] });
          strips.push({ pos: [-inner + pr / 2, y, 0], args: [pr, th, SIZE] });
          strips.push({ pos: [inner - pr / 2, y, 0], args: [pr, th, SIZE] });
        }
        return strips.map((s, i) => (
          <mesh key={i} position={s.pos} receiveShadow>
            <boxGeometry args={s.args} />
            <meshStandardMaterial color={COLOR} roughness={1} metalness={0} />
          </mesh>
        ));
      })()}

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
      {/* Wall band (exterior) — single plane with the matching porthole cutout */}
      <mesh
        geometry={exteriorWallGeo}
        position={[ext, CENTER_Y, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        onUpdate={setLayer1}
      >
        <meshStandardMaterial {...outerMatProps} />
      </mesh>

      {/* ── Back-opening framing (faces -Z) ──────────────────────
          The back exterior face is intentionally omitted so the Overview
          camera can see into the room. Without geometry around the
          opening, the wall/slab thickness is invisible from that angle.
          These 4 strips frame the opening at z=-ext, revealing the wall
          slab depth around the central see-through area (which stays
          open from x=-wallInset to +wallInset, y=FLOOR_Y to CEILING_Y). */}
      {(() => {
        // Solid slab boxes around the open back. These used to be flat planes
        // at z=-ext (capping only the BACK face of the slab), which left the
        // slab DEPTH uncapped — at grazing angles (the bottom and left edges
        // especially) the sightline slipped past the interior wall edge to the
        // background behind the cube, showing as a bright sliver between the
        // wall and the black frame. Giving each frame piece real depth (a box
        // spanning the full wall thickness) makes the opening a solid dark
        // reveal that can't leak from any viewing angle.
        const zc = -(wallInset + ext) / 2; // mid-depth of the slab
        const depth = revealSpan; // wall thickness (incl. inset)
        return (
          <>
            {/* Top — roof slab */}
            <mesh
              position={[0, (CEILING_Y + cubeY1) / 2, zc]}
              receiveShadow
              onUpdate={setLayer1}
            >
              <boxGeometry args={[cubeSize, t, depth]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Bottom — floor slab */}
            <mesh
              position={[0, (cubeY0 + FLOOR_Y) / 2, zc]}
              receiveShadow
              onUpdate={setLayer1}
            >
              <boxGeometry args={[cubeSize, t, depth]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Left — left wall slab */}
            <mesh
              position={[-(ext + wallInset) / 2, CENTER_Y, zc]}
              receiveShadow
              onUpdate={setLayer1}
            >
              <boxGeometry args={[revealSpan, SIZE, depth]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
            {/* Right — right wall slab */}
            <mesh
              position={[(ext + wallInset) / 2, CENTER_Y, zc]}
              receiveShadow
              onUpdate={setLayer1}
            >
              <boxGeometry args={[revealSpan, SIZE, depth]} />
              <meshStandardMaterial {...thicknessMatProps} />
            </mesh>
          </>
        );
      })()}
        </>
      )}
    </group>
  );
});
