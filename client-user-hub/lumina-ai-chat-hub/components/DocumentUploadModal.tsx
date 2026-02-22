import React, { useState, useRef, useCallback } from "react";
import type { PendingAttachment } from "../services/api";

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

export interface PendingDocumentAttachment extends PendingAttachment {
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
      <div className="relative bg-surface-dark border border-border-dark rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-4 border-b border-border-dark flex justify-between items-center">
          <h3 className="text-lg font-bold text-theme-text">上传文档</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 opacity-50 hover:opacity-100 transition-opacity rounded-xl hover:bg-background-dark/50"
            aria-label="关闭"
          >
            <span className="material-symbols-outlined">close</span>
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
                border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
                ${dragOver ? "border-primary bg-primary/10" : "border-border-dark hover:border-primary/50"}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 text-theme-text/60">
                <span className="material-symbols-outlined text-5xl opacity-50">description</span>
                <span>点击或拖拽文档到此处</span>
                <span className="text-xs">支持 PDF、Word、TXT，最大 {formatSize(MAX_SIZE)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background-dark/50 rounded-2xl border border-border-dark">
                <div className="w-12 h-12 flex items-center justify-center bg-surface-dark rounded-xl shrink-0">
                  <span className="material-symbols-outlined text-2xl opacity-50">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-text truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs opacity-60">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-slate-400 hover:text-red-400 text-sm shrink-0 px-3 py-1.5 rounded-xl hover:bg-surface-dark transition-colors"
                >
                  移除
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border-dark flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl opacity-60 hover:opacity-100 font-bold text-sm transition-opacity"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedFile}
            className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
