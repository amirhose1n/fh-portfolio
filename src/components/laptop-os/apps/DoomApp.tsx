import { useEffect, useRef, useState } from "react";

// Minimal local typing for the global `Dos` factory from /js-dos/js-dos.js.
// The shipped `js-dos` types pull in `emulators-ui` (not a dep) and don't
// expose `.run` / `.stop` on the returned instance — those are the only
// methods we actually use, so we describe them ourselves.
interface DosInstance {
  run: (bundleUrl: string) => void;
  stop: () => void;
}
declare const Dos: (root: HTMLDivElement) => DosInstance;

const BUNDLE_URL = "/doom.jsdos";

export function DoomApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<DosInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mount the emulator into our root div. The factory function and its
  // assets ship via the <script>/<link> tags in index.html.
  useEffect(() => {
    if (!rootRef.current) return;

    if (typeof Dos !== "function") {
      setError("js-dos failed to load. Check the script tag in index.html.");
      return;
    }

    const dos = Dos(rootRef.current);
    setInstance(dos);

    // The js-dos UI injects some "flex-grow-0" wrapper elements we don't
    // need — the reference implementation also strips them out for a
    // cleaner embedded look.
    const stripChrome = rootRef.current.getElementsByClassName("flex-grow-0");
    while (stripChrome.length > 0) stripChrome[0].remove();

    return () => {
      dos.stop();
    };
  }, []);

  useEffect(() => {
    if (instance) instance.run(BUNDLE_URL);
  }, [instance]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#000",
      }}
    >
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "monospace",
            padding: 16,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
      <div
        ref={rootRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />
    </div>
  );
}
