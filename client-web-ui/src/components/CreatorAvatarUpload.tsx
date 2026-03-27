"use client";

import { useState, useRef, useCallback } from "react";
import { uploadCreatorAvatar, deleteCreatorAvatar, getCreatorAvatar, type Creator } from "@/lib/api";
import { getCroppedBlob, centerAspectCropForDisplayedImage } from "@/lib/avatarCrop";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface CreatorAvatarUploadProps {
  /** 当前 Creator 数据 */
  creator: Creator | null;
  /** API Key */
  apiKey: string;
  /** 上传/删除成功回调，传入更新后的 creator */
  onSuccess: (creator: Creator) => void;
  /** 错误回调 */
  onError?: (msg: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function CreatorAvatarUpload({
  creator,
  apiKey,
  onSuccess,
  onError,
  disabled = false,
}: CreatorAvatarUploadProps) {
  const avatar = getCreatorAvatar(creator);
  const fallbackLetter = creator?.username?.charAt(0)?.toUpperCase() || "?";

  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewZoom, setPreviewZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    requestAnimationFrame(() => {
      const c = centerAspectCropForDisplayedImage(img, 1);
      if (c) {
        setCrop(c);
        setCompletedCrop(undefined);
      }
    });
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setCompletedCrop(undefined);
      setPreviewZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const [uploading, setUploading] = useState(false);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current || !src) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const res = await uploadCreatorAvatar(apiKey, blob);
      setSrc(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setPreviewZoom(1);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        onError?.(res.error?.message || "上传失败");
      }
    } catch {
      onError?.("上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPreviewZoom(1);
  };

  const handleRemove = async () => {
    if (disabled) return;
    setUploading(true);
    try {
      const res = await deleteCreatorAvatar(apiKey);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        onError?.(res.error?.message || "移除失败");
      }
    } catch {
      onError?.("移除失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div
        className={`relative flex flex-col items-center gap-2 ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="w-20 h-20 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all border-2 border-dashed border-border hover:border-primary"
          title="点击或拖拽上传头像"
        >
          {avatar ? (
            <img
              src={avatar}
              alt="头像"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-medium text-primary">
              {fallbackLetter}
            </span>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary hover:underline"
          >
            上传头像
          </button>
          {avatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-text-secondary hover:text-red-500"
            >
              移除
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {src && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-text-primary font-medium mb-4">裁剪头像（正方形）</h3>
            <p className="text-xs text-text-secondary mb-2">
              拖选区移动位置，拖角点放大缩小选区；可用下方滑块放大预览便于精细裁剪。
            </p>
            <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
              <span className="shrink-0">预览缩放</span>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.1}
                value={previewZoom}
                onChange={(e) => setPreviewZoom(Number(e.target.value))}
                className="flex-1 min-w-0 accent-primary"
                aria-label="预览缩放"
              />
            </div>
            <div className="flex justify-center mb-4 max-h-[75vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                keepSelection
                minWidth={16}
                minHeight={16}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt="裁剪"
                  onLoad={onImageLoad}
                  className="max-w-full block w-auto h-auto"
                  style={{ maxHeight: `${Math.min(40 * previewZoom, 72)}vh`, maxWidth: "100%" }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-text-secondary hover:text-text-primary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!completedCrop || uploading}
                className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg"
              >
                {uploading ? "上传中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
