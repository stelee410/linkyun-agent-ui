/** Agent 状态展示：运行中 / 草稿 / 存档（对应 API: active, private, draft, archived） */

export const AGENT_STATUS_LABELS: Record<string, string> = {
  active: "运行中",
  private: "运行中",
  draft: "草稿",
  archived: "存档",
  deleted: "已删除",
};

export const AGENT_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  private: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  draft: "bg-slate-200 dark:bg-slate-700 text-text-secondary border-border",
  archived: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 border-border",
  deleted: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
};

export interface AgentStatusDisplay {
  label: string;
  style: string;
}

export function getAgentStatusDisplay(agent: { status?: string }): AgentStatusDisplay {
  const s = (agent.status || "draft").toLowerCase();
  return {
    label: AGENT_STATUS_LABELS[s] ?? agent.status ?? "草稿",
    style: AGENT_STATUS_STYLES[s] ?? AGENT_STATUS_STYLES.draft,
  };
}

/** 按 status 筛选 Agent 列表（用于首页左侧筛选） */
export function filterAgentsByStatus<T extends { status?: string }>(
  agents: T[],
  statusFilter: string
): T[] {
  const s = (a: T) => (a.status || "").toLowerCase();
  if (statusFilter === "all") return agents.filter((a) => s(a) !== "archived");
  if (statusFilter === "running") return agents.filter((a) => ["active", "private"].includes(s(a)));
  if (statusFilter === "draft") return agents.filter((a) => s(a) === "draft");
  if (statusFilter === "archived") return agents.filter((a) => s(a) === "archived");
  return agents.filter((a) => s(a) !== "archived");
}

/** 统计各状态数量（供 Dashboard 侧栏展示） */
export function countAgentsByStatus(agents: { status?: string }[]): {
  all: number;
  running: number;
  draft: number;
  archived: number;
} {
  const s = (a: { status?: string }) => (a.status || "").toLowerCase();
  const running = agents.filter((a) => ["active", "private"].includes(s(a))).length;
  const draft = agents.filter((a) => s(a) === "draft").length;
  const archived = agents.filter((a) => s(a) === "archived").length;
  const all = agents.length - archived;
  return { all, running, draft, archived };
}
