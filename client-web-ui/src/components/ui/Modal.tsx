"use client";

import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  /** 内容区最大宽度：md (28rem), lg (32rem), xl (36rem), 2xl (42rem), 3xl (48rem), full (90vw) */
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  /** 点击遮罩是否关闭，默认 true */
  closeOnBackdrop?: boolean;
  /** z-index，默认 50 */
  zIndex?: number;
  /** 内容区额外 class */
  className?: string;
}

const maxWidthClass = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "max-w-[90vw]",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
  closeOnBackdrop = true,
  zIndex = 50,
  className = "",
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        className={`relative w-full rounded-xl border border-border bg-surface p-6 shadow-2xl ${maxWidthClass[maxWidth]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" className="text-lg font-medium text-text-primary mb-4">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
