import {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";

export const AVATAR_MAX_SIZE = 256;

export function getCroppedBlob(
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

    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      !image.width ||
      !image.height ||
      !crop.width ||
      !crop.height
    ) {
      reject(new Error("图片或选区尺寸无效，请稍候再试"));
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

    try {
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
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(e);
      reject(
        new Error(
          msg.includes("insecure") || msg.includes("tainted") || msg.includes("Tainted")
            ? "无法导出裁剪图：预览图跨域加载时未允许 CORS，请为 API 配置 CORS 或为图片设置 crossOrigin"
            : `裁剪失败：${msg}`
        )
      );
      return;
    }

    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                "无法生成图片文件（画布可能被跨域图片污染，请检查 API 的 CORS 与图片 crossOrigin）"
              )
            ),
      "image/jpeg",
      0.85
    );
  });
}

export function centerAspectCrop(
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

/**
 * 与 react-image-crop 官方 demo 一致：选区百分比基于图片在页面上的显示尺寸。
 * 若误用 naturalWidth/naturalHeight，大图被缩略显示时选区会错位，拖动、缩放选区会「不听话」。
 */
export function centerAspectCropForDisplayedImage(
  img: HTMLImageElement,
  aspect: number
): Crop | null {
  const w = img.offsetWidth || img.clientWidth;
  const h = img.offsetHeight || img.clientHeight;
  if (!w || !h) return null;
  return centerAspectCrop(w, h, aspect);
}
