import { useEffect, useState } from "react";
import { ICONS } from "./icons";
import type { AppMeta } from "./types";

interface TaskbarProps {
  activeApp: AppMeta | null;
  onStartClick: () => void;
  onActiveAppClick: () => void;
}

const TASKBAR_HEIGHT = 40;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Tick every 20s — enough to keep the displayed minute fresh.
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function Taskbar({
  activeApp,
  onStartClick,
  onActiveAppClick,
}: TaskbarProps) {
  const now = useNow();

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: TASKBAR_HEIGHT,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "stretch",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "white",
        zIndex: 20,
        userSelect: "none",
      }}
    >
      {/* Start button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartClick();
        }}
        aria-label="Start"
        style={{
          all: "unset",
          width: TASKBAR_HEIGHT,
          height: TASKBAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 80ms ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <img
          src={ICONS.start}
          alt=""
          style={{ width: 22, height: 22, objectFit: "contain" }}
        />
      </button>

      {/* Active-app pill (only when something is open) */}
      {activeApp && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onActiveAppClick();
          }}
          style={{
            all: "unset",
            height: TASKBAR_HEIGHT,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            background: "rgba(255,255,255,0.12)",
            borderBottom: "2px solid #4cc2ff",
            boxSizing: "border-box",
          }}
        >
          <img src={activeApp.icon} alt="" style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 12 }}>{activeApp.name}</span>
        </button>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* System tray */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          height: TASKBAR_HEIGHT,
        }}
      >
        <img
          src={ICONS.lan}
          alt="Network"
          style={{ width: 18, height: 18, objectFit: "contain" }}
        />
        <img
          src={ICONS.speaker}
          alt="Sound"
          style={{ width: 18, height: 18, objectFit: "contain" }}
        />
        <img
          src={ICONS.battery}
          alt="Battery"
          style={{ width: 22, height: 18, objectFit: "contain" }}
        />
      </div>

      {/* Clock + date */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 12px 0 4px",
          fontSize: 11,
          lineHeight: 1.25,
          textAlign: "right",
          minWidth: 80,
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatTime(now)}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.95 }}>
          {formatDate(now)}
        </span>
      </div>
    </div>
  );
}
