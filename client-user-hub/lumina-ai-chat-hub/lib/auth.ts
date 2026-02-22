/**
 * 认证状态本地存储
 */

import type { Creator } from "../services/api";

const STORAGE_KEY = "lumina_auth";

export interface AuthState {
  apiKey: string;
  creator: Creator;
}

export function getAuth(): AuthState | null {
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return null;
  try {
    return JSON.parse(s) as AuthState;
  } catch {
    return null;
  }
}

export function setAuth(apiKey: string, creator: Creator): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ apiKey, creator })
  );
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}
