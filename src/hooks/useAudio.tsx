import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AudioContextValue {
  isOn: boolean;
  toggle: () => void;
  turnOn: () => void;
  turnOff: () => void;
}

// Exported so the Canvas can re-provide it as a context bridge — react-three
// /fiber renders into a separate reconciler, and drei's <Html> portal doesn't
// carry React context across that boundary. Re-providing the same value
// inside the Canvas tree restores access to components like LaptopOS.
export const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  // Armed "on" from the start so the track can begin the moment it has loaded
  // and the browser's autoplay policy allows it (immediately if the page is
  // already unlocked, otherwise on the first user gesture) — no waiting for
  // the intro flythrough to finish.
  const [isOn, setIsOn] = useState(true);

  const turnOn = useCallback(() => setIsOn(true), []);
  const turnOff = useCallback(() => setIsOn(false), []);
  const toggle = useCallback(() => setIsOn((v) => !v), []);

  const value = useMemo(
    () => ({ isOn, toggle, turnOn, turnOff }),
    [isOn, toggle, turnOn, turnOff],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}
