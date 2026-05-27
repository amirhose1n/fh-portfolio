import { useEffect, useState } from "react";
import { AppWindow } from "./AppWindow";
import { DesktopIcon } from "./DesktopIcon";
import { Taskbar } from "./Taskbar";
import { VSCodeApp } from "./apps/VSCodeApp";
import { PdfViewerApp } from "./apps/PdfViewerApp";
import { DoomApp } from "./apps/DoomApp";
import { ICONS, WALLPAPER } from "./icons";
import type { AppId, AppMeta } from "./types";

interface LaptopOSProps {
  isActive: boolean;
}

const APPS: Record<AppId, AppMeta> = {
  vscode: { id: "vscode", name: "vscode.ts — Visual Studio Code", icon: ICONS.vscode },
  pdf: { id: "pdf", name: "amirhosein-farhoodi.pdf", icon: ICONS.pdf },
  doom: { id: "doom", name: "DOOM", icon: ICONS.doom },
};

const DESKTOP_ICONS: Array<{ id: AppId; label: string }> = [
  { id: "vscode", label: "VS Code" },
  { id: "pdf", label: "Resume.pdf" },
  { id: "doom", label: "DOOM" },
];

export function LaptopOS({ isActive }: LaptopOSProps) {
  const [openApp, setOpenApp] = useState<AppId | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<AppId | null>(null);

  // While a window is open, Esc closes the window instead of exiting the
  // laptop. Use capture phase + stopPropagation so the global ModelViewer
  // Esc handler doesn't also fire.
  useEffect(() => {
    if (!isActive || !openApp) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setOpenApp(null);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [isActive, openApp]);

  // Reset transient UI state when the laptop is exited.
  useEffect(() => {
    if (!isActive) {
      setOpenApp(null);
      setSelectedIcon(null);
    }
  }, [isActive]);

  const activeAppMeta = openApp ? APPS[openApp] : null;

  return (
    <div
      onClick={() => setSelectedIcon(null)}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: "none",
      }}
    >
      {/* Wallpaper */}
      <img
        src={WALLPAPER}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Desktop icon grid */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 5,
        }}
      >
        {DESKTOP_ICONS.map(({ id, label }) => (
          <DesktopIcon
            key={id}
            icon={APPS[id].icon}
            label={label}
            selected={selectedIcon === id}
            onClick={() => setSelectedIcon(id)}
            onOpen={() => {
              setOpenApp(id);
              setSelectedIcon(id);
            }}
          />
        ))}
      </div>

      {/* Open app window */}
      {activeAppMeta && (
        <AppWindow
          icon={activeAppMeta.icon}
          title={activeAppMeta.name}
          onClose={() => setOpenApp(null)}
        >
          {openApp === "vscode" && <VSCodeApp />}
          {openApp === "pdf" && <PdfViewerApp />}
          {openApp === "doom" && <DoomApp />}
        </AppWindow>
      )}

      {/* Taskbar */}
      <Taskbar
        activeApp={activeAppMeta}
        onStartClick={() => {
          /* no-op for now */
        }}
        onActiveAppClick={() => {
          /* single-window: clicking the pill does nothing */
        }}
      />

    </div>
  );
}
