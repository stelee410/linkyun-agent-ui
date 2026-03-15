import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ChatSession, AIDigitalHuman, PersonaType } from '../types';
import { AI_HUMANS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAgentAvatarUrl } from '../services/api';
import type { DiscoverAgent, PendingAttachment } from '../services/api';
import { AudioPlayer } from './AudioPlayer';
import { exportChatToPdf } from '../lib/exportChatToPdf';
import { PLACEHOLDER } from '../lib/placeholder';
import { ImageUploadButton } from './ImageUploadButton';
import { DocumentUploadButton } from './DocumentUploadButton';
import { MessageAttachments } from './MessageAttachments';
import SunoEmbed, { isSunoUrl } from './SunoEmbed';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 将制表符分隔的表格块转换为 Markdown 表格格式 */
function wrapTabularToMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  let out = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\x00CODE_BLOCK_${codeBlocks.length - 1}\x00`;
  });
  const lines = out.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('\t') && (line.match(/\t/g)?.length ?? 0) >= 1) {
      const block: string[] = [];
      while (i < lines.length && lines[i].includes('\t') && (lines[i].match(/\t/g)?.length ?? 0) >= 1) {
        block.push(lines[i]);
        i++;
      }
      const cols = block[0].split('\t').length;
      const rows = block.map((row) =>
        row
          .split('\t')
          .map((c) => c.trim())
          .join(' | ')
      );
      const parts = rows.map((r) => `| ${r} |`);
      const sep = `| ${Array(cols).fill('---').join(' | ')} |`;
      const mdTable = [parts[0], sep, ...parts.slice(1)].join('\n');
      result.push(mdTable);
      continue;
    }
    result.push(line);
    i++;
  }
  out = result.join('\n');
  codeBlocks.forEach((b, idx) => {
    out = out.replace(`\x00CODE_BLOCK_${idx}\x00`, b);
  });
  return out;
}

/** 将裸的 graph LR/TD 等块包装成 ```mermaid ... ``` 以便渲染（不处理已存在的 ```mermaid 块） */
function wrapBareMermaid(text: string): string {
  const blocks: string[] = [];
  let out = text.replace(/```mermaid\n[\s\S]*?```/g, (m) => {
    blocks.push(m);
    return `\x00MERMAID_PLACEHOLDER_${blocks.length - 1}\x00`;
  });
  const patterns = [
    /(^|\n)(graph\s+(?:LR|RL|TB|BT|TD)[\s\S]*?)(?=\n\n|\n#|\n```|$)/gm,
    /(^|\n)(flowchart\s+(?:LR|RL|TB|BT|TD)[\s\S]*?)(?=\n\n|\n#|\n```|$)/gm,
    /(^|\n)(sequenceDiagram[\s\S]*?)(?=\n\n|\n#|\n```|$)/gm,
    /(^|\n)(stateDiagram[\s\S]*?)(?=\n\n|\n#|\n```|$)/gm,
  ];
  for (const re of patterns) {
    out = out.replace(re, (_full, before: string, block: string) => {
      if (/^```/.test(block.trim())) return _full;
      return `${before}\n\`\`\`mermaid\n${block.trim()}\n\`\`\``;
    });
  }
  blocks.forEach((b, i) => {
    out = out.replace(`\x00MERMAID_PLACEHOLDER_${i}\x00`, b);
  });
  return out;
}

let mermaidInitialized = false;
function ensureMermaidInit(): void {
  if (mermaidInitialized) return;
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  mermaidInitialized = true;
}

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`);

  useLayoutEffect(() => {
    const raw = code.trim();
    if (!raw) return;
    ensureMermaidInit();
    const id = idRef.current;
    setError(null);
    mermaid
      .render(id, raw)
      .then(({ svg: s }) => setSvg(s))
      .catch((e) => setError(String(e?.message ?? e)));
  }, [code]);

  if (error) {
    return (
      <details className="my-2 rounded border border-amber-500/50 bg-amber-500/10 p-2 text-sm">
        <summary className="cursor-pointer text-amber-600 dark:text-amber-400">Mermaid 渲染失败</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-80">{code}</pre>
      </details>
    );
  }
  if (!svg) {
    return <div className="my-2 min-h-[60px] animate-pulse rounded bg-black/10 dark:bg-white/10" aria-hidden />;
  }
  return (
    <div
      ref={containerRef}
      className="mermaid-diagram my-3 overflow-x-auto rounded bg-black/5 dark:bg-white/5 p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function VoiceMessageBlock({
  content,
  audioUrl,
  t,
}: {
  content: string;
  audioUrl: string;
  t: { chat: { showVoiceText?: string; hideVoiceText?: string } };
}) {
  const [showText, setShowText] = useState(false);
  return (
    <div>
      <AudioPlayer src={audioUrl} />
      <button
        type="button"
        onClick={() => setShowText((v) => !v)}
        className="text-xs opacity-60 hover:opacity-100 mt-1.5 transition-opacity"
      >
        {showText ? t.chat.hideVoiceText ?? 'Hide text ▲' : t.chat.showVoiceText ?? 'Show text ▼'}
      </button>
      {showText && <p className="text-sm whitespace-pre-wrap mt-1 opacity-80">{content}</p>}
    </div>
  );
}

interface ChatWindowProps {
  chat: ChatSession;
  apiKey: string;
  agentAvatar?: string;
  userAvatar?: string;
  sharedWithCreator?: boolean;
  humanized?: boolean;
  onToggleShare?: (shared: boolean) => void;
  agentOnline?: boolean;
  agentType?: 'cloud' | 'edge';
  onSendMessage: (text: string, targetAgentIds?: number[], pendingAttachments?: PendingAttachment[]) => void;
  onUpdateSettings: (aiIds: string[], newTitle?: string) => void;
  onBack?: () => void;
  sending?: boolean;
  /** 当前聊天是否在发送中（用于区分其他聊天窗口显示占位符头像） */
  sendingInThisChat?: boolean;
  shareLoading?: boolean;
  sendError?: string | null;
  onClearSendError?: () => void;
  onClearHistory?: () => Promise<boolean>;
  clearHistoryLoading?: boolean;
  onDeleteMemory?: () => Promise<boolean>;
  deleteMemoryLoading?: boolean;
  onDeleteChat?: () => Promise<boolean>;
  deleteChatLoading?: boolean;
  /** 好友列表，用于群聊参与者选择（替代 AI_HUMANS placeholder） */
  friendAgents?: DiscoverAgent[];
  /** Agent 是否支持图片上传（配置了 image_upload 技能） */
  supportsImageUpload?: boolean;
  /** Agent 是否支持文档上传（配置了 document_upload 技能） */
  supportsDocumentUpload?: boolean;
  /** Edge Agent 工具调用状态通知（如"正在调用 suno_generate..."），发送结束后自动清除 */
  edgeStatus?: string | null;
}

const LIGHT_PRESETS = ['lumina-light', 'facebook', 'wechat'];

const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    if (!inline && match?.[1] === 'mermaid') {
      return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2 -mx-1">
        <table>{children}</table>
      </div>
    );
  },
  a({ href, children }) {
    const url = href ?? '';
    const label = typeof children === 'string' ? children : undefined;
    if (isSunoUrl(url)) {
      return <SunoEmbed url={url} title={label} />;
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, apiKey, agentAvatar, userAvatar, sharedWithCreator, humanized, onToggleShare, agentOnline = true, agentType = 'cloud', onSendMessage, onUpdateSettings, onBack, sending, sendingInThisChat = true, shareLoading, sendError, onClearSendError, onClearHistory, clearHistoryLoading, onDeleteMemory, deleteMemoryLoading, onDeleteChat, deleteChatLoading, friendAgents, supportsImageUpload, supportsDocumentUpload, edgeStatus }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<(PendingAttachment & { url?: string; _file?: File }) | null>(null);
  const [pendingDocument, setPendingDocument] = useState<(PendingAttachment & { _file?: File }) | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteMemoryConfirm, setShowDeleteMemoryConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typingPhrase, setTypingPhrase] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  useEffect(() => {
    if (sending) {
      const chatAny = t.chat as { typingPhrases?: string[]; typingPhraseGroup?: string };
      if (chat.participants.length > 1 && chatAny.typingPhraseGroup) {
        setTypingPhrase(chatAny.typingPhraseGroup);
      } else {
        const phrases = chatAny.typingPhrases ?? ['...'];
        setTypingPhrase(phrases[Math.floor(Math.random() * phrases.length)] ?? '...');
      }
    }
  }, [sending, chat.participants.length, t.chat]);
  
  const [tempParticipants, setTempParticipants] = useState<string[]>(chat.participants);
  const [tempTitle, setTempTitle] = useState(chat.title);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const participantDetails = (chat as { participantDetails?: { id: string; name: string; avatar: string }[] }).participantDetails;
  const currentDisplayParticipants = participantDetails?.length
    ? participantDetails.map((p) => ({ ...p, title: '', type: 'Technical' as PersonaType, bio: '', online: true, systemInstruction: '' } as AIDigitalHuman))
    : chat.participants.map((id) => {
        const found = AI_HUMANS.find((a) => a.id === id);
        if (found) return found;
        return {
          id,
          name: chat.title,
          avatar: agentAvatar || PLACEHOLDER.avatar,
          title: '',
          type: 'Technical' as PersonaType,
          bio: '',
          online: true,
          systemInstruction: '',
        } as AIDigitalHuman;
      });

  const prevMessagesRef = useRef<{ id: string; text: string; isAI: boolean }[]>([]);
  const prevChatIdRef = useRef<string | null>(null);
  const isComposingRef = useRef(false);

  // 滚动到底部：首次进入、用户发送、服务器返回非空内容；服务器返回空内容时不滚动
  useEffect(() => {
    const msgs = chat.messages;
    const prev = prevMessagesRef.current;
    const chatIdChanged = prevChatIdRef.current !== chat.id;

    if (chatIdChanged) {
      prevChatIdRef.current = chat.id;
      prevMessagesRef.current = msgs.map((m) => ({ id: m.id, text: m.text ?? '', isAI: m.isAI }));
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      return;
    }

    if (msgs.length === 0) {
      prevMessagesRef.current = [];
      return;
    }

    const lastMsg = msgs[msgs.length - 1];
    const lastText = (lastMsg?.text ?? '').trim();
    const isUserMsg = !lastMsg?.isAI;
    const isAIMsgWithContent = lastMsg?.isAI && lastText !== '';

    // 场景1：新增消息（用户发送 或 服务器返回）
    if (msgs.length > prev.length) {
      if (isUserMsg || isAIMsgWithContent) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    } else if (msgs.length === prev.length && prev.length > 0) {
      // 场景2：同一条 AI 消息内容从空变为非空（流式/分步更新）
      const prevLast = prev[prev.length - 1];
      const prevLastText = (prevLast?.text ?? '').trim();
      const lastMsgContentUpdated = lastMsg?.isAI && lastText !== '' && prevLastText === '';
      if (lastMsgContentUpdated) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }

    prevMessagesRef.current = msgs.map((m) => ({ id: m.id, text: m.text ?? '', isAI: m.isAI }));
  }, [chat.id, chat.messages]);

  useEffect(() => {
    if (isManageOpen) {
      setTempParticipants(chat.participants);
      setTempTitle(chat.title);
    } else {
      setShowClearConfirm(false);
      setShowDeleteMemoryConfirm(false);
      setShowDeleteConfirm(false);
    }
  }, [isManageOpen, chat.participants, chat.title]);

  useEffect(() => {
    if (isInputExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputExpanded]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const h = Math.max(40, Math.min(ta.scrollHeight, 160));
    ta.style.height = `${h}px`;
  }, [input]);

  const recalculateLayout = useCallback((scrollToTop = true) => {
    inputRef.current?.blur();
    const run = () => {
      window.dispatchEvent(new Event('resize'));
      if (scrollToTop && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
      setTimeout(run, 100);
    });
  }, []);

  const handleCloseInput = useCallback(() => {
    setIsInputExpanded(false);
    recalculateLayout();
  }, [recalculateLayout]);

  const handleSend = () => {
    const hasContent = input.trim() || pendingImage || pendingDocument;
    if (!hasContent) return;
    const text = input.trim() || (pendingImage || pendingDocument ? '请分析以上附件' : '');
    let targetAgentIds: number[] | undefined;
    if (chat.isGroup && participantDetails?.length) {
      const mentioned = new Set<number>();
      for (const p of participantDetails) {
        const pattern = new RegExp(`@${escapeRegExp(p.name)}(?=\\s|$|@)`, 'gi');
        if (pattern.test(text || input)) {
          // p.id is "agent-{agent_id}" for group chats; extract numeric agent_id
          const agentId = typeof p.id === 'string' && p.id.startsWith('agent-')
            ? parseInt(p.id.slice(6), 10)
            : Number(p.id);
          if (!isNaN(agentId)) mentioned.add(agentId);
        }
      }
      if (mentioned.size > 0) targetAgentIds = Array.from(mentioned);
    }
    const pending: PendingAttachment[] = [];
    if (pendingImage) pending.push(pendingImage);
    if (pendingDocument) pending.push(pendingDocument);
    if (pendingImage?.url?.startsWith('blob:')) URL.revokeObjectURL(pendingImage.url);
    onSendMessage(text, targetAgentIds, pending.length > 0 ? pending : undefined);
    setInput('');
    setPendingImage(null);
    setPendingDocument(null);
    setShowMentions(false);
    setIsInputExpanded(false);
    recalculateLayout(false); // 发送后不滚动到顶部，由 useEffect 滚动到底部
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.endsWith('@')) {
      setShowMentions(true);
    } else if (!val.includes('@')) {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAtIndex = input.lastIndexOf('@');
    const newVal = input.slice(0, lastAtIndex) + '@' + name + ' ';
    setInput(newVal);
    setShowMentions(false);
  };

  const insertEmoji = (emoji: string) => {
    const ta = inputRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = input.slice(0, start) + emoji + input.slice(end);
      setInput(newVal);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  const toggleTempParticipant = (aiId: string) => {
    setTempParticipants(prev => 
      prev.includes(aiId) ? prev.filter(id => id !== aiId) : [...prev, aiId]
    );
  };

  const moveParticipant = (idx: number, direction: 'up' | 'down') => {
    setTempParticipants(prev => {
      const next = [...prev];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSaveSettings = () => {
    // Group chat: must keep at least 1 participant; stays as group chat even with 1 (isolated from 1v1)
    if (chat.isGroup && tempParticipants.length < 1) return;
    onUpdateSettings(tempParticipants, tempTitle);
    setIsManageOpen(false);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportChatToPdf(chat, {
        voiceLabel: (t.chat as { voiceMessage?: string }).voiceMessage,
        emptyLabel: (t.chat as { noMessagesInChat?: string }).noMessagesInChat,
      });
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-dark/10 h-full relative text-theme-text overflow-hidden">
      <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border-dark bg-background-dark/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="lg:hidden p-1.5 -ml-1 hover:bg-surface-dark rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-sm lg:text-base font-bold flex items-center gap-2 truncate">
              {chat.title}
              {humanized && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">创作者已阅</span>
              )}
              {chat.isGroup && <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">{chat.participants.length <= 1 ? (t.chat as any).topic ?? 'Topic' : t.chat.group}</span>}
              {agentType === 'edge' && !agentOnline && (
                <span className="bg-slate-600/80 text-slate-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">{t.chat.agentOffline}</span>
              )}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <div className="hidden sm:flex -space-x-2 mr-1">
            {currentDisplayParticipants.slice(0, 3).map(p => (
              <img 
                key={p.id} 
                src={p.avatar} 
                title={p.name}
                className="size-6 lg:size-7 rounded-full border-2 border-background-dark object-cover" 
                alt={p.name} 
              />
            ))}
            {currentDisplayParticipants.length > 3 && (
              <div className="size-6 lg:size-7 rounded-full border-2 border-background-dark bg-surface-dark flex items-center justify-center text-[10px] font-bold">
                +{currentDisplayParticipants.length - 3}
              </div>
            )}
          </div>
          {onToggleShare != null && (
            <div className="hidden sm:flex items-center gap-2 mr-1" title={t.chat.shareDescription}>
              <span className="text-[10px] lg:text-xs opacity-60 whitespace-nowrap">{t.chat.shareWithCreator}</span>
              <button
                onClick={() => !shareLoading && onToggleShare(!sharedWithCreator)}
                disabled={shareLoading}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${sharedWithCreator ? 'bg-primary' : 'bg-slate-600'}`}
                role="switch"
                aria-checked={sharedWithCreator}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sharedWithCreator ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="p-2 transition-colors opacity-50 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title={t.chat.exportPdf}
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl">{exportingPdf ? 'hourglass_empty' : 'picture_as_pdf'}</span>
          </button>
          <button 
            onClick={() => setIsManageOpen(!isManageOpen)}
            className={`p-2 transition-colors ${isManageOpen ? 'text-primary' : 'opacity-50 hover:opacity-100'}`}
            title="Manage Settings"
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl">settings</span>
          </button>
        </div>
      </header>

      {isManageOpen && (
        <div className="absolute inset-0 z-30 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6">
          <div className="bg-surface-dark border border-border-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 lg:p-6 border-b border-border-dark flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">topic</span>
                {t.chat.manage}
              </h3>
              <button onClick={() => setIsManageOpen(false)} className="opacity-50 hover:opacity-100 p-2">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 flex flex-col gap-6">
              {onToggleShare != null && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-background-dark/50 border border-border-dark">
                  <div>
                    <p className="text-sm font-bold">{t.chat.shareWithCreator}</p>
                    <p className="text-xs opacity-60 mt-0.5">{t.chat.shareDescription}</p>
                  </div>
                  <button
                    onClick={() => !shareLoading && onToggleShare(!sharedWithCreator)}
                    disabled={shareLoading}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${sharedWithCreator ? 'bg-primary' : 'bg-slate-600'}`}
                    role="switch"
                    aria-checked={sharedWithCreator}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sharedWithCreator ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold opacity-50 uppercase tracking-widest mb-3 px-2">{t.chat.chatName}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-50 text-xl">edit</span>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 lg:py-4 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                    placeholder={t.chat.placeholder}
                  />
                </div>
              </div>
              {/* For group chats: show all participants with add/remove controls */}
              {chat.isGroup && (friendAgents ?? []).length > 0 && (
              <div>
                <p className="px-2 text-[10px] font-bold opacity-50 uppercase tracking-widest mb-3">{t.chat.inChat}</p>
                <div className="flex flex-col gap-2">
                  {(friendAgents ?? AI_HUMANS).map((ai) => {
                    const rawId = 'id' in ai ? ai.id : (ai as AIDigitalHuman).id;
                    const id = String(rawId);
                    const participantId = `agent-${rawId}`;
                    const name = ai.name ?? (ai as AIDigitalHuman).name ?? '';
                    const avatar = 'avatar' in ai && typeof (ai as AIDigitalHuman).avatar === 'string'
                      ? (ai as AIDigitalHuman).avatar
                      : getAgentAvatarUrl(ai as DiscoverAgent);
                    const subtitle = (ai as AIDigitalHuman).title ?? (ai as DiscoverAgent).description ?? (ai as DiscoverAgent).code ?? '';
                    const isActive = tempParticipants.includes(participantId) || tempParticipants.includes(id);
                    return (
                      <div key={id} className="flex items-center gap-3 p-2 lg:p-3 rounded-2xl bg-background-dark/30 hover:bg-background-dark/50 border border-transparent hover:border-border-dark transition-all">
                        <div className="size-9 rounded-xl overflow-hidden shrink-0 border border-border-dark">
                          <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{name}</p>
                          <p className="text-[10px] opacity-60 truncate">{subtitle}</p>
                        </div>
                        {isActive && (() => {
                          const pIdx = tempParticipants.findIndex((p) => p === participantId || p === id);
                          return (
                            <div className="flex flex-col shrink-0">
                              <button type="button" disabled={pIdx === 0} onClick={() => moveParticipant(pIdx, 'up')} className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                              </button>
                              <button type="button" disabled={pIdx === tempParticipants.length - 1} onClick={() => moveParticipant(pIdx, 'down')} className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                              </button>
                            </div>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => toggleTempParticipant(participantId)}
                          disabled={isActive && tempParticipants.length <= 1}
                          title={isActive && tempParticipants.length <= 1 ? (t.chat as { minOneParticipant?: string }).minOneParticipant : undefined}
                          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isActive ? 'bg-primary text-white' : 'bg-surface-dark text-slate-400 hover:bg-surface-dark/80'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isActive ? t.chat.remove : t.chat.add}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
              {/* For 1v1 chats: invite OTHER agents (excluding current) to upgrade to group chat */}
              {!chat.isGroup && (() => {
                const otherAgents = (friendAgents ?? []).filter((ai) => {
                  const rawId = 'id' in ai ? ai.id : (ai as AIDigitalHuman).id;
                  const agentKey = `agent-${rawId}`;
                  return !chat.participants.includes(agentKey) && !chat.participants.includes(String(rawId));
                });
                return (
                  <div>
                    <p className="px-2 text-[10px] font-bold opacity-50 uppercase tracking-widest mb-3">
                      {(t.chat as { inviteToGroup?: string }).inviteToGroup}
                    </p>
                    {tempParticipants.length >= 2 && (
                      <div className="mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary/80">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">group_add</span>
                        {(t.chat as { upgradeHint?: string }).upgradeHint}
                      </div>
                    )}
                    {otherAgents.length === 0 ? (
                      <div className="px-3 py-4 rounded-2xl bg-background-dark/30 border border-dashed border-border-dark text-center">
                        <span className="material-symbols-outlined text-2xl opacity-30 mb-1 block">person_add</span>
                        <p className="text-xs opacity-50">{(t.chat as { noOtherFriends?: string }).noOtherFriends ?? 'Add more Agent friends to create a group chat'}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {otherAgents.map((ai) => {
                          const rawId = 'id' in ai ? ai.id : (ai as AIDigitalHuman).id;
                          const id = String(rawId);
                          const name = ai.name ?? (ai as AIDigitalHuman).name ?? '';
                          const avatar = 'avatar' in ai && typeof (ai as AIDigitalHuman).avatar === 'string'
                            ? (ai as AIDigitalHuman).avatar
                            : getAgentAvatarUrl(ai as DiscoverAgent);
                          const subtitle = (ai as AIDigitalHuman).title ?? (ai as DiscoverAgent).description ?? (ai as DiscoverAgent).code ?? '';
                          const isActive = tempParticipants.includes(id) || tempParticipants.includes(`agent-${rawId}`);
                          return (
                            <div key={id} className="flex items-center gap-3 p-2 lg:p-3 rounded-2xl bg-background-dark/30 hover:bg-background-dark/50 border border-transparent hover:border-border-dark transition-all">
                              <div className="size-9 rounded-xl overflow-hidden shrink-0 border border-border-dark">
                                <img src={avatar} alt={name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{name}</p>
                                <p className="text-[10px] opacity-60 truncate">{subtitle}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleTempParticipant(id)}
                                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isActive ? 'bg-primary text-white' : 'bg-surface-dark text-slate-400 hover:bg-surface-dark/80'}`}
                              >
                                {isActive ? t.chat.remove : t.chat.add}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {onDeleteMemory != null && (
                <div className="p-3 rounded-2xl bg-background-dark/50 border border-amber-500/30">
                  {!showDeleteMemoryConfirm ? (
                    <>
                      <p className="text-sm font-bold text-amber-500/90 mb-1">{(t.chat as { deleteMemory?: string }).deleteMemory ?? 'Delete memories'}</p>
                      <p className="text-xs opacity-60 mb-3">{(t.chat as { deleteMemoryConfirm?: string }).deleteMemoryConfirm ?? 'Remove all memories between you and this agent. The agent will no longer remember previous context.'}</p>
                      <button
                        onClick={() => setShowDeleteMemoryConfirm(true)}
                        disabled={deleteMemoryLoading}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-500 font-bold text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        {(t.chat as { deleteMemory?: string }).deleteMemory ?? 'Delete memories'}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-300">{(t.chat as { deleteMemoryConfirm?: string }).deleteMemoryConfirm ?? 'Remove all memories between you and this agent?'}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteMemoryConfirm(false)}
                          disabled={deleteMemoryLoading}
                          className="flex-1 py-2.5 rounded-xl border border-border-dark text-slate-300 font-bold text-sm hover:bg-surface-dark transition-colors"
                        >
                          {t.friends.cancel}
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await onDeleteMemory();
                            if (ok) {
                              setShowDeleteMemoryConfirm(false);
                              setIsManageOpen(false);
                            }
                          }}
                          disabled={deleteMemoryLoading}
                          className="flex-1 py-2.5 rounded-xl bg-amber-500/80 text-black font-bold text-sm hover:bg-amber-500 transition-colors disabled:opacity-50"
                        >
                          {deleteMemoryLoading ? '...' : ((t.chat as { deleteMemory?: string }).deleteMemory ?? 'Delete memories')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {onClearHistory != null && (
                <div className="p-3 rounded-2xl bg-background-dark/50 border border-red-500/30">
                  {!showClearConfirm ? (
                    <>
                      <p className="text-sm font-bold text-red-500/90 mb-1">{t.chat.clearHistory}</p>
                      <p className="text-xs opacity-60 mb-3">{(t.chat as { clearHistoryConfirm?: string }).clearHistoryConfirm}</p>
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={clearHistoryLoading}
                        className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {t.chat.clearHistory}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-300">{(t.chat as { clearHistoryConfirm?: string }).clearHistoryConfirm}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          disabled={clearHistoryLoading}
                          className="flex-1 py-2.5 rounded-xl border border-border-dark text-slate-300 font-bold text-sm hover:bg-surface-dark transition-colors"
                        >
                          {t.friends.cancel}
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await onClearHistory();
                            if (ok) {
                              setShowClearConfirm(false);
                              setIsManageOpen(false);
                            }
                          }}
                          disabled={clearHistoryLoading}
                          className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {clearHistoryLoading ? '...' : t.chat.clearHistory}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {onDeleteChat != null && (
                <div className="p-3 rounded-2xl bg-background-dark/50 border border-red-500/50">
                  {!showDeleteConfirm ? (
                    <>
                      <p className="text-sm font-bold text-red-500/90 mb-1">{(t.chat as { deleteChat?: string }).deleteChat}</p>
                      <p className="text-xs opacity-60 mb-3">{(t.chat as { deleteChatConfirm?: string }).deleteChatConfirm}</p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleteChatLoading}
                        className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {(t.chat as { deleteChat?: string }).deleteChat}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-300">{(t.chat as { deleteChatConfirm?: string }).deleteChatConfirm}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleteChatLoading}
                          className="flex-1 py-2.5 rounded-xl border border-border-dark text-slate-300 font-bold text-sm hover:bg-surface-dark transition-colors"
                        >
                          {t.friends.cancel}
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await onDeleteChat();
                            if (ok) {
                              setShowDeleteConfirm(false);
                              setIsManageOpen(false);
                            }
                          }}
                          disabled={deleteChatLoading}
                          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {deleteChatLoading ? '...' : (t.chat as { deleteChat?: string }).deleteChat}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 bg-background-dark/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsManageOpen(false)}
                className="px-4 lg:px-6 py-2 opacity-60 font-bold rounded-xl hover:opacity-100 transition-all text-xs lg:text-sm"
              >
                {t.friends.cancel}
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={chat.isGroup && tempParticipants.length < 1}
                className="px-4 lg:px-6 py-2 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.chat.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 lg:gap-6 custom-scrollbar ${!isInputExpanded ? 'max-md:pb-20' : ''}`}
      >
        {chat.messages.map((msg, idx) => (
          <div key={msg.id} className={`flex gap-3 max-w-[90%] lg:max-w-[85%] ${msg.isAI ? '' : 'self-end flex-row-reverse'}`}>
            {msg.senderId !== 'system' && (() => {
              const senderAvatar = (msg as { senderAvatar?: string }).senderAvatar;
              const isRemovedAgent = msg.isAI && participantDetails?.length && !participantDetails.some((p) => p.id === msg.senderId);
              const showPlaceholder = isRemovedAgent && !senderAvatar;
              return (
                <div className={`size-8 lg:size-9 rounded-xl overflow-hidden shrink-0 mt-1 border border-border-dark shadow-md ${showPlaceholder ? 'bg-slate-600/60 flex items-center justify-center' : ''}`}>
                  {showPlaceholder ? (
                    <span className="material-symbols-outlined text-slate-400 text-lg lg:text-xl">smart_toy</span>
                  ) : (
                    <img
                      src={msg.isAI ? (senderAvatar || agentAvatar || AI_HUMANS.find(a => a.id === msg.senderId)?.avatar || PLACEHOLDER.avatar) : (userAvatar || PLACEHOLDER.avatar)}
                      alt={msg.senderName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })()}
            <div className={`flex flex-col gap-1 min-w-0 ${msg.isAI ? '' : 'items-end'}`}>
              {(idx === 0 || chat.messages[idx-1].senderId !== msg.senderId) && msg.senderId !== 'system' ? (
                <span className={`text-[9px] lg:text-[10px] font-bold px-1 ${msg.isAI ? 'text-primary' : 'opacity-50'}`}>{msg.senderName}</span>
              ) : null}
              <div className={`p-3 lg:p-4 rounded-2xl shadow-sm leading-relaxed text-sm lg:text-base overflow-hidden break-words ${
                msg.senderId === 'system' ? 'bg-border-dark/30 opacity-60 italic text-center w-full my-4 rounded-lg px-2 text-[10px] lg:text-xs' :
                msg.isAI ? 'message-bubble-ai rounded-tl-none' : 'message-bubble-user rounded-tr-none shadow-md shadow-primary/10'
              }`}>
                {msg.senderId === 'system' ? (
                  msg.text
                ) : (msg as { audioUrl?: string }).audioUrl ? (
                  <VoiceMessageBlock content={msg.text} audioUrl={(msg as { audioUrl: string }).audioUrl} t={t} />
                ) : (
                  <>
                    <div className="markdown-content max-w-full overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MARKDOWN_COMPONENTS}
                      >
                        {wrapBareMermaid(wrapTabularToMarkdown(msg.text ?? '')) || '\u200b'}
                      </ReactMarkdown>
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <MessageAttachments
                        attachments={msg.attachments}
                        isUser={!msg.isAI}
                      />
                    )}
                  </>
                )}
              </div>
              <span className="text-[9px] lg:text-[10px] opacity-40 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {sending && typingPhrase && !(sendingInThisChat && chat.messages.length > 0 && chat.messages[chat.messages.length - 1]?.isAI) && (
          <div className="flex gap-3 max-w-[90%] lg:max-w-[85%]">
            <div className="size-8 lg:size-9 rounded-xl overflow-hidden shrink-0 mt-1 border border-border-dark shadow-md bg-slate-600/60 flex items-center justify-center">
              {!sendingInThisChat || chat.participants.length > 1 ? (
                <span className="material-symbols-outlined text-slate-400 text-lg lg:text-xl">smart_toy</span>
              ) : (
                <img src={agentAvatar || PLACEHOLDER.avatar} alt={chat.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[9px] lg:text-[10px] font-bold px-1 text-primary">
                {sendingInThisChat ? chat.title : (t.chat as { typingOtherChat?: string }).typingOtherChat || 'AI Agent'}
              </span>
              <div className="p-3 lg:p-4 rounded-2xl rounded-tl-none shadow-sm text-sm lg:text-base message-bubble-ai animate-pulse">
                <span className="opacity-80">{typingPhrase}</span>
              </div>
            </div>
          </div>
        )}
        {/* Edge 工具调用进度通知气泡 */}
        {sending && sendingInThisChat && edgeStatus && (
          <div className="flex justify-start pl-1">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 text-xs flex items-center gap-2 max-w-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              <span className="truncate">{edgeStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: floating bubble when collapsed */}
      <div
        className="md:hidden fixed right-4 z-50"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {!isInputExpanded && (
          <button
            type="button"
            onClick={() => setIsInputExpanded(true)}
            className="size-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            aria-label={t.chat.inputPlaceholder}
          >
            <span className="material-symbols-outlined text-2xl">chat</span>
          </button>
        )}
      </div>

      {/* Mobile: floating overlay via portal - does not affect page layout */}
      {isInputExpanded &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/40"
              onClick={handleCloseInput}
              onKeyDown={(e) => e.key === 'Escape' && handleCloseInput()}
              aria-hidden="true"
              role="button"
              tabIndex={-1}
            />
            <div
              className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col p-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background-dark/95 backdrop-blur-md border-t border-border-dark rounded-t-2xl max-h-[75vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-sm font-medium opacity-60">{t.chat.inputPlaceholder}</span>
                <button
                  type="button"
                  onClick={handleCloseInput}
                  className="p-2 -mr-2 rounded-full hover:bg-surface-dark/80 transition-colors"
                  aria-label={t.friends.cancel}
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-[10000]" aria-hidden="true" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-full right-4 mb-2 z-[10001] animate-in slide-in-from-bottom-2 duration-200 [&_.EmojiPickerReact]:!bg-surface-dark [&_.EmojiPickerReact]:!border-border-dark [&_.EmojiPickerReact]:!rounded-2xl [&_.EmojiPickerReact]:!shadow-2xl">
              <EmojiPicker
                theme={LIGHT_PRESETS.includes(theme.preset) ? Theme.LIGHT : Theme.DARK}
                width={320}
                height={360}
                onEmojiClick={(data) => insertEmoji(data.emoji)}
                    searchPlaceholder="搜索表情"
                    previewConfig={{ showPreview: false }}
                  />
                  </div>
                </>
              )}
              {showMentions && (
          <div className="mb-2 shrink-0 w-full max-w-[12rem] bg-surface-dark border border-border-dark rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            <p className="p-3 text-[10px] font-bold opacity-50 uppercase tracking-widest border-b border-border-dark bg-background-dark/50">{t.chat.mention}</p>
            <div className="max-h-40 overflow-y-auto custom-scrollbar">
              {currentDisplayParticipants.map(p => (
                <button
                  key={p.id}
                  onClick={() => insertMention(p.name)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/10 hover:text-primary transition-all text-xs"
                >
                  <img src={p.avatar} className="size-6 rounded-lg object-cover shrink-0" alt="" />
                  <span className="font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sendError && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center justify-between gap-2">
            <span>{sendError}</span>
            {onClearSendError && (
              <button onClick={onClearSendError} className="text-xs font-bold underline">
                {t.chat.retry}
              </button>
            )}
          </div>
        )}
        {agentType === 'edge' && !agentOnline && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">cloud_off</span>
            {t.chat.agentOffline}
          </div>
        )}
        {(pendingImage || pendingDocument) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-background-dark/50 border border-border-dark">
            {pendingImage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-dark border border-border-dark">
                {pendingImage.url ? (
                  <img src={pendingImage.url} alt="预览" className="w-12 h-12 object-cover rounded" />
                ) : (
                  <span className="material-symbols-outlined text-2xl opacity-50">image</span>
                )}
                <span className="text-xs truncate max-w-24">{pendingImage.name || '图片'}</span>
                <button type="button" onClick={() => { if (pendingImage.url) URL.revokeObjectURL(pendingImage.url); setPendingImage(null); }} className="text-slate-400 hover:text-red-400">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}
            {pendingDocument && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-dark border border-border-dark">
                <span className="material-symbols-outlined text-2xl opacity-50">description</span>
                <span className="text-xs truncate max-w-32">{pendingDocument.name || '文档'}</span>
                <button type="button" onClick={() => setPendingDocument(null)} className="text-slate-400 hover:text-red-400">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}
          </div>
        )}
        {uploadError && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
            {uploadError}
          </div>
        )}
        <div className={`bg-surface-dark border border-border-dark rounded-2xl p-1.5 lg:p-2 shadow-xl flex items-center gap-1 lg:gap-2 focus-within:ring-2 focus-within:ring-primary/40 transition-all ${(agentType === 'edge' && !agentOnline) || sending ? 'opacity-60 pointer-events-none' : ''}`}>
          {(supportsImageUpload || supportsDocumentUpload) && (
            <div className="flex gap-0.5 p-0.5">
              {supportsImageUpload && (
                <ImageUploadButton
                  apiKey={apiKey}
                  attachment={pendingImage}
                  onUploaded={(a) => { setUploadError(null); setPendingImage(a); }}
                  onError={setUploadError}
                  disabled={sending}
                />
              )}
              {supportsDocumentUpload && (
                <DocumentUploadButton
                  apiKey={apiKey}
                  attachment={pendingDocument}
                  onUploaded={(a) => { setUploadError(null); setPendingDocument(a); }}
                  onClear={() => setPendingDocument(null)}
                  onError={setUploadError}
                  disabled={sending}
                />
              )}
            </div>
          )}
          <textarea 
            ref={inputRef}
            className="flex-1 min-h-[2.5rem] leading-[2.5rem] lg:leading-normal bg-transparent border-none focus:ring-0 py-0 lg:py-2.5 lg:py-3 resize-none max-h-32 lg:max-h-40 placeholder:opacity-40 text-sm custom-scrollbar"
            placeholder={chat.participants.length > 1 ? t.chat.inputPlaceholderGroup : t.chat.inputPlaceholder}
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { setTimeout(() => { isComposingRef.current = false; }, 0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex gap-0.5 p-0.5">
             <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={`p-2 transition-colors ${showEmojiPicker ? 'text-primary opacity-100' : 'opacity-50 hover:text-primary hover:opacity-100'}`}
                title="表情"
                aria-label="选择表情"
              >
                <span className="material-symbols-outlined text-xl">mood</span>
              </button>
             <button 
                onClick={handleSend}
                disabled={sending || (!input.trim() && !pendingImage && !pendingDocument)}
                className="bg-primary text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="发送"
              >
                <span className="material-symbols-outlined font-bold text-xl lg:text-2xl">send</span>
              </button>
          </div>
        </div>
            </div>
          </>,
          document.body
        )}

      {/* Desktop: input in normal flow; hidden when mobile overlay is open to avoid duplicate textarea */}
      <div className={`${isInputExpanded ? 'hidden' : 'hidden md:block'} px-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))] bg-transparent shrink-0 relative`}>
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShowEmojiPicker(false)} />
            <div className="absolute bottom-full right-4 mb-2 z-20 animate-in slide-in-from-bottom-2 duration-200 [&_.EmojiPickerReact]:!bg-surface-dark [&_.EmojiPickerReact]:!border-border-dark [&_.EmojiPickerReact]:!rounded-2xl [&_.EmojiPickerReact]:!shadow-2xl">
              <EmojiPicker theme={LIGHT_PRESETS.includes(theme.preset) ? Theme.LIGHT : Theme.DARK} width={320} height={360} onEmojiClick={(data) => insertEmoji(data.emoji)} searchPlaceholder="搜索表情" previewConfig={{ showPreview: false }} />
            </div>
          </>
        )}
        {showMentions && (
          <div className="absolute bottom-full left-4 mb-2 w-48 bg-surface-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden z-20 animate-in slide-in-from-bottom-2 duration-200">
            <p className="p-3 text-[10px] font-bold opacity-50 uppercase tracking-widest border-b border-border-dark bg-background-dark/50">{t.chat.mention}</p>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {currentDisplayParticipants.map(p => (
                <button key={p.id} onClick={() => insertMention(p.name)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/10 hover:text-primary transition-all text-xs">
                  <img src={p.avatar} className="size-6 rounded-lg object-cover" alt="" />
                  <span className="font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {sendError && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center justify-between gap-2">
            <span>{sendError}</span>
            {onClearSendError && <button onClick={onClearSendError} className="text-xs font-bold underline">{t.chat.retry}</button>}
          </div>
        )}
        {agentType === 'edge' && !agentOnline && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">cloud_off</span>
            {t.chat.agentOffline}
          </div>
        )}
        {(pendingImage || pendingDocument) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-background-dark/50 border border-border-dark">
            {pendingImage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-dark border border-border-dark">
                {pendingImage.url ? <img src={pendingImage.url} alt="预览" className="w-12 h-12 object-cover rounded" /> : <span className="material-symbols-outlined text-2xl opacity-50">image</span>}
                <span className="text-xs truncate max-w-24">{pendingImage.name || '图片'}</span>
                <button type="button" onClick={() => { if (pendingImage.url) URL.revokeObjectURL(pendingImage.url); setPendingImage(null); }} className="text-slate-400 hover:text-red-400"><span className="material-symbols-outlined text-lg">close</span></button>
              </div>
            )}
            {pendingDocument && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-dark border border-border-dark">
                <span className="material-symbols-outlined text-2xl opacity-50">description</span>
                <span className="text-xs truncate max-w-32">{pendingDocument.name || '文档'}</span>
                <button type="button" onClick={() => setPendingDocument(null)} className="text-slate-400 hover:text-red-400"><span className="material-symbols-outlined text-lg">close</span></button>
              </div>
            )}
          </div>
        )}
        {uploadError && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">{uploadError}</div>
        )}
        <div className={`bg-surface-dark border border-border-dark rounded-2xl p-1.5 lg:p-2 shadow-xl flex items-center gap-1 lg:gap-2 focus-within:ring-2 focus-within:ring-primary/40 transition-all ${(agentType === 'edge' && !agentOnline) || sending ? 'opacity-60 pointer-events-none' : ''}`}>
          {(supportsImageUpload || supportsDocumentUpload) && (
            <div className="flex gap-0.5 p-0.5">
              {supportsImageUpload && <ImageUploadButton apiKey={apiKey} attachment={pendingImage} onUploaded={(a) => { setUploadError(null); setPendingImage(a); }} onError={setUploadError} disabled={sending} />}
              {supportsDocumentUpload && <DocumentUploadButton apiKey={apiKey} attachment={pendingDocument} onUploaded={(a) => { setUploadError(null); setPendingDocument(a); }} onClear={() => setPendingDocument(null)} onError={setUploadError} disabled={sending} />}
            </div>
          )}
          <textarea ref={inputRef} className="flex-1 min-h-[2.5rem] bg-transparent border-none focus:ring-0 py-2.5 lg:py-3 resize-none max-h-32 lg:max-h-40 placeholder:opacity-40 text-sm custom-scrollbar" placeholder={chat.participants.length > 1 ? t.chat.inputPlaceholderGroup : t.chat.inputPlaceholder} rows={1} value={input} onChange={(e) => handleInputChange(e.target.value)} onCompositionStart={() => { isComposingRef.current = true; }} onCompositionEnd={() => { setTimeout(() => { isComposingRef.current = false; }, 0); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) { e.preventDefault(); handleSend(); } }} />
          <div className="flex gap-0.5 p-0.5">
            <button type="button" onClick={() => setShowEmojiPicker((v) => !v)} className={`p-2 transition-colors ${showEmojiPicker ? 'text-primary opacity-100' : 'opacity-50 hover:text-primary hover:opacity-100'}`} title="表情" aria-label="选择表情"><span className="material-symbols-outlined text-xl">mood</span></button>
            <button onClick={handleSend} disabled={sending || (!input.trim() && !pendingImage && !pendingDocument)} className="bg-primary text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" title="发送"><span className="material-symbols-outlined font-bold text-xl lg:text-2xl">send</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
