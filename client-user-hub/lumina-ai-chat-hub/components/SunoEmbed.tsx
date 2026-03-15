import React, { useState, useCallback } from 'react';

interface SunoEmbedProps {
  url: string;
  title?: string;
}

function parseSunoId(url: string): string | null {
  // https://suno.ai/song/3bcd68c2-15d9-4bba-8950-795104a8cc29
  // https://suno.com/song/3bcd68c2-15d9-4bba-8950-795104a8cc29
  const m = url.match(/suno\.(?:ai|com)\/song\/([\w-]+)/);
  if (m) return m[1];
  return null;
}

export function isSunoUrl(url: string): boolean {
  return parseSunoId(url) !== null;
}

const SunoEmbed: React.FC<SunoEmbedProps> = ({ url, title }) => {
  const songId = parseSunoId(url);
  const [iframeKey, setIframeKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    setIframeKey(k => k + 1);
    setTimeout(() => setSpinning(false), 1000);
  }, []);

  if (!songId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {title || url}
      </a>
    );
  }

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-border-dark">
      <iframe
        key={iframeKey}
        src={`https://suno.com/embed/${songId}`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        title={title || 'Suno Music'}
        style={{ display: 'block' }}
      />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-border-dark/20 border-t border-border-dark/40">
        <span className="text-[11px] opacity-50 flex-1">
          若无法播放，音乐可能仍在生成中，稍后刷新即可
        </span>
        <button
          onClick={handleRefresh}
          title="刷新播放器"
          className="flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 transition-opacity px-2 py-0.5 rounded-md hover:bg-border-dark/40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.6s ease',
              transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          刷新
        </button>
      </div>
    </div>
  );
};

export default SunoEmbed;
