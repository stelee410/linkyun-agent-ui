"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export const WORKSPACE_STORAGE_KEY = "linkyun_current_workspace_code";

export function getStoredWorkspaceCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredWorkspaceCode(code: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

export const WORKSPACE_CHANGED_EVENT = "workspace-changed";

const WorkspaceContext = createContext<{
  workspaceCode: string;
  setWorkspaceCode: (code: string) => void;
}>({ workspaceCode: "default", setWorkspaceCode: () => {} });

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceCode, setWorkspaceCodeState] = useState<string>("default");

  useEffect(() => {
    const stored = getStoredWorkspaceCode();
    if (stored) setWorkspaceCodeState(stored);
  }, []);

  const setWorkspaceCode = useCallback((code: string) => {
    setStoredWorkspaceCode(code);
    setWorkspaceCodeState(code);
    window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: { workspaceCode: code } }));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaceCode, setWorkspaceCode }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
