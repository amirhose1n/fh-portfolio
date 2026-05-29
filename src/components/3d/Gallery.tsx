import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { GALLERY } = SCENE_CONFIG;

// ── PhotoFrame ──────────────────────────────────────────────────────

interface PhotoFrameProps {
  imageUrl: string;
  position: [number, number, number];
  size: number;
  interactive: boolean;
  onActivate: () => void;
  onHoverChange: (hovered: boolean) => void;
}

function PhotoFrame({
  imageUrl,
  position,
  size,
  interactive,
  onActivate,
  onHoverChange,
}: PhotoFrameProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);
  // Debounce hover visual to prevent flashing during camera animations
  const hoverIntent = useRef(false);
  const hoverDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (tex) => {
      tex.flipY = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      setTexture(tex);
    });
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (hoverDebounceRef.current !== null) clearTimeout(hoverDebounceRef.current);
    };
  }, []);

  const commitHover = (value: boolean) => {
    hoverIntent.current = value;
    if (hoverDebounceRef.current !== null) clearTimeout(hoverDebounceRef.current);
    hoverDebounceRef.current = setTimeout(() => {
      hoverDebounceRef.current = null;
      setHovered(hoverIntent.current);
    }, 50);
  };

  const frameWidth = size * GALLERY.FRAME.WIDTH_MULTIPLIER;
  const frameHeight = size * GALLERY.FRAME.HEIGHT_MULTIPLIER;
  const borderThickness = 0.006;
  const matPadding = 0.012;
  const imageWidth = frameWidth - (borderThickness + matPadding) * 2;
  const imageHeight = frameHeight - (borderThickness + matPadding) * 2;

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    if (!interactive) return;
    commitHover(true);
    onHoverChange(true);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    if (!interactive) return;
    commitHover(false);
    onHoverChange(false);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!interactive) return;
    onActivate();
  };

  const frameColor = hovered
    ? GALLERY.FRAME.COLORS.HOVERED
    : GALLERY.FRAME.COLORS.DEFAULT;

  return (
    <group position={position}>
      {/* Invisible hit area */}
      <mesh
        position={[0, 0, 0.03]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[frameWidth + 0.01, frameHeight + 0.01]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Frame border */}
      <mesh position={[0, 0, 0.01]} castShadow>
        <boxGeometry args={[frameWidth, frameHeight, 0.012]} />
        <meshStandardMaterial
          color={frameColor}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* White mat */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry
          args={[
            frameWidth - borderThickness * 2,
            frameHeight - borderThickness * 2,
          ]}
        />
        <meshStandardMaterial color="#f0ece4" roughness={0.9} metalness={0} />
      </mesh>

      {/* Image */}
      {texture && (
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[imageWidth, imageHeight]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      )}
    </group>
  );
}

// ── Gallery ─────────────────────────────────────────────────────────

function localToWorld(
  localPos: [number, number, number],
  groupPos: [number, number, number],
  groupRot: [number, number, number]
): [number, number, number] {
  const vec = new THREE.Vector3(...localPos);
  vec.applyEuler(new THREE.Euler(...groupRot));
  vec.add(new THREE.Vector3(...groupPos));
  return [vec.x, vec.y, vec.z];
}

export interface GalleryHandle {
  deactivate: () => void;
  /** Zoom into the previous (-1) or next (+1) photo, wrapping around. */
  step: (direction: number) => void;
}

interface GalleryProps {
  isActive: boolean;
  onFrameActivate?: (
    worldPos: [number, number, number] | null,
    zoomPos: [number, number, number] | null
  ) => void;
  onWallClick?: () => void;
  wallPosition?: [number, number, number];
  wallRotation?: [number, number, number];
}

export const Gallery = forwardRef<GalleryHandle, GalleryProps>(function Gallery({
  isActive,
  onFrameActivate,
  onWallClick,
  wallPosition = GALLERY.WALL_POSITION,
  wallRotation = GALLERY.WALL_ROTATION,
}, ref) {
  // Currently zoomed-in frame index (null = gallery overview). Kept in a ref
  // since nothing renders off it — it only drives keyboard stepping.
  const activeFrameRef = useRef<number | null>(null);
  const hoveredSet = useRef(new Set<number>());

  // Compute wall normal once
  const wallNormal = useRef<THREE.Vector3>(new THREE.Vector3());
  useEffect(() => {
    const n = new THREE.Vector3(0, 0, 1);
    n.applyEuler(new THREE.Euler(...wallRotation));
    wallNormal.current = n;
  }, [wallRotation]);

  const activateFrame = (index: number) => {
    activeFrameRef.current = index;

    if (!onFrameActivate) return;

    const localPos = GALLERY.FRAME_POSITIONS[index];
    if (!localPos) return;

    const worldPos = localToWorld(localPos, wallPosition, wallRotation);
    const n = wallNormal.current;
    const zoomPos: [number, number, number] = [
      worldPos[0] + n.x * GALLERY.CAMERA_OFFSET,
      worldPos[1],
      worldPos[2] + n.z * GALLERY.CAMERA_OFFSET,
    ];

    onFrameActivate(worldPos, zoomPos);
  };

  const handleHoverChange = (index: number, hovered: boolean) => {
    if (hovered) {
      hoveredSet.current.add(index);
    } else {
      hoveredSet.current.delete(index);
    }
  };

  useImperativeHandle(ref, () => ({
    deactivate: () => {
      activeFrameRef.current = null;
    },
    step: (direction: number) => {
      const total = GALLERY.IMAGES.length;
      const current = activeFrameRef.current;
      // From the overview, ArrowRight opens the first photo, ArrowLeft the last.
      const base = current === null ? (direction > 0 ? -1 : 0) : current;
      activateFrame(((base + direction) % total + total) % total);
    },
  }));

  const handleGroupClick = (e: any) => {
    if (!isActive && onWallClick) {
      e.stopPropagation();
      onWallClick();
    }
  };

  return (
    <group
      position={wallPosition}
      rotation={wallRotation}
      onClick={handleGroupClick}
    >
      {GALLERY.IMAGES.map((imageUrl, index) => (
        <PhotoFrame
          key={index}
          imageUrl={imageUrl}
          position={GALLERY.FRAME_POSITIONS[index] || [0, 0, 0]}
          size={GALLERY.FRAME.BASE_SIZE}
          interactive={isActive}
          onActivate={() => activateFrame(index)}
          onHoverChange={(h) => handleHoverChange(index, h)}
        />
      ))}
    </group>
  );
});
