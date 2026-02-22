/**
 * Linkyun Agent API 客户端
 * 基于现有服务 API 结构
 */

export const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  metadata?: { avatar?: string };
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
  knowledge_base_id?: number | null;
  version: number;
  system_prompt?: string;
  temperature?: number;
  config?: AgentConfig;
  llm_provider?: string;
  llm_temperature?: number | null;
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
  // 路径格式（新）：如 "1.jpg" - 使用秒级时间戳以便更快看到更新
  if (!av.startsWith("data:")) {
    return `${getBaseUrl()}/api/v1/avatars/${av}?t=${getSecondTimestamp()}`;
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
  const json = await res.json();
  if (!res.ok) {
    return { success: false as const, error: json.error || { message: `HTTP ${res.status}` } };
  }
  return { success: true as const, data: json as Agent };
}

export async function deleteAgentAvatar(apiKey: string, agentId: number) {
  return request<Agent>(`/agents/${agentId}/avatar`, {
    method: "DELETE",
    apiKey,
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
  const json = await res.json();
  if (!res.ok) {
    return { success: false as const, error: json.error || { message: `HTTP ${res.status}` } };
  }
  return { success: true as const, data: json as Creator };
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
}

export interface SharedUser {
  user_id: number;
  username: string;
  session_count: number;
  last_message_at?: string;
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
  /** 回复中附带的图片链接（引用用户消息的附件） */
  attachments?: MessageAttachment[];
}

async function request<T>(
  path: string,
  options: RequestInit & { apiKey?: string } = {}
): Promise<ApiResponse<T>> {
  const { apiKey, ...init } = options;
  const url = `${getBaseUrl()}/api/v1${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (apiKey) {
    (headers as Record<string, string>)["X-API-Key"] = apiKey;
  }

  const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  const json = text ? JSON.parse(text) : { success: true };

  if (!res.ok) {
    return {
      success: false,
      error: json.error || { message: `HTTP ${res.status}` },
    };
  }
  return json;
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

export async function listAgents(apiKey: string) {
  const res = await request<{ agents: Agent[]; total: number }>("/agents", {
    method: "GET",
    apiKey,
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
  }
) {
  return request<Agent>("/agents", {
    method: "POST",
    apiKey,
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
    knowledge_base_id?: number | null;
    llm_provider?: string;
    llm_temperature?: number | null;
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
  if (data.knowledge_base_id !== undefined) body.knowledge_base_id = data.knowledge_base_id;
  if (data.llm_provider !== undefined) body.llm_provider = data.llm_provider;
  if (data.llm_temperature !== undefined) body.llm_temperature = data.llm_temperature;
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
