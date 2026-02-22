"use client";

import { useEffect, useState } from "react";
import { getAuth, type AuthState } from "@/lib/auth";

/**
 * 认证状态 hook。仅在客户端挂载后读取 localStorage，避免 SSR 与水合不一致。
 * @returns { auth: AuthState | null, isReady: boolean }
 */
export function useAuth(): { auth: AuthState | null; isReady: boolean } {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setAuth(getAuth());
    setIsReady(true);
  }, []);

  return { auth, isReady };
}
