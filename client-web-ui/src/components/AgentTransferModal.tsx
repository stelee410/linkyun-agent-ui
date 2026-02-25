"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getUserWorkspaces, updateAgent, type Agent, type WorkspaceWithRole } from "@/lib/api";

interface AgentTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiKey: string;
  agent: Agent | null;
}

export function AgentTransferModal({ open, onClose, onSuccess, apiKey, agent }: AgentTransferModalProps) {
  const { workspaceCode } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentCode = workspaceCode || "default";

  useEffect(() => {
    if (open && apiKey) {
      setLoading(true);
      setError("");
      getUserWorkspaces(apiKey)
        .then((res) => {
          if (res.success && res.data?.workspaces) {
            setWorkspaces(res.data.workspaces);
            setSelectedWorkspaceId(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setWorkspaces([]);
          setError("加载工作空间失败");
          setLoading(false);
        });
    }
  }, [open, apiKey]);

  const targetWorkspaces = workspaces.filter((w) => w.code !== currentCode);

  const handleTransfer = async () => {
    if (!agent || !apiKey || selectedWorkspaceId == null) return;
    setSubmitting(true);
    setError("");
    const res = await updateAgent(apiKey, agent.id, { workspace_id: selectedWorkspaceId });
    setSubmitting(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error?.message || "迁移失败");
    }
  };

  const handleClose = () => {
    setSelectedWorkspaceId(null);
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="迁移到其他工作空间" maxWidth="md">
      {agent && (
        <>
          <p className="text-sm text-text-secondary mb-4">
            将 Agent「{agent.name}」迁移到以下工作空间。迁移后，该 Agent 将出现在目标工作空间中。
          </p>
          {loading ? (
            <div className="py-8 text-center text-text-secondary">加载中...</div>
          ) : targetWorkspaces.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">暂无其他可迁移的工作空间。</p>
          ) : (
            <>
              <div className="space-y-2 mb-6 max-h-[240px] overflow-y-auto">
                {targetWorkspaces.map((w) => (
                  <label
                    key={w.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedWorkspaceId === w.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-text-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="target_workspace"
                      value={w.id}
                      checked={selectedWorkspaceId === w.id}
                      onChange={() => setSelectedWorkspaceId(w.id)}
                      className="sr-only"
                    />
                    <span className="font-medium text-text-primary">{w.name || w.code}</span>
                    <span className="text-xs text-text-secondary">({w.code})</span>
                  </label>
                ))}
              </div>
              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={selectedWorkspaceId == null || submitting}
                  className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
                >
                  {submitting ? "迁移中..." : "确认迁移"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
