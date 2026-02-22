import React from 'react';
import { View, ChatSession } from '../types';
import { PLACEHOLDER } from '../lib/placeholder';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  friendIds: string[];
  onSelectChat: (id: string) => void;
  onCreateChat: (aiId: string) => void;
  currentView: View;
  onSetView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chats, activeChatId, friendIds, onSelectChat, onCreateChat, currentView, onSetView }) => {
  return (
    <aside className="w-80 bg-background-dark border-r border-border-dark flex flex-col shrink-0">
      <div className="p-5 border-b border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-3xl font-bold">blur_on</span>
          <h1 className="text-lg font-bold tracking-tight text-white">Linkyun AI</h1>
        </div>
        <button 
          onClick={() => onSetView('discovery')}
          className="p-1.5 hover:bg-surface-dark rounded-lg text-primary transition-colors"
          title="Discover More"
        >
          <span className="material-symbols-outlined">person_search</span>
        </button>
      </div>

      <nav className="p-2 flex gap-1 bg-surface-dark/30 border-b border-border-dark">
        <button 
          onClick={() => onSetView('messages')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${currentView === 'messages' ? 'bg-primary text-background-dark font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-[10px] uppercase tracking-wider">Chats</span>
        </button>
        <button 
          onClick={() => onSetView('contacts')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${currentView === 'contacts' ? 'bg-primary text-background-dark font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-xl">group</span>
          <span className="text-[10px] uppercase tracking-wider">Friends</span>
        </button>
        <button 
          onClick={() => onSetView('discovery')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${currentView === 'discovery' ? 'bg-primary text-background-dark font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-xl">explore</span>
          <span className="text-[10px] uppercase tracking-wider">Discover</span>
        </button>
        <button 
          onClick={() => onSetView('moments')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${currentView === 'moments' ? 'bg-primary text-background-dark font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-xl">camera_outdoor</span>
          <span className="text-[10px] uppercase tracking-wider">Feed</span>
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active chats. Start a conversation from your Friends list!
          </div>
        ) : (
          chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`px-4 py-4 flex items-center gap-3 cursor-pointer border-l-4 transition-all hover:bg-surface-dark/50 ${activeChatId === chat.id ? 'bg-primary/10 border-primary' : 'border-transparent'}`}
            >
              <div className="size-12 rounded-xl bg-surface-dark flex items-center justify-center text-primary border border-border-dark overflow-hidden shrink-0">
                <img 
                  src={PLACEHOLDER.avatar} 
                  alt={chat.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className={`text-sm truncate ${activeChatId === chat.id ? 'text-white font-bold' : 'text-slate-200'}`}>{chat.title}</h3>
                  <span className="text-[10px] text-slate-500">{chat.lastMessageTime}</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {chat.messages[chat.messages.length - 1]?.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border-dark flex items-center gap-3">
        <div className="size-10 rounded-full border border-primary/30 overflow-hidden">
          <img src={PLACEHOLDER.avatar} alt="User" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">John Doe</p>
          <p className="text-[10px] text-green-500 flex items-center gap-1"><span className="size-1.5 bg-green-500 rounded-full"></span> Online</p>
        </div>
        <button className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">settings</span></button>
      </div>
    </aside>
  );
};

export default Sidebar;
