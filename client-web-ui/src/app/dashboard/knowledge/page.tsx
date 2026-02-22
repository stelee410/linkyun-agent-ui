"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import {
  KnowledgeBase,
  listKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
} from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

export default function KnowledgeBasesPage() {
  const auth = getAuth();
  const router = useRouter();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);

  useEffect(() => {
    if (!auth?.apiKey) return;
    loadKBs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.apiKey]);

  const loadKBs = async () => {
    if (!auth?.apiKey) return;
    setLoading(true);
    setError("");
    const res = await listKnowledgeBases(auth.apiKey);
    if (res.success && res.data) {
      setKbs(res.data);
    } else {
      setKbs([]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!auth?.apiKey || !createName.trim()) return;
    setCreating(true);
    const res = await createKnowledgeBase(auth.apiKey, {
      name: createName.trim(),
      description: createDesc.trim(),
    });
    if (res.success) {
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      loadKBs();
    } else {
      setError(res.error?.message || "创建失败");
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!auth?.apiKey || !deleteTarget) return;
    const res = await deleteKnowledgeBase(auth.apiKey, deleteTarget.id);
    if (res.success) {
      setDeleteTarget(null);
      loadKBs();
    } else {
      setError(res.error?.message || "删除失败");
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return s;
    }
  };

  if (!auth?.apiKey) {
    return (
      <div className="p-8 text-text-secondary">请先登录</div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">知识库管理</h1>
          <p className="text-sm text-text-secondary mt-1">管理你的知识库和数据源</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity"
        >
          + 新建知识库
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">关闭</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-text-secondary">加载中...</div>
      ) : kbs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-text-secondary">还没有配置知识库</p>
          <p className="text-text-secondary text-sm mt-1">点击右上角「新建知识库」开始创建你的第一个知识库</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="bg-surface border border-border rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer group relative"
              onClick={() => router.push(`/dashboard/knowledge/${kb.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-text-primary truncate">
                    {kb.name}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                    {kb.description || "暂无描述"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 ml-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
                <span>创建于 {formatDate(kb.created_at)}</span>
              </div>

              {/* Delete button (visible on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(kb);
                }}
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建知识库" maxWidth="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">名称 *</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="例如：产品文档知识库"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">描述</label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-20"
              placeholder="知识库的用途描述（可选）"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!createName.trim() || creating}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {creating ? "创建中..." : "创建"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除" maxWidth="md">
        {deleteTarget && (
          <>
            <p className="text-sm text-text-secondary mb-6">
              确定要删除知识库「{deleteTarget.name}」吗？此操作将同时删除所有文档和向量数据，不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
