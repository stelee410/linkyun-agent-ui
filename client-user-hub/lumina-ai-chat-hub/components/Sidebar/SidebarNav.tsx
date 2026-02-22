
import React from 'react';
import { View } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarNavProps {
  currentView: View;
  onSetView: (view: View) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ currentView, onSetView }) => {
  const { t } = useLanguage();
  const tabs: { id: View; icon: string; label: string }[] = [
    { id: 'messages', icon: 'chat', label: t.nav.chats },
    { id: 'contacts', icon: 'group', label: t.nav.friends },
    { id: 'discovery', icon: 'explore', label: t.nav.discovery },
    { id: 'moments', icon: 'camera_outdoor', label: t.nav.feed },
  ];

  return (
    <nav className="p-2 flex gap-1 bg-surface-dark/30 border-b border-border-dark">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => onSetView(tab.id)}
          className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${currentView === tab.id ? 'bg-primary text-black font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-xl">{tab.icon}</span>
          <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default SidebarNav;
