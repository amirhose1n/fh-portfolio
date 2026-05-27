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
  LIGHTING: {
    CEILING_LAMP: {
      POSITION: [0, ROOM_CEILING_Y - 0.25, 0] as [number, number, number],
      INTENSITY: 6,
      COLOR: "#FFF8DC",
      DECAY: 2,
      DISTANCE: 10,
      SHADOW_MAP_SIZE: 2048,
    },
    MOONLIGHT: {
      // Cool moonlight above the rooftop — lights exterior shell + Starlink
      POSITION: [2, ROOM_CEILING_Y + 2, 2] as [number, number, number],
      TARGET: [1.5, ROOM_CEILING_Y, 1.5] as [number, number, number],
      INTENSITY: 3,
      COLOR: "#b8c8e0",
    },
  },
  AREAS: {
    OVERVIEW: {
      name: "Overview",
      position: [0, 2.2, -2] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      componentPosition: [1, ROOM_FLOOR_Y, -1] as [number, number, number],
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

  // Window on the right wall (opposite the gallery) — cutout + frame styling
  WINDOW: {
    CUTOUT_WIDTH: 0.9,
    CUTOUT_HEIGHT: 1.0,
    CUTOUT_CENTER_Y: ROOM_CENTER_Y,
    FRAME_THICKNESS: 0.05,
    FRAME_DEPTH: 0.04,
    FRAME_COLOR: "#5c4a2f",
    FRAME_METALNESS: 0.3,
    FRAME_ROUGHNESS: 0.5,
  },

  // Monitor model placement (within portfolio group)
  MONITOR: {
    POSITION: [0, 1.3, -0.1] as [number, number, number],
    SCALE: [1, 0.85, 1] as [number, number, number],
    ROTATION: [-0.05, 0, 0] as [number, number, number],
  },
  LAPTOP_SCREEN: {
    POSITION: [-0.056, -0.38, -0.178] as [number, number, number],
    ROTATION: [-0.26, 0.29, 0.08] as [number, number, number],
    WIDTH: 0.51,
    HEIGHT: 0.31,
    PIXEL_WIDTH: 1280,
    PIXEL_HEIGHT: 800,
    ZOOM_DISTANCE: 0.42,
    HOVER_FRACTION: 0.22,
    HOVER_DURATION: 380,
    ZOOM_DURATION: 700,
    DEBUG_VISIBLE_BACKPLATE: false,
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
    COMPUTER: {
      URL: "/Models/Computer/macbook.glb",
      POSITION: [0, -0.555, 0] as [number, number, number],
      ROTATION: [0, 0.3, 0] as [number, number, number],
      // FBX exports default to cm — 0.01 brings it into the room's metre-scale.
      SCALE: 0.12,
    },
    ACTION: {
      URL: "/Models/Actions/Action1.glb",
      POSITION: [-0.7, 0.82, 0.1] as [number, number, number],
      ROTATION: [0, 0, 0] as [number, number, number],
      SCALE: [0.1, 0.1, 0.1] as [number, number, number],
    },
    DESK: {
      URL: "/Models/Desk/computer_desk.glb",
      POSITION: [0.3, 0, 0] as [number, number, number],
      SCALE: [1.1, 1.1, 1.1] as [number, number, number],
    },
    CHAIR: {
      URL: "/Models/Chair/chair.fbx",
      // Sits in front of the desk on the viewer side of the portfolio group.
      POSITION: [0.6, 0, 0.55] as [number, number, number],
      ROTATION: [0, Math.PI - 1, 0] as [number, number, number],
      SCALE: 0.04,
    },
    SPEAKER: {
      URL: "/Models/Speaker/speaker.fbx",
      // Sits on the desktop, to the side of the monitor.
      POSITION: [-0.5, 0.81, -0.1] as [number, number, number],
      ROTATION: [0, 0.4, 0] as [number, number, number],
      SCALE: 0.0005,
      AUDIO: {
        URL: "/musics/interstllar.mp3",
        // Inverse distance model — full volume near desk, falls off in other areas.
        DISTANCE: 0.5,
        VOLUME: 1.0,
      },
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
  },
} as const;
