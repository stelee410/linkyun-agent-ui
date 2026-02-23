
import React, { useState, useEffect, useCallback } from 'react';
import { View, Message, MomentPost, UserProfile, getViewFromPath, VIEW_PATHS } from './types';
import { AI_HUMANS } from './constants';
import Sidebar from './components/Sidebar/Sidebar';
import type { SidebarChatEntry } from './components/Sidebar/ChatListItem';
import ChatWindow from './components/ChatWindow';
import DiscoveryGrid from './components/DiscoveryGrid';
import MomentsFeed from './components/MomentsFeed';
import AuthScreen from './components/AuthScreen';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { getAuth, setAuth, clearAuth } from './lib/auth';
import type { Creator, DiscoverAgent, UserChatSession, ChatMessage, GroupChatSession } from './services/api';
import { getCreatorAvatar, getProfile } from './services/api';
import {
  addFriendApi,
  removeFriendApi,
  listFriends,
  listUserChats,
  createUserChat,
  getUserChatMessages,
  sendUserMessage,
  toggleShareWithCreator,
  toggleGroupShare,
  clearUserChatMessages,
  deleteUserChat,
  deleteChatMemories,
  updateChatTitle,
  getAgentAvatarUrl,
  getAgentAvatarUrlForFilename,
  listGroupChats,
  createGroupChat as createGroupChatApi,
  sendGroupMessage,
  getGroupChatMessages,
  deleteGroupChat as deleteGroupChatApi,
  updateGroupChat as updateGroupChatApi,
  resolvePendingAttachments,
  listMoments,
  likeMoment,
  unlikeMoment,
  addMomentComment,
  getBaseUrl,
} from './services/api';
import type { APIMoment } from './services/api';
import type { ChatMessage as APIChatMessage } from './services/api';
import { PLACEHOLDER } from './lib/placeholder';
import { isChromeMobile } from './lib/chromeMobile';

function creatorToUserProfile(creator: Creator | null | undefined): UserProfile | null {
  if (!creator || creator.id == null) return null;
  const avatarUrl = getCreatorAvatar(creator);
  return {
    id: String(creator.id),
    username: creator.username || '',
    name: creator.metadata?.full_name || creator.username,
    avatar: avatarUrl || PLACEHOLDER.avatar,
    bio: creator.metadata?.description || '',
  };
}

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>('auth');
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  /** 切换视图并同步 URL（支持直接通过路径访问） */
  const navigateToView = useCallback((v: View) => {
    setView(v);
    if (v !== 'auth') {
      const path = VIEW_PATHS[v];
      if (path && window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (currentUser) {
        const v = getViewFromPath(window.location.pathname);
        setView(v);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser]);

  const loadFriends = async (apiKey: string) => {
    const res = await listFriends(apiKey);
    if (res.success && res.data?.friends) {
      setFriendIds(res.data.friends.map((a) => String(a.id)));
      setFriendAgents(res.data.friends);
    }
  };

  const loadUserChats = async (apiKey: string) => {
    const [res, gRes] = await Promise.all([
      listUserChats(apiKey),
      listGroupChats(apiKey),
    ]);
    if (res.success && res.data?.chats) {
      setChats(res.data.chats);
    }
    if (gRes.success && gRes.data?.chats) {
      setGroupChats(gRes.data.chats);
    }
  };

  const mapAPIMomentToPost = (m: APIMoment): MomentPost => ({
    id: String(m.id),
    authorId: String(m.agent_id),
    authorName: m.agent_name,
    authorAvatar: m.agent_avatar
      ? (m.agent_avatar.startsWith('http') ? m.agent_avatar : `${getBaseUrl()}/api/v1/avatars/${m.agent_avatar}`)
      : PLACEHOLDER.avatar,
    isAI: true,
    content: m.content,
    imageUrls: m.image_urls || [],
    thumbnailUrls: m.thumbnail_urls || [],
    videoUrls: m.video_urls || [],
    timestamp: new Date(m.created_at).toLocaleString(),
    likes: [],
    likeCount: m.like_count ?? 0,
    likedByMe: m.liked_by_me ?? false,
    comments: (m.comments || []).map((c) => ({
      id: String(c.id),
      authorName: c.creator_name || `User${c.creator_id}`,
      text: c.content,
    })),
  });

  const loadMomentsFromAPI = async (apiKey: string) => {
    const res = await listMoments(apiKey, 50);
    if (res.success && res.data?.moments) {
      setMoments(res.data.moments.map(mapAPIMomentToPost));
    }
  };

  const loadAgentMomentsFromAPI = async (apiKey: string, agentId: number) => {
    setLoadingAgentMoments(true);
    try {
      const res = await listMoments(apiKey, 50, 0, agentId);
      if (res.success && res.data?.moments) {
        setAgentMoments(res.data.moments.map(mapAPIMomentToPost));
      } else {
        setAgentMoments([]);
      }
    } finally {
      setLoadingAgentMoments(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      const applyCreator = (creator: Creator) => {
        const profile = creatorToUserProfile(creator);
        if (profile) {
          setCurrentUser(profile);
          const v = getViewFromPath(window.location.pathname);
          setView(v);
          const path = VIEW_PATHS[v];
          if (path) window.history.replaceState(null, '', path);
          loadFriends(auth!.apiKey);
          loadUserChats(auth!.apiKey);
          loadMomentsFromAPI(auth!.apiKey);
        } else {
          clearAuth();
        }
      };
      applyCreator(auth.creator);
      getProfile(auth.apiKey).then((res) => {
        if (res.success && res.data) {
          setAuth(auth.apiKey, res.data);
          applyCreator(res.data);
        }
      });
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (auth: { apiKey: string; creator: Creator }) => {
    const profile = creatorToUserProfile(auth.creator);
    if (profile) {
      setCurrentUser(profile);
      const v = getViewFromPath(window.location.pathname);
      setView(v);
      const path = VIEW_PATHS[v];
      if (path) window.history.replaceState(null, '', path);
      loadFriends(auth.apiKey);
      loadUserChats(auth.apiKey);
      loadMomentsFromAPI(auth.apiKey);
    }
  };

  const [chats, setChats] = useState<UserChatSession[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChatSession[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingChatKey, setSendingChatKey] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);
  const [deleteMemoryLoading, setDeleteMemoryLoading] = useState(false);
  const [deleteChatLoading, setDeleteChatLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendAgents, setFriendAgents] = useState<DiscoverAgent[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null); // string of chat id
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [momentsFilter, setMomentsFilter] = useState<string | null>(null);
  const [momentsFilterAgentName, setMomentsFilterAgentName] = useState<string | null>(null);
  const [agentMoments, setAgentMoments] = useState<MomentPost[]>([]);
  const [loadingAgentMoments, setLoadingAgentMoments] = useState(false);

  const [isSelectingForTopic, setIsSelectingForTopic] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [showTopicPrompt, setShowTopicPrompt] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [groupPolling, setGroupPolling] = useState<string | null>(null);
  
  // Mobile UI State
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  const activeChat = chats.find((c) => String(c.id) === activeChatId) || null;
  const activeGroupChat = groupChats.find((c) => `group-${c.id}` === activeChatId) || null;

  const sidebarChats: SidebarChatEntry[] = React.useMemo(() => {
    const items: SidebarChatEntry[] = [];
    for (const c of chats) {
      items.push({
        key: String(c.id),
        name: c.agent_name,
        avatar: getAgentAvatarUrlForFilename(c.agent_avatar, c.agent_name),
        isGroup: false,
        agentType: c.agent_type,
        agentOnline: c.agent_online,
        lastMessagePreview: c.last_message_preview,
        lastMessageAt: c.last_message_at,
        createdAt: c.created_at,
        messageCount: c.message_count,
      });
    }
    for (const gc of groupChats) {
      const avatars = gc.participants?.map((p) =>
        p.agent_avatar ? getAgentAvatarUrlForFilename(p.agent_avatar, p.agent_name) : getAgentAvatarUrlForFilename('', p.agent_name)
      ) || [];
      items.push({
        key: `group-${gc.id}`,
        name: gc.title || gc.topic || gc.participants?.map((p) => p.agent_name).join(', ') || 'Group Chat',
        isGroup: true,
        participantAvatars: avatars,
        lastMessagePreview: gc.last_message_preview,
        lastMessageAt: gc.last_message_at,
        createdAt: gc.created_at,
        messageCount: gc.message_count,
      });
    }
    // 1v1 和 group 按最后活动时间排序；解析失败的时间视为 0，排到最下面
    const safeTs = (s: string | undefined) => {
      if (!s) return 0;
      const t = new Date(s).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const sortTs = (entry: SidebarChatEntry) => {
      const t = entry.lastMessageAt ? safeTs(entry.lastMessageAt) : safeTs(entry.createdAt);
      return t; // safeTs 对无效字符串返回 0，会排到最下
    };
    items.sort((a, b) => {
      const ta = sortTs(a);
      const tb = sortTs(b);
      if (tb !== ta) return tb - ta;
      return safeTs(b.createdAt) - safeTs(a.createdAt);
    });
    return items;
  }, [chats, groupChats]);

  // Handle mobile view transitions
  useEffect(() => {
    if (activeChatId || view !== 'messages') {
      setShowSidebarOnMobile(false);
    } else {
      setShowSidebarOnMobile(true);
    }
  }, [activeChatId, view]);

  // Load agent's moments when viewing a specific agent's feed
  useEffect(() => {
    const auth = getAuth();
    if (auth && momentsFilter && view === 'moments') {
      const agentId = parseInt(momentsFilter, 10);
      if (!Number.isNaN(agentId)) {
        loadAgentMomentsFromAPI(auth.apiKey, agentId);
      }
    }
  }, [momentsFilter, view]);

  // Refresh chat list every 30 seconds so latest chats appear at top
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const auth = getAuth();
      if (auth) loadUserChats(auth.apiKey);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Polling for async group chat replies
  useEffect(() => {
    if (!groupPolling) return;
    const auth = getAuth();
    if (!auth) { setGroupPolling(null); return; }
    const chatKey = groupPolling;
    const gId = Number(chatKey.replace('group-', ''));
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 90; // ~3 min at 2s intervals

    const poll = async () => {
      if (cancelled) return;
      const existing = chatMessages[chatKey] || [];
      const lastId = existing.length > 0 ? Math.max(...existing.filter(m => m.id > 0).map(m => m.id), 0) : 0;
      const res = await getGroupChatMessages(auth.apiKey, gId, 50, lastId > 0 ? lastId : undefined);
      if (cancelled) return;
      if (res.success && res.data) {
        const newMsgs = res.data.messages;
        if (newMsgs.length > 0) {
          const latest = newMsgs.reduce((a, b) =>
            new Date(b.created_at || 0).getTime() > new Date(a.created_at || 0).getTime() ? b : a
          );
          setChatMessages((prev) => {
            const curr = prev[chatKey] || [];
            const existingIds = new Set(curr.filter(m => m.id > 0).map(m => m.id));
            const unique = newMsgs.filter(m => !existingIds.has(m.id));
            if (unique.length === 0) return prev;
            const withoutOptimistic = curr.filter(m => !String(m.uuid || '').startsWith('temp-'));
            return { ...prev, [chatKey]: [...withoutOptimistic, ...unique] };
          });
          setGroupChats((prev) =>
            prev.map((c) =>
              c.id === gId
                ? {
                    ...c,
                    last_message_at: latest.created_at,
                    last_message_preview: (latest.content || '').slice(0, 50) + ((latest.content?.length || 0) > 50 ? '…' : ''),
                  }
                : c
            )
          );
        }
        if (!res.data.processing) {
          setGroupPolling(null);
          setSendingMessage(false);
          return;
        }
      }
      attempts++;
      if (attempts >= maxAttempts) {
        setGroupPolling(null);
        setSendingMessage(false);
        setSendError('Group chat response timed out');
        return;
      }
      if (!cancelled) setTimeout(poll, 2000);
    };

    const timer = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [groupPolling]);

  const addFriend = async (aiId: string) => {
    if (friendIds.includes(aiId)) return;
    const auth = getAuth();
    if (!auth) return;
    const res = await addFriendApi(auth.apiKey, Number(aiId));
    if (res.success) {
      setFriendIds(prev => [...prev, aiId]);
      await loadFriends(auth.apiKey);
    }
  };

  const removeFriend = async (aiId: string) => {
    const auth = getAuth();
    if (!auth) return;
    const res = await removeFriendApi(auth.apiKey, Number(aiId));
    if (res.success) {
      setFriendIds(prev => prev.filter(id => id !== aiId));
      setFriendAgents(prev => prev.filter(a => String(a.id) !== aiId));
    }
  };

  const findFriendAgent = (aiId: string): DiscoverAgent | undefined =>
    friendAgents.find((a) => String(a.id) === aiId);

  const loadChatMessages = useCallback(
    async (chatKey: string) => {
      const auth = getAuth();
      if (!auth || chatMessages[chatKey]) return;
      setLoadingChat(true);
      let res;
      if (chatKey.startsWith('group-')) {
        const gId = Number(chatKey.replace('group-', ''));
        res = await getGroupChatMessages(auth.apiKey, gId);
      } else {
        res = await getUserChatMessages(auth.apiKey, Number(chatKey));
      }
      setLoadingChat(false);
      if (res.success && res.data?.messages) {
        setChatMessages((prev) => ({ ...prev, [chatKey]: res.data!.messages }));
      }
    },
    [chatMessages]
  );

  const createChat = async (aiId: string) => {
    const auth = getAuth();
    if (!auth) return;
    setLoadingChat(true);
    const res = await createUserChat(auth.apiKey, Number(aiId));
    setLoadingChat(false);
    if (!res.success || !res.data) return;
    const chat = res.data;
    setChats((prev) => {
      const exists = prev.some((c) => c.id === chat.id);
      if (exists) return prev;
      return [chat, ...prev];
    });
    setActiveChatId(String(chat.id));
    navigateToView('messages');
    loadChatMessages(String(chat.id));
  };

  const createGroupChat = async (aiIds: string[], topic?: string) => {
    if (aiIds.length < 1) return;
    const auth = getAuth();
    if (!auth) return;
    setLoadingChat(true);
    const trimmedTopic = topic?.trim() || undefined;
    const res = await createGroupChatApi(auth.apiKey, aiIds.map(Number), trimmedTopic, trimmedTopic);
    setLoadingChat(false);
    if (!res.success || !res.data) return;
    const gc = res.data;
    setGroupChats((prev) => {
      const exists = prev.some((c) => c.id === gc.id);
      if (exists) return prev;
      return [gc, ...prev];
    });
    setActiveChatId(`group-${gc.id}`);
    navigateToView('messages');
  };

  const updateGroupSettings = async (chatId: string, aiIds: string[], newTitle?: string) => {
    const auth = getAuth();
    if (!auth) return;
    if (chatId.startsWith('group-')) {
      const gId = Number(chatId.replace('group-', ''));
      // Update title/topic
      if (newTitle !== undefined) {
        const res = await updateGroupChatApi(auth.apiKey, gId, { title: newTitle });
        if (res.success && res.data) {
          setGroupChats((prev) => prev.map((c) => (c.id === gId ? { ...c, ...res.data } : c)));
        }
      }
      // Update participants if changed. Group chat stays as group even with 1 participant (isolated from 1v1).
      if (aiIds.length >= 1) {
        const { updateGroupParticipants } = await import('./services/api');
        const agentIds = aiIds.map((id) =>
          typeof id === 'string' && id.startsWith('agent-') ? parseInt(id.slice(6), 10) : Number(id)
        ).filter((n) => !isNaN(n));
        const res = await updateGroupParticipants(auth.apiKey, gId, agentIds);
        if (res.success && res.data) {
          setGroupChats((prev) => prev.map((c) => (c.id === gId ? { ...c, participants: res.data!.participants } : c)));
        }
      }
    } else {
      // 1v1 chat: 仅当添加了新参与者（>=2 人）时，创建全新的 group chat，与当前 1v1 隔开
      // 当前 1v1 保持不变，不就地升级；新群聊为独立 session
      if (aiIds.length >= 2) {
        setLoadingChat(true);
        const titleForGroup = newTitle?.trim() || activeChat?.title?.trim() || undefined;
        const agentIds = aiIds.map((id) =>
          typeof id === 'string' && id.startsWith('agent-') ? parseInt(id.slice(6), 10) : Number(id)
        ).filter((n) => !isNaN(n));
        const res = await createGroupChatApi(auth.apiKey, agentIds, titleForGroup, titleForGroup);
        setLoadingChat(false);
        if (res.success && res.data) {
          const gc = res.data;
          setGroupChats((prev) => {
            const exists = prev.some((c) => c.id === gc.id);
            if (exists) return prev;
            return [gc, ...prev];
          });
          const groupKey = `group-${gc.id}`;
          setActiveChatId(groupKey);
          navigateToView('messages');
          loadChatMessages(groupKey);
        }
        return;
      }
      // 仅改标题或未添加参与者：只更新 1v1 标题
      if (newTitle !== undefined) {
        const res = await updateChatTitle(auth.apiKey, Number(chatId), newTitle);
        if (res.success && res.data) {
          setChats((prev) =>
            prev.map((c) => (c.id === res.data!.id ? { ...c, agent_name: res.data!.agent_name, title: res.data!.title } : c))
          );
        }
      }
    }
  };

  const handleDeleteChat = async (chatKey: string): Promise<boolean> => {
    const auth = getAuth();
    if (!auth) return false;
    setDeleteChatLoading(true);
    let success = false;
    if (chatKey.startsWith('group-')) {
      const gId = Number(chatKey.replace('group-', ''));
      const res = await deleteGroupChatApi(auth.apiKey, gId);
      if (res.success) {
        setGroupChats((prev) => prev.filter((c) => c.id !== gId));
        success = true;
      }
    } else {
      const chatId = Number(chatKey);
      const res = await deleteUserChat(auth.apiKey, chatId);
      if (res.success) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        success = true;
      }
    }
    setDeleteChatLoading(false);
    if (success) {
      setChatMessages((prev) => {
        const next = { ...prev };
        delete next[chatKey];
        return next;
      });
      if (activeChatId === chatKey) {
        setActiveChatId(null);
        navigateToView('messages');
      }
      return true;
    }
    return false;
  };

  const handleClearHistory = async (chatKey: string): Promise<boolean> => {
    const auth = getAuth();
    if (!auth) return false;
    if (chatKey.startsWith('group-')) return false;
    setClearHistoryLoading(true);
    const res = await clearUserChatMessages(auth.apiKey, Number(chatKey));
    setClearHistoryLoading(false);
    if (res.success) {
      setChatMessages((prev) => ({ ...prev, [chatKey]: [] }));
      return true;
    }
    return false;
  };

  const handleDeleteMemory = async (chatKey: string): Promise<boolean> => {
    const auth = getAuth();
    if (!auth) return false;
    if (chatKey.startsWith('group-')) return false;
    setDeleteMemoryLoading(true);
    const res = await deleteChatMemories(auth.apiKey, Number(chatKey));
    setDeleteMemoryLoading(false);
    if (res.success) return true;
    return false;
  };

  const handleToggleShare = async (chatKey: string, shared: boolean) => {
    const auth = getAuth();
    if (!auth) return;
    setShareLoading(true);
    if (chatKey.startsWith('group-')) {
      const gId = Number(chatKey.replace('group-', ''));
      const res = await toggleGroupShare(auth.apiKey, gId, shared);
      setShareLoading(false);
      if (res.success) {
        setGroupChats((prev) => prev.map((c) => (c.id === gId ? { ...c, shared_with_creator: shared } : c)));
      }
    } else {
      const chatId = Number(chatKey);
      const res = await toggleShareWithCreator(auth.apiKey, chatId, shared);
      setShareLoading(false);
      if (res.success) {
        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, shared_with_creator: shared } : c)));
      }
    }
  };

  const sendMessage = async (chatKey: string, text: string, targetAgentIds?: number[], pendingAttachments?: import('./services/api').PendingAttachment[]) => {
    if (!currentUser) return;
    const auth = getAuth();
    if (!auth) return;
    const isGroup = chatKey.startsWith('group-');

    let attachments: { type: string; token?: string; download_url?: string; preview_url?: string; name?: string; size?: number }[] = [];
    if (pendingAttachments?.length) {
      attachments = await resolvePendingAttachments(auth.apiKey, pendingAttachments);
    }

    const nowIso = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: 0,
      uuid: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      content_type: 'text',
      attachments: attachments.length > 0 ? attachments.map((a) => ({ type: a.type, token: a.token, url: a.download_url })) : undefined,
      created_at: nowIso,
    };
    setChatMessages((prev) => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), userMsg],
    }));

    // 乐观更新 last_message_at，使侧边栏立即按最新活动重排
    const preview = text.length > 40 ? text.slice(0, 40) + '…' : text;
    if (isGroup) {
      const gId = Number(chatKey.replace('group-', ''));
      setGroupChats((prev) =>
        prev.map((c) =>
          c.id === gId ? { ...c, last_message_at: nowIso, last_message_preview: preview } : c
        )
      );
    } else {
      const chatId = Number(chatKey);
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, last_message_at: nowIso, last_message_preview: preview } : c
        )
      );
    }

    setSendingMessage(true);
    setSendingChatKey(chatKey);
    setSendError(null);
    try {
      const attachForApi = attachments.length > 0 ? attachments.map((a) => ({ type: a.type, token: a.token })) : undefined;
      if (isGroup) {
        const gId = Number(chatKey.replace('group-', ''));
        const res = await sendGroupMessage(auth.apiKey, gId, text, targetAgentIds, attachForApi);
        if (res.success) {
          setGroupPolling(chatKey);
        } else {
          setChatMessages((prev) => ({
            ...prev,
            [chatKey]: (prev[chatKey] || []).filter((m) => m.uuid !== userMsg.uuid),
          }));
          setSendError('Send failed');
        }
      } else {
        const chatId = Number(chatKey);
        const res = await sendUserMessage(auth.apiKey, chatId, text, attachForApi);
        if (res.success && res.data) {
          const aiCreatedAt = new Date().toISOString();
          const aiMsg: ChatMessage = {
            id: 0,
            uuid: res.data.message_id,
            role: 'assistant',
            content: res.data.content,
            content_type: 'text',
            audio_url: res.data.audio_url,
            created_at: aiCreatedAt,
          };
          setChatMessages((prev) => ({
            ...prev,
            [chatKey]: [...(prev[chatKey] || []), aiMsg],
          }));
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, last_message_at: aiCreatedAt, last_message_preview: (res.data!.content || '').slice(0, 50) + ((res.data!.content?.length || 0) > 50 ? '…' : '') }
                : c
            )
          );
        } else {
          setChatMessages((prev) => ({
            ...prev,
            [chatKey]: (prev[chatKey] || []).filter((m) => m.uuid !== userMsg.uuid),
          }));
          setSendError(res.error?.message || 'Send failed');
        }
      }
    } catch (_e) {
      setChatMessages((prev) => ({
        ...prev,
        [chatKey]: (prev[chatKey] || []).filter((m) => m.uuid !== userMsg.uuid),
      }));
      setSendError('Network error, please check connection');
    } finally {
      setSendingMessage(false);
      setSendingChatKey(null);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    setFriendIds([]);
    setFriendAgents([]);
    setChats([]);
    setGroupChats([]);
    setChatMessages({});
    setActiveChatId(null);
    setView('auth');
  };

  const handleLike = async (momentId: string) => {
    const auth = getAuth();
    if (!auth?.apiKey) return;
    const mid = parseInt(momentId, 10);
    if (Number.isNaN(mid)) return;
    const post = (momentsFilter ? agentMoments : moments).find((m) => m.id === momentId);
    const isLiked = post?.likedByMe ?? false;
    const fn = isLiked ? unlikeMoment : likeMoment;
    const res = await fn(auth.apiKey, mid);
    if (!res.success) return;
    const update = (m: MomentPost) =>
      m.id === momentId
        ? {
            ...m,
            likedByMe: !isLiked,
            likeCount: (m.likeCount ?? 0) + (isLiked ? -1 : 1),
          }
        : m;
    setMoments((prev) => prev.map(update));
    if (momentsFilter) setAgentMoments((prev) => prev.map(update));
  };

  const handleComment = async (momentId: string, content: string) => {
    const auth = getAuth();
    if (!auth?.apiKey || !content.trim()) return;
    const mid = parseInt(momentId, 10);
    if (Number.isNaN(mid)) return;
    const res = await addMomentComment(auth.apiKey, mid, content.trim());
    if (!res.success || !res.data) return;
    const newComment = {
      id: String(res.data.id),
      authorName: res.data.creator_name || currentUser?.name || 'You',
      text: res.data.content,
    };
    const appendComment = (m: MomentPost) =>
      m.id === momentId ? { ...m, comments: [...m.comments, newComment] } : m;
    setMoments((prev) => prev.map(appendComment));
    if (momentsFilter) setAgentMoments((prev) => prev.map(appendComment));
  };

  if (view === 'auth') return <AuthScreen onLogin={handleLogin} />;
  if (!currentUser) return null;

  const chromeMobile = isChromeMobile();

  return (
    <div
      className={`flex w-full bg-background-dark text-slate-100 font-sans ${chromeMobile ? 'flex-col overflow-y-auto' : 'overflow-hidden'}`}
      style={{ height: 'var(--vh, 100dvh)', minHeight: 'var(--vh, 100dvh)' }}
    >
      <div className={`flex flex-1 min-h-0 ${chromeMobile ? 'min-h-[var(--vh,100dvh)]' : ''}`}>
      <Sidebar 
        chats={sidebarChats} 
        activeChatId={activeChatId} 
        friendIds={friendIds}
        user={currentUser}
        onSelectChat={(key) => {
          setActiveChatId(key);
          navigateToView('messages');
          if (!chatMessages[key]) loadChatMessages(key);
        }} 
        onUpdateUser={setCurrentUser}
        onLogout={handleLogout}
        currentView={view}
        onSetView={(v) => { 
          navigateToView(v); 
          if(v !== 'moments') setMomentsFilter(null); 
          if(v !== 'contacts') { setIsSelectingForTopic(false); setSelectedFriendIds([]); }
          if(v === 'messages') setActiveChatId(null);
        }}
        className={`${showSidebarOnMobile ? 'flex w-full' : 'hidden'} lg:flex lg:w-80`}
      />
      
      <main className={`flex-1 flex flex-col relative min-w-0 ${showSidebarOnMobile ? 'hidden' : 'flex'} lg:flex`}>
        {view === 'discovery' && currentUser && (
          <DiscoveryGrid 
            apiKey={getAuth()!.apiKey}
            friendIds={friendIds}
            onAddFriend={addFriend}
            onRemoveFriend={removeFriend}
            onChatWith={createChat}
            onViewMoments={(aiId, agentName) => {
              setMomentsFilter(aiId);
              setMomentsFilterAgentName(agentName ?? null);
              navigateToView('moments');
            }}
            onBack={() => setShowSidebarOnMobile(true)}
          />
        )}

        {view === 'contacts' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 sticky top-0 bg-background-dark/95 backdrop-blur-md z-10 py-4 -mt-4">
              <div className="flex items-center gap-3">
                 <button onClick={() => setShowSidebarOnMobile(true)} className="lg:hidden p-2 -ml-2 hover:bg-surface-dark rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                 </button>
                 <div>
                    <h2 className="text-2xl lg:text-4xl font-extrabold text-white">{t.friends.title}</h2>
                    <p className="text-secondary mt-1 text-sm lg:text-base">
                      {isSelectingForTopic ? t.friends.topicSubtitle : t.friends.subtitle}
                    </p>
                 </div>
              </div>
              <div className="flex gap-2">
                {isSelectingForTopic ? (
                  <>
                    <button onClick={() => { setIsSelectingForTopic(false); setSelectedFriendIds([]); }} className="flex-1 lg:flex-none px-4 lg:px-6 py-2.5 rounded-xl border border-border-dark text-slate-300 hover:text-white transition-all font-bold text-sm">{t.friends.cancel}</button>
                    <button onClick={() => {
                      if (selectedFriendIds.length === 1) {
                        setShowTopicPrompt(true);
                        setTopicInput('');
                      } else {
                        createGroupChat(selectedFriendIds);
                        setIsSelectingForTopic(false);
                        setSelectedFriendIds([]);
                      }
                    }} disabled={selectedFriendIds.length === 0} className={`flex-1 lg:flex-none px-4 lg:px-6 py-2.5 rounded-xl transition-all font-bold shadow-lg text-sm ${selectedFriendIds.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-primary text-black'}`}>{t.friends.confirm} ({selectedFriendIds.length})</button>
                  </>
                ) : (
                  <button onClick={() => setIsSelectingForTopic(true)} className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-primary text-black font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-xl">forum</span> {t.friends.newTopic}
                  </button>
                )}
              </div>
            </header>

            {friendAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 lg:p-20 text-center border-2 border-dashed border-border-dark rounded-3xl">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">person_search</span>
                <p className="text-slate-400 max-w-sm">{t.friends.noFriends}</p>
                <button onClick={() => navigateToView('discovery')} className="mt-6 px-8 py-3 bg-surface-dark border border-border-dark rounded-2xl text-primary font-bold hover:border-primary transition-all">{t.friends.goToDiscovery}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {friendAgents.map(agent => {
                  const agentIdStr = String(agent.id);
                  const isSelected = selectedFriendIds.includes(agentIdStr);
                  const isEdge = agent.agent_type === 'edge';
                  const online = isEdge ? agent.edge_status === 'online' : true;
                  return (
                    <div key={agent.id} className={`bg-surface-dark p-4 lg:p-6 rounded-3xl border transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border-dark hover:border-primary/50'}`} onClick={() => isSelectingForTopic ? setSelectedFriendIds(prev => prev.includes(agentIdStr) ? prev.filter(id => id !== agentIdStr) : [...prev, agentIdStr]) : undefined}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={getAgentAvatarUrl(agent)} className="size-14 lg:size-16 rounded-2xl object-cover" alt="" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-dark ${online ? 'bg-green-500' : 'bg-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg lg:text-xl font-bold text-white truncate">{agent.name}</h3>
                          <p className="text-xs text-slate-400 truncate">{agent.description || agent.code}</p>
                        </div>
                      </div>
                      {!isSelectingForTopic && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); createChat(agentIdStr); }}
                            className="flex-1 py-2.5 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <span className="material-symbols-outlined text-lg">chat</span>
                            {t.friends.chatWith}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFriend(agentIdStr); }}
                            className="py-2.5 px-4 border border-border-dark text-slate-400 font-bold rounded-2xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5 text-sm"
                          >
                            <span className="material-symbols-outlined text-lg">person_remove</span>
                            {t.discovery.removeFriend}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {showTopicPrompt && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTopicPrompt(false)}>
                <div className="bg-surface-dark border border-border-dark w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-white mb-1">{t.friends.topicPromptTitle}</h3>
                  <p className="text-sm text-slate-400 mb-4">{t.friends.topicPromptDesc}</p>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && topicInput.trim()) {
                        createGroupChat(selectedFriendIds, topicInput);
                        setShowTopicPrompt(false);
                        setIsSelectingForTopic(false);
                        setSelectedFriendIds([]);
                      }
                    }}
                    placeholder={t.friends.topicPlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowTopicPrompt(false); }}
                      className="flex-1 py-2.5 rounded-xl border border-border-dark text-slate-300 hover:text-white transition-all font-bold text-sm"
                    >{t.friends.cancel}</button>
                    <button
                      onClick={() => {
                        createGroupChat(selectedFriendIds, topicInput);
                        setShowTopicPrompt(false);
                        setIsSelectingForTopic(false);
                        setSelectedFriendIds([]);
                      }}
                      disabled={!topicInput.trim()}
                      className={`flex-1 py-2.5 rounded-xl transition-all font-bold text-sm ${!topicInput.trim() ? 'bg-slate-700 text-slate-500' : 'bg-primary text-black'}`}
                    >{t.friends.confirm}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {view === 'messages' && activeChat && !activeGroupChat && currentUser && (() => {
          const chatKey = String(activeChat.id);
          const msgs = chatMessages[chatKey] || [];
          const adapter: {
            id: string;
            title: string;
            participants: string[];
            messages: Message[];
            lastMessageTime: string;
            isGroup: boolean;
            agentAvatar?: string;
          } = {
            id: chatKey,
            title: activeChat.agent_name,
            participants: [`agent-${activeChat.agent_id}`],
            messages: msgs
              .filter((m) => m.role !== 'system')
              .map((m) => ({
                id: String(m.id || m.uuid),
                senderId: m.role === 'user' ? `user-${currentUser.id}` : `agent-${activeChat.agent_id}`,
                senderName: m.role === 'user' ? currentUser.name : activeChat.agent_name,
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isAI: m.role === 'assistant',
                audioUrl: m.audio_url ?? (m.metadata as { audio_url?: string } | undefined)?.audio_url,
                attachments: m.attachments,
              })),
            lastMessageTime: activeChat.last_message_at
              ? new Date(activeChat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            isGroup: false,
            agentAvatar: getAgentAvatarUrlForFilename(activeChat.agent_avatar, activeChat.agent_name),
          };
          return (
            <ChatWindow
              chat={adapter}
              apiKey={getAuth()!.apiKey}
              agentAvatar={adapter.agentAvatar}
              userAvatar={currentUser.avatar}
              sharedWithCreator={activeChat.shared_with_creator}
              humanized={activeChat.verified}
              onToggleShare={(shared) => handleToggleShare(chatKey, shared)}
              agentOnline={activeChat.agent_online}
              agentType={activeChat.agent_type}
              onSendMessage={(txt, ids, att) => sendMessage(chatKey, txt, ids, att)}
              onUpdateSettings={(aiIds, newTitle) => updateGroupSettings(chatKey, aiIds, newTitle)}
              onBack={() => { setActiveChatId(null); setShowSidebarOnMobile(true); }}
              sending={sendingMessage}
              sendingInThisChat={sendingChatKey === chatKey}
              shareLoading={shareLoading}
              sendError={sendError}
              onClearSendError={() => setSendError(null)}
              onClearHistory={() => handleClearHistory(chatKey)}
              clearHistoryLoading={clearHistoryLoading}
              onDeleteMemory={() => handleDeleteMemory(chatKey)}
              deleteMemoryLoading={deleteMemoryLoading}
              onDeleteChat={() => handleDeleteChat(chatKey)}
              deleteChatLoading={deleteChatLoading}
              friendAgents={friendAgents}
              supportsImageUpload={activeChat.supports_image_upload}
              supportsDocumentUpload={activeChat.supports_document_upload}
            />
          );
        })()}

        {view === 'messages' && activeGroupChat && currentUser && (() => {
          const chatKey = `group-${activeGroupChat.id}`;
          const msgs = chatMessages[chatKey] || [];
          const participants = activeGroupChat.participants || [];
          const participantMap = Object.fromEntries(participants.map((p) => [String(p.agent_id), p]));
          const participantDetails = participants.map((p) => ({
            id: `agent-${p.agent_id}`,
            name: p.agent_name,
            avatar: getAgentAvatarUrlForFilename(p.agent_avatar, p.agent_name),
          }));
          const adapter: {
            id: string;
            title: string;
            participants: string[];
            participantDetails?: { id: string; name: string; avatar: string }[];
            messages: Message[];
            lastMessageTime: string;
            isGroup: boolean;
            agentAvatar?: string;
          } = {
            id: chatKey,
            title: activeGroupChat.title || activeGroupChat.topic || participants.map((p) => p.agent_name).join(', '),
            participants: participants.map((p) => `agent-${p.agent_id}`),
            participantDetails,
            messages: msgs
              .filter((m) => m.role !== 'system')
              .map((m) => {
                const senderP = m.sender_agent_id ? participantMap[String(m.sender_agent_id)] : undefined;
                const senderAvatar = senderP ? getAgentAvatarUrlForFilename(senderP.agent_avatar, senderP.agent_name) : undefined;
                const meta = m.metadata as { audio_url?: string } | undefined;
                const rawAudio = m.audio_url ?? meta?.audio_url;
                return {
                  id: String(m.id || m.uuid),
                  senderId: m.role === 'user' ? `user-${currentUser.id}` : `agent-${m.sender_agent_id || 'ai'}`,
                  senderName: m.role === 'user' ? currentUser.name : (m.sender_name || senderP?.agent_name || 'AI'),
                  text: m.content,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isAI: m.role === 'assistant',
                  audioUrl: typeof rawAudio === 'string' && rawAudio.trim() ? rawAudio : undefined,
                  senderAvatar: m.role === 'assistant' ? senderAvatar : undefined,
                  attachments: m.attachments,
                };
              }),
            lastMessageTime: activeGroupChat.last_message_at
              ? new Date(activeGroupChat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            isGroup: true,
          };
          const firstOnlineP = participants.find((p) => p.online);
          const groupSupportsImage = participants.some((p) => p.supports_image_upload);
          const groupSupportsDocument = participants.some((p) => p.supports_document_upload);
          return (
            <ChatWindow
              chat={adapter}
              apiKey={getAuth()!.apiKey}
              agentAvatar={firstOnlineP ? getAgentAvatarUrlForFilename(firstOnlineP.agent_avatar, firstOnlineP.agent_name) : undefined}
              userAvatar={currentUser.avatar}
              sharedWithCreator={activeGroupChat.shared_with_creator ?? false}
              shareLoading={shareLoading}
              onToggleShare={(shared) => handleToggleShare(chatKey, shared)}
              agentOnline={participants.some((p) => p.online)}
              agentType={participants.some((p) => p.agent_type === 'edge') ? 'edge' : 'cloud'}
              onSendMessage={(txt, ids, att) => sendMessage(chatKey, txt, ids, att)}
              onUpdateSettings={(aiIds, newTitle) => updateGroupSettings(chatKey, aiIds, newTitle)}
              onBack={() => { setActiveChatId(null); setShowSidebarOnMobile(true); }}
              sending={sendingMessage || groupPolling === chatKey}
              sendingInThisChat={groupPolling === chatKey}
              sendError={sendError}
              onClearSendError={() => setSendError(null)}
              onClearHistory={() => handleClearHistory(chatKey)}
              clearHistoryLoading={clearHistoryLoading}
              onDeleteChat={() => handleDeleteChat(chatKey)}
              deleteChatLoading={deleteChatLoading}
              friendAgents={friendAgents}
              supportsImageUpload={groupSupportsImage}
              supportsDocumentUpload={groupSupportsDocument}
            />
          );
        })()}
        
        {view === 'messages' && !activeChat && !activeGroupChat && (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl mb-4">chat_bubble</span>
              <p>{t.common.noChats}</p>
            </div>
          </div>
        )}

        {view === 'moments' && (
          <MomentsFeed 
            moments={momentsFilter ? agentMoments : moments.filter(m => friendIds.includes(m.authorId))}
            onAddMoment={(content) => setMoments(prev => currentUser ? [{ id: `m-${Date.now()}`, authorId: currentUser.id, authorName: currentUser.name, authorAvatar: currentUser.avatar || '', isAI: false, content, timestamp: 'Just now', likes: [], comments: [] }, ...prev] : prev)} 
            onLike={handleLike}
            onComment={handleComment} 
            title={momentsFilter && momentsFilterAgentName
              ? (language === 'zh' ? `${momentsFilterAgentName} 的朋友圈` : `${momentsFilterAgentName}'s Moments`)
              : t.moments.title}
            onBack={() => {
              if (momentsFilter) {
                setMomentsFilter(null);
                setMomentsFilterAgentName(null);
                navigateToView('discovery');
              }
              setShowSidebarOnMobile(true);
            }}
            onRefresh={async () => {
              const auth = getAuth();
              if (!auth?.apiKey) return;
              if (momentsFilter) {
                const agentId = parseInt(momentsFilter, 10);
                if (!Number.isNaN(agentId)) await loadAgentMomentsFromAPI(auth.apiKey, agentId);
              } else {
                await loadMomentsFromAPI(auth.apiKey);
              }
            }}
            hideCreatePost={true}
            showBackOnDesktop={!!momentsFilter}
            loading={!!momentsFilter && loadingAgentMoments}
            userAvatar={currentUser?.avatar}
          />
        )}
      </main>
      </div>
      {chromeMobile && <div className="shrink-0 w-full bg-transparent" style={{ height: '80px' }} aria-hidden />}
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
