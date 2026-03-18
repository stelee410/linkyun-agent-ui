"use client";

import { useState } from "react";
import { ImageUploadModal } from "./ImageUploadModal";
import type { Attachment } from "@/lib/widgets";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

function getThumbUrl(att: Attachment): string | null {
  const raw = att.preview_url || att.download_url || att.url;
  if (raw) {
    // blob: 或 http(s): 开头的直接使用，相对路径需拼接 baseUrl
    if (raw.startsWith("blob:") || raw.startsWith("http")) return raw;
    return `${getBaseUrl()}${raw}`;
  }
  if (att.token) {
    return `${getBaseUrl()}/api/v1/files/${att.token}/download?preview=1`;
  }
  return null;
}

export interface ImageUploadButtonProps {
  apiKey: string;
  /** 当前已选中的图片附件（有则显示缩略图） */
  attachment?: Attachment | null;
  /** 选择确定后回调（含 blob 预览，发送时再上传） */
  onUploaded?: (attachment: Attachment) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function ImageUploadButton({
  apiKey,
  attachment,
  onUploaded,
  onError,
  disabled = false,
}: ImageUploadButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const thumbUrl = attachment ? getThumbUrl(attachment) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setModalOpen(true)}
        disabled={disabled}
        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        aria-label="上传图片"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="已选图片"
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        )}
      </button>
      <ImageUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        apiKey={apiKey}
        onUploaded={onUploaded}
        onError={onError}
      />
    </>
  );
}
