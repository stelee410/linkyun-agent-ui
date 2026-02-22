"use client";

import type { ReactNode } from "react";

/** 技能 implementation_type / name 到展示分类的映射 */
export const skillCategoryMap: Record<string, string> = {
  minimaxi_tts: "voice",
  doubao_tts: "voice",
  sensitive_filter: "safety",
  image_upload: "input",
  document_upload: "input",
  file_upload: "input",
  role_reinforcement: "prompt",
  weather_api: "api",
  get_current_time: "time",
  search_web: "search",
  calculator: "calculator",
};

const iconClass = (size: "sm" | "lg") => (size === "sm" ? "w-5 h-5" : "w-10 h-10");

function createIcons(size: "sm" | "lg"): Record<string, ReactNode> {
  const c = iconClass(size);
  return {
    voice: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    safety: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    input: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    prompt: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h6" />
      </svg>
    ),
    api: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="m17 8 4 4-4 4" />
      </svg>
    ),
    time: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    search: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    calculator: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h4" />
        <path d="M13 17h4" />
      </svg>
    ),
    default: (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 2 8 7.5V11h3.5L17 5.5A2.12 2.12 0 0 0 13.5 2Z" />
        <path d="M6 14c-1.5 0-3 1.2-3 3.5 0 2.3 2 3.5 4 3.5h7c.8 0 2 .5 2.5 2" />
        <path d="M5.5 12.5C7 11 9 10 11.5 10c.4 0 .8 0 1.2.1" />
        <path d="M18.5 9.5c.7.2 1.3.6 1.9 1.1" />
      </svg>
    ),
  };
}

/** 小尺寸图标（如编辑页 badge w-5 h-5） */
export const skillIconsSm = createIcons("sm");
/** 大尺寸图标（如技能广场卡片 w-10 h-10） */
export const skillIconsLg = createIcons("lg");

/** 编辑页 / 列表 badge 用：bg + text */
export const skillColorMap: Record<string, { bg: string; text: string }> = {
  voice: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  safety: { bg: "bg-rose-500/20", text: "text-rose-400" },
  input: { bg: "bg-sky-500/20", text: "text-sky-400" },
  prompt: { bg: "bg-amber-500/20", text: "text-amber-400" },
  api: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  time: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  search: { bg: "bg-violet-500/20", text: "text-violet-400" },
  calculator: { bg: "bg-orange-500/20", text: "text-orange-400" },
  default: { bg: "bg-slate-500/20", text: "text-slate-600 dark:text-slate-400" },
};

/** 技能广场卡片用：bg + text + hoverBg */
export const skillCardColorMap: Record<string, { bg: string; text: string; hoverBg: string }> = {
  voice: { bg: "bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", hoverBg: "group-hover:bg-indigo-500/30" },
  safety: { bg: "bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", hoverBg: "group-hover:bg-rose-500/30" },
  input: { bg: "bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", hoverBg: "group-hover:bg-sky-500/30" },
  prompt: { bg: "bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", hoverBg: "group-hover:bg-amber-500/30" },
  api: { bg: "bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", hoverBg: "group-hover:bg-emerald-500/30" },
  time: { bg: "bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", hoverBg: "group-hover:bg-cyan-500/30" },
  search: { bg: "bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", hoverBg: "group-hover:bg-violet-500/30" },
  calculator: { bg: "bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", hoverBg: "group-hover:bg-orange-500/30" },
  default: { bg: "bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", hoverBg: "group-hover:bg-slate-500/30" },
};

export function getSkillCategory(skillName?: string): string {
  return skillCategoryMap[skillName || ""] || "default";
}

/** 编辑页用：带背景的 skill 小徽章 */
export function SkillIconBadge({ skillName, active }: { skillName?: string; active: boolean }) {
  const cat = getSkillCategory(skillName);
  const colors = skillColorMap[cat] || skillColorMap.default;
  const icon = skillIconsSm[cat] || skillIconsSm.default;
  return (
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        active ? `${colors.bg} ${colors.text}` : "bg-slate-200 dark:bg-slate-700 text-text-secondary"
      }`}
    >
      {icon}
    </div>
  );
}
