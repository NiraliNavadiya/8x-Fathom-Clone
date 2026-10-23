"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Shared video state for the meeting page: the transcript, timeline, summary,
// action items and annotations all seek the one player through this.

type Player = {
  currentMs: number;
  durationMs: number;
  /** Jumps to `ms` and starts playing; brings the player into view if needed. */
  seek: (ms: number) => void;
  /** Used by <VideoPlayer> only. */
  attach: (video: HTMLVideoElement | null, container: HTMLElement | null) => void;
  setCurrentMs: (ms: number) => void;
  setDurationMs: (ms: number) => void;
};

const PlayerContext = createContext<Player | null>(null);

export function PlayerProvider({ initialDurationMs, children }: { initialDurationMs: number; children: React.ReactNode }) {
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialDurationMs);
  const video = useRef<HTMLVideoElement | null>(null);
  const container = useRef<HTMLElement | null>(null);

  const attach = useCallback((v: HTMLVideoElement | null, c: HTMLElement | null) => {
    video.current = v;
    container.current = c;
  }, []);

  const seek = useCallback((ms: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = ms / 1000;
    setCurrentMs(ms);
    v.play().catch(() => {}); // autoplay can be refused; the position still moves
    const box = container.current?.getBoundingClientRect();
    if (box && (box.bottom < 64 || box.top > window.innerHeight)) {
      container.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  const value = useMemo(
    () => ({ currentMs, durationMs, seek, attach, setCurrentMs, setDurationMs }),
    [currentMs, durationMs, seek, attach],
  );
  return <PlayerContext value={value}>{children}</PlayerContext>;
}

export function usePlayer() {
  const player = useContext(PlayerContext);
  if (!player) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return player;
}
