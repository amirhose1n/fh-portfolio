/**
 * Scene configuration constants
 * All positions derived from room geometry — no magic numbers.
 */

// ── Room geometry (foundation for everything else) ──────────────────
const ROOM_SIZE = 3;
const ROOM_HALF = ROOM_SIZE / 2; // 1.5
const ROOM_FLOOR_Y = -1;
const ROOM_CEILING_Y = ROOM_FLOOR_Y + ROOM_SIZE; // 2
const ROOM_CENTER_Y = (ROOM_FLOOR_Y + ROOM_CEILING_Y) / 2; // 0.5
const WALL_INSET = 0.01; // anti z-fighting offset
const WALL_THICKNESS = 0.06; // gap between interior and exterior shells

// ── Gallery frame grid ──────────────────────────────────────────────
const COLS = 4;
const ROWS = 2;
const GRID_WIDTH = 1.1;
const GRID_HEIGHT = 0.7;
const FRAME_BASE_SIZE = 0.2;

function buildFramePositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = -GRID_WIDTH / 2 + (col + 0.5) * (GRID_WIDTH / COLS);
      const y = GRID_HEIGHT / 2 - (row + 0.5) * (GRID_HEIGHT / ROWS);
      positions.push([x, y, 0]);
    }
  }
  return positions;
}

export const SCENE_CONFIG = {
  ROOM: {
    SIZE: ROOM_SIZE,
    HALF: ROOM_HALF,
    FLOOR_Y: ROOM_FLOOR_Y,
    CEILING_Y: ROOM_CEILING_Y,
    CENTER_Y: ROOM_CENTER_Y,
    WALL_INSET,
    WALL_THICKNESS,
  },
  CAMERA: {
    FOV: 60,
    BACKGROUND_COLOR: "#070710",
  },
  NEBULA: {
    RADIUS: 120, // must enclose the Stars cloud (drei Stars radius+depth)
    BASE_COLOR: "#070710", // deep-space fill, matches CAMERA.BACKGROUND_COLOR
    COLOR_A: "#2f3a6b", // muted blue-violet cloud (kept low to limit purple)
    COLOR_B: "#1f6f8c", // teal cloud — the dominant tint
    COLOR_C: "#5a2f6b", // faint purple, only in the very densest pockets
    SCALE: 4.0, // noise frequency — higher = smaller wisps (direction-sampled,
    INTENSITY: 0.35, // 0..1 cloud strength over the base color — keep it barely
    SPEED: 0.01, // drift speed — keep tiny so it's barely perceptible
  },
  LIGHTING: {
    CEILING_LAMP: {
      POSITION: [0, ROOM_CEILING_Y - 0.13, 0] as [number, number, number],
      INTENSITY: 6,
      COLOR: "#ffd7a8",
      DECAY: 1,
      DISTANCE: 6,
      SHADOW_MAP_SIZE: 2048,
    },
    CENTER_LIGHT: {
      POSITION: [0, ROOM_CENTER_Y, 0] as [number, number, number],
      COLOR: "#8a7f1f",
      INTENSITY: 2,
      DECAY: 1.5,
      DISTANCE: 10,
    },
    MOONLIGHT: {
      POSITION: [-4, ROOM_CEILING_Y + 3, 0] as [number, number, number],
      TARGET: [0, ROOM_CENTER_Y, 0] as [number, number, number],
      INTENSITY: 4,
      COLOR: "#b8c8e0",
      SHADOW_MAP_SIZE: 2048,
      SHADOW_BOUNDS: 3.5, // ortho half-extent — must enclose the whole cube
      SHADOW_NEAR: 0.5,
      SHADOW_FAR: 15,
    },
    // Cool rim/back light for the pet cat — sits behind + above it and aims
    // down at it, so it only kisses the cat's back, ears and tail with a bright
    // moonlit edge that separates the silhouette from the dark corner (most
    // visible when orbiting around the cat's back). Tight DISTANCE + decay keep
    // the spill off the rest of the room; narrow ANGLE keeps it on the cat.
    PET_RIM: {
      POSITION: [-0.55, 0.2, -0.4] as [number, number, number],
      TARGET: [-0.65, 0.1, 0.5] as [number, number, number],
      INTENSITY: 4,
      COLOR: "#cdd8ec",
      ANGLE: Math.PI,
      PENUMBRA: 0.9,
      DECAY: 2,
      DISTANCE: 2.6,
    },
  },
  AREAS: {
    OVERVIEW: {
      name: "Overview",
      position: [-2.42, 0.53, -4.34] as [number, number, number],
      target: [0, 0.3, 0] as [number, number, number],
      componentPosition: [1, ROOM_FLOOR_Y, -1] as [number, number, number],
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    },
    GALLERY: {
      name: "Gallery",
      position: [0, ROOM_CENTER_Y, 0] as [number, number, number],
      target: [-(ROOM_HALF - WALL_INSET), ROOM_CENTER_Y, 0] as [
        number,
        number,
        number,
      ],
      componentPosition: [0, 0, 0] as [number, number, number],
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    },
    PORTFOLIO: {
      name: "Portfolio",
      position: [0, ROOM_CENTER_Y, 0] as [number, number, number],
      target: [0.3, 0.3, 1.0] as [number, number, number],
      componentPosition: [0.3, ROOM_FLOOR_Y, 1] as [number, number, number],
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    },
    AVATAR: {
      name: "Avatar",
      position: [0, ROOM_CENTER_Y, 0] as [number, number, number],
      target: [1, 0.3, -1] as [number, number, number],
      componentPosition: [0, 0, 0] as [number, number, number],
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    },
    WINDOW: {
      name: "Window",
      // Pushed forward from room center toward the window for a slight zoom
      position: [0.55, ROOM_CENTER_Y, 0] as [number, number, number],
      target: [ROOM_HALF - WALL_INSET, ROOM_CENTER_Y, 0] as [
        number,
        number,
        number,
      ],
      componentPosition: [0, 0, 0] as [number, number, number],
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
    },
  },

  // Round "spaceship porthole" window on the right wall (opposite the gallery).
  // RADIUS drives the circular cutout, reveal tunnel, glass, and metallic rim.
  WINDOW: {
    RADIUS: 0.5,
    CENTER_Y: ROOM_CENTER_Y,
    SEGMENTS: 64,
    FRAME_TUBE: 0.045,
    FRAME_COLOR: "#9aa3ad",
    FRAME_METALNESS: 0.95,
    FRAME_ROUGHNESS: 0.28,
  },

  // Monitor model placement (within portfolio group)
  MONITOR: {
    POSITION: [0, 1.3, -0.1] as [number, number, number],
    // Uniform scale — the old [1,0.85,1] y-squash was tuned to the macbook and
    // would distort the new Models-v2 laptop.
    SCALE: [1, 1, 1] as [number, number, number],
    ROTATION: [-0.05, 0, 0] as [number, number, number],
  },
  LAPTOP_SCREEN: {
    POSITION: [-0.05, -0.235, -0.16] as [number, number, number],
    ROTATION: [-0.15, 0.3, 0.05] as [number, number, number],
    WIDTH: 0.48,
    HEIGHT: 0.3,
    PIXEL_WIDTH: 1280,
    PIXEL_HEIGHT: 800,
    ZOOM_DISTANCE: 0.42,
    HOVER_FRACTION: 0.22,
    HOVER_DURATION: 380,
    ZOOM_DURATION: 700,
    DEBUG_VISIBLE_BACKPLATE: true,
    DEBUG_BACKPLATE_COLOR: "#ff00aa",
  },

  // Gallery configuration
  GALLERY: {
    WALL_POSITION: [-(ROOM_HALF - WALL_INSET), ROOM_CENTER_Y, 0] as [
      number,
      number,
      number,
    ],
    WALL_ROTATION: [0, Math.PI / 2, 0] as [number, number, number],
    CAMERA_OFFSET: 0.4,
    FRAME: {
      BASE_SIZE: FRAME_BASE_SIZE,
      WIDTH_MULTIPLIER: 1.2,
      HEIGHT_MULTIPLIER: 1.5,
      DEPTH: 0.05,
      IMAGE_SCALE: 0.85,
      IMAGE_OFFSET: 0.03,
      COLORS: {
        DEFAULT: "#5c4a2f",
        HOVERED: "#b8941f",
      },
      MATERIAL: {
        METALNESS: 0.3,
        ROUGHNESS: 0.4,
      },
    },
    FRAME_POSITIONS: buildFramePositions(),
    IMAGES: [
      "/Images/Gallery/gallery1.webp",
      "/Images/Gallery/gallery2.jpg",
      "/Images/Gallery/gallery3.jpg",
      "/Images/Gallery/gallery4.jpg",
      "/Images/Gallery/gallery5.webp",
      "/Images/Gallery/gallery6.jpg",
      "/Images/Gallery/gallery7.jpg",
      "/Images/Gallery/gallery8.jpg",
    ],
  },

  // Model positions
  MODELS: {
    FH: {
      URL: "/Models/FH/Fh.glb",
      POSITION: [1, ROOM_FLOOR_Y, -1] as [number, number, number],
      ROTATION: [0, 0, 0] as [number, number, number],
    },
    SKATEBOARD: {
      URL: "/Models/Skateboard/Skateboard.glb",
      POSITION: [-1.3, -0.59, 1.2] as [number, number, number],
      ROTATION: [5.2, 6.1, 2.8] as [number, number, number],
      SCALE: [1, 1, 1] as [number, number, number],
    },
    FLOWERS: {
      URL: "/Models-v2/FlowerPot/flower-pot.glb",
      POSITION: [1.2, -1, 1.1] as [number, number, number],
      ROTATION: [0, Math.PI / 4, 0] as [number, number, number],
      SCALE: [4.5, 10, 4.5] as [number, number, number],
      ROTATION: [0, 1.5, 0] as [number, number, number],
    },
    COMPUTER: {
      // Models-v2 laptop. Center-pivot, native ~1.9×1.34×1.48 — scaled to a
      // ~0.53-wide laptop and lifted by half its height so the base rests on
      // the desk. NOTE: the interactive OS screen overlay (LAPTOP_SCREEN) was
      // tuned to the old macbook lid and needs re-calibrating to this model.
      URL: "/Models-v2/Laptop/laptop.glb",
      POSITION: [0, -0.256, 0] as [number, number, number],
      ROTATION: [0, 0.3, 0] as [number, number, number],
      SCALE: 0.28,
    },
    DESK: {
      // Models-v2 desk. Center-pivot, native ~1.9×0.86×0.85 — POSITION.y lifts
      // the base onto the floor.
      URL: "/Models-v2/Desk/desk.glb",
      POSITION: [0.3, 0.43, 0] as [number, number, number],
      SCALE: [1, 1, 1] as [number, number, number],
    },
    CHAIR: {
      // Models-v2 chair. Center-pivot, native ~1.9 tall — scaled to ~1.04 to
      // match the old chair, POSITION.y lifts the base onto the floor.
      URL: "/Models-v2/Chair/chair.glb",
      POSITION: [0.6, 0.52, 0.55] as [number, number, number],
      ROTATION: [0, Math.PI + 0.5, 0] as [number, number, number],
      SCALE: 0.55,
    },
    SPEAKER: {
      // Models-v2 speaker. Base-pivot, native ~0.32 tall — sits on the desk top.
      URL: "/Models-v2/Speaker/speaker.glb",
      POSITION: [-0.5, 0.86, -0.1] as [number, number, number],
      ROTATION: [0, 0.4, 0] as [number, number, number],
      SCALE: 0.6,
      AUDIO: {
        URL: "/musics/interstllar.mp3",
        // Inverse distance model — full volume near desk, falls off in other areas.
        DISTANCE: 0.5,
        VOLUME: 1.0,
      },
    },
    PET: {
      URL: "/Models/Pet/topol-idle/cat-idle.glb",
      POSITION: [-0.55, ROOM_FLOOR_Y + 1.07, 1] as [number, number, number],
      ROTATION: [0, Math.PI / 1.1, 0] as [number, number, number],
      SCALE: [0.008, 0.008, 0.008] as [number, number, number],
    },
    STARLINK: {
      URL: "/Models/Starlink/starlink.glb",
      // Centered on the exterior roof (base sits just above the ceiling plane)
      POSITION: [1, ROOM_CEILING_Y + 0.12, -1] as [number, number, number],
      ROTATION: [0, Math.PI / 1.2, 0] as [number, number, number],
      SCALE: [0.003, 0.003, 0.003] as [number, number, number],
    },
  },

  // Animation settings
  ANIMATION: {
    AREA_TRANSITION_DURATION: 1800,
    GALLERY_ZOOM_DURATION: 600,
    EASING_POWER: 3,
  },

  // Debug mode
  DEBUG: {
    ENABLED: false,
    BOX_SIZE: 0.2,
    TARGET_BOX_SIZE: 0.1,
    // Set to false to hide the room walls, ceiling, and exterior shell (the
    // floor stays) — handy for inspecting the interior and model placement.
    SHOW_WALLS: true,
  },
} as const;
