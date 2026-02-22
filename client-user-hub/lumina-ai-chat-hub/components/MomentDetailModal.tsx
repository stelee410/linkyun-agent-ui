import React, { useState, useEffect, useMemo } from 'react';
import { MomentPost } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getBaseUrl } from '../services/api';
import { PLACEHOLDER } from '../lib/placeholder';
import VideoEmbed from './VideoEmbed';

const YOUTUBE_URL_RE = /https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)[\w-]+/gi;
const BILIBILI_URL_RE = /https?:\/\/(www\.)?(bilibili\.com\/video\/BV[\w]+|b23\.tv\/[\w]+|player\.bilibili\.com\/player\.html[^\s]*)/gi;

function extractVideoUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const ytRe = new RegExp(YOUTUBE_URL_RE.source, 'gi');
  while ((m = ytRe.exec(text)) !== null) urls.push(m[0]);
  const biRe = new RegExp(BILIBILI_URL_RE.source, 'gi');
  while ((m = biRe.exec(text)) !== null) urls.push(m[0]);
  return urls;
}

interface MomentDetailModalProps {
  post: MomentPost | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: (id: string) => void | Promise<void>;
  onComment?: (momentId: string, content: string) => void | Promise<void>;
  userAvatar?: string;
}

const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onLike,
  onComment,
  userAvatar,
}) => {
  const { t } = useLanguage();
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', onEsc);
      return () => document.removeEventListener('keydown', onEsc);
    }
  }, [isOpen, onClose]);

  const allVideoUrls = useMemo(() => {
    if (!post) return [];
    const fromField = post.videoUrls || [];
    const fromContent = post.content ? extractVideoUrlsFromText(post.content) : [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const u of [...fromField, ...fromContent]) {
      const normalized = u.replace(/\/+$/, '').split('?')[0];
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(u);
      }
    }
    return result;
  }, [post?.videoUrls, post?.content]);

  if (!isOpen) return null;

  const handleComment = async () => {
    const v = commentInput.trim();
    if (!post || !v || sendingComment || !onComment) return;
    setSendingComment(true);
    await onComment(post.id, v);
    setCommentInput('');
    setSendingComment(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-dark border border-border-dark rounded-3xl shadow-2xl custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {post && (
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 lg:size-12 rounded-2xl overflow-hidden border border-border-dark">
                  <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-sm lg:text-base flex items-center gap-1.5">
                    {post.authorName}
                    {post.isAI && <span className="material-symbols-outlined text-primary text-[14px] fill-1">verified</span>}
                  </h3>
                  <p className="text-[9px] lg:text-[10px] opacity-50 uppercase tracking-widest">{post.timestamp}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 opacity-50 hover:opacity-100 transition-opacity rounded-full hover:bg-border-dark">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="text-sm lg:text-base opacity-90 leading-relaxed mb-4 lg:mb-6 break-words whitespace-pre-wrap">
              {post.content}
            </p>

            {post.image && !post.thumbnailUrls?.length && (
              <div className="rounded-2xl overflow-hidden mb-4 lg:mb-6 border border-border-dark">
                <img src={post.image} alt="Moment attachment" className="w-full h-auto object-cover max-h-[400px]" />
              </div>
            )}

            {post.thumbnailUrls && post.thumbnailUrls.length > 0 && (
              <div className={`mb-4 lg:mb-6 grid gap-1.5 ${
                post.thumbnailUrls.length === 1 ? 'grid-cols-1' :
                post.thumbnailUrls.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {post.thumbnailUrls.map((thumb, idx) => {
                  const fullUrl = post.imageUrls?.[idx];
                  const thumbSrc = thumb.startsWith('http') ? thumb : `${getBaseUrl()}${thumb}`;
                  const fullSrc = fullUrl ? (fullUrl.startsWith('http') ? fullUrl : `${getBaseUrl()}${fullUrl}`) : thumbSrc;
                  return (
                    <a key={idx} href={fullSrc} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden border border-border-dark block">
                      <img src={thumbSrc} alt={`图片 ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  );
                })}
              </div>
            )}

            {allVideoUrls.length > 0 && (
              <div className="mb-4 lg:mb-6 flex flex-col gap-3">
                {allVideoUrls.map((vUrl, idx) => (
                  <VideoEmbed key={idx} url={vUrl} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 lg:gap-6 pt-4 border-t border-border-dark/50">
              <button
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-1.5 lg:gap-2 transition-colors ${(post.likedByMe ?? post.likes.includes('You')) ? 'text-primary' : 'opacity-50 hover:opacity-100'}`}
              >
                <span className={`material-symbols-outlined text-xl lg:text-2xl ${(post.likedByMe ?? post.likes.includes('You')) ? 'fill-1' : ''}`}>favorite</span>
                <span className="text-xs lg:text-sm font-bold">{post.likeCount ?? post.likes.length}</span>
              </button>
              <div className="flex items-center gap-1.5 lg:gap-2 opacity-70">
                <span className="material-symbols-outlined text-xl lg:text-2xl">chat_bubble</span>
                <span className="text-xs lg:text-sm font-bold">{post.comments.length}</span>
              </div>
              <button className="flex items-center gap-1.5 lg:gap-2 opacity-50 hover:opacity-100 transition-all">
                <span className="material-symbols-outlined text-xl lg:text-2xl">share</span>
              </button>
            </div>

            {post.comments.length > 0 && (
              <div className="mt-4 lg:mt-6 bg-background-dark/30 rounded-2xl p-3 lg:p-4 flex flex-col gap-3 lg:gap-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="text-[12px] lg:text-sm leading-snug">
                    <span className="font-bold text-primary mr-2">{comment.authorName}</span>
                    <span className="opacity-90">{comment.text}</span>
                  </div>
                ))}
              </div>
            )}

            {onComment && (
              <div className="mt-4 flex items-center gap-2 lg:gap-3">
                <div className="size-8 rounded-lg overflow-hidden shrink-0 border border-border-dark">
                  <img src={userAvatar || PLACEHOLDER.avatar} alt="You" className="w-full h-full object-cover" />
                </div>
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  className="flex-1 bg-background-dark border border-border-dark rounded-xl px-4 py-2 text-xs lg:text-sm text-theme-text placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary/50 h-9"
                  placeholder={t.moments.comment}
                  disabled={!!sendingComment}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentInput.trim() || !!sendingComment}
                  className="text-primary hover:scale-110 transition-transform p-1.5 shrink-0 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined font-bold">send</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MomentDetailModal;
