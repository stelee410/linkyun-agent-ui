/**
 * Linkyun Agent API 客户端
 * 登录、注册等认证相关接口
 */

import { PLACEHOLDER } from "../lib/placeholder";

export const getBaseUrl = () =>
  (import.meta.env?.VITE_API_URL as string) || "http://localhost:8080";

/** 获取分钟级时间戳，用于头像缓存破坏 */
function getMinuteTimestamp(): number {
  return Math.floor(Date.now() / 60000);
}

/** 获取秒级时间戳，用于 AI Agent 头像缓存破坏（在 creator 页面需要更快的更新） */
function getSecondTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code?: string; message: string };
}

export interface Creator {
  id: number;
  uuid: string;
  username: string;
  email: string;
  status: string;
  metadata?: {
    full_name?: string;
    description?: string;
    organization?: string;
    website?: string;
    avatar?: string;
  };
}

/** 从 Creator 获取头像 URL，无则 null */
export function getCreatorAvatar(creator: Creator | null | undefined): string | null {
  const av = creator?.metadata?.avatar;
  if (!av || typeof av !== "string") return null;
  return `${getBaseUrl()}/api/v1/avatars/${av}?t=${getSecondTimestamp()}`;
}

/** 获取当前用户资料（后端返回 { success, data: creator }） */
export async function getProfile(apiKey: string): Promise<ApiResponse<Creator>> {
  const res = await request<{ data?: Creator }>("/profile", { method: "GET", apiKey });
  if (res.success && res.data) {
    const payload = res.data as { data?: Creator };
    const creator = payload?.data ?? (res.data as Creator);
    if (creator && (creator as Creator).id != null) {
      return { success: true, data: creator as Creator };
    }
  }
  return res as ApiResponse<Creator>;
}

/** 更新用户资料（后端返回 { success, data: creator }） */
export async function updateProfile(
  apiKey: string,
  data: { username?: string; full_name?: string; description?: string }
): Promise<ApiResponse<Creator>> {
  const res = await request<{ data?: Creator }>("/profile", {
    method: "PUT",
    apiKey,
    body: JSON.stringify(data),
  });
  if (res.success && res.data) {
    const payload = res.data as { data?: Creator };
    const creator = payload?.data ?? (res.data as Creator);
    if (creator && (creator as Creator).id != null) {
      return { success: true, data: creator as Creator };
    }
  }
  return res as ApiResponse<Creator>;
}

/** 上传 Creator 头像 */
export async function uploadCreatorAvatar(apiKey: string, file: Blob): Promise<ApiResponse<Creator>> {
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${getBaseUrl()}/api/v1/profile/avatar`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json?.error || { message: `HTTP ${res.status}` } };
  }
  const creator = json?.data ?? json;
  return { success: true, data: creator as Creator };
}

/** 删除 Creator 头像 */
export async function deleteCreatorAvatar(apiKey: string): Promise<ApiResponse<Creator>> {
  const res = await request<{ data?: Creator }>("/profile/avatar", { method: "DELETE", apiKey });
  if (res.success && res.data) {
    const payload = res.data as { data?: Creator };
    const creator = payload?.data ?? (res.data as Creator);
    if (creator && (creator as Creator).id != null) {
      return { success: true, data: creator as Creator };
    }
  }
  return res as ApiResponse<Creator>;
}

// ============ 附件上传（聊天图片/文档） ============

const IMAGE_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const DOCUMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const DOCUMENT_ACCEPT = [".pdf", ".doc", ".docx", ".txt"];

function isDocumentFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return DOCUMENT_ACCEPT.includes(ext);
}

export interface ImageUploadResult {
  token: string;
  download_url: string;
  preview_url: string;
  expires_in: number;
}

export async function uploadImageFile(
  apiKey: string,
  file: File
): Promise<ApiResponse<ImageUploadResult>> {
  if (!file.type.startsWith("image/")) {
    return { success: false, error: { message: "仅支持图片文件" } };
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return { success: false, error: { message: "图片不能超过 20MB" } };
  }
  const url = `${getBaseUrl()}/api/v1/files/upload`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return {
      success: false as const,
      error: json?.error || { message: `HTTP ${res.status}` },
    };
  }
  const d = json?.data || json;
  return {
    success: true as const,
    data: {
      token: d.token,
      download_url: d.download_url,
      preview_url: d.preview_url ?? d.download_url,
      expires_in: d.expires_in ?? 86400,
    },
  };
}

export interface DocumentUploadResult {
  token: string;
  download_url: string;
  expires_in: number;
}

export async function uploadDocumentFile(
  apiKey: string,
  file: File
): Promise<ApiResponse<DocumentUploadResult>> {
  if (!isDocumentFile(file)) {
    return { success: false, error: { message: "仅支持 PDF、Word、TXT 文件" } };
  }
  if (file.size > DOCUMENT_MAX_SIZE) {
    return { success: false, error: { message: "文档不能超过 20MB" } };
  }
  const url = `${getBaseUrl()}/api/v1/files/upload-document`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return {
      success: false as const,
      error: json?.error || { message: `HTTP ${res.status}` },
    };
  }
  const d = json?.data || json;
  return {
    success: true as const,
    data: {
      token: d.token,
      download_url: d.download_url,
      expires_in: d.expires_in ?? 86400,
    },
  };
}

/** 待上传附件（含 _file，发送时再上传） */
export interface PendingAttachment {
  type: "image" | "file";
  url?: string;
  mime_type?: string;
  name?: string;
  size?: number;
  _file?: File;
  [key: string]: unknown;
}

/** 已解析附件（含 token，发送时直接传） */
export interface ResolvedAttachment {
  type: string;
  token: string;
  download_url?: string;
  preview_url?: string;
  mime_type?: string;
  name?: string;
  size?: number;
}

/** 将待上传附件转为已上传（含 token），发送前调用 */
export async function resolvePendingAttachments(
  apiKey: string,
  attachments: PendingAttachment[]
): Promise<ResolvedAttachment[]> {
  const result: ResolvedAttachment[] = [];
  for (const att of attachments) {
    if (att._file) {
      const attType = (att.type as string) || "image";
      const res =
        attType === "file" || isDocumentFile(att._file)
          ? await uploadDocumentFile(apiKey, att._file)
          : await uploadImageFile(apiKey, att._file);
      if (res.success && res.data) {
        const data = res.data as { token: string; download_url?: string; preview_url?: string };
        result.push({
          type: attType === "file" || isDocumentFile(att._file) ? "file" : attType,
          token: data.token,
          download_url: data.download_url,
          preview_url: (data as { preview_url?: string }).preview_url,
          mime_type: att.mime_type as string | undefined,
          name: att.name as string | undefined,
          size: att.size as number | undefined,
        });
      }
    } else if (att.token) {
      result.push({
        type: att.type as string,
        token: att.token as string,
        download_url: att.download_url as string | undefined,
        preview_url: att.preview_url as string | undefined,
        mime_type: att.mime_type as string | undefined,
        name: att.name as string | undefined,
        size: att.size as number | undefined,
      });
    }
  }
  return result;
}

export interface AuthResponse {
  api_key: string;
  creator: Creator;
}

async function request<T>(
  path: string,
  options: RequestInit & { apiKey?: string; workspaceCode?: string } = {}
): Promise<ApiResponse<T>> {
  const { apiKey, workspaceCode, ...init } = options;
  const url = `${getBaseUrl()}/api/v1${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (apiKey) {
    (headers as Record<string, string>)["X-API-Key"] = apiKey;
  }
  if (workspaceCode) {
    (headers as Record<string, string>)["X-Workspace-Code"] = workspaceCode;
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const errMsg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    return { success: false, error: { message: errMsg } };
  }
  return { success: true, data: json as T };
}

// ============ Workspace ============

export interface Workspace {
  id: number;
  uuid: string;
  name: string;
  code: string;
  creator_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithRole extends Workspace {
  role: string;
}

export async function getUserWorkspaces(apiKey: string): Promise<ApiResponse<{ workspaces: WorkspaceWithRole[]; total: number }>> {
  const res = await request<{ success?: boolean; data?: { workspaces: WorkspaceWithRole[]; total: number } }>("/user/workspaces", {
    method: "GET",
    apiKey,
  });
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ workspaces: WorkspaceWithRole[]; total: number }>;
}

export async function switchWorkspace(apiKey: string, workspaceCode: string): Promise<ApiResponse<{ workspace: Workspace; message: string }>> {
  const res = await request<{ success?: boolean; data?: { workspace: Workspace; message: string } }>("/user/workspace/switch", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ workspace_code: workspaceCode }),
  });
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ workspace: Workspace; message: string }>;
}

/** 离开工作空间（当前工作空间非 default 时可用） */
export async function leaveWorkspace(apiKey: string, workspaceCode: string): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ success?: boolean; data?: { message: string } }>("/user/workspace/leave", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ workspace_code: workspaceCode.trim() }),
  });
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ message: string }>;
}

/** 通过邀请码加入工作空间，加入后为 member 角色（不可编辑 Agent） */
export async function joinWorkspace(apiKey: string, inviteCode: string): Promise<ApiResponse<{ workspace: Workspace; message: string }>> {
  const res = await request<{ success?: boolean; data?: { workspace: Workspace; message: string } }>("/user/workspace/join", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ invite_code: inviteCode.trim() }),
  });
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ workspace: Workspace; message: string }>;
}

export async function login(
  username: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  const raw = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await raw.json().catch(() => ({}));
  if (!raw.ok) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${raw.status}`;
    return { success: false, error: { message: msg } };
  }
  // 兼容服务端 RespondJSON 包装 { success, data } 与扁平格式
  const payload = json?.data != null ? json.data : json;
  const apiKey = payload?.api_key ?? payload?.apiKey;
  const creator = payload?.creator;
  if (!apiKey || !creator || creator.id == null) {
    const errMsg = json?.error?.message ?? payload?.error?.message ?? "Login failed, invalid response format";
    return { success: false, error: { message: errMsg } };
  }
  return { success: true, data: { api_key: apiKey, creator } };
}

export async function register(
  username: string,
  email: string,
  password: string,
  invitationCode: string
): Promise<ApiResponse<AuthResponse>> {
  const raw = await fetch(`${getBaseUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, invitation_code: invitationCode.trim() }),
  });
  const json = await raw.json().catch(() => ({}));
  if (!raw.ok) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${raw.status}`;
    return { success: false, error: { message: msg } };
  }
  const payload = json?.data != null ? json.data : json;
  return { success: true, data: { api_key: payload.api_key, creator: payload.creator } };
}

/** 已发布的 Agent（status=active）用于 Discover 展示 */
export interface DiscoverAgent {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  status: string;
  agent_type: "cloud" | "edge";
  edge_status: string;
  created_at?: string;
  updated_at?: string;
  config?: {
    metadata?: { avatar?: string };
  };
}

/** 获取 Agent 头像 URL */
export function getAgentAvatarUrl(agent: DiscoverAgent): string {
  const filename = agent.config?.metadata?.avatar;
  if (filename) {
    return `${getBaseUrl()}/api/v1/avatars/${filename}?t=${getMinuteTimestamp()}`;
  }
  return PLACEHOLDER.avatar400;
}

export interface ListAgentsResponse {
  agents: DiscoverAgent[];
  total: number;
}

export interface ListFriendsResponse {
  friends: DiscoverAgent[];
  total: number;
}

/** 添加好友 */
export async function addFriendApi(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<{ creator_id: number; agent_id: number }>> {
  const res = await request<{ data?: { creator_id: number; agent_id: number } }>(
    "/friends",
    { method: "POST", apiKey, body: JSON.stringify({ agent_id: agentId }) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ creator_id: number; agent_id: number }>;
}

/** 删除好友 */
export async function removeFriendApi(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message: string } }>(
    `/friends/${agentId}`,
    { method: "DELETE", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ message: string }>;
}

/** 获取好友列表（返回完整 Agent 信息） */
export async function listFriends(
  apiKey: string
): Promise<ApiResponse<ListFriendsResponse>> {
  const res = await request<{ data?: ListFriendsResponse }>(
    "/friends",
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<ListFriendsResponse>;
}

// ============ User Chat (1v1) ============

export interface UserChatSession {
  id: number;
  uuid: string;
  agent_id: number;
  agent_name: string; // Display name (custom title or agent name)
  title?: string | null; // User-defined chat/topic name (optional)
  agent_avatar: string;
  agent_type: "cloud" | "edge";
  agent_online: boolean;
  status: string;
  shared_with_creator: boolean;
  verified?: boolean;
  message_count: number;
  last_message_preview?: string;
  last_message_at?: string;
  created_at: string;
  supports_image_upload?: boolean;    // Agent has image_upload pre-skill
  supports_document_upload?: boolean; // Agent has document_upload pre-skill
}

export interface ChatMessage {
  id: number;
  uuid: string;
  role: "user" | "assistant" | "system";
  content: string;
  content_type: string;
  attachments?: { type: string; token?: string; url?: string }[];
  metadata?: { audio_url?: string; [k: string]: unknown };
  audio_url?: string;
  sender_agent_id?: number | null;
  sender_name?: string | null;
  created_at: string;
}

export interface SendMessageResponse {
  message_id: string;
  content: string;
  role: string;
  model: string;
  audio_url?: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
}

/** Build avatar URL from filename (for UserChatSession) */
export function getAgentAvatarUrlForFilename(
  filename: string,
  fallbackCode?: string
): string {
  if (filename) {
    return `${getBaseUrl()}/api/v1/avatars/${filename}?t=${getMinuteTimestamp()}`;
  }
  return PLACEHOLDER.avatar400;
}

/** Create or resume 1v1 chat with an agent */
export async function createUserChat(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<UserChatSession>> {
  const res = await request<{ data?: UserChatSession }>(
    "/user/chats",
    { method: "POST", apiKey, body: JSON.stringify({ agent_id: agentId }) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<UserChatSession>;
}

/** List user's chat sessions */
export async function listUserChats(
  apiKey: string,
  limit?: number,
  offset?: number
): Promise<ApiResponse<{ chats: UserChatSession[]; total: number }>> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const q = params.toString() ? `?${params}` : "";
  const res = await request<{ data?: { chats: UserChatSession[]; total: number } }>(
    `/user/chats${q}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ chats: UserChatSession[]; total: number }>;
}

/** Update chat title */
export async function updateChatTitle(
  apiKey: string,
  chatId: number,
  title: string
): Promise<ApiResponse<UserChatSession>> {
  const body = title.trim() ? { title: title.trim() } : { title: null };
  const res = await request<{ data?: UserChatSession }>(
    `/user/chats/${chatId}`,
    { method: "PATCH", apiKey, body: JSON.stringify(body) }
  );
  if (res.success && res.data) {
    const payload = res.data as { data?: UserChatSession };
    const chat = payload?.data ?? (res.data as UserChatSession);
    if (chat && chat.id != null) {
      return { success: true, data: chat };
    }
  }
  return res as ApiResponse<UserChatSession>;
}

/** Get single chat session detail */
export async function getUserChat(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<UserChatSession>> {
  const res = await request<{ data?: UserChatSession }>(
    `/user/chats/${chatId}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<UserChatSession>;
}

/** Send message in a chat */
export async function sendUserMessage(
  apiKey: string,
  chatId: number,
  content: string,
  attachments?: { type: string; token?: string }[]
): Promise<ApiResponse<SendMessageResponse>> {
  const body: { content: string; attachments?: { type: string; token?: string }[] } = {
    content,
  };
  if (attachments?.length) body.attachments = attachments;
  const res = await request<{ data?: SendMessageResponse }>(
    `/user/chats/${chatId}/messages`,
    { method: "POST", apiKey, body: JSON.stringify(body) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<SendMessageResponse>;
}

/** SSE event from streaming API */
export interface StreamEvent {
  type: "delta" | "done" | "error";
  text?: string;
  message_id?: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  error?: string;
}

/** 流式发送 1v1 消息，通过回调逐块接收内容。若后端返回 JSON（非 SSE）则解析并回调 onDone。 */
export async function sendUserMessageStream(
  apiKey: string,
  chatId: number,
  content: string,
  attachments: { type: string; token?: string }[] | undefined,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: (messageId: string, usage?: StreamEvent["usage"]) => void;
  }
): Promise<void> {
  const body: Record<string, unknown> = { content, stream: true };
  if (attachments?.length) body.attachments = attachments;
  const url = `${getBaseUrl()}/api/v1/user/chats/${chatId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("Content-Type") ?? "";
  const isSSE = contentType.includes("text/event-stream");

  if (!isSSE) {
    const json = await res.json() as { data?: SendMessageResponse } | SendMessageResponse;
    const data = (json as { data?: SendMessageResponse }).data ?? (json as SendMessageResponse);
    const msgId = data?.message_id;
    const msgContent = data?.content;
    if (msgId && msgContent) {
      callbacks.onChunk(msgContent);
      callbacks.onDone(msgId);
    } else if (msgId) {
      callbacks.onDone(msgId);
    } else {
      throw new Error("Invalid response format");
    }
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let gotDone = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const ev = JSON.parse(data) as StreamEvent;
          if (ev.type === "delta" && ev.text) callbacks.onChunk(ev.text);
          else if (ev.type === "done" && ev.message_id) {
            callbacks.onDone(ev.message_id, ev.usage);
            gotDone = true;
            return;
          } else if (ev.type === "error") throw new Error(ev.error ?? "Stream error");
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (!gotDone && buffer.startsWith("data: ")) {
      const data = buffer.slice(6).trim();
      if (data) {
        try {
          const ev = JSON.parse(data) as StreamEvent;
          if (ev.type === "done" && ev.message_id) callbacks.onDone(ev.message_id, ev.usage);
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Get chat message history */
export async function getUserChatMessages(
  apiKey: string,
  chatId: number,
  limit?: number
): Promise<ApiResponse<{ messages: ChatMessage[]; total: number }>> {
  const params = limit != null ? `?limit=${limit}` : "";
  const res = await request<{ data?: { messages: ChatMessage[]; total: number } }>(
    `/user/chats/${chatId}/messages${params}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ messages: ChatMessage[]; total: number }>;
}

/** Clear chat history */
export async function deleteUserChat(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message: string } }>(
    `/user/chats/${chatId}`,
    { method: "DELETE", apiKey }
  );
  if (res.success && res.data) {
    return { success: true, data: res.data };
  }
  return res as ApiResponse<{ message: string }>;
}

export async function clearUserChatMessages(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<{ deleted: number }>> {
  const res = await request<{ data?: { deleted: number } }>(
    `/user/chats/${chatId}/messages`,
    { method: "DELETE", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ deleted: number }>;
}

/** Delete all memories between user and agent for this chat */
export async function deleteChatMemories(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message?: string } }>(
    `/user/chats/${chatId}/memories`,
    { method: "DELETE", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data as { message: string } };
  }
  if (res.success) {
    return { success: true, data: { message: "Memories deleted" } };
  }
  return res as ApiResponse<{ message: string }>;
}

/** Toggle share chat with creator */
export async function toggleShareWithCreator(
  apiKey: string,
  chatId: number,
  shared: boolean
): Promise<ApiResponse<{ shared_with_creator: boolean }>> {
  const res = await request<{ data?: { shared_with_creator: boolean } }>(
    `/user/chats/${chatId}/share`,
    {
      method: "PATCH",
      apiKey,
      body: JSON.stringify({ shared_with_creator: shared }),
    }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ shared_with_creator: boolean }>;
}

// ============ Group Chat ============

export interface GroupParticipant {
  agent_id: number;
  agent_name: string;
  agent_avatar: string;
  agent_type: "cloud" | "edge";
  online: boolean;
  sort_order: number;
  supports_image_upload?: boolean;
  supports_document_upload?: boolean;
}

export interface GroupChatSession {
  id: number;
  uuid: string;
  title?: string | null;
  topic?: string | null;
  is_group: true;
  participants: GroupParticipant[];
  status: string;
  shared_with_creator?: boolean;
  message_count: number;
  last_message_preview?: string;
  last_message_at?: string;
  created_at: string;
}

export interface GroupAgentReply {
  message_id: string;
  agent_id: number;
  agent_name: string;
  content: string;
  model: string;
  audio_url?: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  error?: string;
}

export interface GroupSendMessageResponse {
  user_message_id: string;
  replies: GroupAgentReply[];
}

/** Create a group chat with multiple agents */
export async function createGroupChat(
  apiKey: string,
  agentIds: number[],
  topic?: string,
  title?: string
): Promise<ApiResponse<GroupChatSession>> {
  const body: { agent_ids: number[]; topic?: string; title?: string } = { agent_ids: agentIds };
  if (topic) body.topic = topic;
  if (title) body.title = title;
  const res = await request<{ data?: GroupChatSession }>(
    "/user/group-chats",
    { method: "POST", apiKey, body: JSON.stringify(body) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<GroupChatSession>;
}

/** List group chat sessions */
export async function listGroupChats(
  apiKey: string,
  limit?: number,
  offset?: number
): Promise<ApiResponse<{ chats: GroupChatSession[]; total: number }>> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const q = params.toString() ? `?${params}` : "";
  const res = await request<{ data?: { chats: GroupChatSession[]; total: number } }>(
    `/user/group-chats${q}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ chats: GroupChatSession[]; total: number }>;
}

/** Get a single group chat detail */
export async function getGroupChat(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<GroupChatSession>> {
  const res = await request<{ data?: GroupChatSession }>(
    `/user/group-chats/${chatId}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<GroupChatSession>;
}

/** Send a message in a group chat. Pass targetAgentIds when @mentioning specific agents. */
export async function sendGroupMessage(
  apiKey: string,
  chatId: number,
  content: string,
  targetAgentIds?: number[],
  attachments?: { type: string; token?: string }[]
): Promise<ApiResponse<GroupSendMessageResponse>> {
  const body: { content: string; target_agent_ids?: number[]; attachments?: { type: string; token?: string }[] } = { content };
  if (targetAgentIds?.length) body.target_agent_ids = targetAgentIds;
  if (attachments?.length) body.attachments = attachments;
  const res = await request<{ data?: GroupSendMessageResponse }>(
    `/user/group-chats/${chatId}/messages`,
    { method: "POST", apiKey, body: JSON.stringify(body) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<GroupSendMessageResponse>;
}

/** Get group chat message history. Pass `after` message ID for incremental polling. */
export async function getGroupChatMessages(
  apiKey: string,
  chatId: number,
  limit?: number,
  afterMessageId?: number
): Promise<ApiResponse<{ messages: ChatMessage[]; total: number; processing?: boolean }>> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (afterMessageId != null) params.set("after", String(afterMessageId));
  const q = params.toString() ? `?${params}` : "";
  const res = await request<{ data?: { messages: ChatMessage[]; total: number; processing?: boolean } }>(
    `/user/group-chats/${chatId}/messages${q}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ messages: ChatMessage[]; total: number; processing?: boolean }>;
}

/** Update group chat settings (title, topic) */
export async function updateGroupChat(
  apiKey: string,
  chatId: number,
  data: { title?: string; topic?: string }
): Promise<ApiResponse<GroupChatSession>> {
  const res = await request<{ data?: GroupChatSession }>(
    `/user/group-chats/${chatId}`,
    { method: "PATCH", apiKey, body: JSON.stringify(data) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<GroupChatSession>;
}

/** Toggle share group chat with creator */
export async function toggleGroupShare(
  apiKey: string,
  chatId: number,
  shared: boolean
): Promise<ApiResponse<{ shared_with_creator: boolean }>> {
  const res = await request<{ data?: { shared_with_creator: boolean } }>(
    `/user/group-chats/${chatId}/share`,
    { method: "PATCH", apiKey, body: JSON.stringify({ shared_with_creator: shared }) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<{ shared_with_creator: boolean }>;
}

/** Update group chat participants */
export async function updateGroupParticipants(
  apiKey: string,
  chatId: number,
  agentIds: number[]
): Promise<ApiResponse<GroupChatSession>> {
  const res = await request<{ data?: GroupChatSession }>(
    `/user/group-chats/${chatId}/participants`,
    { method: "PATCH", apiKey, body: JSON.stringify({ agent_ids: agentIds }) }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<GroupChatSession>;
}

/** Delete a group chat */
export async function deleteGroupChat(
  apiKey: string,
  chatId: number
): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message: string } }>(
    `/user/group-chats/${chatId}`,
    { method: "DELETE", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  if (res.success) {
    return { success: true, data: { message: "Group chat deleted" } };
  }
  return res as ApiResponse<{ message: string }>;
}

/** 获取已发布的 Agent（按工作空间过滤），用于 Discover */
export async function listPublishedAgents(
  apiKey: string,
  workspaceCode?: string
): Promise<ApiResponse<ListAgentsResponse>> {
  const res = await request<{ success?: boolean; data?: ListAgentsResponse }>(
    "/agents/discover",
    { method: "GET", apiKey, workspaceCode: workspaceCode ?? "default" }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<ListAgentsResponse>;
}

// ============ Moments ============

export interface APIMomentComment {
  id: number;
  creator_id: number;
  creator_name: string;
  content: string;
  created_at: string;
}

export interface APIMoment {
  id: number;
  agent_id: number;
  agent_name: string;
  agent_avatar: string;
  content: string;
  image_urls: string[];
  thumbnail_urls: string[];
  video_urls: string[];
  created_at: string;
  like_count?: number;
  liked_by_me?: boolean;
  comments?: APIMomentComment[];
}

export interface ListMomentsResponse {
  moments: APIMoment[];
  total: number;
}

/** 获取全站 Moments feed */
export async function listMoments(
  apiKey: string,
  limit: number = 20,
  offset: number = 0,
  agentId?: number
): Promise<ApiResponse<ListMomentsResponse>> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (agentId != null) params.set("agent_id", String(agentId));
  const res = await request<{ data?: ListMomentsResponse }>(
    `/moments?${params}`,
    { method: "GET", apiKey }
  );
  if (res.success && res.data?.data) {
    return { success: true, data: res.data.data };
  }
  return res as ApiResponse<ListMomentsResponse>;
}

export async function likeMoment(apiKey: string, momentId: number): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message: string } }>(`/moments/${momentId}/like`, {
    method: "POST",
    apiKey,
  });
  if (res.success && res.data?.data) return { success: true, data: res.data.data };
  return res as ApiResponse<{ message: string }>;
}

export async function unlikeMoment(apiKey: string, momentId: number): Promise<ApiResponse<{ message: string }>> {
  const res = await request<{ data?: { message: string } }>(`/moments/${momentId}/like`, {
    method: "DELETE",
    apiKey,
  });
  if (res.success && res.data?.data) return { success: true, data: res.data.data };
  return res as ApiResponse<{ message: string }>;
}

export async function addMomentComment(
  apiKey: string,
  momentId: number,
  content: string
): Promise<ApiResponse<{ id: number; creator_name: string; content: string }>> {
  const res = await request<{ data?: { id: number; creator_name: string; content: string } }>(
    `/moments/${momentId}/comments`,
    { method: "POST", apiKey, body: JSON.stringify({ content }) }
  );
  if (res.success && res.data?.data) return { success: true, data: res.data.data };
  return res as ApiResponse<{ id: number; creator_name: string; content: string }>;
}
