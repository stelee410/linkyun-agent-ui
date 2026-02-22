"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import {
  listMarketplaceSkills,
  type MarketplaceSkill,
} from "@/lib/api";
import { skillIconsLg, skillCardColorMap } from "@/lib/skillIcons";

function SkillCard({
  skill,
  onClick,
}: {
  skill: MarketplaceSkill;
  onClick: () => void;
}) {
  const cat = skill.category || "default";
  const icon = skillIconsLg[cat] || skillIconsLg.default;
  const colors = skillCardColorMap[cat] || skillCardColorMap.default;
  return (
    <button
      onClick={onClick}
      className="w-full p-6 bg-surface border border-border rounded-xl hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
    >
      <div className={`w-14 h-14 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center mb-4 ${colors.hoverBg} transition-colors`}>
        {icon}
      </div>
      <h3 className="font-medium text-text-primary mb-1">{skill.name}</h3>
      <p className="text-sm text-text-secondary line-clamp-2">{skill.description}</p>
      {skill.stage && (
        <span
          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
            skill.stage === "pre_conversation"
              ? "text-amber-600 dark:text-amber-400 bg-amber-500/20"
              : skill.stage === "mid_conversation"
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/20"
                : skill.stage === "post_conversation"
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/20"
                  : "text-text-secondary bg-slate-200 dark:bg-slate-700"
          }`}
        >
          {skill.stage === "pre_conversation"
            ? "对话前"
            : skill.stage === "mid_conversation"
              ? "对话中"
              : skill.stage === "post_conversation"
                ? "对话后"
                : skill.stage}
        </span>
      )}
    </button>
  );
}

export default function SkillsMarketplacePage() {
  const router = useRouter();
  const auth = getAuth();
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth?.apiKey) return;
    listMarketplaceSkills(auth.apiKey)
      .then((res) => {
        if (res.success && res.data?.skills) {
          setSkills(res.data.skills);
        } else {
          setError(res.error?.message || "加载失败");
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [auth?.apiKey]);

  const handleSkillClick = (skill: MarketplaceSkill) => {
    router.push(`/dashboard/skills-marketplace/${skill.id}/edit`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">技能广场</h1>
          <p className="text-sm text-text-secondary">
            浏览技能模板，点击进入编辑页面配置参数并保存到用户空间，即可在 AI Agent 中使用
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          返回
        </Link>
      </div>

      {loading && (
        <div className="text-text-secondary py-12 text-center">加载中...</div>
      )}
      {error && (
        <div className="text-red-500 py-4">{error}</div>
      )}
      {!loading && !error && skills.length === 0 && (
        <div className="text-text-secondary py-12 text-center">
          暂无技能模板，请先执行数据库迁移
        </div>
      )}
      {!loading && !error && skills.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => handleSkillClick(skill)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
