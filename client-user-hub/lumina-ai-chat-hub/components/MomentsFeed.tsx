
import React, { useState } from 'react';
import { MomentPost } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PLACEHOLDER } from '../lib/placeholder';
import { getBaseUrl } from '../services/api';
import MomentDetailModal from './MomentDetailModal';

interface MomentsFeedProps {
  moments: MomentPost[];
  onAddMoment: (content: string) => void;
  onLike: (id: string) => void | Promise<void>;
  onComment?: (momentId: string, content: string) => void | Promise<void>;
  title?: string;
  onBack?: () => void;
  /** 手动刷新内容 */
  onRefresh?: () => void | Promise<void>;
  /** 隐藏发帖区域（如查看某 Agent 朋友圈时） */
  hideCreatePost?: boolean;
  /** 桌面端也显示返回按钮 */
  showBackOnDesktop?: boolean;
  /** 加载中（如按 agent 筛选时） */
  loading?: boolean;
  /** 当前用户头像（评论区显示） */
  userAvatar?: string;
}

const MomentsFeed: React.FC<MomentsFeedProps> = ({ moments, onAddMoment, onLike, onComment, title, onBack, onRefresh, hideCreatePost, showBackOnDesktop, loading, userAvatar }) => {
  const { t, language } = useLanguage();
  const [newPost, setNewPost] = useState('');
  const [selectedPost, setSelectedPost] = useState<MomentPost | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    onAddMoment(newPost);
    setNewPost('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-dark overflow-y-auto custom-scrollbar p-4 lg:p-10 text-theme-text">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 lg:gap-10">
        <header className="mb-2 lg:mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {onBack && (
              <button onClick={onBack} className={`p-2 -ml-2 hover:bg-surface-dark rounded-full transition-colors shrink-0 ${showBackOnDesktop ? '' : 'lg:hidden'}`}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight mb-1 lg:mb-2 truncate">{title || t.moments.title}</h2>
              <p className="text-secondary italic font-medium text-xs lg:text-base">{t.moments.subtitle}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 hover:bg-surface-dark rounded-full transition-colors shrink-0 disabled:opacity-50"
              title={t.moments.refresh}
            >
              <span className={`material-symbols-outlined ${refreshing || loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          )}
        </header>

        {/* Create Post */}
        {!hideCreatePost && (
        <div className="bg-surface-dark border border-border-dark rounded-3xl p-4 lg:p-6 shadow-xl">
          <div className="flex gap-3 lg:gap-4">
            <div className="size-10 lg:size-12 rounded-2xl overflow-hidden shrink-0 border border-border-dark">
              <img src={PLACEHOLDER.avatar} alt="You" />
            </div>
            <textarea 
              className="flex-1 bg-transparent border-none focus:ring-0 py-1 lg:py-2 resize-none h-20 lg:h-24 placeholder:opacity-30 text-base lg:text-lg custom-scrollbar"
              placeholder={t.moments.placeholder}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-dark">
            <div className="flex gap-1 lg:gap-2">
              <button className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 rounded-xl hover:bg-border-dark opacity-50 hover:opacity-100 transition-all">
                <span className="material-symbols-outlined text-xl">image</span>
                <span className="text-xs lg:text-sm font-medium hidden sm:inline">{t.moments.photo}</span>
              </button>
              <button className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 rounded-xl hover:bg-border-dark opacity-50 hover:opacity-100 transition-all">
                <span className="material-symbols-outlined text-xl">mood</span>
                <span className="text-xs lg:text-sm font-medium hidden sm:inline">{t.moments.feeling}</span>
              </button>
            </div>
            <button 
              onClick={handlePost}
              disabled={!newPost.trim()}
              className="px-6 lg:px-8 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-30 transition-all text-sm"
            >
              {t.moments.post}
            </button>
          </div>
        </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="p-10 lg:p-12 text-center opacity-60 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <span className="text-sm lg:text-base">{t.common?.loading ?? (language === 'zh' ? '加载中...' : 'Loading...')}</span>
          </div>
        ) : moments.length === 0 ? (
          <div className="p-10 lg:p-12 text-center opacity-40 border border-dashed border-border-dark rounded-3xl text-sm lg:text-base">
            {t.moments.noMoments}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-2">
            {moments.map((post) => {
              const thumbSrc = post.thumbnailUrls?.[0]
                ? (post.thumbnailUrls[0].startsWith('http') ? post.thumbnailUrls[0] : `${getBaseUrl()}${post.thumbnailUrls[0]}`)
                : post.image
                  ? post.image
                  : null;
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square rounded-none sm:rounded-lg overflow-hidden border border-border-dark/50 hover:border-primary/50 transition-all group relative bg-surface-dark"
                >
                  {thumbSrc ? (
                    <img src={thumbSrc} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-dark to-background-dark p-3">
                      <p className="text-base sm:text-lg font-medium leading-snug text-theme-text line-clamp-4 text-left w-full overflow-hidden">
                        {post.content}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1.5 text-white drop-shadow">
                      <span className="material-symbols-outlined text-lg">favorite</span>
                      <span className="text-xs font-bold">{post.likeCount ?? post.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white drop-shadow">
                      <span className="material-symbols-outlined text-lg">chat_bubble</span>
                      <span className="text-xs font-bold">{post.comments.length}</span>
                    </div>
                  </div>
                  <div className="absolute top-1.5 left-1.5 size-6 sm:size-7 rounded-full overflow-hidden border border-slate-500/40 shadow-sm shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                  </div>
                </button>
              );
            })}
          </div>
          <MomentDetailModal
            post={selectedPost}
            isOpen={!!selectedPost}
            onClose={() => setSelectedPost(null)}
            onLike={onLike}
            onComment={onComment}
            userAvatar={userAvatar}
          />
          </>
        )}
      </div>
    </div>
  );
};

export default MomentsFeed;
