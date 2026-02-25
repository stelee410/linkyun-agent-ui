
import React, { useEffect, useState } from 'react';
import { getUserWorkspaces, switchWorkspace } from '../services/api';
import type { WorkspaceWithRole } from '../services/api';
import { getStoredWorkspaceCode, setStoredWorkspaceCode, useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';

interface WorkspaceSelectProps {
  apiKey: string;
  /** 变化时重新拉取工作空间列表 */
  refreshTrigger?: number;
}

const WorkspaceSelect: React.FC<WorkspaceSelectProps> = ({ apiKey, refreshTrigger }) => {
  const { t } = useLanguage();
  const { setWorkspaceCode } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('default');

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
            code = 'default';
          }
          setSelectedCode(code);
          setWorkspaceCode(code);
        } else {
          setWorkspaces([]);
          setSelectedCode('default');
          setWorkspaceCode('default');
        }
        setLoading(false);
      })
      .catch(() => {
        setWorkspaces([]);
        setSelectedCode('default');
        setWorkspaceCode('default');
        setLoading(false);
      });
  }, [apiKey, setWorkspaceCode, refreshTrigger]);

  const displayName = (code: string, fallback: string) =>
    code === 'default' ? t.discovery.defaultWorkspaceName : fallback;
  const options: { code: string; name: string }[] =
    workspaces.length === 0
      ? [{ code: 'default', name: t.discovery.defaultWorkspaceName }]
      : workspaces.map((w) => ({ code: w.code, name: displayName(w.code, w.name || w.code) }));

  const canSwitch = workspaces.length > 1;
  const selectValue = options.some((o) => o.code === selectedCode) ? selectedCode : (options[0]?.code ?? 'default');

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
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-1.5 text-sm text-slate-400 border border-border-dark rounded-xl bg-surface-dark min-w-[140px]">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-xs font-medium whitespace-nowrap">{t.discovery.workspace}:</span>
      <select
        value={selectValue}
        onChange={handleChange}
        disabled={!canSwitch || switching}
        className="px-3 py-1.5 text-sm text-theme-text border border-border-dark rounded-xl bg-surface-dark hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-70 disabled:cursor-default min-w-[120px] appearance-none cursor-pointer pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '16px',
        }}
        title={canSwitch ? t.discovery.switchWorkspace : t.discovery.currentWorkspace}
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WorkspaceSelect;
