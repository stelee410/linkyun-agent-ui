"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AgentCounts {
  all: number;
  running: number;
  draft: number;
  archived: number;
}

const defaultCounts: AgentCounts = { all: 0, running: 0, draft: 0, archived: 0 };

const DashboardAgentCountsContext = createContext<{
  counts: AgentCounts;
  setCounts: (counts: AgentCounts) => void;
}>({ counts: defaultCounts, setCounts: () => {} });

export function DashboardAgentCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCountsState] = useState<AgentCounts>(defaultCounts);
  const setCounts = useCallback((c: AgentCounts) => setCountsState(c), []);
  return (
    <DashboardAgentCountsContext.Provider value={{ counts, setCounts }}>
      {children}
    </DashboardAgentCountsContext.Provider>
  );
}

export function useDashboardAgentCounts() {
  return useContext(DashboardAgentCountsContext);
}
