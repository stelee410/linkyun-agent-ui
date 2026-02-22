import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getBaseUrl } from '../services/api';

function resolveAudioSrc(src: string): string {
  if (src.startsWith('/')) {
    return `${getBaseUrl()}${src}`;
  }
  return src;
}

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src: rawSrc, className = '' }: AudioPlayerProps) {
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

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
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

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const formatTime = (t: number) => {
    if (!isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 mt-2 ${className}`}>
        <span className="text-xs text-red-400">Audio failed to load</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:opacity-80 underline">
          Download
        </a>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 mt-2 px-3 py-2 rounded-xl bg-background-dark/70 border border-border-dark ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className="size-8 flex items-center justify-center rounded-full bg-primary text-black shrink-0 hover:opacity-90 transition-opacity"
        title={playing ? 'Pause' : 'Play'}
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
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right shrink-0">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 appearance-none bg-slate-600 rounded-full cursor-pointer accent-primary [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none"
        />
        <span className="text-[11px] text-slate-500 tabular-nums w-8 shrink-0">{formatTime(duration)}</span>
      </div>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-primary shrink-0 transition-colors"
        title="Download"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1v8.5M3.5 6.5L7 10l3.5-3.5M2 12h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
