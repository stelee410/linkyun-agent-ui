"use client";

import { useState, useRef, useCallback } from "react";
import { uploadAgentAvatar, deleteAgentAvatar, type Agent } from "@/lib/api";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const AVATAR_MAX_SIZE = 256; // 限制头像最大边长

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("No canvas context"));
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    let w = Math.floor(crop.width * scaleX);
    let h = Math.floor(crop.height * scaleY);
    if (w > AVATAR_MAX_SIZE || h > AVATAR_MAX_SIZE) {
      const s = Math.min(AVATAR_MAX_SIZE / w, AVATAR_MAX_SIZE / h);
      w = Math.floor(w * s);
      h = Math.floor(h * s);
    }

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(
      image,
      Math.floor(crop.x * scaleX),
      Math.floor(crop.y * scaleY),
      Math.floor(crop.width * scaleX),
      Math.floor(crop.height * scaleY),
      0,
      0,
      w,
      h
    );

    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
      "image/jpeg",
      0.85
    );
  });
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

interface AvatarUploadProps {
  /** 当前头像 URL 或 data URI，无则显示首字母 */
  avatar: string | null;
  /** 无头像时的首字母 */
  fallbackLetter: string;
  /** Agent ID，用于上传/删除 */
  agentId: number;
  /** API Key */
  apiKey: string;
  /** 上传/删除成功回调，传入更新后的 agent */
  onSuccess: (agent: Agent) => void;
  /** 错误回调 */
  onError?: (msg: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function AvatarUpload({
  avatar,
  fallbackLetter,
  agentId,
  apiKey,
  onSuccess,
  onError,
  disabled = false,
}: AvatarUploadProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight, 1));
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setCompletedCrop(undefined);
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
      const res = await uploadAgentAvatar(apiKey, agentId, blob);
      setSrc(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
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
  };

  const handleRemove = async () => {
    if (disabled) return;
    setUploading(true);
    try {
      const res = await deleteAgentAvatar(apiKey, agentId);
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
          className="w-16 h-16 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all border-2 border-dashed border-zinc-600 hover:border-indigo-500"
          title="点击或拖拽上传头像"
        >
          {avatar ? (
            <img
              src={avatar}
              alt="头像"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-medium text-white">
              {fallbackLetter}
            </span>
          )}
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-indigo-400 hover:text-indigo-300"
          >
            上传
          </button>
          {avatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-zinc-500 hover:text-red-400"
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

      {/* 裁剪弹窗 */}
      {src && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-white font-medium mb-4">裁剪头像（正方形）</h3>
            <div className="flex justify-center mb-4 max-h-[50vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt="裁剪"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[40vh] block"
                  style={{ maxHeight: "40vh" }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!completedCrop || uploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
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
