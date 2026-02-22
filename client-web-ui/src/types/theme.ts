/**
 * 主题包类型，与 docs/theme_design.md 一致。
 * 切换主题包时可将 tokens 写入 CSS 变量；默认主题包通过 :root / .dark 已定义。
 */
export interface ThemeTokens {
  primary: string;
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

export interface ThemePack {
  id: string;
  name: string;
  /** 主题包预设的明暗倾向，实际显示由 mode 决定 */
  mode: "light" | "dark" | "system";
  tokens: ThemeTokens;
}

/** 与 UI-Ref/2.0/creator-web-ui 一致的默认主题（浅色 token） */
const defaultLightTokens: ThemeTokens = {
  primary: "#6366f1",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
};

/** 与 UI-Ref 一致的默认主题（深色 token） */
const defaultDarkTokens: ThemeTokens = {
  primary: "#6366f1",
  background: "#0f172a",
  surface: "#1e293b",
  border: "#27272a",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
};

/** 默认主题包：同时包含浅色与深色 token，由 mode 决定使用哪套 */
export const defaultThemePack: ThemePack = {
  id: "default",
  name: "默认",
  mode: "system",
  tokens: defaultLightTokens, // 实际渲染时由 mode + .dark 决定，此处仅占位
};

export const THEME_PACKS: ThemePack[] = [
  { ...defaultThemePack, tokens: defaultLightTokens },
];

/** 根据 id 获取主题包，未找到则返回默认 */
export function getThemePackById(id: string): ThemePack {
  return THEME_PACKS.find((p) => p.id === id) ?? THEME_PACKS[0];
}
