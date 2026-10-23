"use client";

import {
  AlertTriangle,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WaveLoader } from "@/components/wave-loader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import { formatTimestamp } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Chapter } from "./chapters";
import { MARKERS, MarkerShape, type MarkerKind } from "./markers";
import { usePlayer } from "./player-context";

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SKIP_MS = 10_000;

/**
 * The video is private: `/api/meetings/[id]/video` checks the meeting and
 * redirects to a presigned storage URL that expires after an hour. If it
 * expires mid-playback, Retry asks for a fresh one and resumes in place.
 */
export function VideoPlayer({
  meetingId,
  videoPath = `/api/meetings/${meetingId}/video`,
  title,
  startMs,
  chapters,
  markers,
}: {
  meetingId: string;
  /** Where to load the video; shared pages use their link's own route. */
  videoPath?: string;
  title: string;
  startMs: number;
  /** Up to four sections, shown as gaps in the seek bar and clickable labels under it. */
  chapters: Chapter[];
  /** Moments (annotations, action items) drawn above the seek bar. */
  markers: { id: string; kind: MarkerKind; ms: number; label: string }[];
}) {
  const { currentMs, durationMs, attach, setCurrentMs, setDurationMs, seek } = usePlayer();
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const resumeAt = useRef(startMs);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  // Re-attach when Retry swaps in a new <video>.
  useEffect(() => {
    attach(video.current, container.current);
    return () => attach(null, null);
  }, [attach, attempt]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const v = () => video.current;
  const togglePlay = () => {
    const el = v();
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  const skip = (delta: number) => seek(Math.min(Math.max(currentMs + delta, 0), durationMs));
  const toggleMute = () => {
    const el = v();
    if (!el) return;
    el.muted = !el.muted;
    if (!el.muted && el.volume === 0) el.volume = 0.5;
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else container.current?.requestFullscreen().catch(() => {});
  };
  const retry = () => {
    resumeAt.current = currentMs;
    setFailed(false);
    setWaiting(true);
    setAttempt((n) => n + 1);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("input, [role=menu]")) return;
    // Space on a focused control presses that control.
    if (e.key === " " && target.closest("button")) return;
    const actions: Record<string, () => void> = {
      " ": togglePlay,
      k: togglePlay,
      ArrowLeft: () => skip(-5_000),
      ArrowRight: () => skip(5_000),
      j: () => skip(-SKIP_MS),
      l: () => skip(SKIP_MS),
      m: toggleMute,
      f: toggleFullscreen,
    };
    const action = actions[e.key];
    if (!action || e.metaKey || e.ctrlKey || e.altKey) return;
    // Stops page shortcuts (f = Folders, j/k = tiles) while the player has focus.
    e.preventDefault();
    action();
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress = durationMs > 0 ? (currentMs / durationMs) * 100 : 0;
  const activeChapter = chapters.findIndex((c) => currentMs >= c.startMs && currentMs < c.endMs);

  return (
    <div
      ref={container}
      role="region"
      aria-label={`Video player: ${title}`}
      onKeyDown={onKeyDown}
      className="group/player overflow-hidden rounded-xl border bg-card"
    >
      <div className="relative aspect-video bg-black">
        <video
          key={attempt}
          ref={video}
          src={`${videoPath}${attempt ? `?attempt=${attempt}` : ""}`}
          preload="metadata"
          playsInline
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            if (Number.isFinite(el.duration)) setDurationMs(Math.round(el.duration * 1000));
            if (resumeAt.current > 0) el.currentTime = resumeAt.current / 1000;
          }}
          onTimeUpdate={(e) => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setWaiting(true)}
          onCanPlay={() => setWaiting(false)}
          onPlaying={() => setWaiting(false)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
          onError={() => {
            setFailed(true);
            setWaiting(false);
          }}
          className="size-full cursor-pointer object-contain"
        />

        {failed ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-4 text-center" role="alert">
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="size-8 text-primary" aria-hidden />
              <p className="text-sm">Couldn’t load the video.</p>
              <Button variant="outline" onClick={retry}>
                Retry
              </Button>
            </div>
          </div>
        ) : waiting ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <WaveLoader size="sm" label="Loading video" />
          </div>
        ) : (
          !playing && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-lg shadow-black/50 transition-transform duration-150 hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
              aria-label="Play"
            >
              <Play className="ml-1 size-7 fill-current" aria-hidden />
            </button>
          )
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-3 pt-2 pb-2.5">
        {markers.length > 0 && durationMs > 0 && (
          <ul className="relative h-3" aria-label="Moments">
            {markers.map((m) => {
              const time = formatTimestamp(m.ms);
              return (
                <li key={m.id} className="absolute top-0 -translate-x-1/2" style={{ left: `${Math.min(100, (m.ms / durationMs) * 100)}%` }}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => seek(m.ms)}
                          aria-label={`${MARKERS[m.kind].label} at ${time}: ${m.label}`}
                          className="grid size-4 place-items-center rounded-full transition-transform duration-150 hover:scale-125 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none motion-reduce:transition-none"
                        />
                      }
                    >
                      <MarkerShape kind={m.kind} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">
                      <span className="font-medium">
                        {MARKERS[m.kind].label} · {time}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block opacity-80">{m.label}</span>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={durationMs || 0}
            step={100}
            value={Math.min(currentMs, durationMs)}
            onChange={(e) => {
              const el = v();
              const ms = Number(e.target.value);
              if (el) el.currentTime = ms / 1000;
              setCurrentMs(ms);
            }}
            aria-label="Seek"
            aria-valuetext={`${formatTimestamp(currentMs)} of ${formatTimestamp(durationMs)}`}
            disabled={failed}
            className="player-range w-full"
            style={{ "--progress": `${progress}%` } as React.CSSProperties}
          />
          {/* Chapter boundaries as small gaps in the bar. */}
          {durationMs > 0 &&
            chapters.slice(1).map((c) => (
              <span
                key={c.id}
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-1.5 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-card"
                style={{ left: `${(c.startMs / durationMs) * 100}%` }}
              />
            ))}
        </div>

        {chapters.length > 0 && (
          <nav aria-label="Chapters">
            <ol className="flex">
              {chapters.map((c, i) => (
                <li key={c.id} className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => seek(c.startMs)}
                    title={c.title}
                    aria-current={i === activeChapter ? "true" : undefined}
                    disabled={failed}
                    className={cn(
                      "w-full truncate rounded-md px-2 py-1 text-left text-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                      i === activeChapter
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} disabled={failed}>
            {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => skip(-SKIP_MS)} aria-label="Back 10 seconds" disabled={failed}>
            <RotateCcw />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => skip(SKIP_MS)} aria-label="Forward 10 seconds" disabled={failed}>
            <RotateCw />
          </Button>

          <div className="group/volume flex items-center">
            <Button variant="ghost" size="icon-sm" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              <VolumeIcon />
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const el = v();
                if (!el) return;
                el.volume = Number(e.target.value);
                el.muted = el.volume === 0;
              }}
              aria-label="Volume"
              className="player-range hidden w-20 sm:block"
              style={{ "--progress": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
            />
          </div>

          <span className="ml-2 font-mono text-xs text-muted-foreground tabular-nums">
            <span className="text-foreground">{formatTimestamp(currentMs)}</span> / {formatTimestamp(durationMs)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="font-mono text-xs" aria-label={`Playback speed ${rate}x`} />}
              >
                {rate}x
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                <DropdownMenuRadioGroup
                  value={String(rate)}
                  onValueChange={(value) => {
                    const el = v();
                    if (el) el.playbackRate = Number(value);
                  }}
                >
                  {RATES.map((r) => (
                    <DropdownMenuRadioItem key={r} value={String(r)}>
                      {r}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </div>
        </div>
      </div>
      <p className="sr-only">Shortcuts while the player has focus: Space or K play and pause, arrows skip 5 seconds, J and L skip 10 seconds, M mutes, F toggles full screen.</p>
    </div>
  );
}
