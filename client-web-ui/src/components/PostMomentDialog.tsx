"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  getMomentDraft,
  uploadMomentImage,
  createMoment,
  type MomentImageUploadResult,
} from "@/lib/api";

const MAX_IMAGES = 9;

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface UploadedImage {
  token: string;
  url_800: string;
  url_240: string;
}

interface PostMomentDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: number;
  apiKey: string;
}

export function PostMomentDialog({ open, onClose, agentId, apiKey }: PostMomentDialogProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoImage, setAutoImage] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setContent("");
    setImages([]);
    setError("");
    setSuccess(false);

    setLoading(true);
    getMomentDraft(apiKey, agentId)
      .then((res) => {
        if (!cancelled && res.success && res.data?.content) {
          setContent(res.data.content);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, agentId, apiKey]);

  const handleImageSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const remaining = MAX_IMAGES - images.length;
      const toUpload = Array.from(files).slice(0, remaining);
      if (toUpload.length === 0) return;

      setUploading(true);
      setError("");
      for (const file of toUpload) {
        const res = await uploadMomentImage(apiKey, file);
        if (res.success && res.data) {
          setImages((prev) => [...prev, res.data as MomentImageUploadResult]);
        } else {
          setError(res.error?.message || "图片上传失败");
          break;
        }
      }
      setUploading(false);
    },
    [apiKey, images.length]
  );

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      setError("请输入内容");
      return;
    }
    setSending(true);
    setError("");
    const res = await createMoment(apiKey, agentId, {
      content: content.trim(),
      image_tokens: images.map((img) => img.token),
      auto_image: autoImage && images.length === 0,
    });
    setSending(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } else {
      setError(res.error?.message || "发布失败");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-surface border border-border rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
          <h3 className="text-lg font-medium text-text-primary">发朋友圈</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-1" aria-label="关闭">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              正在生成草稿...
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写点什么..."
              rows={5}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          )}

          {/* Image Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">图片（{images.length}/{MAX_IMAGES}）</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={img.token} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img
                    src={`${getBaseUrl()}${img.url_240}`}
                    alt={`图片 ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleImageSelect(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </div>

          {/* Auto Image Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoImage}
              onChange={(e) => setAutoImage(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">
              AI 自动配图
              <span className="text-xs text-text-secondary/60 ml-1">（无手动图片时，AI 判断是否生成配图）</span>
            </span>
          </label>

          {/* Error / Success */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-500">发布成功！</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm">
            取消
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={sending || loading || !content.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
          >
            {sending ? "发布中..." : "发布"}
          </button>
        </div>
      </div>
    </div>
  );
}
