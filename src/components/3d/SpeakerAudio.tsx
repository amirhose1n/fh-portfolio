import { PositionalAudio } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { PositionalAudio as ThreePositionalAudio } from "three";
import { useAudio } from "../../hooks/useAudio";

interface SpeakerAudioProps {
  url: string;
  distance: number;
  volume: number;
}

const GESTURE_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

export function SpeakerAudio({ url, distance, volume }: SpeakerAudioProps) {
  const ref = useRef<ThreePositionalAudio>(null);
  const { isOn } = useAudio();

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    const sync = () => {
      if (isOn && !audio.isPlaying) audio.play();
      else if (!isOn && audio.isPlaying) audio.pause();
    };

    // If the AudioContext is already running (the page had a gesture before
    // this component mounted), we can just sync immediately.
    if (audio.context.state === "running") {
      sync();
      return;
    }

    // Context is suspended — resume() only succeeds when called from inside
    // a user-gesture handler. Hook one-shot listeners on every common input
    // so the first thing the user does unlocks audio.
    const onGesture = () => {
      audio.context.resume().then(sync).catch(() => {});
    };
    GESTURE_EVENTS.forEach((e) =>
      window.addEventListener(e, onGesture, { once: true }),
    );
    return () => {
      GESTURE_EVENTS.forEach((e) =>
        window.removeEventListener(e, onGesture),
      );
    };
  }, [isOn]);

  return (
    <PositionalAudio
      ref={ref}
      url={url}
      distance={distance}
      loop
      autoplay={false}
    />
  );
}
