
import React, { useState } from 'react';
import { View, UserProfile } from '../../types';
import SidebarNav from './SidebarNav';
import ChatListItem, { type SidebarChatEntry } from './ChatListItem';
import ThemeCustomizer from '../Theme/ThemeCustomizer';
import ProfileModal from '../Profile/ProfileModal';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  chats: SidebarChatEntry[];
  activeChatId: string | null;
  friendIds: string[];
  user: UserProfile;
  onSelectChat: (id: string) => void;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  currentView: View;
  onSetView: (view: View) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ chats, activeChatId, friendIds, user, onSelectChat, onUpdateUser, onLogout, currentView, onSetView, className = '' }) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  return (
    <aside className={`${className} bg-background-dark border-r border-border-dark flex flex-col shrink-0 text-theme-text transition-all`}>
      <div className="p-5 border-b border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-3xl font-bold">blur_on</span>
          <h1 className="text-lg font-bold tracking-tight">Linkyun AI</h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="p-1.5 hover:bg-surface-dark rounded-lg text-xs font-bold text-slate-400 transition-colors uppercase"
          >
            {language === 'en' ? '中' : 'EN'}
          </button>
          <button 
            onClick={() => onSetView('discovery')}
            className="p-1.5 hover:bg-surface-dark rounded-lg text-primary transition-colors"
            title="Discover More"
          >
            <span className="material-symbols-outlined">person_search</span>
          </button>
        </div>
      </div>

      <SidebarNav currentView={currentView} onSetView={onSetView} />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {t.common.noChats}
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListItem 
              key={chat.key} 
              chat={chat} 
              isActive={activeChatId === chat.key} 
              onClick={() => onSelectChat(chat.key)} 
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-border-dark flex items-center gap-3">
        <button 
          onClick={() => setIsProfileOpen(true)}
          className="size-10 rounded-full border border-primary/30 overflow-hidden shrink-0 hover:border-primary transition-all group relative"
        >
          <img src={user.avatar} alt="User" />
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{user.name}</p>
          <p className="text-[10px] text-green-500 flex items-center gap-1"><span className="size-1.5 bg-green-500 rounded-full"></span> {t.common.online}</p>
        </div>
        <button 
          onClick={() => setIsThemeOpen(true)}
          className="text-slate-400 hover:text-primary transition-colors"
          title="Theme"
        >
          <span className="material-symbols-outlined">palette</span>
        </button>
        <button 
          onClick={onLogout}
          className="text-slate-400 hover:text-red-400 transition-colors"
          title={t.common.signOut}
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <ThemeCustomizer isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
      <ProfileModal 
        user={user} 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        onUpdate={onUpdateUser} 
      />
    </aside>
  );
};

export default Sidebar;
