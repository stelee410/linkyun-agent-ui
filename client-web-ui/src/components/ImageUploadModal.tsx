"use client";

import { useState, useRef, useCallback } from "react";
import type { Attachment } from "@/lib/widgets";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 待上传附件：含 blob 预览和原始 File，发送时再上传 */
export interface PendingImageAttachment extends Attachment {
  _file?: File;
}

export interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  /** 选择确定后回调，传入带 blob 预览的 attachment（含 _file 供发送时上传） */
  onUploaded?: (attachment: PendingImageAttachment) => void;
  onError?: (message: string) => void;
}

export function ImageUploadModal({
  open,
  onClose,
  apiKey,
  onUploaded,
  onError,
}: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        onError?.("请选择图片文件");
        return;
      }
      if (file.size > MAX_SIZE) {
        onError?.(`图片不能超过 ${formatSize(MAX_SIZE)}`);
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
    const objectUrl = URL.createObjectURL(selectedFile);
    const pendingAtt: PendingImageAttachment = {
      type: "image",
      url: objectUrl,
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
          <h3 className="text-lg font-medium text-white">上传图片</h3>
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
                accept="image/*"
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
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span>点击或拖拽图片到此处</span>
                <span className="text-xs">支持 JPG、PNG、GIF、WebP，最大 {formatSize(MAX_SIZE)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="预览"
                  className="w-16 h-16 object-cover rounded"
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
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
