import React, { useState } from "react";
import { ImageUploadModal } from "./ImageUploadModal";
import type { PendingImageAttachment } from "./ImageUploadModal";
import { getBaseUrl } from "../services/api";

function getThumbUrl(att: PendingImageAttachment): string | null {
  if (att.url && att.url.startsWith("blob:")) return att.url;
  if (att.url && att.url.startsWith("http")) return att.url;
  if (att.token) {
    return `${getBaseUrl()}/api/v1/files/${att.token}/download?preview=1`;
  }
  return null;
}

export interface ImageUploadButtonProps {
  apiKey: string;
  attachment?: PendingImageAttachment | null;
  onUploaded?: (attachment: PendingImageAttachment) => void;
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
        className="p-2 opacity-50 hover:text-primary hover:opacity-100 transition-all rounded-xl disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        aria-label="上传图片"
        title="上传图片"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="已选图片"
            className="w-8 h-8 object-cover rounded-lg"
          />
        ) : (
          <span className="material-symbols-outlined text-xl">image</span>
        )}
      </button>
      <ImageUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        apiKey={apiKey}
        onUploaded={(a) => {
          onUploaded?.(a);
          setModalOpen(false);
        }}
        onError={onError}
      />
    </>
  );
}
