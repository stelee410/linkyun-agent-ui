"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "@/lib/auth";
import {
  getSessionMessages,
  sendMessage,
  sendMessageStream,
  listAgents,
  createSession,
  getSession,
  getAgentWidgets,
  resolvePendingAttachments,
  getBaseUrl,
  type Agent,
  type Message,
  type PendingAttachment,
  type SendMessageAttachment,
} from "@/lib/api";
import type { Attachment } from "@/lib/widgets";
import { revokeBlobUrls } from "@/lib/widgets";
import { WidgetRenderer } from "@/components/widgets";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { DocumentUploadButton } from "@/components/DocumentUploadButton";
import { MessageAttachments } from "@/components/MessageAttachments";

function VoiceMessage({ content, audioUrl }: { content: string; audioUrl: string }) {
  const [showText, setShowText] = useState(false);
  return (
    <div>
      <AudioPlayer src={audioUrl} />
      <button
        type="button"
        onClick={() => setShowText((v) => !v)}
        className="text-xs text-zinc-500 hover:text-zinc-300 mt-1.5 transition-colors"
      >
        {showText ? "隐藏文字 ▲" : "显示文字 ▼"}
      </button>
      {showText && (
        <p className="text-sm whitespace-pre-wrap text-zinc-400 mt-1">{content}</p>
      )}
    </div>
  );
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const auth = getAuth();
  const [sessionId, setSessionId] = useState<number | null>(
    sessionIdParam ? parseInt(sessionIdParam, 10) : null
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [widgets, setWidgets] = useState<import("@/lib/widgets").WidgetSpec[]>([]);
  const [widgetAttachments, setWidgetAttachments] = useState<Record<string, Attachment[]>>({});
  const [widgetMetadata, setWidgetMetadata] = useState<Record<string, unknown>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth?.apiKey) return;
    loadAgents();
  }, [auth?.apiKey]);

  useEffect(() => {
    if (sessionId && auth?.apiKey) {
      loadMessages();
    } else {
      setLoading(false);
    }
  }, [sessionId, auth?.apiKey]);

  // 进入会话时获取 Widget 列表（需先有 agent_id）
  useEffect(() => {
    if (!sessionId || !auth?.apiKey) return;
    const loadWidgets = async () => {
      let agentId: number;
      if (selectedAgent) {
        agentId = selectedAgent.id;
      } else {
        const sessionRes = await getSession(auth.apiKey, sessionId);
        if (!sessionRes.success || !sessionRes.data) return;
        agentId = sessionRes.data.agent_id;
      }
      const res = await getAgentWidgets(auth.apiKey, agentId);
      if (res.success && res.data?.widgets) {
        setWidgets(res.data.widgets as import("@/lib/widgets").WidgetSpec[]);
      } else {
        setWidgets([]);
      }
    };
    loadWidgets();
  }, [sessionId, auth?.apiKey, selectedAgent?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAgents = async () => {
    if (!auth?.apiKey) return;
    const res = await listAgents(auth.apiKey);
    if (res.success && res.data) {
      setAgents(res.data.agents || []);
    }
  };

  const loadMessages = async () => {
    if (!sessionId || !auth?.apiKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSessionMessages(auth.apiKey, sessionId);
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
      } else {
        setError(res.error?.message || "加载消息失败");
      }
    } catch {
      setError("加载消息失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgent = async (agent: Agent) => {
    if (!auth?.apiKey) return;
    setSelectedAgent(agent);
    setError("");
    setSending(true);
    try {
      const res = await createSession(auth.apiKey, agent.id, 1);
      if (res.success && res.data) {
        setSessionId(res.data.id);
        setMessages([]);
      } else {
        setError(res.error?.message || "创建会话失败");
      }
    } catch {
      setError("创建会话失败");
    } finally {
      setSending(false);
    }
  };

  const handleWidgetAttachments = useCallback((widgetId: string, attachments: Attachment[]) => {
    setWidgetAttachments((prev) => {
      revokeBlobUrls(prev[widgetId] || []);
      const next = { ...prev };
      if (attachments.length === 0) {
        delete next[widgetId];
      } else {
        next[widgetId] = attachments;
      }
      return next;
    });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const allAttachmentsForCheck: Attachment[] = [];
    Object.values(widgetAttachments).forEach((arr) => allAttachmentsForCheck.push(...arr));
    const hasContent = input.trim() || allAttachmentsForCheck.length > 0;
    if (!hasContent || !sessionId || !auth?.apiKey) return;
    const content = input.trim() || "请分析以上附件";
    setInput("");
    setSending(true);
    setError("");

    // 收集所有 Widget 的 attachments，发送时再上传待处理的
    const allAttachments: Attachment[] = [];
    Object.values(widgetAttachments).forEach((arr) => allAttachments.push(...arr));
    const attachmentsToSend = await resolvePendingAttachments(auth!.apiKey, allAttachments as unknown as PendingAttachment[]);
    const customFields =
      Object.keys(widgetMetadata).length > 0 ? { custom_fields: widgetMetadata } : undefined;

    // 乐观更新：先显示用户消息
    const tempAssistantId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        uuid: "",
        session_id: sessionId,
        role: "user",
        content,
        content_type: "text",
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        created_at: new Date().toISOString(),
      } as Message,
      {
        id: tempAssistantId,
        uuid: "",
        session_id: sessionId,
        role: "assistant",
        content: "",
        content_type: "text",
        created_at: new Date().toISOString(),
      } as Message,
    ]);

    const opts = {
      attachments: attachmentsToSend.length > 0 ? (attachmentsToSend as SendMessageAttachment[]) : undefined,
      metadata: customFields,
    };

    const tryStream = async () => {
      await sendMessageStream(auth.apiKey, sessionId, content, opts, {
        onChunk: (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, content: m.content + text } : m
            )
          );
        },
        onDone: (messageId) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, uuid: messageId } : m
            )
          );
        },
      });
    };

    const tryNonStream = async () => {
      const res = await sendMessage(auth.apiKey, sessionId, content, opts);
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  uuid: res.data!.message_id,
                  content: res.data!.content,
                  attachments: res.data!.attachments,
                  audio_url: res.data!.audio_url,
                  metadata: res.data!.docx_url ? { docx_url: res.data!.docx_url } : m.metadata,
                }
              : m
          )
        );
      } else {
        setError(res.error?.message || "发送失败");
        setInput(content);
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
      }
    };

    try {
      try {
        await tryStream();
      } catch {
        await tryNonStream();
      }
    } catch {
      setError("发送失败");
      setInput(content);
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
    } finally {
      setSending(false);
      revokeBlobUrls(allAttachments);
      setWidgetAttachments({});
      setWidgetMetadata({});
    }
  };

  if (!auth?.apiKey) return null;

  // 无 session：选择 Agent 开始对话
  if (!sessionId) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] p-6">
        <h2 className="text-lg font-medium text-white mb-4">选择 Agent 开始对话</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {agents.length === 0 ? (
          <p className="text-zinc-400">暂无 Agent，请先创建</p>
        ) : (
          <div className="grid gap-3 max-w-md">
            {agents.map((agent) => {
              const edgeOffline = agent.agent_type === 'edge' && agent.edge_status !== 'online';
              return (
                <button
                  key={agent.id}
                  onClick={() => !edgeOffline && handleSelectAgent(agent)}
                  disabled={sending || edgeOffline}
                  className={`p-4 text-left bg-zinc-900/50 border border-zinc-800 rounded-xl transition-colors ${
                    edgeOffline
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-indigo-500/50 hover:bg-zinc-900'
                  } disabled:opacity-50`}
                  title={edgeOffline ? '该 Agent 的 Edge 代理未连接，暂时无法对话' : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{agent.name}</span>
                    {agent.agent_type === 'edge' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        agent.edge_status === 'online'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {agent.edge_status === 'online' ? 'Edge Online' : 'Edge Offline'}
                      </span>
                    )}
                  </div>
                  <span className="block text-sm text-zinc-500 mt-0.5">
                    {edgeOffline
                      ? '创作者未启动 Edge 代理，暂时无法对话'
                      : agent.description || agent.model}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 有 session：聊天界面
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-400">
            加载消息...
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
            发送消息开始对话
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => {
              const audioUrl =
                msg.audio_url ||
                (msg.metadata?.audio_url as string | undefined);
              const docxUrl =
                (msg.metadata?.docx_url as string | undefined);
              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-xl ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    {audioUrl ? (
                      <VoiceMessage content={msg.content} audioUrl={audioUrl} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content || (sending ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                        ) : null)}
                      </p>
                    )}
                    {docxUrl && (
                      <a
                        href={`${getBaseUrl()}${docxUrl}`}
                        download="document.docx"
                        className="flex items-center gap-1.5 mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        下载 Word 文档
                      </a>
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
              );
            })}
            {sending && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:0.2s]" />
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:0.4s]" />
                  <span className="ml-1">正在调用大模型...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-zinc-800 bg-zinc-900/30"
      >
        {widgets.filter((w) => w.type !== "image_upload" && w.type !== "document_upload").length > 0 && (
          <div className="max-w-2xl mx-auto mb-3 space-y-3">
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
        <div className="max-w-2xl mx-auto flex gap-2">
          {widgets.some((w) => w.type === "image_upload") && (() => {
            const imageWidget = widgets.find((w) => w.type === "image_upload");
            const imageAttachments = imageWidget ? widgetAttachments[imageWidget.id] ?? [] : [];
            const imageAttachment = imageAttachments[0] ?? null;
            return (
              <ImageUploadButton
                key="image"
                apiKey={auth?.apiKey ?? ""}
                attachment={imageAttachment}
                onUploaded={(att) => {
                  if (imageWidget) {
                    handleWidgetAttachments(imageWidget.id, [
                      { ...att, widget_id: imageWidget.id, skill_id: imageWidget.skill_id },
                    ]);
                  }
                }}
                onError={(msg) => setError(msg)}
                disabled={sending}
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
                apiKey={auth?.apiKey ?? ""}
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
                disabled={sending}
              />
            );
          })()}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={
              sending ||
              (!input.trim() && Object.values(widgetAttachments).flat().length === 0)
            }
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
          >
            {sending ? "发送中..." : "发送"}
          </button>
        </div>
      </form>
    </div>
  );
}
