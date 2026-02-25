"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserWorkspaces, switchWorkspace, type WorkspaceWithRole } from "@/lib/api";
import { getStoredWorkspaceCode, setStoredWorkspaceCode, useWorkspace } from "@/contexts/WorkspaceContext";

interface WorkspaceSelectProps {
  apiKey: string;
}

export function WorkspaceSelect({ apiKey }: WorkspaceSelectProps) {
  const router = useRouter();
  const { setWorkspaceCode } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("default");

  useEffect(() => {
    if (!apiKey) return;
    getUserWorkspaces(apiKey)
      .then((res) => {
        if (res.success && res.data) {
          const list = res.data.workspaces ?? [];
          setWorkspaces(list);
          const stored = getStoredWorkspaceCode();
          const validStored = list.some((w) => w.code === stored);
          let code: string;
          if (validStored && stored) {
            code = stored;
          } else if (list.length > 0) {
            code = list[0].code;
            setStoredWorkspaceCode(code);
          } else {
            code = "default";
          }
          setSelectedCode(code);
          setWorkspaceCode(code);
        } else {
          setWorkspaces([]);
          setSelectedCode("default");
          setWorkspaceCode("default");
        }
        setLoading(false);
      })
      .catch(() => {
        setWorkspaces([]);
        setSelectedCode("default");
        setWorkspaceCode("default");
        setLoading(false);
      });
  }, [apiKey]);

  const options: { code: string; name: string }[] =
    workspaces.length <= 1 ? [{ code: "default", name: "default" }] : workspaces.map((w) => ({ code: w.code, name: w.name || w.code }));

  const canSwitch = workspaces.length > 1;
  const displayValue = canSwitch ? selectedCode : "default";

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!canSwitch || code === selectedCode || switching) return;
    setSwitching(true);
    const res = await switchWorkspace(apiKey, code);
    setSwitching(false);
    if (res.success) {
      setStoredWorkspaceCode(code);
      setSelectedCode(code);
      setWorkspaceCode(code);
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-lg bg-surface min-w-[120px]">
        加载中...
      </div>
    );
  }

  return (
    <select
      value={displayValue}
      onChange={handleChange}
      disabled={!canSwitch || switching}
      className="px-3 py-1.5 text-sm text-text-primary border border-border rounded-lg bg-surface hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-70 disabled:cursor-default min-w-[120px] appearance-none cursor-pointer bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
      }}
      title={canSwitch ? "切换工作空间" : "当前工作空间"}
    >
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.name}
        </option>
      ))}
    </select>
  );
}
