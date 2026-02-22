import React from 'react';

interface VideoEmbedProps {
  url: string;
}

function parseYouTubeId(url: string): string | null {
  const m1 = url.match(/[?&]v=([\w-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/youtu\.be\/([\w-]+)/);
  if (m2) return m2[1];
  const m3 = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (m3) return m3[1];
  const m4 = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (m4) return m4[1];
  const m5 = url.match(/youtube\.com\/v\/([\w-]+)/);
  if (m5) return m5[1];
  return null;
}

function parseBilibiliBvid(url: string): string | null {
  const m1 = url.match(/bilibili\.com\/video\/(BV[\w]+)/i);
  if (m1) return m1[1];
  const m2 = url.match(/player\.bilibili\.com\/player\.html\?.*bvid=(BV[\w]+)/i);
  if (m2) return m2[1];
  const m3 = url.match(/[?&]bvid=(BV[\w]+)/i);
  if (m3) return m3[1];
  return null;
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url }) => {
  const ytId = parseYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border-dark">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }

  const bvid = parseBilibiliBvid(url);
  if (bvid) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border-dark">
        <iframe
          src={`https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          title="Bilibili video"
          scrolling="no"
          frameBorder="0"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary text-sm hover:underline break-all"
    >
      {url}
    </a>
  );
};

export default VideoEmbed;
