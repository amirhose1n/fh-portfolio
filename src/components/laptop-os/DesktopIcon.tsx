interface DesktopIconProps {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  onOpen: () => void;
}

export function DesktopIcon({
  icon,
  label,
  selected,
  onClick,
  onOpen,
}: DesktopIconProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      style={{
        all: "unset",
        cursor: "pointer",
        width: 84,
        padding: "6px 4px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        borderRadius: 4,
        background: selected ? "rgba(60, 120, 220, 0.35)" : "transparent",
        border: selected
          ? "1px solid rgba(120, 170, 240, 0.7)"
          : "1px solid transparent",
        transition: "background 80ms ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <img
        src={icon}
        alt=""
        draggable={false}
        style={{ width: 48, height: 48, objectFit: "contain" }}
      />
      <span
        style={{
          color: "white",
          fontSize: 12,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          textAlign: "center",
          lineHeight: 1.2,
          textShadow: "1px 1px 2px rgba(0,0,0,0.85)",
          wordBreak: "break-word",
        }}
      >
        {label}
      </span>
    </button>
  );
}
