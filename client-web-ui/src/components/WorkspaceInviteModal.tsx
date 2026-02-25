"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getWorkspaceInviteCode, refreshWorkspaceInviteCode } from "@/lib/api";

interface WorkspaceInviteModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
}

export function WorkspaceInviteModal({ open, onClose, apiKey }: WorkspaceInviteModalProps) {
  const { workspaceCode } = useWorkspace();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const currentCode = workspaceCode || "default";
  const loadInviteCode = async () => {
    if (!apiKey) return;
    setLoading(true);
    setError("");
    const res = await getWorkspaceInviteCode(apiKey, currentCode);
    setLoading(false);
    if (res.success && res.data?.invite_code) {
      setInviteCode(res.data.invite_code);
    } else {
      setError(res.error?.message || "获取邀请码失败");
    }
  };

  useEffect(() => {
    if (open && apiKey) {
      loadInviteCode();
    } else if (open) {
      setInviteCode("");
      setError("请先选择工作空间");
    } else {
      setInviteCode("");
      setError("");
    }
  }, [open, apiKey, currentCode]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败");
    }
  };

  const handleRefresh = async () => {
    if (!apiKey) return;
    setRefreshing(true);
    setError("");
    const res = await refreshWorkspaceInviteCode(apiKey, currentCode);
    setRefreshing(false);
    if (res.success && res.data?.invite_code) {
      setInviteCode(res.data.invite_code);
    } else {
      setError(res.error?.message || "刷新失败");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="工作空间邀请码" maxWidth="md">
      <p className="text-sm text-text-secondary mb-4">
        分享邀请码后，他人输入可加入当前工作空间。
      </p>
      {loading ? (
        <div className="py-8 text-center text-text-secondary">加载中...</div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <code className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-lg font-mono font-bold text-text-primary tracking-wider">
              {inviteCode || "—"}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!inviteCode}
              className="px-4 py-3 bg-surface border border-border hover:bg-background disabled:opacity-50 text-text-primary rounded-lg font-medium transition-colors"
            >
              {copied ? "已复制" : "复制"}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || !inviteCode}
              className="px-4 py-3 bg-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {refreshing ? "刷新中..." : "刷新"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        </>
      )}
    </Modal>
  );
}
