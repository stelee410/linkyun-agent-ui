import React from "react";
import { getBaseUrl } from "../services/api";

export interface MessageAttachment {
  type: string;
  token?: string;
  url?: string;
  download_url?: string;
  preview_url?: string;
  name?: string;
  size?: number;
  mime_type?: string;
}

export interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  isUser?: boolean;
}

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

export function MessageAttachments({
  attachments,
  isUser = false,
}: MessageAttachmentsProps) {
  const imageAttachments = attachments.filter((a) => a.type === "image");
  const fileAttachments = attachments.filter((a) => a.type === "file");

  if (imageAttachments.length === 0 && fileAttachments.length === 0) return null;

  const linkClass = isUser
    ? "text-primary/90 hover:text-primary underline"
    : "text-primary hover:text-primary/80 underline";

  const mutedClass = isUser ? "text-theme-text/60" : "opacity-60";

  return (
    <div className="mt-2 space-y-2">
      {imageAttachments.map((att, i) => (
        <div
          key={`img-${i}`}
          className="flex flex-col gap-1.5 p-2 rounded-xl bg-background-dark/30 border border-border-dark/50"
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
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${linkClass}`}
            >
              下载
            </a>
            {att.name && (
              <>
                <span className={mutedClass}>|</span>
                <span className={`text-xs ${mutedClass}`}>{att.name}</span>
              </>
            )}
          </div>
        </div>
      ))}
      {fileAttachments.map((att, i) => (
        <div
          key={`file-${i}`}
          className="flex flex-col gap-1.5 p-2 rounded-xl bg-background-dark/30 border border-border-dark/50"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={getDownloadUrl(att)}
              download={att.name}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${linkClass} inline-flex items-center gap-1`}
            >
              <span className="material-symbols-outlined text-base">description</span>
              {att.name || "文档"}
            </a>
            {att.size && (
              <span className={`text-xs ${mutedClass}`}>{formatSize(att.size)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
