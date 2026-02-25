"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearAuth } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getCreatorAvatar, type Creator } from "@/lib/api";
import { ThemePicker } from "@/components/ThemePicker";
import { DashboardAgentCountsProvider } from "@/contexts/DashboardAgentCountsContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { AgentStatusFilterSidebar } from "@/components/dashboard/AgentStatusFilterSidebar";
import { LogoIcon, SearchIcon, LogoutIcon, InviteIcon } from "@/components/icons";
import { WorkspaceSelect } from "@/components/WorkspaceSelect";
import { WorkspaceInviteModal } from "@/components/WorkspaceInviteModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { auth, isReady } = useAuth();
  const { workspaceCode } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [creator, setCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (isReady && !auth?.apiKey) {
      router.replace("/login");
    }
  }, [isReady, auth?.apiKey, router]);

  const refreshCreator = () => {
    if (!auth?.apiKey) return;
    getProfile(auth.apiKey).then((res) => {
      if (res.success && res.data) setCreator(res.data);
    });
  };

  useEffect(() => {
    if (!auth?.apiKey) return;
    refreshCreator();
  }, [auth?.apiKey]);

  useEffect(() => {
    const onProfileUpdated = () => refreshCreator();
    window.addEventListener("creator-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("creator-profile-updated", onProfileUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshCreator depends on auth
  }, [auth?.apiKey]);

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  if (!isReady || !auth?.apiKey) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur px-6 h-16 flex items-center">
          <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
            <div className="text-text-secondary">加载中...</div>
          </div>
        </header>
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8" />
      </div>
    );
  }

  const isAgents = pathname === "/dashboard" || pathname?.startsWith("/dashboard/agents");
  const isSessions = pathname?.startsWith("/dashboard/sessions");
  const isSkills = pathname?.startsWith("/dashboard/skills-marketplace");
  const isKnowledge = pathname?.startsWith("/dashboard/knowledge");
  /** Agent 编辑页（如 /dashboard/agents/1/edit）时隐藏左侧菜单 */
  const isAgentEditPage = pathname?.match(/^\/dashboard\/agents\/[^/]+\/edit\/?$/);
  const isKnowledgeDetailPage = pathname?.match(/^\/dashboard\/knowledge\/[^/]+\/?$/);
  /** 会话管理页全屏显示 */
  const isSessionsFullPage = pathname === "/dashboard/sessions";

  return (
    <WorkspaceProvider>
    <DashboardAgentCountsProvider>
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <LogoIcon className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-text-primary">Linkyun Agent</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link
                href="/dashboard"
                className={isAgents ? "text-primary border-b-2 border-primary pb-5 mt-5" : "text-text-secondary hover:text-text-primary transition-colors"}
              >
                我的 Agent
              </Link>
              <Link
                href="/dashboard/sessions"
                className={isSessions ? "text-primary border-b-2 border-primary pb-5 mt-5" : "text-text-secondary hover:text-text-primary transition-colors"}
              >
                对话会话
              </Link>
              <Link
                href="/dashboard/skills-marketplace"
                className={isSkills ? "text-primary border-b-2 border-primary pb-5 mt-5" : "text-text-secondary hover:text-text-primary transition-colors"}
              >
                技能广场
              </Link>
              <Link
                href="/dashboard/knowledge"
                className={isKnowledge ? "text-primary border-b-2 border-primary pb-5 mt-5" : "text-text-secondary hover:text-text-primary transition-colors"}
              >
                知识库
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 pr-6 border-r border-border">
              <span className="text-xs text-text-secondary hidden sm:inline">工作空间</span>
              <WorkspaceSelect apiKey={auth.apiKey} />
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                title="邀请码"
              >
                <InviteIcon className="w-5 h-5" />
              </button>
            </div>
            <WorkspaceInviteModal
              open={inviteModalOpen}
              onClose={() => setInviteModalOpen(false)}
              apiKey={auth.apiKey}
              workspaceCode={workspaceCode || "default"}
            />
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 pr-6 border-r border-border hover:opacity-80 transition-opacity"
              title="个人设置"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-text-secondary">当前用户</p>
                <p className="text-sm font-semibold text-text-primary">{creator?.metadata?.full_name || auth.username}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary text-sm font-medium shrink-0 overflow-hidden">
                {getCreatorAvatar(creator) ? (
                  <img src={getCreatorAvatar(creator)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  auth.username?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
            </Link>
            <ThemePicker />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-text-secondary hover:text-red-500 transition-colors text-sm"
            >
              <LogoutIcon className="w-5 h-5" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`w-full mx-auto flex gap-8 flex-1 ${isKnowledgeDetailPage || isSessionsFullPage ? 'px-0 py-0 max-w-none' : 'max-w-[1600px] px-6 py-8'}`}>
        {!isAgentEditPage && !isKnowledgeDetailPage && !isSessionsFullPage && (
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">搜索与过滤</h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <SearchIcon className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索 Agent 名称..."
                  className="w-full bg-surface border border-border rounded-xl pl-10 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            {isAgents && <AgentStatusFilterSidebar />}
            <div className="pt-6 border-t border-border">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-5 rounded-2xl text-white">
                <h4 className="font-bold mb-2">升级到专业版</h4>
                <p className="text-xs text-white/80 mb-4">解锁无限 Edge 节点部署和高级数字人驱动</p>
                <button type="button" className="w-full py-2 bg-white text-primary font-bold text-xs rounded-lg hover:bg-white/90 transition-colors">
                  立即升级
                </button>
              </div>
            </div>
          </div>
        </aside>
        )}
        <section className="flex-grow min-w-0">{children}</section>
      </main>
    </div>
    </DashboardAgentCountsProvider>
    </WorkspaceProvider>
  );
}
