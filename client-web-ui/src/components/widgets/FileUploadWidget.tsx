"use client";

import { useState, useRef, useCallback } from "react";
import type { WidgetSpec, FileUploadConfig, Attachment } from "@/lib/widgets";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_COUNT = 1;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface FileUploadWidgetProps {
  /** Widget 规格，type 应为 file_upload */
  spec: WidgetSpec;
  /** 上传完成回调，传入符合 message.attachments 格式的附件列表 */
  onAttachments?: (attachments: Attachment[]) => void;
  /** 错误回调 */
  onError?: (message: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function FileUploadWidget({
  spec,
  onAttachments,
  onError,
  disabled = false,
}: FileUploadWidgetProps) {
  const config = (spec.config || {}) as FileUploadConfig;
  const accept = config.accept ?? "*";
  const maxSize = config.max_size ?? DEFAULT_MAX_SIZE;
  const maxCount = config.max_count ?? DEFAULT_MAX_COUNT;
  const multiple = config.multiple ?? false;

  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const arr = Array.from(fileList);

      // 校验数量
      const total = files.length + arr.length;
      if (total > maxCount) {
        onError?.(`最多上传 ${maxCount} 个文件`);
        return;
      }

      // 校验大小
      for (const f of arr) {
        if (f.size > maxSize) {
          onError?.(`文件 "${f.name}" 超过 ${Math.round(maxSize / 1024)}KB 限制`);
          return;
        }
      }

      setUploading(true);
      try {
        const newAttachments: Attachment[] = [];
        const attType = spec.type === "image_upload" ? "image" : "file";
        for (const file of arr) {
          const base64 = await fileToBase64(file);
          newAttachments.push({
            type: attType,
            data: base64,
            mime_type: file.type || undefined,
            name: file.name,
            size: file.size,
            widget_id: spec.id,
            skill_id: spec.skill_id,
          });
        }
        const updated = [...files, ...newAttachments].slice(0, maxCount);
        setFiles(updated);
        onAttachments?.(updated);
      } catch {
        onError?.("读取文件失败");
      } finally {
        setUploading(false);
      }
    },
    [files, maxCount, maxSize, spec.id, spec.skill_id, onAttachments, onError]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(!disabled && !uploading);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onAttachments?.(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">{spec.label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-4 transition-colors
          ${dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-600 hover:border-zinc-500"}
          ${disabled || uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}
        `}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple || maxCount > 1}
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-1 text-center text-zinc-400 text-sm">
          {uploading ? (
            <span>上传中...</span>
          ) : (
            <>
              <span>点击或拖拽文件到此处</span>
              <span className="text-xs">
                {accept !== "*" ? `支持：${accept}` : "支持任意类型"}，单文件最大 {formatSize(maxSize)}，最多 {maxCount} 个
              </span>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((att, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg text-sm"
            >
              <span className="text-zinc-300 truncate flex-1" title={att.name}>
                {att.name}
              </span>
              <span className="text-zinc-500 text-xs shrink-0">
                {att.size != null ? formatSize(att.size) : ""}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-zinc-500 hover:text-red-400 shrink-0"
                  aria-label="移除"
                >
                  移除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
