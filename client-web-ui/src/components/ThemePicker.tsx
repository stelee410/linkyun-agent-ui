"use client";

import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_PACKS } from "@/types/theme";

const MODE_LABELS: Record<"light" | "dark" | "system", string> = {
  light: "亮色",
  dark: "暗色",
  system: "跟随系统",
};

export function ThemePicker() {
  const { themePackId, mode, setThemePack, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface/80 transition-colors"
        title="主题"
        aria-expanded={open}
      >
        <span className="sr-only">主题</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-surface shadow-lg py-2 z-50">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            主题包
          </div>
          {THEME_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => {
                setThemePack(pack.id);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                themePackId === pack.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-primary hover:bg-surface/80"
              }`}
            >
              <span>{pack.name}</span>
              {themePackId === pack.id && (
                <span className="text-primary" aria-hidden>✓</span>
              )}
            </button>
          ))}

          <div className="border-t border-border my-2" />

          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            明暗模式
          </div>
          {(["light", "dark", "system"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                mode === m ? "bg-primary/10 text-primary font-medium" : "text-text-primary hover:bg-surface/80"
              }`}
            >
              <span>{MODE_LABELS[m]}</span>
              {mode === m && <span className="text-primary" aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
