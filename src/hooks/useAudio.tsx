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
  const [isOn, setIsOn] = useState(false);

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
