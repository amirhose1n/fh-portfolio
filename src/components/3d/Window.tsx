import { Html } from "@react-three/drei";
import { useState } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { ROOM, WINDOW } = SCENE_CONFIG;

// Contact details etched onto the porthole glass in the Contact step. Phone is
// stored both formatted (for display) and raw (for the clipboard).
const CONTACT = {
  name: "AMIRHOSEIN FARHOODI",
  email: "farhoodiamirhosein.primary@gmail.com",
  phoneDisplay: "+98 919 895 7843",
  phoneRaw: "+989198957843",
};

// Frosted-glass writing on the inner face of the porthole: name, email and
// phone, rendered as real DOM text so the user can select/copy it, plus a
// click-to-copy affordance on the email and phone rows.
function ContactGlass() {
  const [copied, setCopied] = useState<"email" | "phone" | null>(null);

  const copy = async (which: "email" | "phone", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked (insecure context / permissions) — the text
      // is still selectable by hand, so fail silently.
    }
    setCopied(which);
    window.setTimeout(
      () => setCopied((c) => (c === which ? null : c)),
      1300,
    );
  };

  const ink = "rgba(222, 230, 244, 0.72)";
  const glow = "0 0 14px rgba(150, 180, 225, 0.35)";

  const rowStyle: React.CSSProperties = {
    all: "unset",
    display: "block",
    cursor: "pointer",
    color: ink,
    fontSize: 19,
    letterSpacing: "0.1em",
    padding: "7px 0",
    textAlign: "left",
    textShadow: glow,
    transition: "color 160ms ease, text-shadow 160ms ease",
  };

  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = "rgba(244, 248, 255, 0.95)";
    e.currentTarget.style.textShadow = "0 0 18px rgba(170, 200, 240, 0.6)";
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = ink;
    e.currentTarget.style.textShadow = glow;
  };

  return (
    <div
      style={{
        width: 540,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: ink,
        textAlign: "left",
        userSelect: "text",
        WebkitUserSelect: "text",
        lineHeight: 1.2,
      }}
    >
      <div
        style={{
          fontSize: 34,
          fontWeight: 300,
          letterSpacing: "0.28em",
          textShadow: glow,
        }}
      >
        {CONTACT.name}
      </div>

      <div
        style={{
          width: 150,
          height: 1,
          margin: "18px 0 14px",
          background:
            "linear-gradient(90deg, rgba(220,230,245,0.55), transparent)",
        }}
      />

      <button
        type="button"
        style={rowStyle}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
        onClick={(e) => {
          e.stopPropagation();
          copy("email", CONTACT.email);
        }}
        title="Click to copy email"
      >
        {copied === "email" ? "copied ✓" : CONTACT.email}
      </button>

      <button
        type="button"
        style={rowStyle}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
        onClick={(e) => {
          e.stopPropagation();
          copy("phone", CONTACT.phoneRaw);
        }}
        title="Click to copy phone number"
      >
        {copied === "phone" ? "copied ✓" : CONTACT.phoneDisplay}
      </button>
    </div>
  );
}

/**
 * Round "spaceship porthole" window in the right-wall cutout (opposite the
 * gallery). The circular hole through the wall and its reveal tunnel are built
 * in Ground.tsx; this component adds the flush mounting bezel, the raised
 * metallic rim, the glass pane, and the etched contact details (Contact step).
 */
export function Window({ isActive = false }: { isActive?: boolean }) {
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

      {/* Etched contact details on the inner face of the glass — only mounted
          on the Contact step. Same rotation as the glass so it faces into the
          room and reads correctly; nudged a hair toward the room and down so it
          sits in the lower half of the porthole like the reference.
          Deliberately NOT using drei's `occlude` — raycast occlusion runs a
          full-scene raycast every frame (a heavy rAF stall); gating the mount
          on `isActive` instead means it's absent from every other view, so it
          can't bleed through walls and costs nothing when not shown. */}
      {isActive && (
        <Html
          transform
          center
          position={[wallX - 0.01, cy - 0.04, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={0.05}
          pointerEvents="auto"
          zIndexRange={[60, 0]}
        >
          <ContactGlass />
        </Html>
      )}
    </group>
  );
}
