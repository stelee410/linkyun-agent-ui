"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboardAgentCounts } from "@/contexts/DashboardAgentCountsContext";

/** 左侧「状态类型」筛选：用 URL ?status= 控制，数量由首页通过 Context 更新 */
export function AgentStatusFilterSidebar() {
  const searchParams = useSearchParams();
  const { counts } = useDashboardAgentCounts();
  const current = searchParams.get("status") || "all";

  const linkClass = (status: string) =>
    current === status
      ? "w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 text-primary"
      : "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary";

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">状态类型</h3>
      <ul className="space-y-2">
        <li>
          <Link href="/dashboard" className={linkClass("all")}>
            <span className="text-sm font-medium">全部 Agent</span>
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">{counts.all}</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard?status=running" className={linkClass("running")}>
            <span className="text-sm font-medium">运行中</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${current === "running" ? "bg-primary text-white" : "bg-surface text-text-secondary"}`}>
              {counts.running}
            </span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard?status=draft" className={linkClass("draft")}>
            <span className="text-sm font-medium">草稿状态</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${current === "draft" ? "bg-primary text-white" : "bg-surface text-text-secondary"}`}>
              {counts.draft}
            </span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard?status=archived" className={linkClass("archived")}>
            <span className="text-sm font-medium">存档状态</span>
            <span className={`text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center inline-block ${current === "archived" ? "bg-primary text-white" : "bg-surface text-text-secondary"}`}>
              {counts.archived ?? 0}
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
