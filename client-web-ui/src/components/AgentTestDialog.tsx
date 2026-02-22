"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { simulateAgent, getAgentAvatar, getAgentWidgets, resolvePendingAttachments, clearUserMemories, getTestUserId, type PendingAttachment, type SendMessageAttachment } from "@/lib/api";
import type { Agent } from "@/lib/api";
import type { WidgetSpec } from "@/lib/widgets";
import type { Attachment } from "@/lib/widgets";
import { revokeBlobUrls } from "@/lib/widgets";
import { WidgetRenderer } from "@/components/widgets";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { DocumentUploadButton } from "@/components/DocumentUploadButton";
import { AudioPlayer } from "@/components/AudioPlayer";
import { MessageAttachments } from "@/components/MessageAttachments";
import type { MessageAttachment } from "@/lib/api";

function VoiceMessage({ content, audioUrl }: { content: string; audioUrl: string }) {
  const [showText, setShowText] = useState(false);
  return (
    <div>
      <AudioPlayer src={audioUrl} />
      <button
        type="button"
        onClick={() => setShowText((v) => !v)}
        className="text-xs text-text-secondary hover:text-text-primary mt-1.5 transition-colors"
      >
        {showText ? "隐藏文字 ▲" : "显示文字 ▼"}
      </button>
      {showText && (
        <p className="whitespace-pre-wrap text-sm text-text-secondary mt-1">{content}</p>
      )}
    </div>
  );
}

interface TestMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  audio_url?: string;
  attachments?: MessageAttachment[];
}

interface AgentTestDialogProps {
  agent: Agent;
  agentId: number;
  apiKey: string;
  systemPrompt: string;
  examples: { role: string; content: string }[];
  skills?: string[];
  /** 当前选中的对话前技能（用于过滤 widget，反映未保存的编辑） */
  preSkills?: { id: number; uuid: string }[];
  /** 当前选中的对话中技能（Test 时用页面选择，无需保存） */
  midSkills?: { creator_skill_id: number; config?: Record<string, unknown> }[];
  /** 当前选中的对话后技能（Test 时用页面选择，无需保存） */
  postSkills?: { creator_skill_id: number; config?: Record<string, unknown> }[];
  onClose: () => void;
}

export function AgentTestDialog({
  agent,
  agentId,
  apiKey,
  systemPrompt,
  examples,
  skills = [],
  preSkills,
  midSkills,
  postSkills,
  onClose,
}: AgentTestDialogProps) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [allWidgets, setAllWidgets] = useState<WidgetSpec[]>([]);
  const [widgetAttachments, setWidgetAttachments] = useState<Record<string, Attachment[]>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const avatarUrl = getAgentAvatar(agent);
  const avatarLetter = (agent.name || "A").charAt(0).toUpperCase();
  const isEdgeOffline = agent.agent_type === 'edge' && agent.edge_status !== 'online';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 点击菜单外部时关闭
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleClearMemory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearingMemory(true);
    try {
      const testUserId = await getTestUserId(apiKey, agentId);
      if (testUserId) {
        const res = await clearUserMemories(apiKey, testUserId, agentId);
        if (res.success) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), role: "assistant", content: "🧹 已清除所有长期记忆。" },
          ]);
        } else {
          setError(res.error?.message || "清除记忆失败");
        }
      } else {
        setError("未找到测试用户，无法清除记忆");
      }
    } catch {
      setError("清除记忆失败");
    } finally {
      setClearingMemory(false);
      setShowMenu(false);
      setConfirmClear(false);
    }
  };

  useEffect(() => {
    getAgentWidgets(apiKey, agentId).then((res) => {
      if (res.success && res.data?.widgets) {
        setAllWidgets(res.data.widgets as WidgetSpec[]);
      } else {
        setAllWidgets([]);
      }
    });
  }, [apiKey, agentId]);

  // 若传入 preSkills，则只显示当前选中的 widget（反映未保存的编辑，解决移除后 Test 仍显示的问题）
  const widgets = useMemo(() => {
    if (preSkills === undefined) return allWidgets;
    const allowedUuids = new Set(preSkills.map((p) => p.uuid));
    return allWidgets.filter((w) => allowedUuids.has(w.skill_id));
  }, [allWidgets, preSkills]);

  const handleWidgetAttachments = useCallback((widgetId: string, attachments: Attachment[]) => {
    setWidgetAttachments((prev) => {
      revokeBlobUrls(prev[widgetId] || []);
      const next = { ...prev };
      if (attachments.length === 0) delete next[widgetId];
      else next[widgetId] = attachments;
      return next;
    });
  }, []);

  const sendMessage = async (content: string) => {
    const allAttachments: Attachment[] = [];
    Object.values(widgetAttachments).forEach((arr) => allAttachments.push(...arr));
    const hasContent = content.trim() || allAttachments.length > 0;
    if (!hasContent || sending) return;
    const textContent = content.trim() || "请分析以上附件";
    setSending(true);
    setError("");
    setInput("");
    revokeBlobUrls(allAttachments);
    setWidgetAttachments({});

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const attachmentsToSend = await resolvePendingAttachments(apiKey, allAttachments as unknown as PendingAttachment[]);
      const userMsg: TestMessage = {
        id: Date.now(),
        role: "user",
        content: textContent,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend.map((a) => ({ type: a.type, token: a.token, mime_type: a.mime_type, name: a.name })) : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      const res = await simulateAgent(
        apiKey,
        agentId,
        textContent,
        history,
        systemPrompt || undefined,
        examples.length > 0 ? examples : undefined,
        skills.length > 0 ? skills : undefined,
        attachmentsToSend.length > 0 ? (attachmentsToSend as SendMessageAttachment[]) : undefined,
        midSkills,
        postSkills
      );
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: res.data!.content,
            audio_url: res.data!.audio_url,
            attachments: res.data!.attachments,
          },
        ]);
      } else {
        setError(res.error?.message || "发送失败");
      }
    } catch {
      setError("发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allAttachments: Attachment[] = [];
    Object.values(widgetAttachments).forEach((arr) => allAttachments.push(...arr));
    const hasContent = input.trim() || allAttachments.length > 0;
    if (!hasContent) return;
    sendMessage(input.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-medium overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <div>
              <h2 className="font-medium text-text-primary">{agent.name} - 测试对话</h2>
              <p className="text-xs text-text-secondary">此对话仅用于测试，不会存入会话记录</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {agent.memory_enabled && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => { setShowMenu((v) => !v); setConfirmClear(false); }}
                  className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="菜单"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={handleClearMemory}
                      disabled={clearingMemory}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                        confirmClear
                          ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          : "text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {clearingMemory
                        ? "清除中..."
                        : confirmClear
                          ? "⚠ 确认清除所有记忆？"
                          : "🧹 清除长期记忆"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Edge offline warning */}
        {isEdgeOffline && (
          <div className="px-4 py-2 bg-amber-500/10 dark:bg-amber-900/30 border-b border-amber-500/30 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Edge 代理未连接，无法测试对话。请先启动 Edge Proxy。
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-background/30">
          {messages.length === 0 ? (
            <div className="text-center text-text-secondary py-12 text-sm">
              {isEdgeOffline
                ? "Edge 代理离线中，请先启动 Edge Proxy 后再测试"
                : "输入消息与 Agent 对话测试，对话内容不会保存"}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-text-primary"
                  }`}
                >
                  {msg.audio_url ? (
                    <VoiceMessage content={msg.content} audioUrl={msg.audio_url} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.attachments &&
                    Array.isArray(msg.attachments) &&
                    msg.attachments.length > 0 && (
                      <MessageAttachments
                        attachments={msg.attachments}
                        isUser={msg.role === "user"}
                      />
                    )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-text-secondary text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
                <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.2s]" />
                <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.4s]" />
                <span className="ml-1">正在回复...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {error && (
          <div className="px-4 py-2 text-red-500 text-sm shrink-0">{error}</div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0 bg-surface">
          {widgets.filter((w) => w.type !== "image_upload" && w.type !== "document_upload").length > 0 && (
            <div className="mb-3 space-y-2">
              {widgets
                .filter((w) => w.type !== "image_upload" && w.type !== "document_upload")
                .map((w) => (
                  <WidgetRenderer
                    key={w.id}
                    spec={w}
                    onAttachments={(attachments) => handleWidgetAttachments(w.id, attachments)}
                    onError={(msg) => setError(msg)}
                    disabled={sending}
                  />
                ))}
            </div>
          )}
          <div className="flex gap-2">
            {widgets.some((w) => w.type === "image_upload") && (() => {
              const imageWidget = widgets.find((w) => w.type === "image_upload");
              const imageAttachments = imageWidget ? widgetAttachments[imageWidget.id] ?? [] : [];
              const imageAttachment = imageAttachments[0] ?? null;
              return (
                <ImageUploadButton
                  key="image"
                  apiKey={apiKey}
                  attachment={imageAttachment}
                  onUploaded={(att) => {
                    if (imageWidget) {
                      handleWidgetAttachments(imageWidget.id, [
                        { ...att, widget_id: imageWidget.id, skill_id: imageWidget.skill_id },
                      ]);
                    }
                  }}
                  onError={(msg) => setError(msg)}
                  disabled={sending || isEdgeOffline}
                />
              );
            })()}
            {widgets.some((w) => w.type === "document_upload") && (() => {
              const docWidget = widgets.find((w) => w.type === "document_upload");
              const docAttachments = docWidget ? widgetAttachments[docWidget.id] ?? [] : [];
              const docAttachment = docAttachments[0] ?? null;
              return (
                <DocumentUploadButton
                  key="document"
                  apiKey={apiKey}
                  attachment={docAttachment}
                  onUploaded={(att) => {
                    if (docWidget) {
                      handleWidgetAttachments(docWidget.id, [
                        { ...att, widget_id: docWidget.id, skill_id: docWidget.skill_id },
                      ]);
                    }
                  }}
                  onClear={() => {
                    if (docWidget) {
                      handleWidgetAttachments(docWidget.id, []);
                    }
                  }}
                  onError={(msg) => setError(msg)}
                  disabled={sending || isEdgeOffline}
                />
              );
            })()}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isEdgeOffline ? "Edge 代理未连接..." : "输入消息测试..."}
              disabled={sending || isEdgeOffline}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                sending ||
                isEdgeOffline ||
                (!input.trim() && Object.values(widgetAttachments).flat().length === 0)
              }
              className="px-5 py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium"
              title={isEdgeOffline ? "Edge 代理未连接，无法测试" : undefined}
            >
              {sending ? "发送中..." : "发送"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
