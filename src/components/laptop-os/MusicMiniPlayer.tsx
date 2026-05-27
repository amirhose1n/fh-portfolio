import { useAudio } from "../../hooks/useAudio";
import { ICONS } from "./icons";

interface MusicMiniPlayerProps {
  trackTitle: string;
  trackArtist: string;
}

export function MusicMiniPlayer({
  trackTitle,
  trackArtist,
}: MusicMiniPlayerProps) {
  const { isOn, toggle, turnOff } = useAudio();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        // Sit just above the 40px taskbar (8px gap) in the bottom-right.
        bottom: 48,
        right: 12,
        width: 240,
        zIndex: 15,
        background: "rgba(28, 28, 32, 0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(10px)",
        color: "white",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.6)",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <span>NOW PLAYING</span>
        <button
          type="button"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            turnOff();
          }}
          style={{
            all: "unset",
            cursor: "pointer",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            padding: "0 4px",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.7)")
          }
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: 10, padding: 10 }}>
        <img
          src={ICONS.music}
          alt=""
          draggable={false}
          style={{
            width: 56,
            height: 56,
            objectFit: "cover",
            borderRadius: 4,
            background: "#000",
          }}
        />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {trackTitle}
          </div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {trackArtist}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-label={isOn ? "Pause" : "Play"}
            style={{
              all: "unset",
              marginTop: 6,
              alignSelf: "flex-start",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
            }
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>
              {isOn ? "❚❚" : "▶"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
