/**
 * Export chat history to a well-formatted PDF.
 * Uses html2pdf.js to convert styled HTML to PDF.
 */

import html2pdf from 'html2pdf.js';
import { marked } from 'marked';
import type { ChatSession, Message } from '../types';

export interface ExportPdfOptions {
  voiceLabel?: string;
  emptyLabel?: string;
}

// Simple markdown to HTML (handles code blocks, lists, bold, etc.)
function markdownToHtml(text: string): string {
  if (!text?.trim()) return '';
  try {
    return marked.parse(text, {
      gfm: true,
      breaks: true,
    }) as string;
  } catch {
    return escapeHtml(text);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildMessageHtml(msg: Message, showSender: boolean, opts: ExportPdfOptions): string {
  const isUser = !msg.isAI;
  const bubbleBg = isUser ? '#13b6ec' : '#1a2c32';
  const bubbleColor = isUser ? '#ffffff' : '#f8fafc';
  const align = isUser ? 'right' : 'left';
  const senderColor = isUser ? '#94a3b8' : '#13b6ec';
  const voiceLabel = opts.voiceLabel ?? 'Voice message';

  let contentHtml: string;
  if ((msg as { audioUrl?: string }).audioUrl) {
    // Voice message: show text content
    contentHtml = `<p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(msg.text)}</p><p style="margin:6px 0 0;font-size:11px;opacity:0.8;">🎤 ${escapeHtml(voiceLabel)}</p>`;
  } else {
    const html = markdownToHtml(msg.text);
    contentHtml = `<div class="msg-content" style="font-size:13px;line-height:1.6;word-wrap:break-word;">${html}</div>`;
  }

  const senderBlock = showSender
    ? `<div style="font-size:10px;font-weight:600;color:${senderColor};margin-bottom:4px;">${escapeHtml(msg.senderName)}</div>`
    : '';

  return `
    <div style="margin-bottom:16px;text-align:${align};">
      <div style="display:inline-block;max-width:85%;text-align:left;">
        ${senderBlock}
        <div style="background:${bubbleBg};color:${bubbleColor};padding:12px 16px;border-radius:12px;border:1px solid rgba(128,128,128,0.15);">
          ${contentHtml}
        </div>
        <div style="font-size:9px;color:#64748b;margin-top:4px;margin-left:2px;">${escapeHtml(msg.timestamp)}</div>
      </div>
    </div>
  `;
}

function buildFullHtml(chat: ChatSession, opts: ExportPdfOptions): string {
  const participantsLabel = chat.isGroup
    ? chat.participants.length > 1
      ? 'Group Chat'
      : 'Topic Chat'
    : '1-on-1 Chat';

  let messagesHtml = '';
  let lastSenderId = '';
  for (const msg of chat.messages) {
    if (msg.senderId === 'system') continue;
    const showSender = msg.senderId !== lastSenderId;
    lastSenderId = msg.senderId;
    messagesHtml += buildMessageHtml(msg, showSender, opts);
  }

  const emptyLabel = opts.emptyLabel ?? 'No messages in this chat.';
  if (!messagesHtml.trim()) {
    messagesHtml = `<p style="text-align:center;color:#64748b;font-size:14px;padding:24px;">${escapeHtml(emptyLabel)}</p>`;
  }

  const exportDate = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Plus Jakarta Sans', system-ui, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .msg-content p { margin: 0 0 8px 0; }
    .msg-content p:last-child { margin-bottom: 0; }
    .msg-content ul, .msg-content ol { margin: 8px 0; padding-left: 24px; }
    .msg-content code {
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .msg-content pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      margin: 8px 0;
    }
    .msg-content pre code { background: none; padding: 0; }
    .msg-content h1,.msg-content h2,.msg-content h3 { margin: 12px 0 6px; font-size: 14px; }
    .msg-content blockquote {
      border-left: 4px solid #cbd5e1;
      margin: 8px 0;
      padding-left: 12px;
      color: #64748b;
    }
    .msg-content a { color: #13b6ec; }
  </style>
</head>
<body>
  <div style="padding:24px;max-width:700px;margin:0 auto;">
    <header style="border-bottom:2px solid #13b6ec;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">${escapeHtml(chat.title)}</h1>
      <div style="font-size:11px;color:#64748b;">
        <span style="display:inline-block;margin-right:16px;">${escapeHtml(participantsLabel)}</span>
        <span>Exported: ${escapeHtml(exportDate)}</span>
      </div>
    </header>

    <main>
      ${messagesHtml}
    </main>

    <footer style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">
      Linkyun AI Chat · Exported from chat session
    </footer>
  </div>
</body>
</html>
  `;
}

export async function exportChatToPdf(chat: ChatSession, options?: ExportPdfOptions): Promise<void> {
  const opts = options ?? {};
  const html = buildFullHtml(chat, opts);

  // 提取 body 内的内容（去掉 html/head/body 标签，只保留内容）
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const bodyContent = parsed.body.innerHTML;

  const container = document.createElement('div');
  container.innerHTML = bodyContent;
  container.style.cssText = 'position:relative;width:700px;min-height:200px;background:#fff;padding:0;margin:0';
  container.setAttribute('data-html2pdf-ignore', 'true');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;left:0;top:0;width:800px;min-height:100%;overflow:auto;z-index:2147483647;background:#fff;pointer-events:none';
  wrapper.appendChild(container);

  document.body.appendChild(wrapper);

  const sanitizedTitle = chat.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 50);
  const filename = `chat_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    await new Promise((r) => setTimeout(r, 100));
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
