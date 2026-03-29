/**
 * Linkyun Agent API 客户端
 * 基于现有服务 API 结构
 */

const API_URL_OVERRIDE_STORAGE_KEY = "linkyun-api-url-override";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export const getDefaultBaseUrl = () =>
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081");

export const getConfiguredBaseUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(API_URL_OVERRIDE_STORAGE_KEY);
  if (!raw) return null;
  const normalized = normalizeBaseUrl(raw);
  return normalized || null;
};

export const setConfiguredBaseUrl = (url: string | null) => {
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    window.localStorage.removeItem(API_URL_OVERRIDE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(API_URL_OVERRIDE_STORAGE_KEY, normalizeBaseUrl(url));
};

export const getBaseUrl = () => getConfiguredBaseUrl() || getDefaultBaseUrl();

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code?: string; message: string };
}

export interface CreatorMetadata {
  full_name?: string;
  description?: string;
  organization?: string;
  website?: string;
  avatar?: string; // 头像文件名，如 creator_1.jpg
}

export interface Creator {
  id: number;
  uuid: string;
  username: string;
  email: string;
  status: string;
  metadata?: CreatorMetadata;
}

export interface ExampleMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentConfig {
  system_prompt?: string;
  temperature?: number;
  examples?: ExampleMessage[];
  skills?: string[];
  metadata?: {
    avatar?: string;
    /** 角色设定稿正文（Motherland + 提示词/头像生成） */
    character_design_spec?: string;
    /** 漫画设计稿静态文件名，对应 GET /api/v1/character-sheets/{filename} */
    character_design_sheet?: string;
  };
}

export interface RagConfig {
  enabled: boolean;
  knowledge_base_id?: string;
  max_chunks?: number;
  similarity_threshold?: number;
}

export interface Agent {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string;
  model: string;
  status: string;
  agent_type: 'cloud' | 'edge';
  edge_status: 'offline' | 'online';
  edge_token?: string;
  memory_enabled: boolean;
  hidden?: boolean;
  llm_api_key_configured?: boolean;
  knowledge_base_id?: number | null;
  version: number;
  system_prompt?: string;
  temperature?: number;
  config?: AgentConfig;
  llm_provider?: string;
  llm_temperature?: number | null;
  llm_provider_type?: string;
  llm_base_url?: string;
  llm_model_name?: string;
  /** 服务端返回，用于头像 URL 缓存破坏 */
  updated_at?: string;
}

export interface LLMProvider {
  name: string;
  display_name: string;
  description: string;
  model: string;
  skip_temperature: boolean;
  capabilities: string[];
}

/** 获取分钟级时间戳，用于头像缓存破坏 */
function getMinuteTimestamp(): number {
  return Math.floor(Date.now() / 60000);
}

/** 获取秒级时间戳，用于 AI Agent 头像缓存破坏（在 creator 页面需要更快的更新） */
function getSecondTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/** 从 Agent 获取头像：路径则返回完整 URL，base64 则原样返回（兼容旧数据），无则 null */
export function getAgentAvatar(agent: Agent): string | null {
  const av = agent.config?.metadata?.avatar;
  if (!av || typeof av !== "string") return null;
  // 路径格式（新）：如 "1.jpg" — 优先用 updated_at 破坏缓存（上传/接受 AI 头像后立即刷新）
  if (!av.startsWith("data:")) {
    let bust = getSecondTimestamp();
    if (typeof agent.updated_at === "string" && agent.updated_at) {
      const ms = new Date(agent.updated_at).getTime();
      if (!Number.isNaN(ms)) bust = ms;
    }
    return `${getBaseUrl()}/api/v1/avatars/${encodeURIComponent(av)}?t=${bust}`;
  }
  return av;
}

export async function uploadAgentAvatar(apiKey: string, agentId: number, file: Blob) {
  const url = `${getBaseUrl()}/api/v1/agents/${agentId}/avatar`;
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = (await res.json()) as { success?: boolean; data?: Agent; error?: { message?: string } };
  if (!res.ok) {
    return { success: false as const, error: json.error || { message: `HTTP ${res.status}` } };
  }
  const data = json.data;
  if (!data) {
    return { success: false as const, error: { message: "Invalid response: missing agent data" } };
  }
  return { success: true as const, data };
}

export async function deleteAgentAvatar(apiKey: string, agentId: number) {
  return request<Agent>(`/agents/${agentId}/avatar`, {
    method: "DELETE",
    apiKey,
  });
}

/** AI 生成头像预览（与 Motherland「生成头像」技能相同管线，需已配置 Nano Banana） */
export async function generateAgentAvatarPreview(apiKey: string, agentId: number, prompt: string) {
  return request<{ image_url: string }>(`/agents/${agentId}/avatar/generate-preview`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({ prompt }),
  });
}

/** 依据当前提示词稿、Motherland 对话与近期人机对话优化 system prompt；调用使用系统 Motherland Agent 的 LLM（非被编辑 Agent 的模型） */
export async function optimizeAgentNarrative(
  apiKey: string,
  agentId: number,
  body: { baseline_prompt?: string; instruction?: string }
) {
  return request<{ optimized_prompt: string }>(`/agents/${agentId}/optimize-narrative`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({
      baseline_prompt: body.baseline_prompt ?? "",
      instruction: body.instruction ?? "",
    }),
  });
}

/** Motherland 多模态 LLM：根据当前提示词、头像与 Motherland 对话摘录生成角色设定稿 */
export async function generateCharacterDesignSpec(apiKey: string, agentId: number, systemPrompt?: string) {
  return request<{ spec_text: string }>(`/agents/${agentId}/character-design/generate-spec`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({ system_prompt: systemPrompt ?? "" }),
  });
}

/** Motherland 委托 Nano Banana：根据设定稿生成漫画用设计稿图 */
export async function generateCharacterDesignSheet(apiKey: string, agentId: number, specText: string) {
  return request<{ image_url: string }>(`/agents/${agentId}/character-design/generate-sheet`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({ spec_text: specText }),
  });
}

/** 将设定稿与设计稿图写入 Agent Profile（config.metadata + 静态文件） */
export async function saveCharacterDesign(
  apiKey: string,
  agentId: number,
  body: { spec_text: string; image_url: string }
) {
  return request<Agent>(`/agents/${agentId}/character-design/save`, {
    method: "POST",
    apiKey,
    body: JSON.stringify(body),
  });
}

/** 从 Creator 获取头像 URL，无则 null */
export function getCreatorAvatar(creator: Creator | null | undefined): string | null {
  const av = creator?.metadata?.avatar;
  if (!av || typeof av !== "string") return null;
  return `${getBaseUrl()}/api/v1/avatars/${av}?t=${getMinuteTimestamp()}`;
}

export async function uploadCreatorAvatar(apiKey: string, file: Blob) {
  const url = `${getBaseUrl()}/api/v1/profile/avatar`;
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = (await res.json()) as { success?: boolean; data?: Creator; error?: { message?: string } };
  if (!res.ok) {
    return { success: false as const, error: json.error || { message: `HTTP ${res.status}` } };
  }
  const data = json.data;
  if (!data) {
    return { success: false as const, error: { message: "Invalid response: missing profile data" } };
  }
  return { success: true as const, data };
}

export async function deleteCreatorAvatar(apiKey: string) {
  return request<Creator>("/profile/avatar", {
    method: "DELETE",
    apiKey,
  });
}

/** 图片上传结果，用于 message attachments */
export interface ImageUploadResult {
  token: string;
  download_url: string;
  preview_url: string;
  expires_in: number;
}

/** 上传图片到 Creator 接口，返回 token 和 URL */
export async function uploadImageFile(
  apiKey: string,
  file: File
): Promise<ApiResponse<ImageUploadResult>> {
  if (!file.type.startsWith("image/")) {
    return { success: false, error: { message: "仅支持图片文件" } };
  }
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
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
    console.warn("[ImageUpload] upload failed:", res.status, json);
    return {
      success: false as const,
      error: json.error || { message: `HTTP ${res.status}` },
    };
  }
  // 后端 RespondJSON 包装为 { success, data: { token, ... } }
  const d = json.data || json;
  console.log("[ImageUpload] upload success: token=", d.token, "name=", file.name, "size=", file.size);
  return {
    success: true as const,
    data: {
      token: d.token,
      download_url: d.download_url,
      preview_url: d.preview_url,
      expires_in: d.expires_in ?? 86400,
    },
  };
}

/** 文档上传结果 */
export interface DocumentUploadResult {
  token: string;
  download_url: string;
  expires_in: number;
}

const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.txt";
const DOCUMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB

function isDocumentFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return [".pdf", ".doc", ".docx", ".txt"].includes(ext);
}

/** 上传文档到 Creator 接口（PDF/Word/TXT） */
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
      error: json.error || { message: `HTTP ${res.status}` },
    };
  }
  const d = json.data || json;
  return {
    success: true as const,
    data: {
      token: d.token,
      download_url: d.download_url,
      expires_in: d.expires_in ?? 86400,
    },
  };
}

/** 带 _file 的待上传附件（内部使用） */
export interface PendingAttachment {
  _file?: File;
  [key: string]: unknown;
}

/** 将待上传附件（含 _file）转为已上传附件（含 token），发送前调用 */
export async function resolvePendingAttachments(
  apiKey: string,
  attachments: PendingAttachment[]
): Promise<{ type: string; token?: string; download_url?: string; preview_url?: string; mime_type?: string; name?: string; size?: number; widget_id?: string; skill_id?: string }[]> {
  console.log("[ImageUpload] resolvePendingAttachments: input count=", attachments.length, "items=", attachments.map((a) => ({ type: a.type, hasFile: !!a._file, token: a.token })));
  const result: { type: string; token?: string; download_url?: string; preview_url?: string; mime_type?: string; name?: string; size?: number; widget_id?: string; skill_id?: string }[] = [];
  for (const att of attachments) {
    const base = { widget_id: att.widget_id as string | undefined, skill_id: att.skill_id as string | undefined };
    if (att._file) {
      const attType = (att.type as string) || "image";
      const res =
        attType === "file" || isDocumentFile(att._file)
          ? await uploadDocumentFile(apiKey, att._file)
          : await uploadImageFile(apiKey, att._file);
      if (res.success && res.data) {
        const data = res.data as { token: string; download_url?: string; preview_url?: string };
        result.push({
          ...base,
          type: attType === "file" || isDocumentFile(att._file) ? "file" : attType,
          token: data.token,
          download_url: data.download_url,
          preview_url: (data as { preview_url?: string }).preview_url,
          mime_type: att.mime_type as string | undefined,
          name: att.name as string | undefined,
          size: att.size as number | undefined,
        });
      } else {
        console.warn("[Upload] upload failed for", att._file.name, ":", (res as { error?: { message?: string } }).error?.message);
      }
    } else if (att.token) {
      result.push({
        ...base,
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
  console.log("[ImageUpload] resolvePendingAttachments: output count=", result.length, "tokens=", result.map((r) => r.token));
  return result;
}

export interface Session {
  id: number;
  uuid: string;
  agent_id: number;
  user_id: number;
  creator_id: number;
  status: string;
  message_count: number;
  total_tokens: number;
  created_at: string;
  verified?: boolean;
  custom_prompt_patch?: string | null;
  /** 用户自定义的聊天/话题名称（user_hub 会话） */
  title?: string | null;
  /** 是否为群聊会话 */
  is_group?: boolean;
  /** 会话类型：H2A=人机对话, A2A=机机对话(Talk to mother land) */
  session_type?: string;
}

export interface SharedUser {
  user_id: number;
  username: string;
  session_count: number;
  last_message_at?: string;
}

/** GET /sessions/shared — 创作者全部共享 H2A（1v1）会话 */
export interface SharedH2ASessionInfo {
  id: number;
  uuid: string;
  title?: string | null;
  status: string;
  source: string;
  message_count: number;
  total_tokens: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
}

export interface SharedH2AAgentInfo {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  avatar: string;
  agent_type: string;
  online: boolean;
}

export interface SharedH2AHumanInfo {
  id: number;
  uuid: string;
  username: string;
  display_name?: string;
  avatar: string;
}

export interface SharedH2ASessionForCreator {
  session: SharedH2ASessionInfo;
  agent: SharedH2AAgentInfo;
  human: SharedH2AHumanInfo;
}

/** 将共享列表行转为 Session，供消息/Prompt 等现有接口使用 */
export function sharedH2ARowToSession(
  row: SharedH2ASessionForCreator,
  creatorId = 0
): Session {
  return {
    id: row.session.id,
    uuid: row.session.uuid,
    agent_id: row.agent.id,
    user_id: row.human.id,
    creator_id: creatorId,
    status: row.session.status,
    message_count: row.session.message_count,
    total_tokens: row.session.total_tokens,
    created_at: row.session.created_at,
    verified: row.session.verified,
    title: row.session.title ?? undefined,
    is_group: false,
    session_type: "H2A",
  };
}

/** 用户/Agent 存库的头像文件名 → 可展示的 URL */
export function getAvatarUrlFromStoredFilename(filename: string | null | undefined): string | null {
  if (!filename || typeof filename !== "string" || !filename.trim()) return null;
  const av = filename.trim();
  if (av.startsWith("data:")) return av;
  return `${getBaseUrl()}/api/v1/avatars/${encodeURIComponent(av)}?t=${getMinuteTimestamp()}`;
}

/** 消息中的附件（与 Attachment 格式一致，含 token 时用于预览/下载） */
export interface MessageAttachment {
  type: string;
  token?: string;
  download_url?: string;
  preview_url?: string;
  mime_type?: string;
  name?: string;
  size?: number;
}

export interface Message {
  id: number;
  uuid: string;
  session_id: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  content_type: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
  created_at: string;
  audio_url?: string;
  /** 群聊中发送该消息的 Agent ID */
  sender_agent_id?: number | null;
  /** 群聊中发送该消息的 Agent 名称（或用户显示名） */
  sender_name?: string | null;
}

export interface AuthResponse {
  api_key: string;
  creator: Creator;
}

export interface SendMessageResponse {
  message_id: string;
  content: string;
  role: string;
  model: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  audio_url?: string;
  docx_url?: string;
  /** 生成的图片 URL（如 nanobanana_image 技能） */
  image_url?: string;
  /** 回复中附带的图片链接（引用用户消息的附件） */
  attachments?: MessageAttachment[];
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
  let json: { success?: boolean; data?: T; error?: { message?: string } } = { success: true };
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: { message: res.ok ? "Invalid response format" : `HTTP ${res.status}` },
      };
    }
  }

  if (!res.ok) {
    return {
      success: false,
      error: {
        ...(json.error || {}),
        message: json.error?.message ?? `HTTP ${res.status}`,
      },
    };
  }
  return {
    success: json.success ?? true,
    data: json.data,
  } as ApiResponse<T>;
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

export async function getUserWorkspaces(apiKey: string) {
  return request<{ workspaces: WorkspaceWithRole[]; total: number }>("/user/workspaces", {
    method: "GET",
    apiKey,
  });
}

export async function switchWorkspace(apiKey: string, workspaceCode: string) {
  return request<{ workspace: Workspace; message: string }>("/user/workspace/switch", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ workspace_code: workspaceCode }),
  });
}

export async function getWorkspaceInviteCode(apiKey: string, workspaceCode: string) {
  return request<{ invite_code: string }>("/user/workspace/invite-code", {
    method: "GET",
    apiKey,
    workspaceCode,
  });
}

export async function refreshWorkspaceInviteCode(apiKey: string, workspaceCode: string) {
  return request<{ invite_code: string }>("/user/workspace/invite-code/refresh", {
    method: "POST",
    apiKey,
    workspaceCode,
  });
}

// ============ 系统状态（公开接口，无需认证） ============

export interface MotherlandStatus {
  configured: boolean;
  agent_id?: number; // 当 configured 时返回 Motherland Agent ID
}

export async function getMotherlandStatus(): Promise<MotherlandStatus> {
  const res = await fetch(`${getBaseUrl()}/api/v1/system/motherland-status`);
  const data = await res.json();
  return data as MotherlandStatus;
}

/** 与 Motherland 对话（创作者认证，用于 Agent 编辑页 Talk To Motherland） */
export async function talkToMotherland(apiKey: string, agentId: number, content: string): Promise<ApiResponse<{ content: string }>> {
  return request<{ content: string }>("/system/talk-to-motherland", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ content, agent_id: agentId }),
  });
}

/** 自动对话一轮（创作者认证，Agent 自动与 Motherland 对话） */
export async function autoTalkRound(apiKey: string, agentId: number, topic: string): Promise<ApiResponse<{ agent_message: string; motherland_reply: string }>> {
  return request<{ agent_message: string; motherland_reply: string }>("/system/auto-talk-round", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ agent_id: agentId, topic }),
  });
}

/** 自动生成对话主题（根据 Agent 设定和最近对话） */
export async function generateAutoTalkTopic(apiKey: string, agentId: number): Promise<ApiResponse<{ topic: string }>> {
  return request<{ topic: string }>("/system/generate-topic", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ agent_id: agentId }),
  });
}

/** 获取与 Motherland 的聊天历史 */
export async function getMotherlandChatHistory(apiKey: string, agentId: number): Promise<ApiResponse<{ messages: { role: string; content: string }[] }>> {
  return request<{ messages: { role: string; content: string }[] }>("/system/motherland-chat-history", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ agent_id: agentId }),
  });
}

/** 重置与 Motherland 的聊天记录 */
export async function resetMotherlandChat(apiKey: string, agentId: number): Promise<ApiResponse<{ status: string }>> {
  return request<{ status: string }>("/system/motherland-chat-reset", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ agent_id: agentId }),
  });
}

// ============ 认证 ============

export async function login(
  username: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

// ============ Profile ============

export async function getProfile(apiKey: string) {
  return request<Creator>("/profile", { method: "GET", apiKey });
}

export async function updateProfile(
  apiKey: string,
  data: { username?: string; full_name?: string; description?: string }
) {
  return request<Creator>("/profile", {
    method: "PUT",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function changePassword(
  apiKey: string,
  currentPassword: string,
  newPassword: string
) {
  return request<{ message: string }>("/profile/password", {
    method: "PUT",
    apiKey,
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ============ Agents ============

export async function listAgents(apiKey: string, options?: { workspaceCode?: string }) {
  const res = await request<{ agents: Agent[]; total: number }>("/agents", {
    method: "GET",
    apiKey,
    workspaceCode: options?.workspaceCode,
  });
  return res;
}

export async function getAgent(apiKey: string, id: number) {
  return request<Agent>(`/agents/${id}`, { method: "GET", apiKey });
}

export async function getAgentByCode(apiKey: string, code: string) {
  return request<Agent>(`/agents/by-code/${encodeURIComponent(code)}`, {
    method: "GET",
    apiKey,
  });
}

export async function createAgent(
  apiKey: string,
  data: {
    code: string;
    name: string;
    description?: string;
    model?: string;
    system_prompt?: string;
    temperature?: number;
    agent_type?: 'cloud' | 'edge';
  },
  options?: { workspaceCode?: string }
) {
  return request<Agent>("/agents", {
    method: "POST",
    apiKey,
    workspaceCode: options?.workspaceCode,
    body: JSON.stringify({
      code: data.code,
      name: data.name,
      description: data.description || "",
      model: data.model || "claude-3-5-sonnet-20241022",
      system_prompt: data.system_prompt || "你是一个有帮助的助手。",
      temperature: data.temperature ?? 0.7,
      agent_type: data.agent_type || "cloud",
    }),
  });
}

export async function updateAgent(
  apiKey: string,
  id: number,
  data: {
    code?: string;
    name?: string;
    description?: string;
    system_prompt?: string;
    model?: string;
    temperature?: number;
    examples?: ExampleMessage[];
    status?: string;
    skills?: string[];
    agent_type?: 'cloud' | 'edge';
    memory_enabled?: boolean;
    hidden?: boolean;
    llm_api_key?: string | null;
    knowledge_base_id?: number | null;
    llm_provider?: string;
    llm_temperature?: number | null;
    llm_provider_type?: string;
    llm_base_url?: string;
    llm_model_name?: string;
    workspace_id?: number;
  }
) {
  const body: Record<string, unknown> = {};
  if (data.code != null) body.code = data.code;
  if (data.name != null) body.name = data.name;
  if (data.description != null) body.description = data.description;
  if (data.system_prompt != null) body.system_prompt = data.system_prompt;
  if (data.model != null) body.model = data.model;
  if (data.temperature != null) body.temperature = data.temperature;
  if (data.examples != null) body.examples = data.examples;
  if (data.status != null) body.status = data.status;
  if (data.skills != null) body.skills = data.skills;
  if (data.agent_type != null) body.agent_type = data.agent_type;
  if (data.memory_enabled != null) body.memory_enabled = data.memory_enabled;
  if (data.hidden != null) body.hidden = data.hidden;
  if (data.llm_api_key !== undefined) body.llm_api_key = data.llm_api_key;
  if (data.knowledge_base_id !== undefined) body.knowledge_base_id = data.knowledge_base_id;
  if (data.llm_provider !== undefined) body.llm_provider = data.llm_provider;
  if (data.llm_temperature !== undefined) body.llm_temperature = data.llm_temperature;
  if (data.llm_provider_type !== undefined) body.llm_provider_type = data.llm_provider_type;
  if (data.llm_base_url !== undefined) body.llm_base_url = data.llm_base_url;
  if (data.llm_model_name !== undefined) body.llm_model_name = data.llm_model_name;
  if (data.workspace_id !== undefined) body.workspace_id = data.workspace_id;
  return request<Agent>(`/agents/${id}`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify(body),
  });
}

export interface SkillDefinition {
  name: string;
  description: string;
  category?: string;
  version?: string;
}

export async function listSkills(apiKey: string) {
  const res = await request<{ skills: SkillDefinition[] }>("/skills", {
    method: "GET",
    apiKey,
  });
  return res;
}

// ============ Marketplace & Creator Skills ============

export interface MarketplaceSkill {
  id: number;
  uuid: string;
  name: string;
  description: string;
  description_for_llm?: string | null;
  /** 从 skill_definition.description 解析，用于「恢复默认」调用提示词 */
  default_tool_description?: string;
  config_doc?: string | null;
  stage: string;
  implementation_type: string;
  trigger_config?: unknown;
  config_schema?: unknown;
  category?: string;
}

export async function listMarketplaceSkills(apiKey: string, stage?: string) {
  const q = stage ? `?stage=${encodeURIComponent(stage)}` : "";
  return request<{ skills: MarketplaceSkill[] }>(`/skills/marketplace${q}`, {
    method: "GET",
    apiKey,
  });
}

export async function getMarketplaceSkill(apiKey: string, id: number) {
  return request<MarketplaceSkill>(`/skills/marketplace/${id}`, {
    method: "GET",
    apiKey,
  });
}

export interface CreatorSkill {
  id: number;
  uuid: string;
  creator_id: number;
  skill_id: number;
  skill_name?: string;
  /** pre_conversation | mid_conversation | post_conversation */
  stage?: string;
  /** function | prompt-based | prompt-api | prompt-tool，用于判断是否支持按 Agent 编辑调用提示词 */
  implementation_type?: string;
  /** 技能默认的 tool description（来自 skill_definition），用于编辑时的默认展示和一键恢复 */
  default_tool_description?: string;
  name: string;
  config: Record<string, unknown>;
  config_schema?: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[] }>; required?: string[] };
  status: string;
  created_at: string;
  updated_at: string;
}

export async function listCreatorSkills(apiKey: string) {
  return request<{ creator_skills: CreatorSkill[] }>("/creator-skills", {
    method: "GET",
    apiKey,
  });
}

export async function createCreatorSkill(
  apiKey: string,
  data: { skill_id: number; name: string; config: Record<string, unknown> }
) {
  return request<CreatorSkill>("/creator-skills", {
    method: "POST",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function getCreatorSkill(apiKey: string, id: number) {
  return request<CreatorSkill>(`/creator-skills/${id}`, {
    method: "GET",
    apiKey,
  });
}

export async function updateCreatorSkill(
  apiKey: string,
  id: number,
  data: { name?: string; config?: Record<string, unknown>; status?: string }
) {
  return request<CreatorSkill>(`/creator-skills/${id}`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function deleteCreatorSkill(apiKey: string, id: number) {
  return request<{ message: string }>(`/creator-skills/${id}`, {
    method: "DELETE",
    apiKey,
  });
}

/** Agent 绑定的 post skill，含 agent 级 config 覆盖 */
export interface AgentPostSkill {
  id: number;
  skill_id: number;
  skill_name: string;
  name: string;
  config: Record<string, unknown>;
  agent_config?: Record<string, unknown>;
}

export async function listAgentPostSkills(apiKey: string, agentId: number) {
  return request<{ post_skills: AgentPostSkill[] }>(`/agents/${agentId}/post-skills`, {
    method: "GET",
    apiKey,
  });
}

export interface AgentPreSkill {
  id: number;
  uuid: string;
  skill_id: number;
  skill_name: string;
  name: string;
}

export async function listAgentPreSkills(apiKey: string, agentId: number) {
  return request<{ pre_skills: AgentPreSkill[] }>(`/agents/${agentId}/pre-skills`, {
    method: "GET",
    apiKey,
  });
}

export async function setAgentPreSkills(
  apiKey: string,
  agentId: number,
  preSkills: { creator_skill_id: number }[]
) {
  return request<{ message: string }>(`/agents/${agentId}/pre-skills`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify({ pre_skills: preSkills }),
  });
}

export async function addBuiltinImageUpload(apiKey: string, agentId: number) {
  return request<{ message: string; creator_skill_id?: number }>(
    `/agents/${agentId}/pre-skills/add-builtin-image-upload`,
    { method: "POST", apiKey }
  );
}

export async function addBuiltinDocumentUpload(apiKey: string, agentId: number) {
  return request<{ message: string; creator_skill_id?: number }>(
    `/agents/${agentId}/pre-skills/add-builtin-document-upload`,
    { method: "POST", apiKey }
  );
}

export async function getAgentWidgets(apiKey: string, agentId: number) {
  return request<{ widgets: import("@/lib/widgets").WidgetSpec[] }>(
    `/agents/${agentId}/skills/widgets`,
    { method: "GET", apiKey }
  );
}

export async function setAgentPostSkills(
  apiKey: string,
  agentId: number,
  postSkills: { creator_skill_id: number; config?: Record<string, unknown> }[]
) {
  return request<{ message: string }>(`/agents/${agentId}/post-skills`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify({ post_skills: postSkills }),
  });
}

export interface AgentMidSkill {
  id: number;
  uuid: string;
  creator_id: number;
  skill_id: number;
  skill_name: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  agent_config?: Record<string, unknown>;
}

export async function listAgentMidSkills(apiKey: string, agentId: number) {
  return request<{ mid_skills: AgentMidSkill[] }>(`/agents/${agentId}/mid-skills`, {
    method: "GET",
    apiKey,
  });
}

export async function setAgentMidSkills(
  apiKey: string,
  agentId: number,
  midSkills: { creator_skill_id: number; config?: Record<string, unknown> }[]
) {
  return request<{ message: string }>(`/agents/${agentId}/mid-skills`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify({ mid_skills: midSkills }),
  });
}

export async function deleteAgent(apiKey: string, id: number) {
  return request<{ message: string }>(`/agents/${id}`, {
    method: "DELETE",
    apiKey,
  });
}

export async function resetEdgeToken(apiKey: string, id: number) {
  return request<{ edge_token: string }>(`/agents/${id}/edge-token/reset`, {
    method: "POST",
    apiKey,
  });
}

// ============ Sessions ============

export async function listSessions(apiKey: string) {
  return request<{ sessions: Session[]; total: number }>("/sessions", {
    method: "GET",
    apiKey,
  });
}

export async function listSharedUsers(apiKey: string, agentId: number) {
  return request<{ users: SharedUser[] }>(`/agents/${agentId}/shared-users`, {
    method: "GET",
    apiKey,
  });
}

export async function listSharedSessions(apiKey: string, agentId: number, userId: number) {
  return request<{ sessions: Session[] }>(`/agents/${agentId}/users/${userId}/shared-sessions`, {
    method: "GET",
    apiKey,
  });
}

/** 创作者：全部已共享的 H2A（1v1）会话，含 session / agent / human */
export async function listSharedH2ASessionsForCreator(apiKey: string) {
  return request<{ sessions: SharedH2ASessionForCreator[] }>("/sessions/shared", {
    method: "GET",
    apiKey,
  });
}

export async function verifySession(apiKey: string, sessionId: number, verified: boolean) {
  return request<{ id: number; verified: boolean }>(`/sessions/${sessionId}/verify`, {
    method: "PATCH",
    apiKey,
    body: JSON.stringify({ verified }),
  });
}

export interface UserAgentPrompt {
  id: number;
  agent_id: number;
  user_id: number;
  prompt: string;
}

export async function getUserAgentPrompt(apiKey: string, agentId: number, userId: number) {
  return request<UserAgentPrompt>(`/agents/${agentId}/users/${userId}/prompt`, {
    method: "GET",
    apiKey,
  });
}

export async function setUserAgentPrompt(apiKey: string, agentId: number, userId: number, prompt: string) {
  return request<UserAgentPrompt>(`/agents/${agentId}/users/${userId}/prompt`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify({ prompt }),
  });
}

export async function getSession(apiKey: string, id: number) {
  return request<Session>(`/sessions/${id}`, { method: "GET", apiKey });
}

export async function updateSessionPrompt(apiKey: string, sessionId: number, promptPatch: string) {
  return request<{ message: string; prompt_patch: string; session_id: string }>(`/sessions/${sessionId}/prompt`, {
    method: "PATCH",
    apiKey,
    body: JSON.stringify({ prompt_patch: promptPatch, reason: "" }),
  });
}

export async function createSession(
  apiKey: string,
  agentId: number,
  userId: number = 1
) {
  return request<Session>("/sessions", {
    method: "POST",
    apiKey,
    body: JSON.stringify({ agent_id: agentId, user_id: userId }),
  });
}

/** 模拟对话时覆盖的技能（Test 用页面选择，无需保存） */
export interface SimulateSkillOverride {
  creator_skill_id: number;
  config?: Record<string, unknown>;
}

/** 模拟对话：直接调用 LLM 测试，不创建 session、不保存消息 */
export async function simulateAgent(
  apiKey: string,
  agentId: number,
  content: string,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  examples?: { role: string; content: string }[],
  skills?: string[],
  attachments?: SendMessageAttachment[],
  midSkills?: SimulateSkillOverride[],
  postSkills?: SimulateSkillOverride[]
) {
  const body: Record<string, unknown> = { content, messages };
  if (systemPrompt != null) body.system_prompt = systemPrompt;
  if (examples != null && examples.length > 0) body.examples = examples;
  if (skills != null && skills.length > 0) body.skills = skills;
  if (attachments != null && attachments.length > 0) {
    body.attachments = attachments;
    console.log("[Simulate] sending attachments:", attachments.length, attachments.map((a) => ({ type: a.type, token: a.token })));
  }
  if (midSkills != null && midSkills.length > 0) body.mid_skills = midSkills;
  if (postSkills != null && postSkills.length > 0) body.post_skills = postSkills;
  return request<SendMessageResponse>(`/agents/${agentId}/simulate`, {
    method: "POST",
    apiKey,
    body: JSON.stringify(body),
  });
}

export async function getSessionMessages(apiKey: string, sessionId: number) {
  return request<{ messages: Message[]; total: number }>(
    `/sessions/${sessionId}/messages`,
    { method: "GET", apiKey }
  );
}

/** 主动推送消息（创作者评论等） */
export interface PushMessageParams {
  user_id: number;
  creator_id?: number;
  group_id?: number;
  session_id?: number;
  sender_agent_id: number;
  sender_name?: string;
  content: string;
  content_type?: string;
}

export async function pushMessage(
  apiKey: string,
  params: PushMessageParams
): Promise<ApiResponse<{ message_id: string; session_id: number }>> {
  return request<{ message_id: string; session_id: number }>("/user/push-messages", {
    method: "POST",
    apiKey,
    body: JSON.stringify({
      user_id: params.user_id,
      creator_id: params.creator_id,
      group_id: params.group_id,
      session_id: params.session_id,
      sender_agent_id: params.sender_agent_id,
      sender_name: params.sender_name,
      content: params.content,
      content_type: params.content_type ?? "text",
    }),
  });
}

// ============ Messages ============

/** 发送消息时的附件，对应 docs/widget_protocol.md 5.3 */
export interface SendMessageAttachment {
  type: "file" | "image" | "audio";
  token?: string; // 上传后获得的文件令牌，用于引用临时目录中的文件
  url?: string;
  data?: string; // Base64 编码
  mime_type?: string;
  name?: string;
  size?: number;
  widget_id?: string;
  skill_id?: string;
}

/** 发送消息时的 metadata.custom_fields，对应 docs/widget_protocol.md 5.4 */
export interface SendMessageOptions {
  attachments?: SendMessageAttachment[];
  metadata?: { custom_fields?: Record<string, unknown> };
}

export async function sendMessage(
  apiKey: string,
  sessionId: number,
  content: string,
  options?: SendMessageOptions
) {
  const body: Record<string, unknown> = { content };
  if (options?.attachments && options.attachments.length > 0) {
    body.attachments = options.attachments;
    console.log("[SendMessage] sending attachments:", options.attachments.length, options.attachments.map((a) => ({ type: a.type, token: a.token })));
  }
  if (options?.metadata?.custom_fields && Object.keys(options.metadata.custom_fields).length > 0) {
    body.metadata = options.metadata;
  }
  return request<SendMessageResponse>(
    `/sessions/${sessionId}/messages`,
    {
      method: "POST",
      apiKey,
      body: JSON.stringify(body),
    }
  );
}

/** SSE event from streaming API */
export interface StreamEvent {
  type: "delta" | "done" | "error";
  text?: string;
  message_id?: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  error?: string;
}

/** 流式发送消息，通过回调逐块接收内容 */
export async function sendMessageStream(
  apiKey: string,
  sessionId: number,
  content: string,
  options: SendMessageOptions | undefined,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: (messageId: string, usage?: StreamEvent["usage"]) => void;
    onError?: (err: string) => void;
  }
): Promise<void> {
  const body: Record<string, unknown> = { content, stream: true };
  if (options?.attachments && options.attachments.length > 0) {
    body.attachments = options.attachments;
  }
  if (options?.metadata?.custom_fields && Object.keys(options.metadata.custom_fields ?? {}).length > 0) {
    body.metadata = options.metadata;
  }
  const url = `${getBaseUrl()}/api/v1/sessions/${sessionId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    callbacks.onError?.(errText || `HTTP ${res.status}`);
    throw new Error(errText || `HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.("No response body");
    throw new Error("No response body");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const ev = JSON.parse(data) as StreamEvent;
            if (ev.type === "delta" && ev.text) {
              callbacks.onChunk(ev.text);
            } else if (ev.type === "done" && ev.message_id) {
              callbacks.onDone(ev.message_id, ev.usage);
              return;
            } else if (ev.type === "error") {
              callbacks.onError?.(ev.error ?? "Stream error");
              throw new Error(ev.error ?? "Stream error");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }
    if (buffer.startsWith("data: ")) {
      const data = buffer.slice(6).trim();
      if (data) {
        try {
          const ev = JSON.parse(data) as StreamEvent;
          if (ev.type === "done" && ev.message_id) {
            callbacks.onDone(ev.message_id, ev.usage);
            return;
          }
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============ Memory ============

export async function clearUserMemories(apiKey: string, userId: number, agentId: number) {
  return request<{ message: string }>(
    `/users/${userId}/agents/${agentId}/memories`,
    { method: "DELETE", apiKey }
  );
}

/** 获取当前 creator 对应的 test user ID（用于记忆清除） */
export async function getTestUserId(apiKey: string, agentId: number): Promise<number | null> {
  const res = await request<{ test_user_id: number }>(`/agents/${agentId}/test-user`, { method: "GET", apiKey });
  if (res.success && res.data?.test_user_id) return res.data.test_user_id;
  return null;
}

// ============ Knowledge Base ============

export interface KnowledgeBase {
  id: number;
  uuid: string;
  creator_id: number;
  name: string;
  description: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  uuid: string;
  knowledge_base_id: number;
  source_type: "file" | "url" | "text";
  source: string;
  title: string;
  file_size: number | null;
  char_count: number | null;
  chunk_count: number;
  status: "pending" | "processing" | "ready" | "failed";
  progress: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export async function listKnowledgeBases(apiKey: string) {
  return request<KnowledgeBase[]>("/knowledge-bases", { apiKey });
}

export async function createKnowledgeBase(apiKey: string, data: { name: string; description?: string }) {
  return request<KnowledgeBase>("/knowledge-bases", {
    method: "POST",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function getKnowledgeBase(apiKey: string, id: number) {
  return request<KnowledgeBase>(`/knowledge-bases/${id}`, { apiKey });
}

export async function updateKnowledgeBase(apiKey: string, id: number, data: { name?: string; description?: string }) {
  return request<KnowledgeBase>(`/knowledge-bases/${id}`, {
    method: "PUT",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function deleteKnowledgeBase(apiKey: string, id: number) {
  return request<void>(`/knowledge-bases/${id}`, {
    method: "DELETE",
    apiKey,
  });
}

export async function listDocuments(apiKey: string, kbId: number) {
  return request<Document[]>(`/knowledge-bases/${kbId}/documents`, { apiKey });
}

export async function getDocument(apiKey: string, docId: number) {
  return request<Document>(`/documents/${docId}`, { apiKey });
}

export async function deleteDocument(apiKey: string, docId: number) {
  return request<void>(`/documents/${docId}`, { method: "DELETE", apiKey });
}

export async function uploadDocument(apiKey: string, kbId: number, file: File): Promise<ApiResponse<Document>> {
  const url = `${getBaseUrl()}/api/v1/knowledge-bases/${kbId}/documents/upload`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || { message: `HTTP ${res.status}` } };
  }
  return { success: true, data: json.data || json };
}

export async function addDocumentURL(apiKey: string, kbId: number, url: string, title?: string) {
  return request<Document>(`/knowledge-bases/${kbId}/documents/url`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({ url, title }),
  });
}

export async function addDocumentText(apiKey: string, kbId: number, title: string, content: string) {
  return request<Document>(`/knowledge-bases/${kbId}/documents/text`, {
    method: "POST",
    apiKey,
    body: JSON.stringify({ title, content }),
  });
}

export async function reindexDocument(apiKey: string, docId: number) {
  return request<void>(`/documents/${docId}/reindex`, { method: "POST", apiKey });
}

export interface DocumentChunk {
  index: number;
  content: string;
  score?: number;
}

export interface DocumentChunksResponse {
  chunks: DocumentChunk[];
  total: number;
  page: number;
  page_size: number;
}

export async function listDocumentChunks(apiKey: string, docId: number, page: number = 1, pageSize: number = 20) {
  return request<DocumentChunksResponse>(`/documents/${docId}/chunks?page=${page}&page_size=${pageSize}`, { apiKey });
}

// ============ Moments ============

export interface MomentDraft {
  content: string;
  agent_name: string;
}

export interface MomentImageUploadResult {
  token: string;
  url_800: string;
  url_240: string;
}

export interface CreateMomentRequest {
  content: string;
  image_tokens?: string[];
  video_urls?: string[];
  auto_image?: boolean;
}

export interface MomentCommentItem {
  id: number;
  creator_id: number;
  creator_name: string;
  content: string;
  created_at: string;
}

export interface MomentItem {
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
  comments?: MomentCommentItem[];
}

export async function getMomentDraft(apiKey: string, agentId: number) {
  return request<MomentDraft>(`/agents/${agentId}/moments/draft`, { apiKey });
}

export async function uploadMomentImage(apiKey: string, file: File): Promise<ApiResponse<MomentImageUploadResult>> {
  if (!file.type.startsWith("image/")) {
    return { success: false, error: { message: "仅支持图片文件" } };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { success: false, error: { message: "图片不能超过 20MB" } };
  }
  const url = `${getBaseUrl()}/api/v1/files/upload-moment-image`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json?.error || { message: `HTTP ${res.status}` } };
  }
  const d = json?.data || json;
  return {
    success: true,
    data: { token: d.token, url_800: d.url_800, url_240: d.url_240 },
  };
}

export async function createMoment(apiKey: string, agentId: number, data: CreateMomentRequest) {
  return request<MomentItem>(`/agents/${agentId}/moments`, {
    method: "POST",
    apiKey,
    body: JSON.stringify(data),
  });
}

export async function listAgentMoments(apiKey: string, agentId: number, limit: number = 20, offset: number = 0) {
  return request<{ moments: MomentItem[]; total: number }>(`/agents/${agentId}/moments?limit=${limit}&offset=${offset}`, { apiKey });
}

export async function deleteMoment(apiKey: string, agentId: number, momentId: number) {
  return request<{ message: string }>(`/agents/${agentId}/moments/${momentId}`, {
    method: "DELETE",
    apiKey,
  });
}

export async function addMomentComment(
  apiKey: string,
  momentId: number,
  content: string
): Promise<ApiResponse<{ id: number; creator_name: string; content: string }>> {
  return request<{ id: number; creator_name: string; content: string }>(
    `/moments/${momentId}/comments`,
    { method: "POST", apiKey, body: JSON.stringify({ content }) }
  );
}

// ============ Moment Auto-Schedule ============

export interface MomentAutoScheduleConfig {
  agent_id: number;
  enabled: boolean;
  weekdays: number[];
  daily_times: string[];
  timezone: string;
  week_start: string;
}

export interface MomentScheduleItem {
  id: number;
  scheduled_at: string;
  status: string;
  moment_id?: number;
}

export interface MomentAutoScheduleResult {
  config: MomentAutoScheduleConfig | null;
  schedules: MomentScheduleItem[];
  reasoning?: string;
}

export async function generateMomentAutoSchedule(apiKey: string, agentId: number) {
  return request<MomentAutoScheduleResult>(`/agents/${agentId}/moments/auto-schedule`, {
    method: "POST",
    apiKey,
  });
}

export async function getMomentAutoSchedule(apiKey: string, agentId: number) {
  return request<MomentAutoScheduleResult>(`/agents/${agentId}/moments/auto-schedule`, { apiKey });
}

export async function deleteMomentAutoSchedule(apiKey: string, agentId: number) {
  return request<{ message: string }>(`/agents/${agentId}/moments/auto-schedule`, {
    method: "DELETE",
    apiKey,
  });
}

// =========================================
// LLM Provider API
// =========================================

export async function getLLMProviders(apiKey: string): Promise<ApiResponse<LLMProvider[]>> {
  return request<LLMProvider[]>("/llm-providers", { apiKey });
}

// =========================================
// User Events SSE（Edge 状态通知）
// =========================================

/** Edge 推送的状态通知事件 */
export interface EdgeStatusEvent {
  type: "edge_status";
  subtype: "status" | "progress" | "info";
  content: string;
  metadata?: {
    tool_name?: string;
    skill_name?: string;
    stage?: "pre_skill" | "tool_call" | "tool_done" | "post_skill";
    [key: string]: unknown;
  };
}

/**
 * 订阅 GET /api/v1/user/events?session_id=xxx 的 SSE 推送
 * 返回一个取消订阅的清理函数
 */
export function subscribeUserEvents(
  apiKey: string,
  sessionId: number,
  callbacks: {
    onEdgeStatus?: (event: EdgeStatusEvent) => void;
    onError?: (err: Event) => void;
  }
): () => void {
  const url = `${getBaseUrl()}/api/v1/user/events?session_id=${sessionId}`;
  const eventSource = new EventSource(url, {
    // EventSource 不支持自定义 Header，通过 URL 携带认证（需 cookie/token 方案）
    // 此处使用已有 cookie-based auth 或兼容方案
  } as EventSourceInit);

  // 通过 fetch 建立带 Header 的 SSE 连接（绕过 EventSource 不支持 Header 的限制）
  let abortController = new AbortController();
  eventSource.close(); // 关闭标准 EventSource，改用 fetch SSE

  (async () => {
    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey },
        signal: abortController.signal,
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "edge_status" && callbacks.onEdgeStatus) {
              callbacks.onEdgeStatus(evt as EdgeStatusEvent);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError" && callbacks.onError) {
        callbacks.onError(err as Event);
      }
    }
  })();

  return () => {
    abortController.abort();
  };
}

// ============ Share Link ============

export interface ShareLinkResponse {
  uuid: string;
  share_token: string;
  agent_id: number;
  agent_name?: string;
  enabled: boolean;
  expires_at?: string;
  share_url?: string;
  created_at: string;
}

export async function createShareLink(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<ShareLinkResponse>> {
  const res = await request<ShareLinkResponse>(`/agents/${agentId}/share-link`, {
    method: "POST",
    apiKey,
  });
  return res;
}

export async function getShareLink(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<ShareLinkResponse>> {
  const res = await request<ShareLinkResponse>(`/agents/${agentId}/share-link`, {
    method: "GET",
    apiKey,
  });
  return res;
}

export async function toggleShareLink(
  apiKey: string,
  agentId: number,
  enabled: boolean
): Promise<ApiResponse<ShareLinkResponse>> {
  const res = await request<ShareLinkResponse>(`/agents/${agentId}/share-link`, {
    method: "PATCH",
    apiKey,
    body: JSON.stringify({ enabled }),
  });
  return res;
}

export async function deleteShareLink(
  apiKey: string,
  agentId: number
): Promise<ApiResponse<{ deleted: boolean }>> {
  const res = await request<{ deleted: boolean }>(`/agents/${agentId}/share-link`, {
    method: "DELETE",
    apiKey,
  });
  return res;
}
