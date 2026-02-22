/**
 * Widget 协议类型定义
 * 参考：docs/widget_protocol.md
 */

export type WidgetType =
  | "file_upload"
  | "image_upload"
  | "document_upload"
  | "select"
  | "date_picker"
  | "custom";

export interface WidgetSpec {
  id: string;
  type: WidgetType;
  label: string;
  config: Record<string, unknown>;
  skill_id: string;
}

/** file_upload / image_upload 的 config */
export interface FileUploadConfig {
  accept?: string;
  max_size?: number;
  max_count?: number;
  multiple?: boolean;
}

/** message.attachments 中的附件格式 */
export interface Attachment {
  type: "file" | "image" | "audio";
  token?: string; // 上传后获得的文件令牌
  url?: string;
  download_url?: string;
  preview_url?: string;
  data?: string; // Base64 编码（逐步废弃，优先用 token）
  mime_type?: string;
  name?: string;
  size?: number;
  widget_id?: string;
  skill_id?: string;
}

/** 释放附件中的 blob URL，避免内存泄漏 */
export function revokeBlobUrls(attachments: Attachment[]): void {
  for (const att of attachments) {
    const u = att.url || att.preview_url || att.download_url;
    if (typeof u === "string" && u.startsWith("blob:")) {
      URL.revokeObjectURL(u);
    }
  }
}
