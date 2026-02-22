"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAuth } from "@/lib/auth";
import {
  getMarketplaceSkill,
  listCreatorSkills,
  createCreatorSkill,
  type MarketplaceSkill,
} from "@/lib/api";

export default function SkillEditPage() {
  const params = useParams();
  const skillId = Number(params.id);
  const auth = getAuth();
  const [template, setTemplate] = useState<MarketplaceSkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyAdded, setAlreadyAdded] = useState(false);
  const [showForLlmExpanded, setShowForLlmExpanded] = useState(false);

  useEffect(() => {
    if (!auth?.apiKey || !skillId) return;
    Promise.all([
      getMarketplaceSkill(auth.apiKey, skillId),
      listCreatorSkills(auth.apiKey),
    ])
      .then(([tplRes, listRes]) => {
        if (!tplRes.success || !tplRes.data) {
          setError(tplRes.error?.message || "加载失败");
          setLoading(false);
          return;
        }
        setTemplate(tplRes.data);

        // 检查用户是否已添加
        const existing = listRes.success && listRes.data?.creator_skills
          ? listRes.data.creator_skills.find((cs) => cs.skill_id === skillId)
          : null;
        if (existing) {
          setAlreadyAdded(true);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [auth?.apiKey, skillId]);

  const handleAdd = async () => {
    if (!auth?.apiKey || !template) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // 从 schema 中提取默认值
      const schema = template.config_schema as {
        properties?: Record<string, { default?: unknown }>;
      } | undefined;
      const defaults: Record<string, unknown> = {};
      if (schema?.properties) {
        for (const [k, v] of Object.entries(schema.properties)) {
          if (v && typeof v === "object" && "default" in v) {
            defaults[k] = (v as { default?: unknown }).default;
          }
        }
      }
      const res = await createCreatorSkill(auth.apiKey, {
        skill_id: template.id,
        name: template.name,
        config: defaults,
      });
      if (res.success && res.data) {
        setAlreadyAdded(true);
        setSuccess("已加入我的空间！请前往 Agent 编辑页面配置参数并启用。");
      } else {
        setError(res.error?.message || "添加失败");
      }
    } catch {
      setError("添加失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-text-secondary">加载中...</div>
      </div>
    );
  }
  if (!template) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-red-500">技能模板不存在</div>
        <Link href="/dashboard/skills-marketplace" className="text-primary mt-2 inline-block hover:opacity-80">
          返回技能广场
        </Link>
      </div>
    );
  }

  const schema = template.config_schema as {
    properties?: Record<string, { type?: string; description?: string; default?: unknown; enum?: string[]; enumLabels?: Record<string, string> }>;
    required?: string[];
  } | undefined;
  const required = new Set(schema?.required || []);
  const hasParams = schema?.properties && Object.keys(schema.properties).length > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/skills-marketplace"
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          ← 返回技能广场
        </Link>
      </div>

      {/* 标题 + 阶段标签 */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-xl font-semibold text-text-primary">{template.name}</h1>
        {template.stage && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              template.stage === "pre_conversation"
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/20"
                : template.stage === "mid_conversation"
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/20"
                  : template.stage === "post_conversation"
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/20"
                    : "text-text-secondary bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {template.stage === "pre_conversation"
              ? "对话前"
              : template.stage === "mid_conversation"
                ? "对话中"
                : template.stage === "post_conversation"
                  ? "对话后"
                  : template.stage}
          </span>
        )}
        {alreadyAdded && (
          <span className="text-xs px-2 py-0.5 rounded text-green-600 dark:text-green-400 bg-green-500/20">
            已加入
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary mb-6">{template.description}</p>

      {/* 参数文档 */}
      {template.config_doc && template.config_doc.trim() && (
        <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50 p-4 mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">参数文档</h3>
          <div className="text-sm text-text-secondary [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-medium [&_h3]:font-medium [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2 [&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_li]:ml-4 [&_code]:bg-slate-200 dark:[&_code]:bg-slate-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-text-primary [&_pre]:bg-slate-200 dark:[&_pre]:bg-slate-800 [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-2">
            <ReactMarkdown>{template.config_doc}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* 参数列表（只读） */}
      {hasParams && (
        <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50 p-4 mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">配置参数列表</h3>
          <div className="space-y-2">
            {Object.entries(schema!.properties!).map(([key, prop]) => {
              const isRequired = required.has(key);
              const desc = prop?.description || "";
              const defaultVal = prop?.default;
              const enumVals = prop?.enum;
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg bg-surface border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-text-primary font-mono">{key}</code>
                      {isRequired && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          必填
                        </span>
                      )}
                      {prop?.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-text-secondary">
                          {prop.type}
                        </span>
                      )}
                    </div>
                    {desc && (
                      <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                    )}
                    {defaultVal !== undefined && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        默认值: <code className="text-text-primary">{String(defaultVal)}</code>
                      </p>
                    )}
                    {enumVals && enumVals.length > 0 && (
                      enumVals.length > 20 ? (
                        <p className="text-xs text-text-secondary mt-0.5">
                          可选值: 共 {enumVals.length} 种（在配置页面中通过下拉搜索选择）
                        </p>
                      ) : (
                        <p className="text-xs text-text-secondary mt-0.5">
                          可选值: {enumVals.map((v) => (
                            <code key={v} className="text-text-primary mr-1">{prop?.enumLabels?.[v] || v}</code>
                          ))}
                        </p>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary mt-3">
            加入空间后，在 Agent 编辑页面中配置这些参数
          </p>
        </div>
      )}

      {/* LLM 说明（折叠） */}
      {template.description_for_llm && template.description_for_llm.trim() && (
        <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50 mb-6">
          <button
            type="button"
            onClick={() => setShowForLlmExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-text-secondary hover:text-text-primary"
          >
            <span>开发者：传给 LLM 的完整说明</span>
            <span className="text-text-secondary">{showForLlmExpanded ? "▲" : "▼"}</span>
          </button>
          {showForLlmExpanded && (
            <div className="border-t border-border px-4 py-3 text-sm text-text-secondary whitespace-pre-wrap">
              {template.description_for_llm}
            </div>
          )}
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}
      {success && <div className="text-green-600 dark:text-green-400 mb-4">{success}</div>}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {!alreadyAdded ? (
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {saving ? "添加中..." : "加入我的空间"}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 dark:text-green-400">已在我的空间中</span>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm"
            >
              前往 Agent 编辑 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
