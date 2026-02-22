"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import {
  KnowledgeBase,
  Document,
  DocumentChunk,
  getKnowledgeBase,
  updateKnowledgeBase,
  listDocuments,
  uploadDocument,
  addDocumentURL,
  addDocumentText,
  deleteDocument,
  reindexDocument,
  listDocumentChunks,
} from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "等待处理", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  processing: { label: "处理中", color: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  ready: { label: "就绪", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  failed: { label: "失败", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

type TabType = "chunks" | "raw" | "metadata" | "logs";

function getFileTypeIcon(doc: Document) {
  if (doc.source_type === "url") {
    return (
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
    );
  }
  if (doc.source_type === "text") {
    return (
      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  const ext = doc.source?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") {
    return (
      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

function getLargeFileIcon(doc: Document) {
  if (doc.source_type === "url") {
    return (
      <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
    );
  }
  if (doc.source_type === "text") {
    return (
      <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  const ext = doc.source?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") {
    return (
      <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
          <path d="M8.5 13.5c0-.28.22-.5.5-.5h.5c.55 0 1 .45 1 1s-.45 1-1 1H9v1h-.5v-2.5zm2.5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5S11 14.83 11 14zm1.5-.5c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm2 0v2.5h.5v-1h.5l.5 1h.6l-.6-1.1c.3-.2.5-.5.5-.9 0-.55-.45-1-1-1h-1z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

function IndexingProgressBar({ status, progress }: { status: string; progress: number }) {
  if (status !== "pending" && status !== "processing") return null;
  const pct = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="mt-2">
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        {status === "pending" ? (
          <div className="h-full rounded-full bg-yellow-400 animate-pulse" style={{ width: "30%" }} />
        ) : (
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return s;
  }
}

function formatRelativeTime(s: string) {
  try {
    const now = Date.now();
    const then = new Date(s).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h 前`;
    const days = Math.floor(hrs / 24);
    return `${days}天前`;
  } catch {
    return s;
  }
}

function getFileExtBadge(doc: Document) {
  if (doc.source_type === "url") return { label: "URL", color: "text-blue-600 bg-blue-50" };
  if (doc.source_type === "text") return { label: "文本", color: "text-purple-600 bg-purple-50" };
  const ext = doc.source?.split(".").pop()?.toUpperCase() || "";
  if (ext === "PDF") return { label: "PDF", color: "text-red-600 bg-red-50" };
  if (ext === "TXT") return { label: "TXT", color: "text-gray-600 bg-gray-100" };
  if (ext === "MD") return { label: "MD", color: "text-gray-600 bg-gray-100" };
  if (ext === "HTML" || ext === "HTM") return { label: "HTML", color: "text-orange-600 bg-orange-50" };
  return null;
}

export default function KnowledgeBaseDetailPage() {
  const auth = getAuth();
  const params = useParams();
  const router = useRouter();
  const kbId = Number(params.id);

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Chunks state
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [chunksPage, setChunksPage] = useState(1);
  const [chunksLoading, setChunksLoading] = useState(false);
  const chunksPageSize = 20;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("chunks");

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Add URL state
  const [showAddURL, setShowAddURL] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [addingURL, setAddingURL] = useState(false);

  // Add Text state
  const [showAddText, setShowAddText] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [addingText, setAddingText] = useState(false);

  // Edit KB state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Delete doc state
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [reindexingIds, setReindexingIds] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    if (!auth?.apiKey) return;
    setLoading(true);
    const [kbRes, docsRes] = await Promise.all([
      getKnowledgeBase(auth.apiKey, kbId),
      listDocuments(auth.apiKey, kbId),
    ]);
    if (kbRes.success && kbRes.data) {
      setKb(kbRes.data);
    } else {
      setError("知识库不存在");
    }
    if (docsRes.success && docsRes.data) {
      const docsList = docsRes.data;
      setDocs(docsList);
      setSelectedDoc((prev) => {
        if (!prev) return docsList.length > 0 ? docsList[0] : null;
        const updated = docsList.find((d: Document) => d.id === prev.id);
        return updated || (docsList.length > 0 ? docsList[0] : null);
      });
    }
    setLoading(false);
  }, [auth?.apiKey, kbId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasPending = docs.some((d) => d.status === "pending" || d.status === "processing");
    if (!hasPending) return;
    const interval = setInterval(() => loadData(), 3000);
    return () => clearInterval(interval);
  }, [docs, loadData]);

  const loadChunks = useCallback(async (docId: number, page: number) => {
    if (!auth?.apiKey) return;
    setChunksLoading(true);
    const res = await listDocumentChunks(auth.apiKey, docId, page, chunksPageSize);
    if (res.success && res.data) {
      setChunks(res.data.chunks || []);
      setChunksTotal(res.data.total || 0);
    } else {
      setChunks([]);
      setChunksTotal(0);
    }
    setChunksLoading(false);
  }, [auth?.apiKey, chunksPageSize]);

  useEffect(() => {
    if (selectedDoc && selectedDoc.status === "ready" && activeTab === "chunks") {
      loadChunks(selectedDoc.id, chunksPage);
    } else {
      setChunks([]);
      setChunksTotal(0);
    }
  }, [selectedDoc, activeTab, chunksPage, loadChunks]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.apiKey) return;
    setUploading(true);
    setError("");
    const res = await uploadDocument(auth.apiKey, kbId, file);
    if (res.success) {
      loadData();
    } else {
      setError(res.error?.message || "上传失败");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddURL = async () => {
    if (!auth?.apiKey || !urlInput.trim()) return;
    setAddingURL(true);
    const res = await addDocumentURL(auth.apiKey, kbId, urlInput.trim(), urlTitle.trim() || undefined);
    if (res.success) {
      setShowAddURL(false);
      setUrlInput("");
      setUrlTitle("");
      loadData();
    } else {
      setError(res.error?.message || "添加失败");
    }
    setAddingURL(false);
  };

  const handleAddText = async () => {
    if (!auth?.apiKey || !textContent.trim()) return;
    setAddingText(true);
    const res = await addDocumentText(auth.apiKey, kbId, textTitle.trim() || "文本文档", textContent.trim());
    if (res.success) {
      setShowAddText(false);
      setTextTitle("");
      setTextContent("");
      loadData();
    } else {
      setError(res.error?.message || "添加失败");
    }
    setAddingText(false);
  };

  const handleDeleteDoc = async () => {
    if (!auth?.apiKey || !deleteTarget) return;
    const res = await deleteDocument(auth.apiKey, deleteTarget.id);
    if (res.success) {
      setDeleteTarget(null);
      if (selectedDoc?.id === deleteTarget.id) setSelectedDoc(null);
      loadData();
    } else {
      setError(res.error?.message || "删除失败");
    }
  };

  const handleReindex = async (docId: number) => {
    if (!auth?.apiKey) return;
    setReindexingIds((prev) => new Set(prev).add(docId));
    const res = await reindexDocument(auth.apiKey, docId);
    if (res.success) {
      loadData();
    }
    setReindexingIds((prev) => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
  };

  const handleEditKB = async () => {
    if (!auth?.apiKey || !kb) return;
    const res = await updateKnowledgeBase(auth.apiKey, kb.id, {
      name: editName.trim(),
      description: editDesc.trim(),
    });
    if (res.success) {
      setShowEdit(false);
      loadData();
    } else {
      setError(res.error?.message || "更新失败");
    }
  };

  const filteredDocs = docs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.title || "").toLowerCase().includes(q) ||
      (d.source || "").toLowerCase().includes(q)
    );
  });

  const totalChunkPages = Math.ceil(chunksTotal / chunksPageSize);

  if (!auth?.apiKey) {
    return <div className="p-8 text-text-secondary">请先登录</div>;
  }

  if (loading && !kb) {
    return <div className="p-8 text-text-secondary">加载中...</div>;
  }

  if (!kb) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">{error || "知识库不存在"}</p>
        <button onClick={() => router.push("/dashboard/knowledge")} className="mt-4 text-primary underline text-sm">
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)]">
      {/* Top header bar */}
      <div className="px-6 py-3 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/knowledge")}
            className="text-text-secondary hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-text-primary">智能体知识库管理</h1>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SYSTEM LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditName(kb.name);
              setEditDesc(kb.description);
              setShowEdit(true);
            }}
            className="p-2 rounded-lg text-text-secondary hover:bg-background transition-colors"
            title="设置"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">关闭</button>
        </div>
      )}

      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Sidebar: Document List */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-surface flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-primary">数据源列表</span>
              <span className="text-xs text-text-secondary">{docs.length} 总计</span>
            </div>
            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索知识文档..."
                className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {/* Add Button */}
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 bg-primary hover:opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {uploading ? "上传中..." : "添加数据源"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.html,.htm,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => setShowAddURL(true)}
                className="px-3 py-2 rounded-lg text-sm border border-border text-text-secondary hover:bg-background transition-colors"
                title="添加 URL"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <button
                onClick={() => setShowAddText(true)}
                className="px-3 py-2 rounded-lg text-sm border border-border text-text-secondary hover:bg-background transition-colors"
                title="添加文本"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2 opacity-50">📄</div>
                <p className="text-text-secondary text-xs">
                  {searchQuery ? "未找到匹配文档" : "暂无数据源"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const status = STATUS_MAP[doc.status] || STATUS_MAP.pending;
                  const badge = getFileExtBadge(doc);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setChunksPage(1);
                        setActiveTab("chunks");
                      }}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-background border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {getFileTypeIcon(doc)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {doc.title || doc.source}
                            </p>
                            {badge && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color} flex-shrink-0`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-secondary">
                              {doc.source_type === "file"
                                ? `${formatFileSize(doc.file_size)} · ${doc.chunk_count > 0 ? doc.chunk_count + " 分" : "0 分"}`
                                : doc.source}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {doc.status === "failed" ? (
                              <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">失败</span>
                            ) : doc.status !== "ready" ? (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.color}`}>{status.label}</span>
                            ) : (
                              <span />
                            )}
                            <span className="text-[10px] text-text-secondary">
                              {formatDate(doc.created_at)}
                            </span>
                          </div>
                          <IndexingProgressBar status={doc.status} progress={doc.progress} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area: Document Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-background">
          {selectedDoc ? (
            <div className="p-6">
              {/* Document Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {getLargeFileIcon(selectedDoc)}
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      {selectedDoc.title || selectedDoc.source}
                    </h2>
                    <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {selectedDoc.source}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReindex(selectedDoc.id)}
                    disabled={
                      selectedDoc.status === "pending" ||
                      selectedDoc.status === "processing" ||
                      reindexingIds.has(selectedDoc.id)
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {reindexingIds.has(selectedDoc.id) ? "提交中..." : "重新训练"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selectedDoc)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-surface rounded-xl p-4 border border-border">
                  <p className="text-xs text-text-secondary mb-1">分块数量</p>
                  <p className="text-2xl font-bold text-text-primary">{selectedDoc.chunk_count}</p>
                  <p className="text-xs text-text-secondary">chunks</p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                  <p className="text-xs text-text-secondary mb-1">文件大小</p>
                  <p className="text-2xl font-bold text-green-600">{formatFileSize(selectedDoc.file_size)}</p>
                  <p className="text-xs text-text-secondary">{selectedDoc.char_count ? `${selectedDoc.char_count} 字符` : "-"}</p>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                  <p className="text-xs text-text-secondary mb-1">索引状态</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${STATUS_MAP[selectedDoc.status]?.dot || "bg-gray-400"}`} />
                    <p className="text-lg font-bold text-text-primary">
                      {selectedDoc.status === "ready" ? "Active" : STATUS_MAP[selectedDoc.status]?.label || selectedDoc.status}
                    </p>
                  </div>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                  <p className="text-xs text-text-secondary mb-1">最后更新</p>
                  <p className="text-2xl font-bold text-text-primary">{formatRelativeTime(selectedDoc.updated_at)}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-6 border-b border-border mb-6">
                {(
                  [
                    { key: "chunks", label: "分块预览 (Chunk View)" },
                    { key: "raw", label: "原始数据" },
                    { key: "metadata", label: "元数据" },
                    { key: "logs", label: "索引日志" },
                  ] as { key: TabType; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab.key
                        ? "text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "chunks" && (
                <div>
                  {selectedDoc.status !== "ready" ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3 opacity-50">
                        {selectedDoc.status === "failed" ? "❌" : "⏳"}
                      </div>
                      <p className="text-text-secondary text-sm">
                        {selectedDoc.status === "failed"
                          ? `索引失败：${selectedDoc.error_message || "未知错误"}`
                          : "文档正在处理中，请稍等..."}
                      </p>
                    </div>
                  ) : chunksLoading ? (
                    <div className="text-center py-16 text-text-secondary">加载分块数据中...</div>
                  ) : chunks.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3 opacity-50">📦</div>
                      <p className="text-text-secondary text-sm">暂无分块数据</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {chunks.map((chunk) => (
                          <div
                            key={chunk.index}
                            className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                CHUNK #{String(chunk.index + 1).padStart(3, "0")}
                              </span>
                              {chunk.score != null && chunk.score > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-text-secondary">
                                    Confidence: {(chunk.score * 100).toFixed(0)}%
                                  </span>
                                  <div className="w-16 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        chunk.score >= 0.9
                                          ? "bg-emerald-600 dark:bg-emerald-400"
                                          : chunk.score >= 0.7
                                          ? "bg-amber-500 dark:bg-amber-400"
                                          : "bg-rose-600 dark:bg-rose-400"
                                      }`}
                                      style={{ width: `${chunk.score * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-text-primary leading-relaxed line-clamp-4">
                              {chunk.content}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalChunkPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6 pb-4">
                          <button
                            onClick={() => setChunksPage((p) => Math.max(1, p - 1))}
                            disabled={chunksPage <= 1}
                            className="p-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="text-sm text-text-secondary px-3">
                            Page {chunksPage} of {totalChunkPages}
                          </span>
                          <button
                            onClick={() => setChunksPage((p) => Math.min(totalChunkPages, p + 1))}
                            disabled={chunksPage >= totalChunkPages}
                            className="p-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "raw" && (
                <div className="bg-surface rounded-xl border border-border p-6">
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary text-xs">文档 ID</span>
                        <p className="text-text-primary font-mono mt-0.5">{selectedDoc.id}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs">UUID</span>
                        <p className="text-text-primary font-mono mt-0.5 truncate">{selectedDoc.uuid}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary text-xs">来源类型</span>
                        <p className="text-text-primary mt-0.5">{selectedDoc.source_type === "file" ? "文件上传" : "URL 抓取"}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs">文件大小</span>
                        <p className="text-text-primary mt-0.5">{formatFileSize(selectedDoc.file_size)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-text-secondary text-xs">来源路径</span>
                      <p className="text-text-primary mt-0.5 break-all font-mono text-xs bg-background p-2 rounded-lg">{selectedDoc.source}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-text-secondary text-xs">字符数</span>
                        <p className="text-text-primary mt-0.5">{selectedDoc.char_count ?? "-"}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs">分块数</span>
                        <p className="text-text-primary mt-0.5">{selectedDoc.chunk_count}</p>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs">进度</span>
                        <p className="text-text-primary mt-0.5">{selectedDoc.progress}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "metadata" && (
                <div className="bg-surface rounded-xl border border-border p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2">文档元数据</h3>
                      <pre className="bg-background p-4 rounded-lg text-xs text-text-primary font-mono overflow-auto max-h-64">
                        {JSON.stringify(
                          {
                            id: selectedDoc.id,
                            uuid: selectedDoc.uuid,
                            knowledge_base_id: selectedDoc.knowledge_base_id,
                            title: selectedDoc.title,
                            source_type: selectedDoc.source_type,
                            source: selectedDoc.source,
                            file_size: selectedDoc.file_size,
                            char_count: selectedDoc.char_count,
                            chunk_count: selectedDoc.chunk_count,
                            status: selectedDoc.status,
                            progress: selectedDoc.progress,
                            error_message: selectedDoc.error_message,
                            metadata: selectedDoc.metadata,
                            created_at: selectedDoc.created_at,
                            updated_at: selectedDoc.updated_at,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2">知识库信息</h3>
                      <pre className="bg-background p-4 rounded-lg text-xs text-text-primary font-mono overflow-auto max-h-64">
                        {JSON.stringify(
                          {
                            id: kb.id,
                            uuid: kb.uuid,
                            name: kb.name,
                            description: kb.description,
                            embedding_model: kb.embedding_model,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="bg-surface rounded-xl border border-border p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${STATUS_MAP[selectedDoc.status]?.dot || "bg-gray-400"}`} />
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">
                          当前状态：<span className="font-medium">{STATUS_MAP[selectedDoc.status]?.label || selectedDoc.status}</span>
                        </p>
                        {selectedDoc.error_message && (
                          <p className="text-xs text-red-500 mt-1">{selectedDoc.error_message}</p>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary">{formatRelativeTime(selectedDoc.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">文档创建</p>
                      </div>
                      <span className="text-xs text-text-secondary">{formatDate(selectedDoc.created_at)}</span>
                    </div>
                    {selectedDoc.chunk_count > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">
                            生成 <span className="font-medium">{selectedDoc.chunk_count}</span> 个分块
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">📄</div>
                <p className="text-text-secondary">选择一个数据源查看详情</p>
                <p className="text-text-secondary text-xs mt-1">或上传文件 / 添加 URL 开始</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add URL Modal */}
      <Modal open={showAddURL} onClose={() => setShowAddURL(false)} title="添加 URL 数据源" maxWidth="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">URL *</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https://example.com/docs"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">标题（可选）</label>
            <input
              type="text"
              value={urlTitle}
              onChange={(e) => setUrlTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="数据源标题"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowAddURL(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAddURL}
            disabled={!urlInput.trim() || addingURL}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {addingURL ? "添加中..." : "添加"}
          </button>
        </div>
      </Modal>

      {/* Add Text Modal */}
      <Modal open={showAddText} onClose={() => setShowAddText(false)} title="添加文本数据" maxWidth="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">标题（可选）</label>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="文本文档"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">文本内容 *</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
              placeholder="在此粘贴或输入长文本内容..."
              rows={15}
            />
            <p className="text-xs text-text-secondary mt-1">
              已输入 {textContent.length} 字符
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowAddText(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAddText}
            disabled={!textContent.trim() || addingText}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {addingText ? "添加中..." : "添加"}
          </button>
        </div>
      </Modal>

      {/* Edit KB Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="编辑知识库" maxWidth="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">名称</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">描述</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-20"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowEdit(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleEditKB}
            disabled={!editName.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            保存
          </button>
        </div>
      </Modal>

      {/* Delete Doc Confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除" maxWidth="md">
        {deleteTarget && (
          <>
            <p className="text-sm text-text-secondary mb-6">
              确定要删除数据源「{deleteTarget.title || deleteTarget.source}」吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-background transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteDoc}
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
