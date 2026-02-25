"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { useDashboardAgentCounts } from "@/contexts/DashboardAgentCountsContext";
import { useWorkspace, WORKSPACE_CHANGED_EVENT } from "@/contexts/WorkspaceContext";
import {
  listAgents,
  createAgent,
  deleteAgent,
  getAgent,
  getAgentAvatar,
  listAgentPreSkills,
  listAgentMidSkills,
  listAgentPostSkills,
  getLLMProviders,
  type Agent,
  type AgentPreSkill,
  type AgentMidSkill,
  type AgentPostSkill,
  type LLMProvider,
} from "@/lib/api";
import { AgentTestDialog } from "@/components/AgentTestDialog";
import { AgentTransferModal } from "@/components/AgentTransferModal";
import { AddIcon, EditIcon, VisibilityIcon, DeleteIcon, ChatIcon, ScheduleIcon, TransferIcon } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { getAgentStatusDisplay, filterAgentsByStatus, countAgentsByStatus } from "@/lib/agentStatus";

export default function DashboardPage() {
  const auth = getAuth();
  const searchParams = useSearchParams();
  const { setCounts } = useDashboardAgentCounts();
  const { workspaceCode } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<Agent | null>(null);
  const [transferAgent, setTransferAgent] = useState<Agent | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [createAgentType, setCreateAgentType] = useState<"cloud" | "edge">("cloud");
  const [testDialogAgentId, setTestDialogAgentId] = useState<number | null>(null);
  const [testDialogData, setTestDialogData] = useState<{
    agent: Agent;
    systemPrompt: string;
    examples: { role: string; content: string }[];
    skills: string[];
    preSkills: { id: number; uuid: string }[];
    midSkills: { creator_skill_id: number; config?: Record<string, unknown> }[];
    postSkills: { creator_skill_id: number; config?: Record<string, unknown> }[];
  } | null>(null);
  const [testDialogLoading, setTestDialogLoading] = useState(false);

  const statusFilter = searchParams.get("status") || "all";
  const filteredAgents = useMemo(() => filterAgentsByStatus(agents, statusFilter), [agents, statusFilter]);

  const DELETE_CONFIRM_ZH = "我确认删除";
  const DELETE_CONFIRM_EN = "I confirm to delete";
  const isDeleteConfirmValid =
    deleteConfirmInput.trim() === DELETE_CONFIRM_ZH ||
    deleteConfirmInput.trim().toLowerCase() === DELETE_CONFIRM_EN.toLowerCase();

  const loadAgents = () => loadAgentsWithWorkspace();

  useEffect(() => {
    if (!auth?.apiKey) return;
    loadAgents();
  }, [auth?.apiKey, workspaceCode]);

  useEffect(() => {
    const onWorkspaceChanged = (e: Event) => {
      const code = (e as CustomEvent<{ workspaceCode: string }>)?.detail?.workspaceCode;
      loadAgentsWithWorkspace(code);
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChanged);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChanged);
  }, [auth?.apiKey]);

  useEffect(() => {
    setCounts(countAgentsByStatus(agents));
  }, [agents, setCounts]);

  useEffect(() => {
    if (!testDialogAgentId || !auth?.apiKey) return;
    setTestDialogLoading(true);
    setTestDialogData(null);
    const apiKey = auth.apiKey;
    Promise.all([
      getAgent(apiKey, testDialogAgentId),
      listAgentPreSkills(apiKey, testDialogAgentId),
      listAgentMidSkills(apiKey, testDialogAgentId),
      listAgentPostSkills(apiKey, testDialogAgentId),
    ])
      .then(([agentRes, preRes, midRes, postRes]) => {
        if (!agentRes.success || !agentRes.data) {
          setTestDialogAgentId(null);
          return;
        }
        const agent = agentRes.data;
        const ex = agent.config?.examples;
        const examples = Array.isArray(ex)
          ? ex
              .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
              .map((m: { role: string; content?: string }) => ({ role: m.role, content: m.content || "" }))
          : [];
        const preSkills: { id: number; uuid: string }[] = (preRes.success && preRes.data?.pre_skills)
          ? (preRes.data.pre_skills as AgentPreSkill[]).map((s) => ({ id: s.id, uuid: s.uuid }))
          : [];
        const midSkills: { creator_skill_id: number; config?: Record<string, unknown> }[] =
          midRes.success && midRes.data?.mid_skills
            ? (midRes.data.mid_skills as AgentMidSkill[]).map((s) => ({
                creator_skill_id: s.id,
                config: s.agent_config ?? s.config ?? {},
              }))
            : [];
        const postSkills: { creator_skill_id: number; config?: Record<string, unknown> }[] =
          postRes.success && postRes.data?.post_skills
            ? (postRes.data.post_skills as AgentPostSkill[]).map((s) => ({
                creator_skill_id: s.id,
                config: s.agent_config ?? s.config ?? {},
              }))
            : [];
        setTestDialogData({
          agent,
          systemPrompt: agent.system_prompt || "",
          examples,
          skills: (agent.config?.skills as string[]) ?? [],
          preSkills,
          midSkills,
          postSkills,
        });
      })
      .catch(() => setTestDialogAgentId(null))
      .finally(() => setTestDialogLoading(false));
  }, [testDialogAgentId, auth?.apiKey]);

  const openTestDialog = (agent: Agent) => {
    setTestDialogAgentId(agent.id);
  };

  const loadAgentsWithWorkspace = async (wsCode?: string) => {
    if (!auth?.apiKey) return;
    const code = wsCode ?? workspaceCode;
    setLoading(true);
    setError("");
    try {
      const [agentsRes, providersRes] = await Promise.all([
        listAgents(auth.apiKey, { workspaceCode: code && code !== "default" ? code : undefined }),
        getLLMProviders(auth.apiKey),
      ]);
      if (agentsRes.success && agentsRes.data) {
        setAgents(agentsRes.data.agents || []);
      } else {
        setError(agentsRes.error?.message || "加载失败");
      }
      if (providersRes.success && providersRes.data) {
        setLlmProviders(providersRes.data);
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth?.apiKey) return;
    const form = e.currentTarget;
    const code = (form.elements.namedItem("code") as HTMLInputElement).value.trim().toLowerCase();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLInputElement).value.trim();
    const systemPrompt = (form.elements.namedItem("system_prompt") as HTMLInputElement).value.trim();
    if (!code) {
      setError("Code 为必填（用于分享，系统唯一）");
      return;
    }
    if (!/^[a-z0-9_-]{2,64}$/.test(code)) {
      setError("Code 仅支持小写字母、数字、下划线、横线，2-64 字符");
      return;
    }
    if (!name) {
      setError("名称为必填");
      return;
    }
    setError("");
    try {
      const res = await createAgent(
        auth.apiKey,
        {
          code,
          name,
          description: description || undefined,
          system_prompt: systemPrompt || undefined,
          agent_type: createAgentType,
        },
        { workspaceCode: workspaceCode && workspaceCode !== "default" ? workspaceCode : undefined }
      );
      if (res.success) {
        setShowCreate(false);
        loadAgents();
      } else {
        setError(res.error?.message || "创建失败");
      }
    } catch {
      setError("创建失败");
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!auth?.apiKey) return;
    setDeleting(agent.id);
    setError("");
    try {
      const res = await deleteAgent(auth.apiKey, agent.id);
      if (res.success) {
        setViewing(null);
        setDeleteConfirmAgent(null);
        setDeleteConfirmInput("");
        loadAgents();
      } else {
        setError(res.error?.message || "删除失败");
      }
    } catch {
      setError("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const openDeleteConfirm = (agent: Agent) => {
    setDeleteConfirmAgent(agent);
    setDeleteConfirmInput("");
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmAgent(null);
    setDeleteConfirmInput("");
  };

  const handleView = async (agent: Agent) => {
    if (!auth?.apiKey) return;
    const res = await getAgent(auth.apiKey, agent.id);
    if (res.success && res.data) {
      setViewing(res.data);
    }
  };

  const typeLabel = (agent: Agent) => (agent.agent_type === "edge" ? "Edge" : "Cloud");
  const typeStyle = (agent: Agent) =>
    agent.agent_type === "edge"
      ? "bg-primary/10 text-primary"
      : "bg-primary/10 text-primary";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-secondary">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            {statusFilter === "archived" ? "存档的 Agent" : statusFilter === "draft" ? "草稿状态" : statusFilter === "running" ? "运行中" : "我的 Agent"}
          </h1>
          <p className="text-text-secondary text-sm">
            {statusFilter === "archived"
              ? `共 ${filteredAgents.length} 个已存档的 Agent`
              : statusFilter === "draft"
                ? `共 ${filteredAgents.length} 个草稿`
                : statusFilter === "running"
                  ? `共 ${filteredAgents.length} 个运行中的 Agent`
                  : "管理并监控您的 AI 数字人智能体"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <AddIcon className="w-5 h-5" />
          <span>新建 Agent</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* 新建 Agent 弹窗 */}
      <Modal open={!!showCreate} onClose={() => setShowCreate(false)} title="新建 Agent" maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Code *（系统唯一，用于分享）</label>
                <input
                  name="code"
                  required
                  pattern="[a-z0-9_-]{2,64}"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary"
                  placeholder="如 jess、my-agent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">名称 *</label>
                <input
                  name="name"
                  required
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary"
                  placeholder="Agent 名称"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">描述</label>
                <input
                  name="description"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">System Prompt</label>
                <textarea
                  name="system_prompt"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary"
                  placeholder="你是一个有帮助的助手。"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Agent 类型</label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      createAgentType === "cloud" ? "border-primary bg-primary/10" : "border-border hover:border-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="agent_type"
                      value="cloud"
                      checked={createAgentType === "cloud"}
                      onChange={() => setCreateAgentType("cloud")}
                      className="sr-only"
                    />
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${createAgentType === "cloud" ? "border-primary" : "border-border"}`}>
                      {createAgentType === "cloud" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Cloud</div>
                      <div className="text-xs text-text-secondary">云端处理</div>
                    </div>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      createAgentType === "edge" ? "border-primary bg-primary/10" : "border-border hover:border-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="agent_type"
                      value="edge"
                      checked={createAgentType === "edge"}
                      onChange={() => setCreateAgentType("edge")}
                      className="sr-only"
                    />
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${createAgentType === "edge" ? "border-primary" : "border-border"}`}>
                      {createAgentType === "edge" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Edge</div>
                      <div className="text-xs text-text-secondary">本地代理</div>
                    </div>
                  </label>
                </div>
                {createAgentType === "edge" && (
                  <p className="text-xs text-amber-500/90 mt-2">
                    Edge 模式：对话将通过 Edge Tunnel 转发到本地代理程序处理，需在本地运行 Edge Proxy。
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary">
                  取消
                </button>
                <button type="submit" className="px-4 py-2 bg-primary hover:opacity-90 text-white rounded-lg">
                  创建
                </button>
              </div>
        </form>
      </Modal>

      {/* 查看 Agent 弹窗 */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} maxWidth="lg" className="max-h-[80vh] overflow-y-auto">
        {viewing && (
          <>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-text-secondary">Code（分享用）</dt>
                <dd className="text-text-primary font-mono">{viewing.code || "-"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">描述</dt>
                <dd className="text-text-primary">{viewing.description || "-"}</dd>
              </div>
              {viewing.agent_type === "edge" ? (
                <div>
                  <dt className="text-text-secondary">上线状态</dt>
                  <dd className="text-text-primary flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${viewing.edge_status === "online" ? "text-green-600 dark:text-green-400" : "text-text-secondary"}`}>
                      <span className={`w-2 h-2 rounded-full ${viewing.edge_status === "online" ? "bg-green-500" : "bg-text-secondary"}`} />
                      {viewing.edge_status === "online" ? "已上线" : "未上线"}
                    </span>
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-text-secondary">模型</dt>
                  <dd className="text-text-primary">{viewing.model}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-secondary">状态</dt>
                <dd className="text-text-primary">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${getAgentStatusDisplay(viewing).style}`}>
                    {getAgentStatusDisplay(viewing).label}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">Agent 类型</dt>
                <dd className="text-text-primary flex items-center gap-2">
                  {viewing.agent_type === "edge" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">Edge</span>
                  ) : (
                    <span className="text-text-secondary">Cloud</span>
                  )}
                </dd>
              </div>
              {viewing.system_prompt && (
                <div>
                  <dt className="text-text-secondary">System Prompt</dt>
                  <dd className="text-text-primary whitespace-pre-wrap">{viewing.system_prompt}</dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => openDeleteConfirm(viewing)}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm rounded-lg"
              >
                删除
              </button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-text-secondary hover:text-text-primary">
                关闭
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* 测试聊天弹窗：与编辑页相同的 AgentTestDialog */}
      {testDialogLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="text-text-primary">加载中...</div>
        </div>
      )}
      {testDialogData && auth?.apiKey && (
        <AgentTestDialog
          agent={testDialogData.agent}
          agentId={testDialogData.agent.id}
          apiKey={auth.apiKey}
          systemPrompt={testDialogData.systemPrompt}
          examples={testDialogData.examples}
          skills={testDialogData.skills}
          preSkills={testDialogData.preSkills}
          midSkills={testDialogData.midSkills}
          postSkills={testDialogData.postSkills}
          onClose={() => {
            setTestDialogAgentId(null);
            setTestDialogData(null);
          }}
        />
      )}

      {/* 删除二次确认弹窗：需输入确认文案 */}
      <Modal
        open={!!deleteConfirmAgent}
        onClose={closeDeleteConfirm}
        title="确认删除"
        maxWidth="md"
        zIndex={60}
      >
        {deleteConfirmAgent && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              确定要删除 Agent「{deleteConfirmAgent.name}」吗？此操作不可恢复。请在下方输入
              <span className="font-medium text-text-primary">「我确认删除」</span>
              或
              <span className="font-medium text-text-primary">「I confirm to delete」</span>
              以确认。
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="请输入确认文案"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none text-sm"
              autoFocus
            />
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="px-4 py-2 text-text-secondary hover:text-text-primary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => isDeleteConfirmValid && handleDelete(deleteConfirmAgent)}
                disabled={!isDeleteConfirmValid || deleting === deleteConfirmAgent.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg"
              >
                {deleting === deleteConfirmAgent.id ? "删除中..." : "确认删除"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* 迁移 Agent 弹窗 */}
      {auth?.apiKey && (
        <AgentTransferModal
          open={!!transferAgent}
          onClose={() => setTransferAgent(null)}
          onSuccess={loadAgents}
          apiKey={auth.apiKey}
          agent={transferAgent}
        />
      )}

      {/* 卡片网格：按左侧状态筛选后的列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const avatar = getAgentAvatar(agent);
          const isOnline = agent.agent_type === "edge" && agent.edge_status === "online";
          return (
            <div
              key={agent.id}
              className="group relative bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-border overflow-hidden flex items-center justify-center text-text-primary font-medium shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        agent.name.charAt(0).toUpperCase() || "A"
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-surface rounded-full ${
                        isOnline ? "bg-green-500" : "bg-text-secondary"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${typeStyle(agent)}`}>
                      {typeLabel(agent)}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getAgentStatusDisplay(agent).style}`}>
                      {getAgentStatusDisplay(agent).label}
                    </span>
                    <span className="flex items-center text-[10px] text-text-secondary">
                      <ScheduleIcon className="w-3 h-3 mr-1" />
                      最近更新
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">{agent.name}</h3>
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  {[agent.code, agent.description || agent.model].filter(Boolean).join(" · ") || agent.status}
                </p>
                <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
                  {agent.agent_type === "edge" ? (
                    <span className={`px-2 py-0.5 border text-[10px] rounded ${agent.edge_status === "online" ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" : "bg-surface border-border text-text-secondary"}`}>
                      {agent.edge_status === "online" ? "已上线" : "未上线"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-surface border border-border text-text-secondary text-[10px] rounded">
                      {agent.llm_provider
                        ? llmProviders.find((p) => p.name === agent.llm_provider)?.display_name || agent.llm_provider
                        : "系统指定模型"}
                    </span>
                  )}
                </div>
              </div>
              {/* 悬浮操作层：编辑、测试聊天、查看、迁移、删除右对齐 */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-end gap-4 pr-6 transition-opacity duration-300">
                <Link
                  href={`/dashboard/agents/${agent.id}/edit`}
                  className="w-10 h-10 rounded-full bg-surface text-text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 shadow"
                  title="编辑"
                >
                  <EditIcon className="w-5 h-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => openTestDialog(agent)}
                  className="w-10 h-10 rounded-full bg-surface text-text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 shadow"
                  title="测试聊天"
                >
                  <ChatIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTransferAgent(agent)}
                  className="w-10 h-10 rounded-full bg-surface text-text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 shadow"
                  title="迁移"
                >
                  <TransferIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleView(agent)}
                  className="w-10 h-10 rounded-full bg-surface text-text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 shadow"
                  title="查看"
                >
                  <VisibilityIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(agent)}
                  className="w-10 h-10 rounded-full bg-surface text-text-primary flex items-center justify-center hover:bg-red-500 hover:text-white transition-all hover:scale-110 shadow"
                  title="删除"
                >
                  <DeleteIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
        {/* 从模板库快速创建 */}
        <Link
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            setShowCreate(true);
          }}
          className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-surface/50 transition-colors cursor-pointer group min-h-[240px]"
        >
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <AddIcon className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm font-bold text-text-secondary group-hover:text-text-primary">从模板库快速创建</p>
          <p className="text-xs text-text-secondary mt-1">查看 20+ 个官方预置模板</p>
        </Link>
      </div>

      {/* 右下角 API 状态 */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-40">
        <div className="bg-surface border border-border p-4 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-text-secondary">API 状态: 正常</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">并发对话: -</span>
          </div>
        </div>
      </div>
    </>
  );
}
