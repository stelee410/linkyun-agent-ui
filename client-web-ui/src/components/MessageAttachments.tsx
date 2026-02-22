"use client";

import type { MessageAttachment } from "@/lib/api";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getPreviewUrl(att: MessageAttachment): string {
  if (att.preview_url) {
    return att.preview_url.startsWith("http")
      ? att.preview_url
      : `${getBaseUrl()}${att.preview_url}`;
  }
  if (att.token) {
    return `${getBaseUrl()}/api/v1/files/${att.token}/download?preview=1`;
  }
  return "#";
}

function getDownloadUrl(att: MessageAttachment): string {
  if (att.download_url) {
    return att.download_url.startsWith("http")
      ? att.download_url
      : `${getBaseUrl()}${att.download_url}`;
  }
  if (att.token) {
    return `${getBaseUrl()}/api/v1/files/${att.token}/download`;
  }
  return "#";
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  /** 是否为用户消息（影响样式） */
  isUser?: boolean;
}

export function MessageAttachments({
  attachments,
  isUser = false,
}: MessageAttachmentsProps) {
  const imageAttachments = attachments.filter((a) => a.type === "image");
  const fileAttachments = attachments.filter((a) => a.type === "file");

  if (imageAttachments.length === 0 && fileAttachments.length === 0) return null;

  const linkClass = isUser
    ? "text-indigo-200 hover:text-white underline"
    : "text-indigo-400 hover:text-indigo-300 underline";

  const mutedClass = isUser ? "text-indigo-200/60" : "text-zinc-500";

  return (
    <div className="mt-2 space-y-2">
      {/* 图片附件 */}
      {imageAttachments.map((att, i) => (
        <div
          key={`img-${i}`}
          className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/20"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={getPreviewUrl(att)}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${linkClass}`}
            >
              预览
            </a>
            <span className={mutedClass}>|</span>
            <a
              href={getDownloadUrl(att)}
              download={att.name}
              className={`text-sm ${linkClass}`}
            >
              下载
            </a>
            {att.name && (
              <span className={`text-xs ${mutedClass} truncate max-w-[120px]`}>
                {att.name}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* 文档附件 */}
      {fileAttachments.map((att, i) => (
        <div
          key={`file-${i}`}
          className="flex items-center gap-2 p-2 rounded-lg bg-black/20"
        >
          {/* 文档图标 */}
          <svg
            className={`w-5 h-5 shrink-0 ${isUser ? "text-indigo-200" : "text-zinc-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          {/* 文件名 + 大小 */}
          <div className="flex-1 min-w-0">
            {att.name && (
              <span
                className={`text-sm truncate block ${isUser ? "text-indigo-100" : "text-zinc-300"}`}
                title={att.name}
              >
                {att.name}
              </span>
            )}
            {att.size && (
              <span className={`text-xs ${mutedClass}`}>{formatSize(att.size)}</span>
            )}
          </div>

          {/* 下载链接 */}
          <a
            href={getDownloadUrl(att)}
            download={att.name}
            className={`text-sm shrink-0 ${linkClass}`}
          >
            下载
          </a>
        </div>
      ))}
    </div>
  );
}
