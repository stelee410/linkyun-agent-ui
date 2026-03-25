"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
  getAgent,
  updateAgent,
  resetEdgeToken,
  listCreatorSkills,
  updateCreatorSkill,
  deleteCreatorSkill,
  listAgentPostSkills,
  setAgentPostSkills,
  listAgentMidSkills,
  setAgentMidSkills,
  listAgentPreSkills,
  setAgentPreSkills,
  simulateAgent,
  getAgentAvatar,
  listKnowledgeBases,
  type Agent,
  type KnowledgeBase,
  type ExampleMessage,
  type CreatorSkill,
  type AgentPostSkill,
  type AgentMidSkill,
  type AgentPreSkill,
  getMarketplaceSkill,
  listAgentMoments,
  deleteMoment,
  addMomentComment,
  getBaseUrl,
  getLLMProviders,
  generateMomentAutoSchedule,
  getMomentAutoSchedule,
  deleteMomentAutoSchedule,
  getMotherlandStatus,
  talkToMotherland,
  autoTalkRound,
  generateAutoTalkTopic,
  getMotherlandChatHistory,
  resetMotherlandChat,
  type MomentItem,
  type LLMProvider,
  type MomentAutoScheduleResult,
  type MomentScheduleItem,
} from "@/lib/api";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AgentTestDialog } from "@/components/AgentTestDialog";
import { PostMomentDialog } from "@/components/PostMomentDialog";
import { BackIcon, SaveIcon, PublishIcon, ArchiveIcon, TestPlayIcon } from "@/components/icons";

interface DisplayMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

import { SkillIconBadge } from "@/lib/skillIcons";

const SEARCHABLE_ENUM_THRESHOLD = 15;

function SearchableEnumSelect({
  value,
  options,
  labels,
  onChange,
  placeholder = "请选择...",
  className,
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter((v) => {
      const label = labels?.[v] || v;
      return v.toLowerCase().includes(s) || label.toLowerCase().includes(s);
    });
  }, [options, labels, search]);

  const groups = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const v of filtered) {
      const label = labels?.[v] || v;
      const sepIdx = label.indexOf(" · ");
      const group = sepIdx > 0 ? label.substring(0, sepIdx) : "其他";
      if (!map[group]) map[group] = [];
      map[group].push(v);
    }
    return map;
  }, [filtered, labels]);

  const displayLabel = value ? (labels?.[value] || value) : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(""); }}
        className={className || "w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-left text-text-primary focus:ring-2 focus:ring-primary focus:outline-none truncate"}
      >
        {displayLabel || <span className="text-text-secondary">{placeholder}</span>}
      </button>
      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:ring-1 focus:ring-primary focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            <div
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-primary/10 cursor-pointer"
            >
              {placeholder}
            </div>
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-3 py-1 text-xs font-medium text-text-secondary bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                  {group}
                </div>
                {items.map((v) => {
                  const label = labels?.[v] || v;
                  const name = label.includes(" · ") ? label.split(" · ").slice(1).join(" · ") : label;
                  return (
                    <div
                      key={v}
                      onClick={() => { onChange(v); setIsOpen(false); }}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 flex items-center justify-between ${
                        v === value ? "bg-primary/5 text-primary" : "text-text-primary"
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      <span className="text-[10px] text-text-secondary ml-2 font-mono shrink-0">{v}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-text-secondary text-center">无匹配结果</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MidSkillConfigModal({
  skillName,
  initialRolePrompt,
  onSave,
  onClose,
}: {
  skillName: string;
  initialRolePrompt: string;
  onSave: (rolePrompt: string) => void;
  onClose: () => void;
}) {
  const [rolePrompt, setRolePrompt] = useState(initialRolePrompt);
  useEffect(() => {
    setRolePrompt(initialRolePrompt);
  }, [initialRolePrompt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-2">配置角色设定 - {skillName}</h3>
        <p className="text-sm text-text-secondary mb-3">此设定将注入到 system prompt，引导 LLM 按该身份回复</p>
        <textarea
          value={rolePrompt}
          onChange={(e) => setRolePrompt(e.target.value)}
          placeholder="你是一位专业的客服，请始终以友好、专业的态度回复。"
          rows={6}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none text-sm resize-y"
        />
        <p className="text-xs text-text-secondary mt-2">配置将立即保存</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(rolePrompt)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/** 技能调用提示词编辑弹窗：按 Agent 覆盖传给 LLM 的 tool description（何时调用此技能） */
function ToolDescriptionModal({
  apiKey,
  skillId,
  skillName,
  initialValue,
  onSave,
  onClose,
}: {
  apiKey: string;
  skillId: number;
  skillName: string;
  /** 当前展示值：用户自定义覆盖优先，否则为全局预置 */
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [resetting, setResetting] = useState(false);
  useEffect(() => setValue(initialValue), [initialValue]);

  const fetchDefault = async () => {
    const res = await getMarketplaceSkill(apiKey, skillId);
    if (res.success && res.data) {
      // 优先使用 description_for_llm（给 LLM 的中文说明），其次 default_tool_description
      return res.data.description_for_llm || res.data.default_tool_description || "";
    }
    return "";
  };

  // 弹窗打开时：若无自定义值，自动从后端加载系统默认
  useEffect(() => {
    if (initialValue) return;
    setResetting(true);
    fetchDefault().then((def) => {
      if (def) setValue(def);
    }).finally(() => setResetting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      const def = await fetchDefault();
      if (def) setValue(def);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-1">调用提示词 - {skillName}</h3>
        <p className="text-sm text-text-secondary mb-3">
          自定义此 Agent 下该技能的「何时调用」说明，将传给大模型。未自定义则使用系统默认，可修改后保存。
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="请输入何时调用此技能的说明…"
          rows={6}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none text-sm resize-y"
        />
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm disabled:opacity-50"
          >
            {resetting ? "加载中…" : "恢复默认"}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">
              取消
            </button>
            <button
              type="button"
              onClick={() => onSave(value.trim())}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MidSkillGenericConfigModal({
  skillName,
  configSchema,
  initialConfig,
  onSave,
  onClose,
}: {
  skillName: string;
  configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
  initialConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig);
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const schema = configSchema?.properties;
  if (!schema || Object.keys(schema).length === 0) return null;

  const required = new Set(configSchema.required || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-2">配置 - {skillName}</h3>
        <p className="text-sm text-text-secondary mb-4">Agent 级配置，会覆盖 Marketplace 中的默认值</p>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {Object.entries(schema).map(([key, prop]) => {
            const isSecret = /api_key|password|secret|token/i.test(key);
            const desc = prop?.description || key;
            const enumVals = prop?.enum;
            const enumLabels = prop?.enumLabels;
            const useSearchable = enumVals && enumVals.length > SEARCHABLE_ENUM_THRESHOLD && enumLabels;
            return (
              <div key={key}>
                <label className="block text-sm text-text-secondary mb-1">
                  {key}
                  {required.has(key) && <span className="text-amber-400 ml-1">*</span>}
                  {desc && desc !== key && <span className="block text-xs text-text-secondary mt-0.5">{desc}</span>}
                </label>
                {useSearchable ? (
                  <SearchableEnumSelect
                    value={String(config[key] ?? "")}
                    options={enumVals}
                    labels={enumLabels}
                    onChange={(v) => setConfig((c) => ({ ...c, [key]: v }))}
                    placeholder={required.has(key) ? "必填" : "选填"}
                  />
                ) : enumVals && enumVals.length > 0 ? (
                  <select
                    value={String(config[key] ?? "")}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">请选择...</option>
                    {enumVals.map((v) => (
                      <option key={v} value={v}>{enumLabels?.[v] || v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={isSecret ? "password" : "text"}
                    value={String(config[key] ?? "")}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder={required.has(key) ? "必填" : "选填"}
                    autoComplete={isSecret ? "off" : undefined}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(config)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatorSkillConfigModal({
  skillName,
  configSchema,
  initialConfig,
  onSave,
  onClose,
  saving,
}: {
  skillName: string;
  configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
  initialConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig);
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const schema = configSchema?.properties;
  if (!schema || Object.keys(schema).length === 0) return null;

  const required = new Set(configSchema.required || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-1">配置参数 - {skillName}</h3>
        <p className="text-sm text-text-secondary mb-4">填写技能所需的配置参数</p>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(schema).map(([key, prop]) => {
            const isSecret = /api_key|password|secret|token/i.test(key);
            const desc = prop?.description || key;
            const isRequired = required.has(key);
            const enumVals = prop?.enum;
            const enumLabels = prop?.enumLabels;
            const useSearchable = enumVals && enumVals.length > SEARCHABLE_ENUM_THRESHOLD && enumLabels;
            return (
              <div key={key}>
                <label className="block text-sm text-text-secondary mb-1">
                  <span className="flex items-center gap-2">
                    <code className="font-mono text-text-secondary">{key}</code>
                    {isRequired && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">必填</span>}
                  </span>
                  {desc && desc !== key && <span className="block text-xs text-text-secondary mt-0.5">{desc}</span>}
                </label>
                {useSearchable ? (
                  <SearchableEnumSelect
                    value={String(config[key] ?? "")}
                    options={enumVals}
                    labels={enumLabels}
                    onChange={(v) => setConfig((c) => ({ ...c, [key]: v }))}
                    placeholder={isRequired ? "必填" : "请选择..."}
                  />
                ) : enumVals && enumVals.length > 0 ? (
                  <select
                    value={String(config[key] ?? "")}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">请选择...</option>
                    {enumVals.map((v) => (
                      <option key={v} value={v}>{enumLabels?.[v] || v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={isSecret ? "password" : "text"}
                    value={String(config[key] ?? "")}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder={isRequired ? "必填" : prop?.default !== undefined ? `默认: ${prop.default}` : "选填"}
                    autoComplete={isSecret ? "off" : undefined}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(config)}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TwoTabSkillConfigModal({
  skillName,
  configSchema,
  globalConfig,
  agentConfig,
  onSaveGlobal,
  onSaveAgent,
  onClose,
  savingGlobal,
}: {
  skillName: string;
  configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
  globalConfig: Record<string, unknown>;
  agentConfig: Record<string, unknown>;
  onSaveGlobal: (config: Record<string, unknown>) => void;
  onSaveAgent: (config: Record<string, unknown>) => void;
  onClose: () => void;
  savingGlobal?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"global" | "agent">("agent");
  const [gConfig, setGConfig] = useState<Record<string, unknown>>(globalConfig);
  const [aConfig, setAConfig] = useState<Record<string, unknown>>(agentConfig);
  useEffect(() => { setGConfig(globalConfig); }, [globalConfig]);
  useEffect(() => { setAConfig(agentConfig); }, [agentConfig]);

  const schema = configSchema?.properties;
  if (!schema || Object.keys(schema).length === 0) return null;

  const required = new Set(configSchema.required || []);

  const renderField = (
    key: string,
    prop: { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> },
    value: unknown,
    onChange: (val: string) => void,
    placeholder?: string,
  ) => {
    const isSecret = /api_key|password|secret|token/i.test(key);
    const desc = prop?.description || key;
    const isRequired = activeTab === "global" && required.has(key);
    const enumVals = prop?.enum;
    const enumLabels = prop?.enumLabels;
    const useSearchable = enumVals && enumVals.length > SEARCHABLE_ENUM_THRESHOLD && enumLabels;

    return (
      <div key={key}>
        <label className="block text-sm text-text-secondary mb-1">
          <span className="flex items-center gap-2">
            <code className="font-mono text-text-secondary">{key}</code>
            {isRequired && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">必填</span>}
          </span>
          {desc && desc !== key && <span className="block text-xs text-text-secondary mt-0.5">{desc}</span>}
        </label>
        {useSearchable ? (
          <SearchableEnumSelect
            value={String(value ?? "")}
            options={enumVals}
            labels={enumLabels}
            onChange={onChange}
            placeholder={placeholder || "请选择..."}
          />
        ) : enumVals && enumVals.length > 0 ? (
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">{placeholder || "请选择..."}</option>
            {enumVals.map((v) => (
              <option key={v} value={v}>{enumLabels?.[v] || v}</option>
            ))}
          </select>
        ) : (
          <input
            type={isSecret ? "password" : "text"}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || (isRequired ? "必填" : prop?.default !== undefined ? `默认: ${prop.default}` : "选填")}
            autoComplete={isSecret ? "off" : undefined}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-3">配置 - {skillName}</h3>

        {/* Tab 切换 */}
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "global"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            全局配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "agent"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            Agent 配置
          </button>
        </div>

        {activeTab === "global" ? (
          <>
            <p className="text-xs text-text-secondary mb-3">所有 Agent 共享的默认配置</p>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {Object.entries(schema).map(([key, prop]) =>
                renderField(key, prop, gConfig[key], (val) =>
                  setGConfig((c) => ({ ...c, [key]: val }))
                )
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">
                取消
              </button>
              <button
                type="button"
                onClick={() => onSaveGlobal(gConfig)}
                disabled={savingGlobal}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingGlobal ? "保存中..." : "保存全局配置"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-text-secondary mb-3">仅当前 Agent 生效，留空的字段使用全局配置的值</p>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {Object.entries(schema).map(([key, prop]) => {
                const globalVal = gConfig[key];
                const hint = globalVal ? `全局: ${String(globalVal)}` : (prop?.default !== undefined ? `默认: ${prop.default}` : "留空=使用全局");
                return renderField(key, prop, aConfig[key], (val) =>
                  setAConfig((c) => ({ ...c, [key]: val })),
                  hint,
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">
                取消
              </button>
              <button
                type="button"
                onClick={() => onSaveAgent(aConfig)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                保存 Agent 配置
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PostSkillConfigModal({
  skillName,
  initialWords,
  onSave,
  onClose,
}: {
  skillName: string;
  initialWords: string;
  onSave: (words: string) => void;
  onClose: () => void;
}) {
  const [words, setWords] = useState(initialWords);
  useEffect(() => {
    setWords(initialWords);
  }, [initialWords]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-surface border border-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-text-primary mb-2">配置敏感词 - {skillName}</h3>
        <p className="text-sm text-text-secondary mb-3">每行一个敏感词，将替换为 ***</p>
        <textarea
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder={"他妈的\n操\n傻逼"}
          rows={10}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm resize-y"
        />
        <p className="text-xs text-text-secondary mt-2">配置将立即保存</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(words)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentEditPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const agentId = Number(params.id);
  const auth = getAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [creatorSkills, setCreatorSkills] = useState<CreatorSkill[]>([]);
  const [selectedPostSkills, setSelectedPostSkills] = useState<
    { creator_skill_id: number; config?: Record<string, unknown> }[]
  >([]);
  const [selectedMidSkills, setSelectedMidSkills] = useState<
    { creator_skill_id: number; config?: Record<string, unknown> }[]
  >([]);
  const [selectedPreSkills, setSelectedPreSkills] = useState<
    { creator_skill_id: number }[]
  >([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKBId, setSelectedKBId] = useState<number | null>(null);
  const [testMessages, setTestMessages] = useState<DisplayMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showPostMomentDialog, setShowPostMomentDialog] = useState(false);
  const [middleTab, setMiddleTab] = useState<"prompt" | "fewshot" | "moments" | "model" | "motherland">("prompt");
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [deletingMomentId, setDeletingMomentId] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [expandedCommentsMomentId, setExpandedCommentsMomentId] = useState<number | null>(null);
  const [momentCommentInputs, setMomentCommentInputs] = useState<Record<number, string>>({});
  const [sendingCommentMomentId, setSendingCommentMomentId] = useState<number | null>(null);
  const [autoSchedule, setAutoSchedule] = useState<MomentAutoScheduleResult | null>(null);
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [postSkillConfigModal, setPostSkillConfigModal] = useState<{
    creatorSkillId: number;
    skillName: string;
    words: string;
  } | null>(null);
  const [midSkillConfigModal, setMidSkillConfigModal] = useState<{
    creatorSkillId: number;
    skillName: string;
    rolePrompt: string;
  } | null>(null);
  const [toolDescriptionModal, setToolDescriptionModal] = useState<{
    creatorSkillId: number;
    skillId: number;
    skillName: string;
    toolDescription: string;
    defaultToolDescription: string;
  } | null>(null);
  const [midSkillGenericConfigModal, setMidSkillGenericConfigModal] = useState<{
    creatorSkillId: number;
    skillName: string;
    configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
    initialConfig: Record<string, unknown>;
  } | null>(null);
  const [creatorSkillConfigModal, setCreatorSkillConfigModal] = useState<{
    creatorSkillId: number;
    skillName: string;
    configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
    initialConfig: Record<string, unknown>;
  } | null>(null);
  const [creatorSkillConfigSaving, setCreatorSkillConfigSaving] = useState(false);
  const [twoTabConfigModal, setTwoTabConfigModal] = useState<{
    creatorSkillId: number;
    skillName: string;
    configSchema: { properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>; required?: string[] };
    globalConfig: Record<string, unknown>;
    agentConfig: Record<string, unknown>;
  } | null>(null);
  const [twoTabGlobalSaving, setTwoTabGlobalSaving] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [motherlandStatus, setMotherlandStatus] = useState<{ configured: boolean; agent_id?: number } | null>(null);
  const [motherlandMessages, setMotherlandMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [motherlandTopic, setMotherlandTopic] = useState("");
  const [motherlandAutoRunning, setMotherlandAutoRunning] = useState(false);
  const [motherlandTopicModalOpen, setMotherlandTopicModalOpen] = useState(false);
  const [motherlandTopicGenerating, setMotherlandTopicGenerating] = useState(false);
  const [motherlandHistoryLoaded, setMotherlandHistoryLoaded] = useState(false);
  const motherlandAbortRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const motherlandEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth?.apiKey || !agentId) return;
    loadAgent();
  }, [auth?.apiKey, agentId]);

  // Load knowledge bases for selector
  useEffect(() => {
    if (!auth?.apiKey) return;
    listKnowledgeBases(auth.apiKey).then((res) => {
      if (res.success && res.data) setKnowledgeBases(res.data);
    });
  }, [auth?.apiKey]);

  // Edge Agent 状态轮询（每 10 秒）
  useEffect(() => {
    if (!auth?.apiKey || !agentId || !agent || agent.agent_type !== 'edge') return;
    const interval = setInterval(async () => {
      const res = await getAgent(auth.apiKey, agentId);
      if (res.success && res.data) {
        setAgent((prev) => prev ? { ...prev, edge_status: res.data!.edge_status } : prev);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [auth?.apiKey, agentId, agent?.agent_type]);

  // 从 Marketplace 返回时需重新拉取 creator skills
  useEffect(() => {
    if (!auth?.apiKey) return;
    listCreatorSkills(auth.apiKey).then((res) => {
      if (res.success && res.data?.creator_skills) {
        setCreatorSkills(res.data.creator_skills);
      }
    });
  }, [auth?.apiKey, pathname]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testMessages]);

  useEffect(() => {
    motherlandEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [motherlandMessages]);

  // Load motherland status and chat history when opening Talk To Motherland tab
  useEffect(() => {
    if (middleTab === "motherland") {
      getMotherlandStatus().then(setMotherlandStatus).catch(() => setMotherlandStatus(null));
      if (auth?.apiKey && agentId) {
        setMotherlandHistoryLoaded(false);
        getMotherlandChatHistory(auth.apiKey, Number(agentId)).then((res) => {
          if (res.success && res.data?.messages && res.data.messages.length > 0) {
            setMotherlandMessages(res.data.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })));
          } else {
            setMotherlandMessages([]);
          }
          setMotherlandHistoryLoaded(true);
        }).catch(() => setMotherlandHistoryLoaded(true));
      }
    }
  }, [middleTab]);

  // Auto-conversation loop with Motherland
  // If continuing=true, don't clear messages and don't require a topic
  const startAutoTalk = async (topicOverride?: string, continuing = false) => {
    const topic = (topicOverride ?? motherlandTopic).trim();
    if (!continuing && !topic) return;
    if (!auth?.apiKey || motherlandAutoRunning) return;
    setMotherlandTopicModalOpen(false);
    if (topic) setMotherlandTopic(topic);
    setMotherlandAutoRunning(true);
    if (!continuing) setMotherlandMessages([]);
    motherlandAbortRef.current = false;

    const apiKey = auth.apiKey;
    const aid = Number(agentId);
    let isFirst = !continuing && !!topic;

    while (!motherlandAbortRef.current) {
      try {
        const res = await autoTalkRound(apiKey, aid, isFirst ? topic : "");
        if (motherlandAbortRef.current) break;
        if (res.success && res.data) {
          setMotherlandMessages((prev) => [
            ...prev,
            { role: "user", content: res.data!.agent_message },
            { role: "assistant", content: res.data!.motherland_reply },
          ]);
          isFirst = false;
        } else {
          setMotherlandMessages((prev) => [
            ...prev,
            { role: "assistant", content: `对话出错：${res.error?.message ?? "未知错误"}` },
          ]);
          break;
        }
      } catch (err) {
        if (motherlandAbortRef.current) break;
        setMotherlandMessages((prev) => [
          ...prev,
          { role: "assistant", content: `对话出错：${err instanceof Error ? err.message : "网络错误"}` },
        ]);
        break;
      }
    }

    setMotherlandAutoRunning(false);
  };

  // Generate topic automatically
  const handleGenerateTopic = async () => {
    if (!auth?.apiKey || motherlandTopicGenerating) return;
    setMotherlandTopicGenerating(true);
    try {
      const res = await generateAutoTalkTopic(auth.apiKey, Number(agentId));
      if (res.success && res.data?.topic) {
        setMotherlandTopic(res.data.topic);
      }
    } catch {
      // ignore
    } finally {
      setMotherlandTopicGenerating(false);
    }
  };

  // Reset Motherland chat history
  const handleResetMotherlandChat = async () => {
    if (!auth?.apiKey) return;
    try {
      await resetMotherlandChat(auth.apiKey, Number(agentId));
      setMotherlandMessages([]);
      setMotherlandTopic("");
    } catch {
      // ignore
    }
  };

  // 技能选择/参数变更时立即保存到数据库，无需单独点保存
  const savePreSkillsToDb = async (next: { creator_skill_id: number }[]) => {
    if (!auth?.apiKey) return;
    try {
      await setAgentPreSkills(auth.apiKey, agentId, next.map((p) => ({ creator_skill_id: p.creator_skill_id })));
    } catch {
      setError("对话前技能保存失败");
    }
  };
  const saveMidSkillsToDb = async (next: { creator_skill_id: number; config?: Record<string, unknown> }[]) => {
    if (!auth?.apiKey) return;
    try {
      await setAgentMidSkills(
        auth.apiKey,
        agentId,
        next.map((p) => ({ creator_skill_id: p.creator_skill_id, config: p.config }))
      );
    } catch {
      setError("对话中技能保存失败");
    }
  };
  const savePostSkillsToDb = async (next: { creator_skill_id: number; config?: Record<string, unknown> }[]) => {
    if (!auth?.apiKey) return;
    try {
      await setAgentPostSkills(
        auth.apiKey,
        agentId,
        next.map((p) => ({ creator_skill_id: p.creator_skill_id, config: p.config }))
      );
    } catch {
      setError("对话后技能保存失败");
    }
  };

  const handleDeleteCreatorSkill = async (csId: number, stage?: string) => {
    if (!auth?.apiKey) return;
    if (!confirm("确定要删除这个技能吗？删除后需要重新从 Marketplace 添加。")) return;
    try {
      await deleteCreatorSkill(auth.apiKey, csId);
      setCreatorSkills((prev) => prev.filter((c) => c.id !== csId));
      if (stage === "pre_conversation") {
        const next = selectedPreSkills.filter((p) => p.creator_skill_id !== csId);
        setSelectedPreSkills(next);
        savePreSkillsToDb(next);
      } else if (stage === "mid_conversation") {
        const next = selectedMidSkills.filter((p) => p.creator_skill_id !== csId);
        setSelectedMidSkills(next);
        saveMidSkillsToDb(next);
      } else if (stage === "post_conversation") {
        const next = selectedPostSkills.filter((p) => p.creator_skill_id !== csId);
        setSelectedPostSkills(next);
        savePostSkillsToDb(next);
      }
    } catch {
      setError("技能删除失败");
    }
  };

  const loadAgent = async () => {
    if (!auth?.apiKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await getAgent(auth.apiKey, agentId);
      if (res.success && res.data) {
        setAgent(res.data);
        setCode(res.data.code || "");
        setName(res.data.name || "");
        setDescription(res.data.description || "");
        setPrompt(res.data.system_prompt || "");
        const ex = res.data.config?.examples;
        if (ex && Array.isArray(ex) && ex.length > 0) {
          setTestMessages(
            ex
              .filter((m: ExampleMessage) => m.role === "user" || m.role === "assistant")
              .map((m: ExampleMessage, i: number) => ({
                id: i,
                role: m.role as "user" | "assistant",
                content: m.content || "",
              }))
          );
        } else {
          setTestMessages([]);
        }
        setSelectedSkills(res.data.config?.skills ?? []);
        setSelectedKBId(res.data.knowledge_base_id ?? null);
        listAgentPostSkills(auth.apiKey, agentId).then((r) => {
          if (r.success && r.data?.post_skills) {
            setSelectedPostSkills(
              r.data.post_skills.map((s: AgentPostSkill) => ({
                creator_skill_id: s.id,
                config: s.agent_config || {},
              }))
            );
          }
        });
        listAgentPreSkills(auth.apiKey, agentId).then((r) => {
          if (r.success && r.data?.pre_skills) {
            setSelectedPreSkills(
              r.data.pre_skills.map((s: AgentPreSkill) => ({
                creator_skill_id: s.id,
              }))
            );
          }
        });
        listAgentMidSkills(auth.apiKey, agentId).then((r) => {
          if (r.success && r.data?.mid_skills) {
            setSelectedMidSkills(
              r.data.mid_skills.map((s: AgentMidSkill) => ({
                creator_skill_id: s.id,
                config: s.agent_config || s.config || {},
              }))
            );
          }
        });
      } else {
        setError(res.error?.message || "加载失败");
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const saveWithStatus = async (targetStatus: string) => {
    if (!auth?.apiKey || !agent) return;
    setSaving(true);
    setError("");
    setSaveSuccess(false);
    const examples: ExampleMessage[] = testMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const codeTrimmed = code.trim().toLowerCase();
    if (codeTrimmed && !/^[a-z0-9_-]{2,64}$/.test(codeTrimmed)) {
      setError("Code 仅支持小写字母、数字、下划线、横线，2-64 字符");
      setSaving(false);
      return;
    }
    try {
      const res = await updateAgent(auth.apiKey, agentId, {
        code: codeTrimmed || agent.code,
        name: name.trim() || agent.name,
        description: description.trim(),
        system_prompt: prompt,
        examples,
        skills: selectedSkills,
        status: targetStatus,
        knowledge_base_id: selectedKBId,
      });
      if (res.success) {
        // 技能选择/参数已改为变更时即时保存，此处仅保存 agent 基础信息
        setSaveSuccess(true);
        setAgent(res.data || agent);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setError(res.error?.message || "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsDraft = () => saveWithStatus("draft");
  const handlePublish = () => saveWithStatus("active");
  const handleArchive = () => saveWithStatus("archived");

  const sendTestMessage = async (content: string) => {
    if (!content.trim() || !auth?.apiKey) return;
    setSending(true);
    setError("");

    setTestMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user" as const, content },
    ]);

    const messages = testMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await simulateAgent(
        auth.apiKey,
        agentId,
        content,
        messages,
        prompt || undefined,
        undefined,
        selectedSkills.length > 0 ? selectedSkills : undefined
      );
      if (res.success && res.data) {
        setTestMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant" as const,
            content: res.data!.content,
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

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = testInput.trim();
    if (!content) return;
    setTestInput("");
    await sendTestMessage(content);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const content = testInput.trim();
    if (!content) return;
    setTestInput("");
    const now = Date.now();
    setTestMessages((prev) => [
      ...prev,
      { id: now, role: "user" as const, content },
      {
        id: now + 1,
        role: "assistant" as const,
        content: "请输入你自定义的内容",
      },
    ]);
  };

  const handleClearTest = () => {
    setTestMessages([]);
  };

  const handleDeleteMessage = (msgId: number) => {
    setTestMessages((prev) => prev.filter((m) => m.id !== msgId));
    if (editingId === msgId) setEditingId(null);
  };

  const handleEditContent = (msgId: number, content: string) => {
    setTestMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content } : m))
    );
  };

  const loadMoments = async () => {
    if (!auth?.apiKey || !agent) return;
    setLoadingMoments(true);
    try {
      const res = await listAgentMoments(auth.apiKey, Number(agent.id), 50, 0);
      if (res.success && res.data) {
        setMoments(res.data.moments || []);
      }
    } finally {
      setLoadingMoments(false);
    }
  };

  const loadLLMProviders = async () => {
    if (!auth?.apiKey) return;
    setLoadingProviders(true);
    try {
      const res = await getLLMProviders(auth.apiKey);
      if (res.success && res.data) {
        setLlmProviders(res.data);
      }
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (!auth?.apiKey || !agent || agent.agent_type !== "cloud") return;
    if (llmProviders.length > 0 || loadingProviders) return;
    loadLLMProviders();
  }, [auth?.apiKey, agent?.id, agent?.agent_type, llmProviders.length, loadingProviders]);

  const loadAutoSchedule = async () => {
    if (!auth?.apiKey || !agent) return;
    setLoadingAutoSchedule(true);
    try {
      const res = await getMomentAutoSchedule(auth.apiKey, Number(agent.id));
      if (res.success && res.data) {
        setAutoSchedule(res.data);
      }
    } finally {
      setLoadingAutoSchedule(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!auth?.apiKey || !agent) return;
    setGeneratingSchedule(true);
    try {
      const res = await generateMomentAutoSchedule(auth.apiKey, Number(agent.id));
      if (res.success && res.data) {
        setAutoSchedule(res.data);
      }
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!auth?.apiKey || !agent) return;
    if (!confirm("确定要关闭自动发朋友圈吗？")) return;
    await deleteMomentAutoSchedule(auth.apiKey, Number(agent.id));
    setAutoSchedule(null);
  };

  const handleDeleteMoment = async (momentId: number) => {
    if (!auth?.apiKey || !agent) return;
    if (!confirm("确定要删除这条朋友圈吗？")) return;
    setDeletingMomentId(momentId);
    try {
      const res = await deleteMoment(auth.apiKey, Number(agent.id), momentId);
      if (res.success) {
        setMoments((prev) => prev.filter((m) => m.id !== momentId));
      }
    } finally {
      setDeletingMomentId(null);
    }
  };

  const handleAddMomentComment = async (momentId: number, content: string) => {
    if (!auth?.apiKey || !agent) return;
    const text = content.trim();
    if (!text) return;
    const contentWithTag = text.startsWith("from Human") ? text : `from Human: ${text}`;
    setSendingCommentMomentId(momentId);
    try {
      const res = await addMomentComment(auth.apiKey, momentId, contentWithTag);
      if (res.success && res.data) {
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  comments: [
                    ...(m.comments || []),
                    {
                      id: res.data!.id,
                      creator_id: 0,
                      creator_name: res.data!.creator_name,
                      content: res.data!.content,
                      created_at: new Date().toISOString(),
                    },
                  ],
                }
              : m
          )
        );
        setMomentCommentInputs((prev) => ({ ...prev, [momentId]: "" }));
      }
    } finally {
      setSendingCommentMomentId(null);
    }
  };

  if (!auth?.apiKey) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-secondary">加载中...</div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
        <Link href="/dashboard" className="mt-4 inline-block text-primary">
          返回 Agent 列表
        </Link>
      </div>
    );
  }

  if (!agent) return null;

  const displayName = name.trim() || agent.name || "Agent";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background text-text-primary">
      {/* Header：图标 + 文字，统一圆角与间距 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <AvatarUpload
            avatar={getAgentAvatar(agent)}
            fallbackLetter={avatarLetter}
            agentId={agentId}
            apiKey={auth.apiKey}
            onSuccess={(updated) => setAgent(updated)}
            onError={(msg) => setError(msg)}
            disabled={saving}
          />
          <span className="font-medium text-text-primary">{displayName}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <BackIcon className="w-4 h-4 shrink-0" />
            <span>返回</span>
          </button>
          <span className="w-px h-5 bg-border mx-0.5" aria-hidden />
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 ${
              saveSuccess
                ? "bg-amber-500 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            <SaveIcon className="w-4 h-4 shrink-0" />
            <span>{saving ? "保存中..." : saveSuccess ? "已保存" : "存为草稿"}</span>
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <PublishIcon className="w-4 h-4 shrink-0" />
            <span>发布</span>
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-primary border border-border transition-colors disabled:opacity-50"
          >
            <ArchiveIcon className="w-4 h-4 shrink-0" />
            <span>存档</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowTestDialog(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all"
          >
            <TestPlayIcon className="w-4 h-4 shrink-0" />
            <span>测试</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPostMomentDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span>发朋友圈</span>
          </button>
        </div>
      </header>

      {/* Main content: three panels */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Prompt Editor */}
        <div className="w-1/3 flex flex-col border-r border-border shrink-0 bg-surface">
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-12 shrink-0">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="给 Agent 起个名字"
                className="flex-1 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-12 shrink-0">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述 Agent 的用途"
                className="flex-1 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-12 shrink-0">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="jess"
                className="flex-1 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-border rounded text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>
          {/* Agent 类型选择器 */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-text-secondary">Agent 类型</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!auth?.apiKey || !agent || agent.agent_type === 'cloud') return;
                  const res = await updateAgent(auth.apiKey, agentId, { agent_type: 'cloud' });
                  if (res.success && res.data) setAgent(res.data);
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  agent.agent_type !== 'edge'
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-text-secondary hover:text-text-primary hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Cloud
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!auth?.apiKey || !agent || agent.agent_type === 'edge') return;
                  const res = await updateAgent(auth.apiKey, agentId, { agent_type: 'edge' });
                  if (res.success && res.data) setAgent(res.data);
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  agent.agent_type === 'edge'
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-text-secondary hover:text-text-primary hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Edge
              </button>
            </div>
          </div>

          {/* 长期记忆开关 */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">长期记忆</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  启用后，AI 可在对话中记住用户偏好，跨会话生效
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!auth?.apiKey || !agent) return;
                  const next = !agent.memory_enabled;
                  const res = await updateAgent(auth.apiKey, agentId, { memory_enabled: next });
                  if (res.success && res.data) setAgent(res.data);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  agent.memory_enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    agent.memory_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 不在 Discover 显示 */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">不在 Discover 显示</span>
                <p className="text-xs text-text-secondary mt-0.5">
                  开启后，Agent 不会出现在 lumina-ai-chat-hub 的 Discover 列表中，但 API 调用不受影响
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!auth?.apiKey || !agent) return;
                  const next = !(agent.hidden ?? false);
                  const res = await updateAgent(auth.apiKey, agentId, { hidden: next });
                  if (res.success && res.data) setAgent(res.data);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  (agent.hidden ?? false) ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    (agent.hidden ?? false) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 知识库绑定 */}
          <div className="px-4 py-3 border-b border-border">
            <div>
              <span className="text-sm text-text-primary">知识库 (RAG)</span>
              <p className="text-xs text-text-secondary mt-0.5">
                绑定知识库后，AI 会基于知识库内容回答问题
              </p>
            </div>
            <select
              value={selectedKBId ?? ""}
              onChange={async (e) => {
                if (!auth?.apiKey || !agent) return;
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedKBId(val);
                const res = await updateAgent(auth.apiKey, agentId, {
                  knowledge_base_id: val,
                });
                if (res.success && res.data) setAgent(res.data);
              }}
              className="mt-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">未绑定</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Edge 配置区域 */}
          {agent.agent_type === 'edge' && (
            <div className="px-4 py-3 border-b border-border space-y-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Edge Tunnel</span>
                <span className={`inline-flex items-center gap-1 text-xs ${
                  agent.edge_status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    agent.edge_status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-text-secondary'
                  }`} />
                  {agent.edge_status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Agent UUID</label>
                <div className="flex gap-1">
                  <code className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-border rounded text-xs text-text-primary font-mono truncate">
                    {agent.uuid}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(agent.uuid || '');
                    }}
                    className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary hover:text-text-primary rounded shrink-0 border border-border"
                  >
                    复制
                  </button>
                </div>
              </div>
              {agent.edge_token && (
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Edge Token</label>
                  <div className="flex gap-1">
                    <code className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-border rounded text-xs text-text-primary font-mono truncate">
                      {agent.edge_token}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(agent.edge_token || '');
                        setTokenCopied(true);
                        setTimeout(() => setTokenCopied(false), 2000);
                      }}
                      className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary hover:text-text-primary rounded shrink-0 border border-border"
                    >
                      {tokenCopied ? '已复制' : '复制'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!auth?.apiKey || !confirm('重置 Token 后，现有的 Edge Proxy 连接将失效，确定？')) return;
                        const res = await resetEdgeToken(auth.apiKey, agentId);
                        if (res.success && res.data) {
                          setAgent((prev) => prev ? { ...prev, edge_token: res.data!.edge_token } : prev);
                        }
                      }}
                      className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-red-500/20 text-text-secondary hover:text-red-600 dark:hover:text-red-400 rounded shrink-0 border border-border"
                    >
                      重置
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-text-secondary">
                Edge 模式下对话将转发到本地 Edge Proxy 处理。Mid/Post 技能由本地代理处理。
              </p>
            </div>
          )}

        </div>

        {/* Middle: System Prompt / Few-shot / Moments / Model */}
        <div className="w-1/3 flex flex-col border-r border-border bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
          <div className="border-b border-border flex items-center">
            <button
              onClick={() => setMiddleTab("prompt")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                middleTab === "prompt"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Prompt
            </button>
            <button
              onClick={() => setMiddleTab("fewshot")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                middleTab === "fewshot"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Few-shot
            </button>
            <button
              onClick={() => { setMiddleTab("moments"); loadMoments(); loadAutoSchedule(); }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                middleTab === "moments"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              朋友圈
            </button>
            <button
              onClick={() => setMiddleTab("model")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                middleTab === "model"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              模型
            </button>
            <button
              onClick={() => setMiddleTab("motherland")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                middleTab === "motherland"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Talk To Motherland
            </button>
            {middleTab === "fewshot" && testMessages.length > 0 && (
              <button
                onClick={handleClearTest}
                className="px-3 text-xs text-text-secondary hover:text-text-primary"
              >
                清空
              </button>
            )}
            {middleTab === "moments" && (
              <button
                onClick={loadMoments}
                className="px-3 text-xs text-text-secondary hover:text-text-primary"
                title="刷新"
              >
                刷新
              </button>
            )}
          </div>

          {middleTab === "prompt" && (
            <div className="flex-1 min-h-0 flex flex-col bg-surface">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入 Agent 的人设、规则、背景..."
                className="flex-1 w-full p-4 bg-transparent text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:ring-0 text-sm font-mono"
                spellCheck={false}
              />
            </div>
          )}

          {middleTab === "fewshot" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {testMessages.length === 0 ? (
                  <div className="text-center text-text-secondary py-12 text-sm">
                    添加示例对话，或点击顶部 Test 与 Agent 测试对话
                  </div>
                ) : (
                  <>
                  {testMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 group ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2 rounded-xl flex items-start gap-2 ${
                          msg.role === "user"
                            ? "bg-primary text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-text-primary"
                        }`}
                      >
                        {editingId === msg.id ? (
                          <textarea
                            autoFocus
                            value={msg.content}
                            onChange={(e) =>
                              handleEditContent(msg.id, e.target.value)
                            }
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setEditingId(null);
                                e.currentTarget.blur();
                              }
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                setEditingId(null);
                                e.currentTarget.blur();
                              }
                            }}
                            rows={Math.max(3, msg.content.split("\n").length + 1)}
                            style={{ fieldSizing: "content" } as React.CSSProperties}
                            className="flex-1 min-w-0 w-full text-sm bg-transparent resize-none focus:outline-none focus:ring-0 text-text-primary placeholder-text-secondary"
                            placeholder="输入内容..."
                            spellCheck={false}
                          />
                        ) : (
                          <p
                            onClick={() => setEditingId(msg.id)}
                            className="text-sm whitespace-pre-wrap flex-1 cursor-text hover:ring-1 hover:ring-border rounded px-1 -mx-1"
                            title="点击编辑"
                          >
                            {msg.content}
                          </p>
                        )}
                        {editingId !== msg.id && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 text-xs shrink-0"
                            title="删除"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-text-secondary text-sm flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
                        <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.2s]" />
                        <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.4s]" />
                        <span className="ml-1">正在调用大模型...</span>
                      </div>
                    </div>
                  )}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>
              {error && (
                <div className="px-4 py-2 text-red-400 text-sm">{error}</div>
              )}
              <form
                onSubmit={handleTestSend}
                className="p-4 border-t border-border"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="输入消息测试..."
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddManual}
                    disabled={sending || !testInput.trim()}
                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-text-primary rounded-lg font-medium"
                  >
                    添加
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !testInput.trim()}
                    className="px-5 py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {sending ? "发送中..." : "发送"}
                  </button>
                </div>
              </form>
            </>
          )}

          {middleTab === "moments" && (
            <div className="flex-1 overflow-y-auto">
              {/* Auto-Schedule Panel */}
              <div className="border-b border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text-primary">自动发朋友圈</h3>
                  <div className="flex items-center gap-2">
                    {autoSchedule?.config && (
                      <button
                        type="button"
                        onClick={handleDeleteSchedule}
                        className="px-2.5 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        关闭
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateSchedule}
                      disabled={generatingSchedule}
                      className="px-3 py-1 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-md disabled:opacity-50 transition-colors"
                    >
                      {generatingSchedule ? "AI 规划中..." : autoSchedule?.config ? "重新规划" : "AI 一键排期"}
                    </button>
                  </div>
                </div>

                {loadingAutoSchedule ? (
                  <p className="text-xs text-text-secondary">加载排期...</p>
                ) : autoSchedule?.config ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span>
                        📅 {autoSchedule.config.weekdays.map(d => ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"][d] || d).join("、")}
                      </span>
                      <span>
                        🕐 {autoSchedule.config.daily_times.join("、")}
                      </span>
                    </div>
                    {autoSchedule.reasoning && (
                      <p className="text-xs text-text-secondary italic">{autoSchedule.reasoning}</p>
                    )}
                    {autoSchedule.schedules.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-text-secondary">
                          待发 {autoSchedule.schedules.filter(s => s.status === "pending").length} 条
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {autoSchedule.schedules.map((s) => {
                            const dt = new Date(s.scheduled_at);
                            const isPast = dt < new Date();
                            return (
                              <span
                                key={s.id}
                                className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  s.status === "posted"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : isPast
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {s.status === "posted" ? "✓ " : ""}{dt.toLocaleDateString("zh-CN", { weekday: "short" })} {dt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">
                    点击「AI 一键排期」让 AI 根据角色人设自动规划每周发朋友圈时间
                  </p>
                )}
              </div>

              {loadingMoments ? (
                <div className="text-center text-text-secondary py-12 text-sm">
                  加载中...
                </div>
              ) : moments.length === 0 ? (
                <div className="text-center text-text-secondary py-12 text-sm">
                  暂无朋友圈，点击顶部按钮发布
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {moments.map((m) => (
                    <div key={m.id} className="p-4 group hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-text-primary whitespace-pre-wrap flex-1 leading-relaxed">
                          {m.content}
                        </p>
                        <button
                          onClick={() => handleDeleteMoment(m.id)}
                          disabled={deletingMomentId === m.id}
                          className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 text-xs shrink-0 mt-0.5 disabled:opacity-50 transition-opacity"
                          title="删除"
                        >
                          {deletingMomentId === m.id ? "..." : "🗑"}
                        </button>
                      </div>
                      {m.thumbnail_urls && m.thumbnail_urls.length > 0 && (
                        <div className={`mt-2 grid gap-1 ${
                          m.thumbnail_urls.length === 1 ? "grid-cols-1 max-w-[200px]" :
                          m.thumbnail_urls.length <= 4 ? "grid-cols-2 max-w-[240px]" :
                          "grid-cols-3 max-w-[300px]"
                        }`}>
                          {m.thumbnail_urls.map((url, i) => {
                            const fullUrl = url.startsWith("http") ? url : `${getBaseUrl()}${url}`;
                            const fullImg = (m.image_urls[i] ?? url);
                            const fullImgUrl = fullImg.startsWith("http") ? fullImg : `${getBaseUrl()}${fullImg}`;
                            return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreviewImageUrl(fullImgUrl)}
                              className="block w-full text-left cursor-zoom-in"
                            >
                              <img
                                src={fullUrl}
                                alt=""
                                className="w-full aspect-square object-cover rounded"
                              />
                            </button>
                          );})}
                        </div>
                      )}
                      {m.video_urls && m.video_urls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.video_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block truncate">
                              {url}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-text-secondary">
                        <span>{new Date(m.created_at).toLocaleString("zh-CN")}</span>
                        {(m.like_count ?? 0) > 0 && (
                          <span>❤️ {m.like_count} 赞</span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCommentsMomentId((prev) =>
                              prev === m.id ? null : m.id
                            )
                          }
                          className="hover:text-text-primary hover:underline"
                        >
                          💬 {m.comments?.length ?? 0} 评论
                        </button>
                      </div>
                      {expandedCommentsMomentId === m.id && (
                        <div className="mt-2 space-y-2">
                          {m.comments && m.comments.length > 0 && (
                            <div className="pl-2 border-l-2 border-border space-y-1">
                              {m.comments.map((c) => (
                                <div key={c.id} className="text-xs text-text-secondary">
                                  <span className="font-medium text-text-primary">
                                    {c.creator_name}
                                  </span>
                                  <span className="ml-1">{c.content}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={momentCommentInputs[m.id] ?? ""}
                              onChange={(e) =>
                                setMomentCommentInputs((prev) => ({
                                  ...prev,
                                  [m.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddMomentComment(
                                    m.id,
                                    momentCommentInputs[m.id] ?? ""
                                  );
                                }
                              }}
                              placeholder="添加评论..."
                              disabled={sendingCommentMomentId === m.id}
                              className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleAddMomentComment(m.id, momentCommentInputs[m.id] ?? "")
                              }
                              disabled={
                                !(momentCommentInputs[m.id] ?? "").trim() ||
                                sendingCommentMomentId === m.id
                              }
                              className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingCommentMomentId === m.id ? "发送中..." : "发送"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {middleTab === "model" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {agent.agent_type !== "cloud" ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  Edge 模式下大模型配置由本地代理决定
                </p>
              ) : (
                <>
                  {/* Provider 类型 */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Provider</label>
                    <select
                      value={agent.llm_provider_type || ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setAgent({ ...agent, llm_provider_type: val || undefined });
                        if (auth?.apiKey) {
                          await updateAgent(auth.apiKey, Number(agent.id), { llm_provider_type: val });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">默认（系统设定）</option>
                      <option value="openai">OpenAI 兼容协议</option>
                      <option value="anthropic">Anthropic 兼容协议</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                    {!agent.llm_provider_type && (
                      <p className="text-xs text-text-secondary">不选择则使用系统配置的默认大模型</p>
                    )}
                  </div>

                  {/* Model Name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Model Name</label>
                    <input
                      type="text"
                      list="model-name-suggestions"
                      value={agent.llm_model_name || ""}
                      placeholder="留空使用默认"
                      onChange={(e) => setAgent({ ...agent, llm_model_name: e.target.value })}
                      onBlur={async (e) => {
                        if (auth?.apiKey) {
                          await updateAgent(auth.apiKey, Number(agent.id), { llm_model_name: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <datalist id="model-name-suggestions">
                      {(() => {
                        const t = agent.llm_provider_type;
                        if (t === "openai") return <>
                          <option value="gpt-4.1" />
                          <option value="gpt-4.1-mini" />
                          <option value="gpt-4o" />
                          <option value="gpt-4o-mini" />
                          <option value="gpt-5" />
                          <option value="o4-mini" />
                          <option value="o3" />
                          <option value="o3-mini" />
                          <option value="o1" />
                          <option value="glm-5" />
                          <option value="glm-4.7" />
                          <option value="qwen3-max" />
                          <option value="qwen3.5-plus" />
                          <option value="doubao-seed-2-0-pro-260215" />
                          <option value="doubao-seed-2-0-lite-260215" />
                          <option value="deepseek-chat" />
                          <option value="deepseek-reasoner" />
                        </>;
                        if (t === "anthropic") return <>
                          <option value="claude-opus-4-20250514" />
                          <option value="claude-sonnet-4-20250514" />
                          <option value="claude-3-7-sonnet-20250219" />
                          <option value="claude-3-5-haiku-20241022" />
                          <option value="MiniMax-M2.5" />
                        </>;
                        if (t === "gemini") return <>
                          <option value="gemini-3.1-flash-lite-preview" />
                          <option value="gemini-3-flash-preview" />
                          <option value="gemini-3-pro-preview" />
                          <option value="gemini-2.5-pro-preview-03-25" />
                          <option value="gemini-2.5-flash" />
                          <option value="gemini-2.0-flash" />
                          <option value="gemini-2.0-flash-lite" />
                          <option value="gemini-1.5-pro" />
                          <option value="gemini-1.5-flash" />
                        </>;
                        return <>
                          <option value="gpt-4.1" />
                          <option value="gpt-5" />
                          <option value="claude-opus-4-20250514" />
                          <option value="claude-sonnet-4-20250514" />
                          <option value="gemini-2.5-pro-preview-03-25" />
                          <option value="gemini-2.0-flash" />
                          <option value="qwen3-max" />
                          <option value="doubao-seed-2-0-pro-260215" />
                          <option value="deepseek-chat" />
                        </>;
                      })()}
                    </datalist>
                  </div>

                  {/* Base URL */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Base URL</label>
                    <input
                      type="text"
                      list="base-url-suggestions"
                      value={agent.llm_base_url || ""}
                      placeholder="留空使用 Provider 默认地址"
                      onChange={(e) => setAgent({ ...agent, llm_base_url: e.target.value })}
                      onBlur={async (e) => {
                        if (auth?.apiKey) {
                          await updateAgent(auth.apiKey, Number(agent.id), { llm_base_url: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <datalist id="base-url-suggestions">
                      {(() => {
                        const t = agent.llm_provider_type;
                        if (t === "openai") return <>
                          <option value="https://api.openai.com/v1" />
                          <option value="https://open.bigmodel.cn/api/paas/v4" />
                          <option value="https://dashscope.aliyuncs.com/compatible-mode/v1" />
                          <option value="https://ark.cn-beijing.volces.com/api/v3" />
                          <option value="https://api.minimaxi.com/v1" />
                          <option value="https://api.deepseek.com/v1" />
                        </>;
                        if (t === "anthropic") return <>
                          <option value="https://api.anthropic.com" />
                          <option value="https://api.minimaxi.com/anthropic" />
                        </>;
                        if (t === "gemini") return <>
                          <option value="https://generativelanguage.googleapis.com" />
                        </>;
                        return <>
                          <option value="https://api.openai.com/v1" />
                          <option value="https://api.anthropic.com" />
                          <option value="https://generativelanguage.googleapis.com" />
                        </>;
                      })()}
                    </datalist>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">API Key</label>
                    <p className="text-xs text-text-secondary">
                      留空则使用系统配置的 Key；填写后仅该 Agent 生效
                    </p>
                    {(agent.llm_api_key_configured ?? false) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600 dark:text-green-400">✓ 已单独设置</span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!auth?.apiKey || !agent) return;
                            const res = await updateAgent(auth.apiKey, Number(agent.id), { llm_api_key: "" });
                            if (res.success && res.data) setAgent(res.data);
                          }}
                          className="text-xs px-2 py-1 text-text-secondary hover:text-text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          清除
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="password"
                          id="llm-api-key-input"
                          placeholder="输入 API Key"
                          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={async (e) => {
                            if (e.key !== "Enter") return;
                            const el = document.getElementById("llm-api-key-input") as HTMLInputElement;
                            const val = el?.value?.trim() ?? "";
                            if (!auth?.apiKey || !agent || !val) return;
                            const res = await updateAgent(auth.apiKey, Number(agent.id), { llm_api_key: val });
                            if (res.success && res.data) {
                              setAgent(res.data);
                              el.value = "";
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const el = document.getElementById("llm-api-key-input") as HTMLInputElement;
                            const val = el?.value?.trim() ?? "";
                            if (!auth?.apiKey || !agent || !val) return;
                            const res = await updateAgent(auth.apiKey, Number(agent.id), { llm_api_key: val });
                            if (res.success && res.data) {
                              setAgent(res.data);
                              el.value = "";
                            }
                          }}
                          className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
                        >
                          保存
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-text-primary">Temperature</label>
                      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agent.llm_temperature === null || agent.llm_temperature === undefined}
                          onChange={async (e) => {
                            const useDefault = e.target.checked;
                            const newTemp = useDefault ? null : 0.7;
                            setAgent({ ...agent, llm_temperature: newTemp });
                            if (auth?.apiKey) {
                              await updateAgent(auth.apiKey, Number(agent.id), { llm_temperature: newTemp });
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        使用默认
                      </label>
                    </div>
                    {agent.llm_temperature !== null && agent.llm_temperature !== undefined && (
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={agent.llm_temperature ?? 0.7}
                          onChange={(e) => {
                            const newTemp = parseFloat(e.target.value);
                            setAgent({ ...agent, llm_temperature: newTemp });
                          }}
                          onMouseUp={async (e) => {
                            const newTemp = parseFloat((e.target as HTMLInputElement).value);
                            if (auth?.apiKey) {
                              await updateAgent(auth.apiKey, Number(agent.id), { llm_temperature: newTemp });
                            }
                          }}
                          onTouchEnd={async (e) => {
                            const newTemp = parseFloat((e.target as HTMLInputElement).value);
                            if (auth?.apiKey) {
                              await updateAgent(auth.apiKey, Number(agent.id), { llm_temperature: newTemp });
                            }
                          }}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-text-secondary">
                          <span>0（确定性）</span>
                          <span className="font-medium text-primary">{agent.llm_temperature?.toFixed(1)}</span>
                          <span>2（创造性）</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {middleTab === "motherland" && (
            <div className="flex-1 min-h-0 flex flex-col bg-surface">
              {motherlandStatus === null ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                  加载中...
                </div>
              ) : !motherlandStatus.configured ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-sm p-4">
                  Motherland 尚未配置，请联系管理员
                </div>
              ) : motherlandStatus.agent_id && Number(agentId) === motherlandStatus.agent_id ? (
                <div className="flex-1 flex items-center justify-center text-text-primary text-base font-medium p-4">
                  你已经是Motherland
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {motherlandMessages.length === 0 && !motherlandAutoRunning ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-sm py-12 gap-4">
                        <p>点击播放键，开始与 Motherland 的自动对话</p>
                        <button
                          type="button"
                          onClick={() => { setMotherlandTopic(""); setMotherlandTopicModalOpen(true); }}
                          className="w-16 h-16 flex items-center justify-center rounded-full bg-primary hover:opacity-90 text-white transition-colors shadow-lg"
                        >
                          <svg width="24" height="28" viewBox="0 0 16 18" fill="currentColor"><path d="M15 9L1 17.66V0.34L15 9Z" /></svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        {motherlandTopic && (
                          <div className="text-center text-xs text-text-secondary py-1">
                            主题：{motherlandTopic}
                          </div>
                        )}
                        {motherlandMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] px-4 py-2 rounded-xl ${
                                msg.role === "user"
                                  ? "bg-primary text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-text-primary"
                              }`}
                            >
                              <p className="text-xs font-medium opacity-60 mb-1">
                                {msg.role === "user" ? (agent?.name || "Agent") : "Motherland"}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {motherlandAutoRunning && (
                      <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-text-secondary text-sm flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
                          <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.2s]" />
                          <span className="inline-block w-2 h-2 rounded-full bg-text-secondary animate-pulse [animation-delay:0.4s]" />
                          <span className="ml-1">对话进行中...</span>
                        </div>
                      </div>
                    )}
                    <div ref={motherlandEndRef} />
                  </div>
                  {/* Bottom controls */}
                  {(motherlandAutoRunning || motherlandMessages.length > 0) && (
                    <div className="p-3 border-t border-border flex justify-center gap-3">
                      {motherlandAutoRunning ? (
                        <button
                          type="button"
                          onClick={() => { motherlandAbortRef.current = true; }}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title="停止"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect width="14" height="14" rx="2" /></svg>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startAutoTalk("", true)}
                            className="px-5 py-2 bg-primary hover:opacity-90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="14" viewBox="0 0 16 18" fill="currentColor"><path d="M15 9L1 17.66V0.34L15 9Z" /></svg>
                            继续
                          </button>
                          <button
                            type="button"
                            onClick={handleResetMotherlandChat}
                            className="px-5 py-2 border border-border text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            重置
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Topic input modal */}
                  {motherlandTopicModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMotherlandTopicModalOpen(false)}>
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-text-primary mb-4">设置对话主题</h3>
                        <div className="space-y-3">
                          <textarea
                            value={motherlandTopic}
                            onChange={(e) => setMotherlandTopic(e.target.value)}
                            placeholder="输入你希望讨论的主题..."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleGenerateTopic}
                            disabled={motherlandTopicGenerating}
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {motherlandTopicGenerating ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                自动生成主题
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex gap-3 mt-5">
                          <button
                            type="button"
                            onClick={() => setMotherlandTopicModalOpen(false)}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => startAutoTalk()}
                            disabled={!motherlandTopic.trim()}
                            className="flex-1 px-4 py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            开始对话
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        {/* Right: Skills */}
        <div className="w-1/3 flex flex-col bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
          {/* 对话前技能（Widget） */}
          <div className="border-t border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">对话前技能（Widget）</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (auth?.apiKey) {
                      listCreatorSkills(auth.apiKey).then((res) => {
                        if (res.success && res.data?.creator_skills) {
                          setCreatorSkills(res.data.creator_skills);
                        }
                      });
                    }
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary"
                  title="刷新列表（从 Marketplace 添加后请点击）"
                >
                  刷新
                </button>
                <Link
                  href="/dashboard/skills-marketplace"
                  className="text-xs text-primary hover:opacity-80"
                >
                  去 Marketplace 添加
                </Link>
              </div>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              {creatorSkills.filter((cs) => cs.stage === "pre_conversation").length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-2">
                  暂无对话前技能，请先在 Marketplace 添加 pre_conversation 类型技能
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {creatorSkills
                    .filter((cs) => cs.stage === "pre_conversation")
                    .map((cs) => {
                      const checked = !!selectedPreSkills.find((p) => p.creator_skill_id === cs.id);
                      const hasConfig = !!(cs.config_schema?.properties && Object.keys(cs.config_schema.properties).length > 0);
                      return (
                        <div
                          key={cs.id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            checked
                              ? "bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40"
                              : "bg-slate-100/80 dark:bg-slate-800/50 border-border hover:border-primary/50"
                          }`}
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const next = checked
                                ? selectedPreSkills.filter((p) => p.creator_skill_id !== cs.id)
                                : [...selectedPreSkills, { creator_skill_id: cs.id }];
                              setSelectedPreSkills(next);
                              savePreSkillsToDb(next);
                            }}
                          >
                            <SkillIconBadge skillName={cs.skill_name} active={checked} />
                            <div className="min-w-0 flex-1">
                            <div className="text-xs text-text-primary font-medium truncate">{cs.name}</div>
                            <div className="text-[10px] text-text-secondary truncate">{cs.skill_name || `ID: ${cs.id}`}</div>
                            </div>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                checked
                                  ? "bg-primary text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-text-secondary"
                              }`}
                            >
                              {checked ? "已启用" : "未启用"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-3 mt-2 pt-1.5 border-t border-border">
                            <button
                              type="button"
                              onClick={() => handleDeleteCreatorSkill(cs.id, cs.stage)}
                              className="text-[11px] text-red-400/70 hover:text-red-300"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              disabled={!hasConfig}
                              onClick={() => {
                                if (hasConfig) {
                                  setCreatorSkillConfigModal({
                                    creatorSkillId: cs.id,
                                    skillName: cs.name,
                                    configSchema: cs.config_schema!,
                                    initialConfig: cs.config || {},
                                  });
                                }
                              }}
                              className={`text-[11px] ${hasConfig ? "text-primary hover:opacity-80" : "text-text-secondary cursor-not-allowed"}`}
                            >
                              配置
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* 对话中技能（角色强化等） */}
          <div className={`border-t border-border ${agent.agent_type === 'edge' ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">
                对话中技能（角色强化）
                {agent.agent_type === 'edge' && <span className="ml-2 text-xs text-amber-400">Edge 模式下由本地代理处理</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (auth?.apiKey) {
                      listCreatorSkills(auth.apiKey).then((res) => {
                        if (res.success && res.data?.creator_skills) {
                          setCreatorSkills(res.data.creator_skills);
                        }
                      });
                    }
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary"
                  title="刷新列表（从 Marketplace 添加后请点击）"
                >
                  刷新
                </button>
                <Link
                  href="/dashboard/skills-marketplace"
                  className="text-xs text-primary hover:opacity-80"
                >
                  去 Marketplace 添加
                </Link>
              </div>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto">
              {creatorSkills.filter((cs) => cs.stage === "mid_conversation").length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-2">
                  暂无对话中技能，请先在 Marketplace 添加 mid_conversation 类型技能
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {creatorSkills
                    .filter((cs) => cs.stage === "mid_conversation")
                    .map((cs) => {
                      const sel = selectedMidSkills.find((p) => p.creator_skill_id === cs.id);
                      const checked = !!sel;
                      const hasConfig = !!(cs.config_schema?.properties && Object.keys(cs.config_schema.properties).length > 0);
                      const canConfig = checked && (cs.skill_name === "role_reinforcement" || hasConfig);
                      // prompt-api 型技能支持按 Agent 编辑调用提示词；implementation_type 可能未返回时用 skill_name 兜底
                      const PROMPT_API_SKILL_NAMES = ["create_docx", "minimaxi_tts", "weather_api"];
                      const isPromptApi = cs.implementation_type === "prompt-api" || (!!cs.skill_name && PROMPT_API_SKILL_NAMES.includes(cs.skill_name));
                      const canEditToolDesc = checked && isPromptApi;
                      const needsAttention = checked && (
                        (cs.skill_name === "role_reinforcement" && !String(sel?.config?.role_prompt || "").trim()) ||
                        (cs.skill_name !== "role_reinforcement" && hasConfig && (cs.config_schema?.required || []).some((k: string) => {
                          const v = cs.config?.[k];
                          return v == null || String(v).trim() === "";
                        }))
                      );
                      return (
                        <div
                          key={cs.id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            checked
                              ? "bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40"
                              : "bg-slate-100/80 dark:bg-slate-800/50 border-border hover:border-primary/50"
                          }`}
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const defaultConfig = cs.skill_name === "role_reinforcement" ? { role_prompt: "" } : {};
                              const next = checked
                                ? selectedMidSkills.filter((p) => p.creator_skill_id !== cs.id)
                                : [...selectedMidSkills, { creator_skill_id: cs.id, config: defaultConfig }];
                              setSelectedMidSkills(next);
                              saveMidSkillsToDb(next);
                            }}
                          >
                            <SkillIconBadge skillName={cs.skill_name} active={checked} />
                            <div className="min-w-0 flex-1">
                            <div className="text-xs text-text-primary font-medium truncate">{cs.name}</div>
                            <div className="text-[10px] text-text-secondary truncate">{cs.skill_name || `ID: ${cs.id}`}</div>
                              {needsAttention && (
                                <div className="text-[10px] text-amber-400/90 truncate mt-0.5">需要配置</div>
                              )}
                            </div>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                checked
                                  ? "bg-primary text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-text-secondary"
                              }`}
                            >
                              {checked ? "已启用" : "未启用"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-3 mt-2 pt-1.5 border-t border-border flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteCreatorSkill(cs.id, cs.stage)}
                              className="text-[11px] text-red-400/70 hover:text-red-300"
                            >
                              删除
                            </button>
                            {canEditToolDesc && (
                              <button
                                type="button"
                                onClick={() => setToolDescriptionModal({
                                  creatorSkillId: cs.id,
                                  skillId: cs.skill_id,
                                  skillName: cs.name,
                                  toolDescription: String(sel?.config?.tool_description ?? cs.default_tool_description ?? ""),
                                  defaultToolDescription: String(cs.default_tool_description ?? ""),
                                })}
                                className="text-[11px] text-primary hover:opacity-80"
                              >
                                调用提示词
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!canConfig}
                              onClick={() => {
                                if (cs.skill_name === "role_reinforcement") {
                                  setMidSkillConfigModal({
                                    creatorSkillId: cs.id,
                                    skillName: cs.name,
                                    rolePrompt: String(sel?.config?.role_prompt || ""),
                                  });
                                } else if (hasConfig) {
                                  setTwoTabConfigModal({
                                    creatorSkillId: cs.id,
                                    skillName: cs.name,
                                    configSchema: cs.config_schema!,
                                    globalConfig: cs.config || {},
                                    agentConfig: sel?.config || {},
                                  });
                                }
                              }}
                              className={`text-[11px] ${canConfig ? "text-primary hover:opacity-80" : "text-text-secondary cursor-not-allowed"}`}
                            >
                              配置
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* 对话后技能（数字人） */}
          <div className={`border-t border-border ${agent.agent_type === 'edge' ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">
                对话后技能（数字人）
                {agent.agent_type === 'edge' && <span className="ml-2 text-xs text-amber-400">Edge 模式下由本地代理处理</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (auth?.apiKey) {
                      listCreatorSkills(auth.apiKey).then((res) => {
                        if (res.success && res.data?.creator_skills) {
                          setCreatorSkills(res.data.creator_skills);
                        }
                      });
                    }
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary"
                  title="刷新列表（从 Marketplace 添加后请点击）"
                >
                  刷新
                </button>
                <Link
                  href="/dashboard/skills-marketplace"
                  className="text-xs text-primary hover:opacity-80"
                >
                  去 Marketplace 添加
                </Link>
              </div>
            </div>
            <div className="p-3 max-h-64 overflow-y-auto">
              {creatorSkills.filter((cs) => cs.stage === "post_conversation").length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-4">
                  暂无对话后技能，请先在 Marketplace 添加 post_conversation 类型技能
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {creatorSkills
                    .filter((cs) => cs.stage === "post_conversation")
                    .map((cs) => {
                      const sel = selectedPostSkills.find((p) => p.creator_skill_id === cs.id);
                      const checked = !!sel;
                      const isSensitiveFilter = cs.skill_name === "sensitive_filter";
                      const hasConfig = !!(cs.config_schema?.properties && Object.keys(cs.config_schema.properties).length > 0);
                      const canConfig = checked && (isSensitiveFilter || hasConfig);
                      return (
                        <div
                          key={cs.id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            checked
                              ? "bg-primary/20 border-primary shadow-sm ring-1 ring-primary/40"
                              : "bg-slate-100/80 dark:bg-slate-800/50 border-border hover:border-primary/50"
                          }`}
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const next = checked
                                ? selectedPostSkills.filter((p) => p.creator_skill_id !== cs.id)
                                : [...selectedPostSkills, { creator_skill_id: cs.id, config: {} }];
                              setSelectedPostSkills(next);
                              savePostSkillsToDb(next);
                            }}
                          >
                            <SkillIconBadge skillName={cs.skill_name} active={checked} />
                            <div className="min-w-0 flex-1">
                            <div className="text-xs text-text-primary font-medium truncate">{cs.name}</div>
                            <div className="text-[10px] text-text-secondary truncate">{cs.skill_name || `ID: ${cs.id}`}</div>
                            </div>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                checked
                                  ? "bg-primary text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-text-secondary"
                              }`}
                            >
                              {checked ? "已启用" : "未启用"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-3 mt-2 pt-1.5 border-t border-border">
                            <button
                              type="button"
                              onClick={() => handleDeleteCreatorSkill(cs.id, cs.stage)}
                              className="text-[11px] text-red-400/70 hover:text-red-300"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              disabled={!canConfig}
                              onClick={() => {
                                if (isSensitiveFilter) {
                                  setPostSkillConfigModal({
                                    creatorSkillId: cs.id,
                                    skillName: cs.name,
                                    words: ((sel?.config?.words as string[]) || []).join("\n"),
                                  });
                                } else if (hasConfig) {
                                  setCreatorSkillConfigModal({
                                    creatorSkillId: cs.id,
                                    skillName: cs.name,
                                    configSchema: cs.config_schema!,
                                    initialConfig: cs.config || {},
                                  });
                                }
                              }}
                              className={`text-[11px] ${canConfig ? "text-primary hover:opacity-80" : "text-text-secondary cursor-not-allowed"}`}
                            >
                              配置
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPostMomentDialog && agent && (
        <PostMomentDialog
          open={showPostMomentDialog}
          onClose={() => setShowPostMomentDialog(false)}
          agentId={agentId}
          apiKey={auth.apiKey}
        />
      )}

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl"
            aria-label="关闭"
          >
            ×
          </button>
          <img
            src={previewImageUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showTestDialog && agent && (
        <AgentTestDialog
          agent={agent}
          agentId={agentId}
          apiKey={auth.apiKey}
          systemPrompt={prompt}
          examples={testMessages.map((m) => ({ role: m.role, content: m.content }))}
          skills={selectedSkills}
          preSkills={selectedPreSkills.flatMap((p) => {
            const cs = creatorSkills.find((c) => c.id === p.creator_skill_id);
            return cs ? [{ id: cs.id, uuid: cs.uuid }] : [];
          })}
          midSkills={selectedMidSkills.map((p) => ({
            creator_skill_id: p.creator_skill_id,
            config: p.config,
          }))}
          postSkills={selectedPostSkills.map((p) => ({
            creator_skill_id: p.creator_skill_id,
            config: p.config,
          }))}
          onClose={() => setShowTestDialog(false)}
        />
      )}

      {/* 角色设定配置弹窗 */}
      {midSkillConfigModal && (
        <MidSkillConfigModal
          skillName={midSkillConfigModal.skillName}
          initialRolePrompt={midSkillConfigModal.rolePrompt}
          onSave={(rolePrompt) => {
            const next = selectedMidSkills.map((p) =>
              p.creator_skill_id === midSkillConfigModal.creatorSkillId
                ? { ...p, config: { ...p.config, role_prompt: rolePrompt } }
                : p
            );
            setSelectedMidSkills(next);
            saveMidSkillsToDb(next);
            setMidSkillConfigModal(null);
          }}
          onClose={() => setMidSkillConfigModal(null)}
        />
      )}

      {/* 技能调用提示词弹窗（按 Agent 覆盖 tool_description，适用于 create_docx、minimaxi_tts、weather_api 等 prompt-api 技能） */}
      {toolDescriptionModal && (
        <ToolDescriptionModal
          apiKey={auth!.apiKey}
          skillId={toolDescriptionModal.skillId}
          skillName={toolDescriptionModal.skillName}
          initialValue={toolDescriptionModal.toolDescription}
          onSave={(toolDescription) => {
            const next = selectedMidSkills.map((p) => {
              if (p.creator_skill_id !== toolDescriptionModal.creatorSkillId) return p;
              const newConfig = { ...p.config };
              // 与系统默认相同或为空时，清除覆盖，使用系统默认
              if (toolDescription && toolDescription !== toolDescriptionModal.defaultToolDescription) {
                newConfig.tool_description = toolDescription;
              } else {
                delete newConfig.tool_description;
              }
              return { ...p, config: newConfig };
            });
            setSelectedMidSkills(next);
            saveMidSkillsToDb(next);
            setToolDescriptionModal(null);
          }}
          onClose={() => setToolDescriptionModal(null)}
        />
      )}

      {/* 对话中技能通用配置弹窗（如 weather_api 的 default_city） */}
      {midSkillGenericConfigModal && (
        <MidSkillGenericConfigModal
          skillName={midSkillGenericConfigModal.skillName}
          configSchema={midSkillGenericConfigModal.configSchema}
          initialConfig={midSkillGenericConfigModal.initialConfig}
          onSave={(config) => {
            const next = selectedMidSkills.map((p) =>
              p.creator_skill_id === midSkillGenericConfigModal.creatorSkillId
                ? { ...p, config }
                : p
            );
            setSelectedMidSkills(next);
            saveMidSkillsToDb(next);
            setMidSkillGenericConfigModal(null);
          }}
          onClose={() => setMidSkillGenericConfigModal(null)}
        />
      )}

      {/* 敏感词配置弹窗 */}
      {postSkillConfigModal && (
        <PostSkillConfigModal
          skillName={postSkillConfigModal.skillName}
          initialWords={postSkillConfigModal.words}
          onSave={(words) => {
            const wordList = words
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            const next = selectedPostSkills.map((p) =>
              p.creator_skill_id === postSkillConfigModal.creatorSkillId
                ? { ...p, config: { ...p.config, words: wordList } }
                : p
            );
            setSelectedPostSkills(next);
            savePostSkillsToDb(next);
            setPostSkillConfigModal(null);
          }}
          onClose={() => setPostSkillConfigModal(null)}
        />
      )}

      {/* 通用技能参数配置弹窗（编辑 creator_skill.config） */}
      {creatorSkillConfigModal && (
        <CreatorSkillConfigModal
          skillName={creatorSkillConfigModal.skillName}
          configSchema={creatorSkillConfigModal.configSchema}
          initialConfig={creatorSkillConfigModal.initialConfig}
          saving={creatorSkillConfigSaving}
          onSave={async (config) => {
            if (!auth?.apiKey) return;
            setCreatorSkillConfigSaving(true);
            try {
              const res = await updateCreatorSkill(auth.apiKey, creatorSkillConfigModal.creatorSkillId, { config });
              if (res.success) {
                const listRes = await listCreatorSkills(auth.apiKey);
                if (listRes.success && listRes.data?.creator_skills) {
                  setCreatorSkills(listRes.data.creator_skills);
                }
                setCreatorSkillConfigModal(null);
              } else {
                setError(res.error?.message || "保存配置失败");
              }
            } catch {
              setError("保存配置失败");
            } finally {
              setCreatorSkillConfigSaving(false);
            }
          }}
          onClose={() => setCreatorSkillConfigModal(null)}
        />
      )}

      {/* 两 Tab 配置弹窗（全局 + Agent 配置） */}
      {twoTabConfigModal && (
        <TwoTabSkillConfigModal
          skillName={twoTabConfigModal.skillName}
          configSchema={twoTabConfigModal.configSchema}
          globalConfig={twoTabConfigModal.globalConfig}
          agentConfig={twoTabConfigModal.agentConfig}
          savingGlobal={twoTabGlobalSaving}
          onSaveGlobal={async (config) => {
            if (!auth?.apiKey) return;
            setTwoTabGlobalSaving(true);
            try {
              const res = await updateCreatorSkill(auth.apiKey, twoTabConfigModal.creatorSkillId, { config });
              if (res.success) {
                const listRes = await listCreatorSkills(auth.apiKey);
                if (listRes.success && listRes.data?.creator_skills) {
                  setCreatorSkills(listRes.data.creator_skills);
                }
                setTwoTabConfigModal(null);
              } else {
                setError(res.error?.message || "保存全局配置失败");
              }
            } catch {
              setError("保存全局配置失败");
            } finally {
              setTwoTabGlobalSaving(false);
            }
          }}
          onSaveAgent={(config) => {
            const next = selectedMidSkills.map((p) =>
              p.creator_skill_id === twoTabConfigModal.creatorSkillId
                ? { ...p, config }
                : p
            );
            setSelectedMidSkills(next);
            saveMidSkillsToDb(next);
            setTwoTabConfigModal(null);
          }}
          onClose={() => setTwoTabConfigModal(null)}
        />
      )}
    </div>
  );
}
