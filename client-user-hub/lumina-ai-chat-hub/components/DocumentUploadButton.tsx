import React, { useState } from "react";
import { DocumentUploadModal } from "./DocumentUploadModal";
import type { PendingDocumentAttachment } from "./DocumentUploadModal";

export interface DocumentUploadButtonProps {
  apiKey: string;
  attachment?: PendingDocumentAttachment | null;
  onUploaded?: (attachment: PendingDocumentAttachment) => void;
  onClear?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function DocumentUploadButton({
  apiKey,
  attachment,
  onUploaded,
  onClear,
  onError,
  disabled = false,
}: DocumentUploadButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasDoc = !!attachment;

  return (
    <>
      <div className="relative shrink-0 group">
        <button
          type="button"
          onClick={() => !disabled && setModalOpen(true)}
          disabled={disabled}
          className={`p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${
            hasDoc
              ? "text-primary opacity-100"
              : "opacity-50 hover:text-primary hover:opacity-100"
          }`}
          aria-label={hasDoc ? `已选：${attachment?.name ?? "文档"}` : "上传文档"}
          title={hasDoc ? attachment?.name ?? "文档已选中" : "上传文档（PDF/Word/TXT）"}
        >
          <span className="material-symbols-outlined text-xl">description</span>
        </button>

        {hasDoc && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-background-dark pointer-events-none" />
        )}

        {hasDoc && !disabled && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface-dark hover:bg-red-500 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 border border-border-dark"
            aria-label="移除文档"
            title="移除文档"
            style={{ fontSize: "9px", lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      <DocumentUploadModal
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
