"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** 将相对路径（/api/v1/...）转为指向后端的完整 URL */
function resolveAudioSrc(src: string): string {
  if (src.startsWith("/")) {
    return `${API_BASE}${src}`;
  }
  return src;
}

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src: rawSrc, className = "" }: AudioPlayerProps) {
  const src = resolveAudioSrc(rawSrc);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    const onError = () => setError(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const time = parseFloat(e.target.value);
      audio.currentTime = time;
      setCurrentTime(time);
    },
    []
  );

  const formatTime = (t: number) => {
    if (!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 mt-2 ${className}`}>
        <span className="text-xs text-red-400">音频加载失败</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          直接下载
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2.5 mt-2 px-3 py-2 rounded-lg bg-zinc-900/70 border border-zinc-700/50 ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-colors"
        title={playing ? "暂停" : "播放"}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" rx="0.5" />
            <rect x="7" y="1" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.5v9l7.5-4.5L3 1.5z" />
          </svg>
        )}
      </button>

      {/* Progress */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[11px] text-zinc-400 tabular-nums w-8 text-right shrink-0">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 appearance-none bg-zinc-700 rounded-full cursor-pointer accent-indigo-500 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:appearance-none"
        />
        <span className="text-[11px] text-zinc-500 tabular-nums w-8 shrink-0">
          {formatTime(duration)}
        </span>
      </div>

      {/* Download Link */}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-500 hover:text-zinc-300 shrink-0 transition-colors"
        title="下载音频"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1v8.5M3.5 6.5L7 10l3.5-3.5M2 12h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
