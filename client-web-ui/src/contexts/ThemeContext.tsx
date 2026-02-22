"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getThemePackById, type ThemePack } from "@/types/theme";

const STORAGE_KEY = "linkyun-theme";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  themePackId: string;
  mode: ThemeMode;
}

function loadState(): ThemeState {
  if (typeof window === "undefined")
    return { themePackId: "default", mode: "system" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { themePackId: "default", mode: "system" };
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      themePackId: parsed.themePackId ?? "default",
      mode: parsed.mode ?? "system",
    };
  } catch {
    return { themePackId: "default", mode: "system" };
  }
}

function saveState(state: ThemeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getEffectiveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

interface ThemeContextValue {
  themePackId: string;
  mode: ThemeMode;
  isDark: boolean;
  setThemePack: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
  themePack: ThemePack;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ThemeState>({ themePackId: "default", mode: "system" });
  const [mounted, setMounted] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(mq.matches);
    const handler = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark = useMemo(() => {
    if (!mounted) return false;
    if (state.mode === "dark") return true;
    if (state.mode === "light") return false;
    return systemPrefersDark;
  }, [mounted, state.mode, systemPrefersDark]);

  useEffect(() => {
    if (!mounted) return;
    applyDarkClass(isDark);
  }, [mounted, isDark]);

  useEffect(() => {
    if (!mounted) return;
    saveState(state);
  }, [mounted, state]);

  const setThemePack = useCallback((id: string) => {
    setState((prev) => ({ ...prev, themePackId: id }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const toggleDark = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: getEffectiveDark(prev.mode) ? "light" : "dark",
    }));
  }, []);

  const themePack = getThemePackById(state.themePackId);

  const value: ThemeContextValue = useMemo(
    () => ({
      themePackId: state.themePackId,
      mode: state.mode,
      isDark,
      setThemePack,
      setMode,
      toggleDark,
      themePack,
    }),
    [state.themePackId, state.mode, isDark, setThemePack, setMode, toggleDark, themePack]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
