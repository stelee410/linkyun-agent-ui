"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
  listAgents,
  listSharedUsers,
  listSharedSessions,
  getSessionMessages,
  verifySession,
  updateSessionPrompt,
  getUserAgentPrompt,
  setUserAgentPrompt,
  pushMessage,
  getAgentAvatar,
  type Agent,
  type Session,
  type Message,
  type SharedUser,
} from "@/lib/api";
import { MessageAttachments } from "@/components/MessageAttachments";
import { Modal } from "@/components/ui/Modal";

export default function SessionsPage() {
  const auth = getAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [sharedSessions, setSharedSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionPrompt, setSessionPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSessionPrompt, setSavingSessionPrompt] = useState(false);
  const [savingUserPrompt, setSavingUserPrompt] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sessionPromptModalOpen, setSessionPromptModalOpen] = useState(false);
  const [userPromptModalOpen, setUserPromptModalOpen] = useState(false);
  const [creatorComment, setCreatorComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const loadAgents = useCallback(async () => {
    if (!auth?.apiKey) return;
    try {
      const res = await listAgents(auth.apiKey);
      if (res.success && res.data) {
        const list = (res.data as { agents?: Agent[] }).agents ?? [];
        setAgents(list);
        if (list.length > 0 && !selectedAgentId) {
          setSelectedAgentId(list[0].id);
        }
      }
    } catch {
      setError("加载 Agents 失败");
    } finally {
      setLoading(false);
    }
  }, [auth?.apiKey, selectedAgentId]);

  useEffect(() => {
    if (!auth?.apiKey) return;
    loadAgents();
  }, [auth?.apiKey, loadAgents]);

  useEffect(() => {
    if (!auth?.apiKey || !selectedAgentId) return;
    setError("");
    setSelectedUserId(null);
    setSelectedSession(null);
    const load = async () => {
      const res = await listSharedUsers(auth.apiKey, selectedAgentId);
      if (res.success && res.data) {
        setSharedUsers((res.data as { users: SharedUser[] }).users ?? []);
      } else {
        setSharedUsers([]);
      }
    };
    load();
  }, [auth?.apiKey, selectedAgentId]);

  useEffect(() => {
    if (!auth?.apiKey || !selectedAgentId || !selectedUserId) return;
    setSelectedSession(null);
    const load = async () => {
      const res = await listSharedSessions(auth.apiKey, selectedAgentId, selectedUserId);
      if (res.success && res.data) {
        setSharedSessions((res.data as { sessions: Session[] }).sessions ?? []);
      } else {
        setSharedSessions([]);
      }
    };
    load();
  }, [auth?.apiKey, selectedAgentId, selectedUserId]);

  useEffect(() => {
    if (!auth?.apiKey || !selectedSession) {
      setMessages([]);
      setSessionPrompt("");
      return;
    }
    const loadMessages = async () => {
      const res = await getSessionMessages(auth!.apiKey, selectedSession.id);
      if (res.success && res.data) {
        setMessages((res.data as { messages: Message[] }).messages ?? []);
      } else {
        setMessages([]);
      }
    };
    loadMessages();
    setSessionPrompt(selectedSession.custom_prompt_patch ?? "");
  }, [auth?.apiKey, selectedSession]);

  useEffect(() => {
    if (!auth?.apiKey || !selectedAgentId || !selectedUserId) {
      setUserPrompt("");
      return;
    }
    const load = async () => {
      const res = await getUserAgentPrompt(auth.apiKey, selectedAgentId, selectedUserId);
      if (res.success && res.data) {
        setUserPrompt((res.data as { prompt?: string }).prompt ?? "");
      } else {
        setUserPrompt("");
      }
    };
    load();
  }, [auth?.apiKey, selectedAgentId, selectedUserId]);

  const handleVerify = async () => {
    if (!auth?.apiKey || !selectedSession) return;
    setVerifying(true);
    setError("");
    try {
      const res = await verifySession(auth.apiKey, selectedSession.id, !selectedSession.verified);
      if (res.success && res.data) {
        setSelectedSession((s) => (s ? { ...s, verified: (res.data as { verified: boolean }).verified } : null));
        setSharedSessions((prev) =>
          prev.map((s) => (s.id === selectedSession.id ? { ...s, verified: (res.data as { verified: boolean }).verified } : s))
        );
      } else {
        setError(res.error?.message ?? "操作失败");
      }
    } catch {
      setError("操作失败");
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveSessionPrompt = async () => {
    if (!auth?.apiKey || !selectedSession) return;
    setSavingSessionPrompt(true);
    setError("");
    try {
      const res = await updateSessionPrompt(auth.apiKey, selectedSession.id, sessionPrompt);
      if (!res.success) {
        setError(res.error?.message ?? "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSavingSessionPrompt(false);
    }
  };

  const handleSendCreatorComment = async () => {
    const text = creatorComment.trim();
    if (!text || !auth?.apiKey || !selectedSession) return;
    setSendingComment(true);
    setError("");
    try {
      const content = `[创作者评论] ${text}`;
      const params = {
        user_id: selectedSession.user_id,
        sender_agent_id: selectedSession.agent_id,
        sender_name: "创作者",
        content,
      };
      if (selectedSession.is_group) {
        (params as Record<string, unknown>).group_id = selectedSession.id;
      } else {
        (params as Record<string, unknown>).session_id = selectedSession.id;
      }
      const res = await pushMessage(auth.apiKey, params as Parameters<typeof pushMessage>[1]);
      if (res.success) {
        setCreatorComment("");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            uuid: (res.data as { message_id: string }).message_id,
            session_id: selectedSession.id,
            role: "assistant",
            content,
            content_type: "text",
            sender_agent_id: selectedSession.agent_id,
            sender_name: "创作者",
            created_at: new Date().toISOString(),
          } as Message,
        ]);
      } else {
        setError(res.error?.message ?? "发送失败");
      }
    } catch {
      setError("发送失败");
    } finally {
      setSendingComment(false);
    }
  };

  const handleSaveUserPrompt = async () => {
    if (!auth?.apiKey || !selectedAgentId || !selectedUserId) return;
    setSavingUserPrompt(true);
    setError("");
    try {
      const res = await setUserAgentPrompt(auth.apiKey, selectedAgentId, selectedUserId, userPrompt);
      if (!res.success) {
        setError(res.error?.message ?? "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSavingUserPrompt(false);
    }
  };

  const getAgentName = (id: number) => agents.find((a) => a.id === id)?.name ?? `Agent #${id}`;

  if (!auth?.apiKey) return null;

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-text-secondary">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden">
      {error && (
        <div className="px-4 py-2 bg-red-500/10 text-red-500 text-sm border-b border-border">
          {error}
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Column 1: Agents */}
        <div className="w-48 flex-shrink-0 border-r border-border flex flex-col bg-surface/50">
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-secondary uppercase tracking-wider">
            我的 Agent
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {agents.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-4">
                暂无 Agent
                <Link href="/dashboard" className="block text-primary mt-1 hover:underline">
                  去创建
                </Link>
              </div>
            ) : (
              agents.map((a) => {
                const avatarUrl = getAgentAvatar(a);
                const avatarLetter = (a.name || "A").charAt(0).toUpperCase();
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgentId(a.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                      selectedAgentId === a.id ? "bg-primary/15 text-primary font-medium" : "text-text-primary hover:bg-surface"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-surface border border-border overflow-hidden flex items-center justify-center shrink-0 text-xs font-medium">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        avatarLetter
                      )}
                    </div>
                    <span className="truncate">{a.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Shared Users */}
        <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-surface/30">
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-secondary uppercase tracking-wider">
            共享用户
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!selectedAgentId ? (
              <div className="text-text-secondary text-sm py-4">请先选择 Agent</div>
            ) : sharedUsers.length === 0 ? (
              <div className="text-text-secondary text-sm py-4">暂无共享会话用户</div>
            ) : (
              sharedUsers.map((u) => {
                const userLetter = (u.username || "U").charAt(0).toUpperCase();
                return (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUserId(u.user_id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                      selectedUserId === u.user_id ? "bg-primary/15 text-primary font-medium" : "text-text-primary hover:bg-surface"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 overflow-hidden flex items-center justify-center shrink-0 text-xs font-semibold">
                      {userLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.username}</div>
                      <div className="text-xs text-text-secondary">{u.session_count} 个会话</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Sessions */}
        <div className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-surface/30">
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-secondary uppercase tracking-wider">
            会话列表
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!selectedUserId ? (
              <div className="text-text-secondary text-sm py-4">请先选择用户</div>
            ) : sharedSessions.length === 0 ? (
              <div className="text-text-secondary text-sm py-4">暂无共享会话</div>
            ) : (
              sharedSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSession?.id === s.id ? "bg-primary/15 text-primary font-medium" : "text-text-primary hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {s.title?.trim() || `会话 #${s.id}`}
                    {s.is_group && (
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary" title="群聊">群</span>
                    )}
                    {s.verified && (
                      <span className="text-emerald-500 shrink-0" title="已认证">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">{s.message_count} 条 · {s.status}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 4: Conversation */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
            <div className="text-sm text-text-primary truncate">
              {selectedSession ? (
                <>
                  {selectedSession.title?.trim()
                    ? selectedSession.title.trim()
                    : `${getAgentName(selectedSession.agent_id)} · 会话 #${selectedSession.id}`}
                  {selectedSession.is_group && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">群聊</span>
                  )}
                  {selectedSession.verified && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓ 已认证</span>
                  )}
                </>
              ) : (
                <span className="text-text-secondary">选择会话查看对话</span>
              )}
            </div>
            {selectedSession && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedSession.verified
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-surface border border-border text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {verifying ? "..." : selectedSession.verified ? "✓ Verified" : "Mark Verified"}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
            {!selectedSession ? (
              <div className="flex items-center justify-center flex-1 text-text-secondary text-sm">
                选择会话以查看聊天记录
              </div>
            ) : (
              <>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                暂无消息
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                {messages
                  .filter((msg) => msg.role !== "system" && msg.role !== "tool")
                  .map((msg) => {
                    const senderLabel =
                      msg.role === "user"
                        ? "用户"
                        : msg.sender_name?.trim() || getAgentName(msg.sender_agent_id ?? selectedSession?.agent_id ?? 0);
                    return (
                      <div key={msg.id} className="text-sm">
                        <span className="font-medium text-primary shrink-0">{senderLabel}：</span>
                        <span className="text-text-primary whitespace-pre-wrap">{msg.content}</span>
                        {msg.attachments &&
                          Array.isArray(msg.attachments) &&
                          msg.attachments.length > 0 && (
                            <div className="mt-2">
                              <MessageAttachments
                                attachments={msg.attachments}
                                isUser={msg.role === "user"}
                              />
                            </div>
                          )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 创作者评论输入 */}
            {selectedSession && (
              <div className="mt-4 pt-4 border-t border-border shrink-0">
                <label className="block text-xs font-medium text-text-secondary mb-2">创作者评论（将推送至用户）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={creatorComment}
                    onChange={(e) => setCreatorComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendCreatorComment()}
                    placeholder="输入评论，将作为 [创作者评论] 推送给用户"
                    disabled={sendingComment}
                    className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSendCreatorComment}
                    disabled={!creatorComment.trim() || sendingComment}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {sendingComment ? "发送中..." : "发送"}
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>

        {/* Column 5: Prompt Editor */}
        <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-surface/50 min-h-0">
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-secondary uppercase tracking-wider shrink-0">
            Prompt 编辑
          </div>
          <div className="flex-1 flex flex-col min-h-0 p-3 gap-4 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 gap-1.5">
              <label className="block text-xs font-medium text-text-secondary shrink-0">会话级 Prompt</label>
              <button
                type="button"
                onClick={() => setSessionPromptModalOpen(true)}
                disabled={!selectedSession}
                className="flex-1 min-h-0 w-full px-3 py-3 text-left text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border overflow-y-auto whitespace-pre-wrap break-words"
              >
                {sessionPrompt || "点击编辑针对当前会话的 Prompt..."}
              </button>
              <button
                type="button"
                onClick={handleSaveSessionPrompt}
                disabled={!selectedSession || savingSessionPrompt}
                className="w-full py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {savingSessionPrompt ? "保存中..." : "保存"}
              </button>
            </div>
            <div className="flex-1 flex flex-col min-h-0 gap-1.5">
              <label className="block text-xs font-medium text-text-secondary shrink-0">用户级 Prompt</label>
              <button
                type="button"
                onClick={() => setUserPromptModalOpen(true)}
                disabled={!selectedUserId}
                className="flex-1 min-h-0 w-full px-3 py-3 text-left text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border overflow-y-auto whitespace-pre-wrap break-words"
              >
                {userPrompt || "点击编辑针对该用户的 Prompt（所有会话生效）..."}
              </button>
              <button
                type="button"
                onClick={handleSaveUserPrompt}
                disabled={!selectedUserId || savingUserPrompt}
                className="w-full py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {savingUserPrompt ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 会话级 Prompt 大弹窗 */}
      <Modal
        open={sessionPromptModalOpen}
        onClose={() => setSessionPromptModalOpen(false)}
        title="会话级 Prompt"
        maxWidth="3xl"
        className="max-h-[85vh] flex flex-col"
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto px-0.5">
          <p className="text-sm text-text-secondary mb-3">针对当前会话的 Prompt 补丁，仅在此会话中生效。</p>
          <textarea
            value={sessionPrompt}
            onChange={(e) => setSessionPrompt(e.target.value)}
            placeholder="输入针对当前会话的 Prompt 补丁..."
            rows={14}
            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none resize-y min-h-[320px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setSessionPromptModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-surface transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSaveSessionPrompt();
                setSessionPromptModalOpen(false);
              }}
              disabled={!selectedSession || savingSessionPrompt}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSessionPrompt ? "保存中..." : "保存并关闭"}
            </button>
          </div>
        </div>
      </Modal>

      {/* 用户级 Prompt 大弹窗 */}
      <Modal
        open={userPromptModalOpen}
        onClose={() => setUserPromptModalOpen(false)}
        title="用户级 Prompt"
        maxWidth="3xl"
        className="max-h-[85vh] flex flex-col"
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto px-0.5">
          <p className="text-sm text-text-secondary mb-3">针对该用户的 Prompt，在该用户与此 Agent 的所有会话中生效。</p>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="输入针对该用户的 Prompt..."
            rows={14}
            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none resize-y min-h-[320px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setUserPromptModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-surface transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSaveUserPrompt();
                setUserPromptModalOpen(false);
              }}
              disabled={!selectedUserId || savingUserPrompt}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingUserPrompt ? "保存中..." : "保存并关闭"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
