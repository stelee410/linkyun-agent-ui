import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { joinWorkspace } from '../services/api';
import type { Workspace } from '../services/api';

interface JoinWorkspaceModalProps {
  apiKey: string;
  onClose: () => void;
  onSuccess: (workspace: Workspace) => void;
}

const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({ apiKey, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    const res = await joinWorkspace(apiKey, code);
    setLoading(false);
    if (res.success && res.data?.workspace) {
      onSuccess(res.data.workspace);
      onClose();
    } else {
      setError(res.error?.message ?? t.discovery.joinFailed);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-dark border border-border-dark rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t.discovery.joinWorkspaceModalTitle}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">{t.discovery.joinWorkspaceModalDesc}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => { setInviteCode(e.target.value); setError(null); }}
            placeholder={t.discovery.inviteCodePlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 mb-4"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-dark text-slate-300 hover:text-white transition-all font-bold text-sm"
            >
              {t.friends.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className={`flex-1 py-2.5 rounded-xl transition-all font-bold text-sm ${loading || !inviteCode.trim() ? 'bg-slate-700 text-slate-500' : 'bg-primary text-black hover:opacity-90'}`}
            >
              {loading ? t.common.loading : t.discovery.joinWorkspace}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};

export default JoinWorkspaceModal;
