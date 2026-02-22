"use client";

import { useState } from "react";
import { DocumentUploadModal } from "./DocumentUploadModal";
import type { Attachment } from "@/lib/widgets";

export interface DocumentUploadButtonProps {
  apiKey: string;
  attachment?: Attachment | null;
  onUploaded?: (attachment: Attachment & { _file?: File }) => void;
  /** 点击 X 时清除已选文档 */
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
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            hasDoc
              ? "text-indigo-400 hover:text-indigo-300 hover:bg-zinc-700/50"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          }`}
          aria-label={hasDoc ? `已选：${attachment?.name ?? "文档"}` : "上传文档"}
          title={hasDoc ? attachment?.name ?? "文档已选中" : "上传文档（PDF/Word/TXT）"}
        >
          <svg
            className="w-5 h-5"
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
        </button>

        {/* 红点：文档已选中时显示 */}
        {hasDoc && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-zinc-900 pointer-events-none" />
        )}

        {/* X 按钮：文档已选中且非禁用时悬浮显示 */}
        {hasDoc && !disabled && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
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
        onUploaded={onUploaded}
        onError={onError}
      />
    </>
  );
}
