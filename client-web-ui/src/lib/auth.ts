"use client";

const STORAGE_KEY = "linkyun_auth";

export interface AuthState {
  apiKey: string;
  username: string;
}

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    return JSON.parse(s) as AuthState;
  } catch {
    return null;
  }
}

export function setAuth(apiKey: string, username: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ apiKey, username })
  );
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
