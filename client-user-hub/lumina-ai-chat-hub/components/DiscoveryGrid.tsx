import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { listPublishedAgents, getAgentAvatarUrl } from '../services/api';
import type { DiscoverAgent } from '../services/api';

type SortMode = 'time_desc' | 'time_asc' | 'name_asc' | 'name_desc';

interface DiscoveryGridProps {
  apiKey: string;
  friendIds: string[];
  onAddFriend: (aiId: string) => void;
  onRemoveFriend: (aiId: string) => void;
  onChatWith: (aiId: string) => void;
  onViewMoments: (aiId: string, agentName?: string) => void;
  onBack?: () => void;
}

/** Edge 模式：展示真实 online/offline；非 Edge：始终在线 */
function isOnline(agent: DiscoverAgent): boolean {
  if (agent.agent_type === 'edge') {
    return agent.edge_status === 'online';
  }
  return true;
}

const DiscoveryGrid: React.FC<DiscoveryGridProps> = ({ apiKey, friendIds, onAddFriend, onRemoveFriend, onChatWith, onViewMoments, onBack }) => {
  const { language, setLanguage, t } = useLanguage();
  const [agents, setAgents] = useState<DiscoverAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('time_desc');

  const filteredAndSortedAgents = useMemo(() => {
    let list = agents;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.code || '').toLowerCase().includes(q)
      );
    }
    list = [...list];
    if (sortMode === 'name_asc' || sortMode === 'name_desc') {
      const dir = sortMode === 'name_desc' ? -1 : 1;
      list.sort((a, b) => dir * (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else {
      const dir = sortMode === 'time_asc' ? -1 : 1;
      list.sort((a, b) => {
        const ta = a.updated_at || a.created_at || '';
        const tb = b.updated_at || b.created_at || '';
        return dir * tb.localeCompare(ta);
      });
    }
    return list;
  }, [agents, searchQuery, sortMode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPublishedAgents(apiKey).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data?.agents) {
        setAgents(res.data.agents);
      } else {
        setError(res.error?.message ?? 'Failed to load agents');
        setAgents([]);
      }
    }).catch((err) => {
      if (cancelled) return;
      setLoading(false);
      setError(err?.message ?? 'Network error');
      setAgents([]);
    });
    return () => { cancelled = true; };
  }, [apiKey]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background-dark overflow-y-auto custom-scrollbar text-theme-text">
      <header className="p-6 lg:p-10 border-b border-border-dark flex flex-col gap-4 sticky top-0 bg-background-dark/95 backdrop-blur-md z-20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="lg:hidden p-2 -ml-2 hover:bg-surface-dark rounded-full transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div className="flex flex-col gap-1 lg:gap-2">
              <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight">{t.discovery.title}</h2>
              <p className="text-secondary font-medium text-xs lg:text-base">{t.discovery.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="lg:hidden p-2 bg-surface-dark border border-border-dark rounded-xl text-xs font-bold text-primary hover:bg-border-dark transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">language</span>
            {language === 'en' ? '中' : 'EN'}
          </button>
        </div>
        {!loading && !error && agents.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.discovery.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-sm text-theme-text placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 text-xs font-medium hidden sm:inline">{language === 'zh' ? '排序' : 'Sort'}:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="px-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 appearance-none cursor-pointer pr-9"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="time_desc">{t.discovery.sortByTimeDesc}</option>
                <option value="time_asc">{t.discovery.sortByTimeAsc}</option>
                <option value="name_asc">{t.discovery.sortByNameAsc}</option>
                <option value="name_desc">{t.discovery.sortByNameDesc}</option>
              </select>
            </div>
          </div>
        )}
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center p-12">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && agents.length > 0 && filteredAndSortedAgents.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-secondary">
          <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
          <p className="text-sm">{language === 'zh' ? '未找到匹配的 Agent' : 'No matching agents found'}</p>
        </div>
      )}

      {!loading && !error && filteredAndSortedAgents.length > 0 && (
        <div className="p-4 lg:p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
          {filteredAndSortedAgents.map((agent) => {
            const aiId = String(agent.id);
            const isFriend = friendIds.includes(aiId);
            const online = isOnline(agent);
            const isEdge = agent.agent_type === 'edge';
            return (
              <div 
                key={agent.id}
                className="group relative flex flex-col bg-surface-dark rounded-2xl overflow-hidden border-2 transition-all duration-300 border-transparent hover:border-primary/50 shadow-lg"
              >
                <div className="h-40 lg:h-44 overflow-hidden relative">
                  <img 
                    src={getAgentAvatarUrl(agent)} 
                    alt={agent.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] lg:text-[9px] font-bold uppercase tracking-widest ${online ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-slate-500/20 text-slate-500 border border-slate-500/30'}`}>
                      {online ? t.discovery.online : t.discovery.offline}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 lg:p-4 bg-gradient-to-t from-background-dark to-transparent pt-14">
                    {isEdge ? (
                      <span className="bg-amber-500/20 text-amber-400 text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-bold border border-amber-500/20 mr-1.5">
                        {t.discovery.edgeMode}
                      </span>
                    ) : (
                      <span className="bg-primary/20 text-primary text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-bold border border-primary/20">
                        {t.discovery.cloudMode}
                      </span>
                    )}
                    <h3 className="text-base lg:text-lg font-bold text-white mt-1 truncate">{agent.name}</h3>
                    <p className="text-[9px] lg:text-[10px] text-primary/80 font-medium truncate">{agent.description || agent.code}</p>
                  </div>
                </div>
                
                <div className="p-3 lg:p-4 flex flex-col flex-1">
                  <p className="text-[11px] lg:text-xs opacity-70 leading-relaxed mb-2 lg:mb-3 line-clamp-2 lg:line-clamp-3">
                    {agent.description || agent.name}
                  </p>
                  
                  <div className="mt-auto space-y-1.5 lg:space-y-2">
                    {isFriend ? (
                      <button 
                        onClick={() => onChatWith(aiId)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 lg:py-2.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-bold text-xs hover:bg-primary hover:text-white hover:border-primary transition-all group"
                      >
                        <span className="material-symbols-outlined text-base group-hover:hidden">check_circle</span>
                        <span className="material-symbols-outlined text-base hidden group-hover:inline">chat</span>
                        <span className="group-hover:hidden">{t.discovery.added}</span>
                        <span className="hidden group-hover:inline">{t.friends.chatWith}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => onAddFriend(aiId)}
                        className="w-full py-2 lg:py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <span className="material-symbols-outlined text-base">person_add</span>
                        {t.discovery.addFriend}
                      </button>
                    )}
                    <button 
                      onClick={() => onViewMoments(aiId, agent.name)}
                      className="w-full py-2 lg:py-2.5 bg-background-dark/30 border border-border-dark opacity-70 font-bold rounded-xl hover:opacity-100 transition-all text-[11px] lg:text-xs flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">camera_outdoor</span>
                      {t.discovery.viewMoments}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-secondary">
          <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
          <p>{language === 'zh' ? '暂无已发布的 Agent，请在控制台创建并发布' : 'No published agents yet. Create and publish in the dashboard.'}</p>
        </div>
      )}
    </div>
  );
};

export default DiscoveryGrid;
