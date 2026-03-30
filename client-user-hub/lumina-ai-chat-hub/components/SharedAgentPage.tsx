import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  enterShare,
  createGuestSession,
  deleteGuestSession,
  getGuestMessages,
  sendGuestMessageStream,
  getBaseUrl,
  type PublicShareAgent,
  type PublicShareSession,
} from '../services/api';
import { PLACEHOLDER } from '../lib/placeholder';
import { useVoiceInput } from '../hooks/useVoiceInput';

const DOUBAO_ASR_APP_ID = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_DOUBAO_ASR_APP_ID;
const DOUBAO_ASR_ACCESS_TOKEN = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_DOUBAO_ASR_ACCESS_TOKEN;

const SHARE_USER_CODE_KEY = 'linkyun_share_user_code';

interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  streaming?: boolean;
}

interface Props {
  shareToken: string;
}

const SharedAgentPage: React.FC<Props> = ({ shareToken }) => {
  const [agent, setAgent] = useState<PublicShareAgent | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDesignSheet, setShowDesignSheet] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [inCancelZone, setInCancelZone] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pressStartYRef = useRef(0);
  const isPressingRef = useRef(false);
  const allSessionsRef = useRef<PublicShareSession[]>([]);

  const isVoiceEnabled = !!(DOUBAO_ASR_APP_ID && DOUBAO_ASR_ACCESS_TOKEN);

  const voice = useVoiceInput({
    appId: DOUBAO_ASR_APP_ID,
    accessToken: DOUBAO_ASR_ACCESS_TOKEN,
    onFinalResult: (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
    onError: (msg) => {
      setVoiceError(msg);
      setTimeout(() => setVoiceError(null), 3000);
    },
  });

  const isVoiceBusy = voice.state === 'recording' || voice.state === 'processing';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const savedCode = localStorage.getItem(SHARE_USER_CODE_KEY) || undefined;
      const res = await enterShare(shareToken, savedCode);
      if (!res.success || !res.data) {
        setError(res.error?.message || '链接无效或已过期');
        setLoading(false);
        return;
      }

      const data = res.data;
      setAgent(data.agent);

      const code = data.user_code || savedCode || '';
      if (data.user_code) {
        localStorage.setItem(SHARE_USER_CODE_KEY, data.user_code);
      }
      setUserCode(code);

      if (data.sessions && data.sessions.length > 0) {
        allSessionsRef.current = data.sessions;
        const latest = data.sessions[data.sessions.length - 1];
        setActiveSessionId(latest.id);
        await loadMessages(code, latest.id);
      } else if (data.session) {
        allSessionsRef.current = [data.session];
        setActiveSessionId(data.session.id);
        await loadMessages(code, data.session.id);
      }

      setLoading(false);
    };
    init();
  }, [shareToken]);

  const loadMessages = async (code: string, sessionId: number) => {
    const res = await getGuestMessages(shareToken, code, sessionId);
    if (res.success && res.data) {
      setMessages(
        (res.data as Array<{ id: number; uuid: string; role: string; content: string; created_at: string }>).map((m) => ({
          id: String(m.id),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          created_at: m.created_at,
        }))
      );
    }
  };

  const handleNewSession = async () => {
    if (!userCode) return;

    const oldSessions = allSessionsRef.current;
    for (const s of oldSessions) {
      await deleteGuestSession(shareToken, userCode, s.id);
    }

    const res = await createGuestSession(shareToken, userCode);
    if (res.success && res.data) {
      allSessionsRef.current = [res.data];
      setActiveSessionId(res.data.id);
      setMessages([]);
    }
  };

  const handleExportPDF = async () => {
    if (messages.length === 0 || exporting) return;
    setExporting(true);

    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const { default: jsPDF } = await import('jspdf');

      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;padding:24px;background:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111';

      const title = document.createElement('div');
      title.style.cssText = 'margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #e5e7eb';
      title.innerHTML = `<div style="font-size:18px;font-weight:700;color:#111">${agent?.name || 'Agent'}</div><div style="font-size:12px;color:#999;margin-top:4px">${new Date().toLocaleString()}</div>`;
      container.appendChild(title);

      for (const msg of messages) {
        if (msg.streaming) continue;
        const row = document.createElement('div');
        row.style.cssText = `margin-bottom:12px;display:flex;${msg.role === 'user' ? 'justify-content:flex-end' : ''}`;

        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width:420px;padding:10px 14px;border-radius:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;font-size:13px;${
          msg.role === 'user'
            ? 'background:#3b82f6;color:#fff;border-top-right-radius:4px'
            : 'background:#f3f4f6;color:#111;border-top-left-radius:4px'
        }`;
        bubble.textContent = msg.content;
        row.appendChild(bubble);
        container.appendChild(row);
      }

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = 210;
      const pdfContentW = pdfW - 20;
      const scale = pdfContentW / imgW;
      const fullH = imgH * scale;
      const pageH = 297 - 20;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      let yOffset = 0;
      let page = 0;

      while (yOffset < fullH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10 - yOffset, pdfContentW, fullH);
        yOffset += pageH;
        page++;
      }

      pdf.save(`${agent?.name || 'chat'}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !userCode || !activeSessionId || sending) return;

    setInput('');
    setSending(true);

    const userMsg: GuestMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: GuestMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current = sendGuestMessageStream(
      shareToken,
      userCode,
      activeSessionId,
      text,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      (fullText) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullText || m.content, streaming: false }
              : m
          )
        );
        setSending(false);
      },
      (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `[Error] ${errMsg}`, streaming: false }
              : m
          )
        );
        setSending(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const agentAvatarUrl = agent?.avatar
    ? `${getBaseUrl()}/api/v1/avatars/${agent.avatar}`
    : PLACEHOLDER.avatar;

  const designSheetUrl = agent?.character_design_sheet
    ? `${getBaseUrl()}/api/v1/character-sheets/${agent.character_design_sheet}`
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-sm px-6">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">链接无效</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <img
          src={agentAvatarUrl}
          alt={agent?.name}
          className={`w-11 h-11 rounded-full object-cover ${designSheetUrl ? 'cursor-pointer ring-2 ring-blue-200 dark:ring-blue-800 hover:ring-blue-400 dark:hover:ring-blue-600 transition-all' : ''}`}
          onClick={() => { if (designSheetUrl) setShowDesignSheet(true); }}
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER.avatar; }}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {agent?.name || 'Agent'}
          </h1>
          <p className="text-xs text-gray-400">公开分享</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="导出聊天记录为 PDF"
            >
              {exporting ? (
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  导出中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  PDF
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleNewSession}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            新对话
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 relative">
        {designSheetUrl && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${designSheetUrl})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute inset-0 bg-white/75 dark:bg-gray-900/80 pointer-events-none" />
          </>
        )}
        <div className="absolute inset-0 overflow-y-auto px-4 py-4">
        <div className="relative z-10 space-y-4">
        {!activeSessionId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <img
                src={agentAvatarUrl}
                alt={agent?.name}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER.avatar; }}
              />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {agent?.name}
              </h2>
              <p className="text-sm text-gray-500 mb-4">点击「新对话」开始聊天</p>
              <button
                onClick={handleNewSession}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                开始对话
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">发送消息开始对话</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' && (
                <img
                  src={agentAvatarUrl}
                  alt="agent"
                  className={`w-10 h-10 rounded-full object-cover shrink-0 mt-1 ${designSheetUrl ? 'cursor-pointer' : ''}`}
                  onClick={() => { if (designSheetUrl) setShowDesignSheet(true); }}
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER.avatar; }}
                />
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.streaming && !msg.content ? (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-gray-400 dark:bg-gray-500 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                      )}
                    </div>
                  )
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        </div>
        </div>
      </div>

      {/* Voice error toast */}
      {voiceError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-red-500 text-white text-xs rounded-lg shadow-lg">
          {voiceError}
        </div>
      )}

      {/* Input */}
      {activeSessionId && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            {isVoiceEnabled && (
              <button
                type="button"
                onClick={() => { if (!isVoiceBusy) setIsVoiceMode(!isVoiceMode); }}
                disabled={isVoiceBusy}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                title={isVoiceMode ? '切换到键盘' : '切换到语音'}
              >
                {isVoiceMode ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" /><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                )}
              </button>
            )}

            <div className="flex-1 relative flex">
              <textarea
                ref={(el) => {
                  if (el && !input) el.style.height = '36px';
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent block"
                style={{ maxHeight: '120px', height: '36px', lineHeight: '20px', paddingTop: '7px', paddingBottom: '7px', visibility: isVoiceBusy ? 'hidden' : 'visible' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = '36px';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
              {isVoiceMode && (
                <button
                  type="button"
                  style={{ top: '-2px', left: '-1px', right: '-1px', bottom: 0 }}
                  className={`absolute z-10 rounded-xl font-medium text-sm select-none transition-all duration-150 flex items-center justify-center gap-2 touch-none ${
                    voice.state === 'processing'
                      ? 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-400 backdrop-blur-sm cursor-wait'
                      : inCancelZone
                        ? 'bg-red-500 text-white scale-[0.97]'
                        : voice.state === 'recording'
                          ? 'bg-blue-500 text-white scale-[0.98] shadow-md shadow-blue-500/30'
                          : 'bg-white/30 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 backdrop-blur-[2px]'
                  }`}
                  onPointerDown={(e) => {
                    if (voice.state === 'processing') return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    isPressingRef.current = true;
                    pressStartYRef.current = e.clientY;
                    setInCancelZone(false);
                    voice.startRecording();
                  }}
                  onPointerMove={(e) => {
                    if (!isPressingRef.current) return;
                    setInCancelZone(e.clientY - pressStartYRef.current < -80);
                  }}
                  onPointerUp={() => {
                    if (!isPressingRef.current) return;
                    isPressingRef.current = false;
                    if (inCancelZone) {
                      voice.cancelRecording();
                    } else {
                      voice.stopRecording();
                    }
                    setInCancelZone(false);
                  }}
                  onPointerCancel={() => {
                    if (!isPressingRef.current) return;
                    isPressingRef.current = false;
                    setInCancelZone(false);
                    voice.cancelRecording();
                  }}
                  disabled={voice.state === 'processing'}
                >
                  {voice.state === 'processing' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      识别中...
                    </>
                  ) : voice.state === 'recording' ? (
                    <>
                      <span className="flex items-end gap-0.5 h-4">
                        {[10, 16, 12, 14, 8].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 bg-current rounded-full animate-bounce"
                            style={{ height: `${inCancelZone ? 6 : h}px`, animationDelay: `${i * 0.08}s` }}
                          />
                        ))}
                      </span>
                      <span>{inCancelZone ? '松开取消' : '松开发送 · 上滑取消'}</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                      按住说话
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || isVoiceBusy}
              className="px-4 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 border border-transparent"
              style={{ height: '36px' }}
            >
              {sending ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '发送'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Design sheet viewer */}
      {showDesignSheet && designSheetUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowDesignSheet(false)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDesignSheet(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img
              src={designSheetUrl}
              alt={`${agent?.name} 角色设计稿`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="mt-3 text-sm text-white/80">{agent?.name} — 角色设计稿</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAgentPage;
