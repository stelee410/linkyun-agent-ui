
import React, { useState, useRef, useCallback } from 'react';
import {
  uploadCreatorAvatar,
  deleteCreatorAvatar,
  getCreatorAvatar,
  type Creator,
} from '../../services/api';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const AVATAR_MAX_SIZE = 256;

function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('No canvas context'));
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
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
      'image/jpeg',
      0.85
    );
  });
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

interface CreatorAvatarUploadProps {
  creator: Creator | null;
  apiKey: string;
  onSuccess: (creator: Creator) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}

export const CreatorAvatarUpload: React.FC<CreatorAvatarUploadProps> = ({
  creator,
  apiKey,
  onSuccess,
  onError,
  disabled = false,
}) => {
  const avatar = getCreatorAvatar(creator);
  const fallbackLetter = creator?.username?.charAt(0)?.toUpperCase() || '?';

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
    if (!file.type.startsWith('image/')) return;
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
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        onError?.(res.error?.message || 'Upload failed');
      }
    } catch {
      onError?.('Upload failed');
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
      const res = await deleteCreatorAvatar(apiKey);
      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        onError?.(res.error?.message || 'Remove failed');
      }
    } catch {
      onError?.('Remove failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className={`flex flex-col items-center gap-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="size-24 rounded-full overflow-hidden border-2 border-primary/30 flex items-center justify-center cursor-pointer hover:border-primary transition-all border-dashed bg-background-dark"
          title="Click or drag to upload avatar"
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-medium text-primary">{fallbackLetter}</span>
          )}
        </div>
        <div className="flex gap-2 text-[10px]">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">
            Upload
          </button>
          {avatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-slate-400 hover:text-red-400"
            >
              Remove
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
          e.target.value = '';
        }}
      />

      {src && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
          <div className="bg-surface-dark border border-border-dark rounded-2xl p-4 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-theme-text font-medium mb-4">Crop avatar (square)</h3>
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
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[40vh] block"
                  style={{ maxHeight: '40vh' }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!completedCrop || uploading}
                className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-xl"
              >
                {uploading ? 'Uploading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
