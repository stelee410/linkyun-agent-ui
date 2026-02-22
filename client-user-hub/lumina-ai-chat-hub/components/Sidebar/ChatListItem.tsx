
import React from 'react';
import { getAgentAvatarUrlForFilename } from '../../services/api';

export interface SidebarChatEntry {
  key: string;
  name: string;
  avatar?: string;
  isGroup: boolean;
  participantAvatars?: string[];
  agentType?: string;
  agentOnline?: boolean;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt?: string;
  messageCount: number;
}

interface ChatListItemProps {
  chat: SidebarChatEntry;
  isActive: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isActive, onClick }) => {
  const timeStr = chat.lastMessageAt
    ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      onClick={onClick}
      className={`px-4 py-4 flex items-center gap-3 cursor-pointer border-l-4 transition-all hover:bg-surface-dark/50 ${isActive ? 'bg-primary/10 border-primary' : 'border-transparent'}`}
    >
      {chat.isGroup ? (
        <div className="relative size-12 rounded-xl bg-surface-dark flex items-center justify-center border border-border-dark overflow-hidden shrink-0">
          {chat.participantAvatars && chat.participantAvatars.length >= 2 ? (
            <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
              {chat.participantAvatars.slice(0, 4).map((av, i) => (
                <img key={i} src={av} alt="" className="w-full h-full object-cover rounded-sm" />
              ))}
            </div>
          ) : chat.participantAvatars && chat.participantAvatars.length === 1 ? (
            <img src={chat.participantAvatars[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-primary text-xl">forum</span>
          )}
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-[8px] text-black font-bold px-1 rounded-full leading-tight">
            {chat.participantAvatars && chat.participantAvatars.length <= 1 ? 'Topic' : 'Group'}
          </span>
        </div>
      ) : (
        <div className="relative size-12 rounded-xl bg-surface-dark flex items-center justify-center text-primary border border-border-dark overflow-hidden shrink-0">
          <img
            src={chat.avatar || getAgentAvatarUrlForFilename('', chat.name)}
            alt={chat.name}
            className="w-full h-full object-cover"
          />
          {chat.agentType === 'edge' && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-dark ${chat.agentOnline ? 'bg-green-500' : 'bg-slate-500'}`}
            />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline text-theme-text">
          <h3 className={`text-sm truncate ${isActive ? 'font-bold' : ''}`}>{chat.name}</h3>
          {timeStr && <span className="text-[10px] opacity-60 shrink-0 ml-2">{timeStr}</span>}
        </div>
        <p className="text-xs opacity-50 truncate mt-0.5">
          {chat.lastMessagePreview || (chat.messageCount > 0 ? '...' : '')}
        </p>
      </div>
    </div>
  );
};

export default ChatListItem;
