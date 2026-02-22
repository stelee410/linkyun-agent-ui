"use client";

import type { WidgetSpec } from "@/lib/widgets";
import type { Attachment } from "@/lib/widgets";
import { FileUploadWidget } from "./FileUploadWidget";

export interface WidgetRendererProps {
  spec: WidgetSpec;
  onAttachments?: (attachments: Attachment[]) => void;
  onMetadata?: (widgetId: string, value: unknown) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/** 根据 WidgetSpec.type 渲染对应组件 */
export function WidgetRenderer({
  spec,
  onAttachments,
  onError,
  disabled = false,
}: WidgetRendererProps) {
  if (spec.type === "file_upload" || spec.type === "image_upload") {
    return (
      <FileUploadWidget
        spec={spec}
        onAttachments={onAttachments}
        onError={onError}
        disabled={disabled}
      />
    );
  }
  // select, date_picker, custom 暂不实现，可后续扩展
  return null;
}
