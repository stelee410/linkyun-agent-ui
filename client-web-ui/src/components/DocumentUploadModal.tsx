"use client";

import { useState, useRef, useCallback } from "react";
import type { Attachment } from "@/lib/widgets";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPT = ".pdf,.doc,.docx,.txt";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isDocumentFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return [".pdf", ".doc", ".docx", ".txt"].includes(ext);
}

/** 待上传文档附件 */
export interface PendingDocumentAttachment extends Attachment {
  _file?: File;
}

export interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  onUploaded?: (attachment: PendingDocumentAttachment) => void;
  onError?: (message: string) => void;
}

export function DocumentUploadModal({
  open,
  onClose,
  apiKey,
  onUploaded,
  onError,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!isDocumentFile(file)) {
        onError?.("请选择 PDF、Word 或 TXT 文件");
        return;
      }
      if (file.size > MAX_SIZE) {
        onError?.(`文档不能超过 ${formatSize(MAX_SIZE)}`);
        return;
      }
      setSelectedFile(file);
    },
    [onError]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (!selectedFile) return;
    onError?.("");
    const pendingAtt: PendingDocumentAttachment = {
      type: "file",
      mime_type: selectedFile.type || undefined,
      name: selectedFile.name,
      size: selectedFile.size,
      _file: selectedFile,
    };
    onUploaded?.(pendingAtt);
    setSelectedFile(null);
    onClose();
  };

  const handleRemove = () => {
    setSelectedFile(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">上传文档</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-600 hover:border-zinc-500"}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <svg
                  className="w-12 h-12 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>点击或拖拽文档到此处</span>
                <span className="text-xs">支持 PDF、Word、TXT，最大 {formatSize(MAX_SIZE)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <div className="w-12 h-12 flex items-center justify-center bg-zinc-700 rounded shrink-0">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-zinc-500">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-zinc-500 hover:text-red-400 text-sm shrink-0"
                >
                  移除
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedFile}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
