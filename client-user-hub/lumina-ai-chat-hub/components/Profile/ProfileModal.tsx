
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAuth, setAuth } from '../../lib/auth';
import {
  getCreatorAvatar,
  updateProfile,
  type Creator,
} from '../../services/api';
import { PLACEHOLDER } from '../../lib/placeholder';
import { CreatorAvatarUpload } from './CreatorAvatarUpload';

interface ProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: UserProfile) => void;
}

function creatorToUserProfile(creator: Creator): UserProfile {
  const avatarUrl = getCreatorAvatar(creator);
  return {
    id: String(creator.id),
    username: creator.username || '',
    name: creator.metadata?.full_name || creator.username,
    avatar: avatarUrl || PLACEHOLDER.avatar,
    bio: creator.metadata?.description || '',
  };
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const { t, language } = useLanguage();
  const auth = getAuth();
  const creator = auth?.creator ?? null;
  const apiKey = auth?.apiKey ?? '';

  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(user.username);
      setName(user.name);
      setBio(user.bio);
      setError('');
    }
  }, [isOpen, user.username, user.name, user.bio]);

  const handleAvatarSuccess = (c: Creator) => {
    setAuth(apiKey, c);
    onUpdate(creatorToUserProfile(c));
  };

  const handleSave = async () => {
    if (!apiKey) return;
    setError('');
    setSaving(true);
    try {
      const res = await updateProfile(apiKey, {
        username: username.trim(),
        full_name: name.trim() || undefined,
        description: bio.trim() || undefined,
      });
      if (res.success && res.data) {
        setAuth(apiKey, res.data);
        onUpdate(creatorToUserProfile(res.data));
        onClose();
      } else {
        setError(res.error?.message || 'Update failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-border-dark w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-border-dark flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person_edit</span>
            {t.profile.title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
            <CreatorAvatarUpload
              creator={creator}
              apiKey={apiKey}
              onSuccess={handleAvatarSuccess}
              onError={setError}
            />
            <p className="text-xs text-slate-500 text-center sm:text-left">
              {language === 'zh' ? '点击头像可上传、裁剪或移除' : 'Click avatar to upload, crop or remove'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              {t.profile.usernameLabel}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-theme-text"
              placeholder="3-100 chars"
              minLength={3}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              {t.profile.nameLabel}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-theme-text"
              placeholder={t.profile.namePlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              {t.profile.bioLabel}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-4 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-theme-text resize-none h-40 text-sm placeholder:opacity-30"
              placeholder={t.profile.bioPlaceholder}
            />
            <p className="mt-2 text-[10px] text-slate-500 italic">
              * {t.profile.bioPlaceholder.split('...')[1]}
            </p>
          </div>
        </div>

        <div className="p-6 bg-black/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors"
          >
            {t.friends.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="px-10 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            {saving ? (language === 'zh' ? '保存中...' : 'Saving...') : t.chat.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
