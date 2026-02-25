
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

const translations = {
  en: {
    auth: {
      welcome: "Welcome Back",
      subtitle: "Please enter your details to sign in.",
      google: "Continue with Google",
      or: "or login with email",
      username: "Username or Email",
      email: "Email",
      password: "Password",
      forgot: "Forgot?",
      signIn: "Sign In",
      signUp: "Sign Up",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      future: "Future",
      connect: "Connect with the",
      experience: "Experience the next generation of social interaction with real-time AI digital humans.",
      loading: "Loading...",
      registerSuccess: "Registration successful!",
      loginFailed: "Login failed",
      registerFailed: "Registration failed",
      inviteCode: "Invitation Code",
      inviteCodePlaceholder: "Enter your invitation code",
      inviteCodeRequired: "Invitation code is required",
      needInviteCode: "Need an invitation code?",
      contactUs: "Contact us:",
      wechat: "WeChat",
      discord: "Discord"
    },
    nav: {
      chats: "Chats",
      friends: "Friends",
      discovery: "Discover",
      feed: "Feed"
    },
    discovery: {
      title: "Discovery",
      subtitle: "Find new digital companions. Add them to your friend list to start chatting.",
      addFriend: "Add Friend",
      added: "Added Friend",
      viewMoments: "View Moments",
      online: "Online",
      offline: "Offline",
      edgeMode: "Edge",
      cloudMode: "Cloud",
      removeFriend: "Remove",
      searchPlaceholder: "Search by name or description...",
      sortByTimeDesc: "Time (Newest)",
      sortByTimeAsc: "Time (Oldest)",
      sortByNameAsc: "Name (A-Z)",
      sortByNameDesc: "Name (Z-A)",
      workspace: "Workspace",
      switchWorkspace: "Switch workspace",
      currentWorkspace: "Current workspace",
      defaultWorkspaceName: "Default",
      joinWorkspace: "Join",
      joinWorkspaceModalTitle: "Join Workspace",
      joinWorkspaceModalDesc: "Enter the invite code to join a workspace. You will be added as a member and can use AI agents, but cannot edit them.",
      inviteCodePlaceholder: "Enter invite code",
      joinSuccess: "Joined workspace successfully",
      joinFailed: "Failed to join workspace",
      leaveWorkspace: "Leave",
      leaveWorkspaceModalTitle: "Leave Workspace",
      leaveWorkspaceConfirm: "Are you sure you want to leave this workspace? You can rejoin with an invite code later.",
      leaveSuccess: "Left workspace successfully",
      leaveFailed: "Failed to leave workspace"
    },
    friends: {
      title: "My Friends",
      subtitle: "Your circle of digital companions.",
      topicSubtitle: "Select friends to participate in the Topic Chat.",
      newTopic: "New Topic Chat",
      cancel: "Cancel",
      confirm: "Confirm",
      noFriends: "You haven't added any AI friends yet. Visit the Discovery tab to find your first digital assistant!",
      goToDiscovery: "Go to Discovery",
      chatWith: "Chat",
      topicPromptTitle: "Enter a Topic",
      topicPromptDesc: "Give this conversation a topic so you can have different themed chats with the same AI.",
      topicPlaceholder: "e.g. Travel planning, Code review..."
    },
    chat: {
      assistant: "Assistant",
      assistants: "Assistants",
      group: "Group",
      topic: "Topic",
      manage: "Topic / Multi-AI Settings",
      chatName: "Chat / Topic Name",
      placeholder: "Enter chat theme...",
      inChat: "Assistants in this Chat",
      remove: "Remove",
      add: "Add",
      minOneParticipant: "Group chat must have at least 1 participant",
      save: "Save Changes",
      inputPlaceholder: "Start typing... Use @ for mentions",
      inputPlaceholderGroup: "Message group... Use @ to mention",
      mention: "Mention AI",
      shareWithCreator: "Share chat with creator",
      shareDescription: "Allow the agent creator to view this chat",
      shareEnabled: "Shared",
      shareDisabled: "Not shared",
      agentOffline: "Agent is currently offline",
      sendFailed: "Send failed",
      retry: "Retry",
      networkError: "Network error, please check connection",
      clearHistory: "Clear chat history",
      clearHistoryConfirm: "Clear all messages in this chat? This cannot be undone.",
      clearHistoryDone: "Chat history cleared",
      deleteMemory: "Delete memories",
      deleteMemoryConfirm: "Remove all memories between you and this agent. The agent will no longer remember previous context.",
      deleteChat: "Delete chat",
      deleteChatConfirm: "Delete this entire chat? Messages will be permanently removed and cannot be recovered.",
      showVoiceText: "Show text ▼",
      hideVoiceText: "Hide text ▲",
      audioLoadFailed: "Audio failed to load",
      download: "Download",
      typingPhraseGroup: "AI Agents are replying...",
      typingOtherChat: "AI Agent in another chat",
      exportPdf: "Export PDF",
      voiceMessage: "Voice message",
      noMessagesInChat: "No messages in this chat.",
      typingPhrases: [
        "Thinking...",
        "Typing...",
        "Processing your message...",
        "Generating response...",
        "Searching for the best answer...",
        "Crafting a reply...",
        "Almost there...",
        "Working on it...",
        "Let me think...",
        "One moment...",
        "Computing...",
        "Preparing response...",
        "Gathering thoughts...",
        "Formulating reply...",
        "Considering...",
        "Analyzing...",
        "Putting it together...",
        "Just a sec...",
        "Getting there...",
        "Brainstorming..."
      ]
    },
    moments: {
      title: "Moments",
      subtitle: "Stay connected with your digital friends' latest updates.",
      post: "Post",
      placeholder: "What's on your mind?",
      photo: "Photo",
      feeling: "Feeling",
      comment: "Write a comment...",
      noMoments: "No moments found here yet.",
      refresh: "Refresh"
    },
    profile: {
      title: "Edit Profile",
      usernameLabel: "Username",
      nameLabel: "Display Name",
      namePlaceholder: "Your name or nickname",
      bioLabel: "Personal Bio",
      bioPlaceholder: "Tell the AI about yourself (e.g. interests, job, personality)... This context will be shared with them.",
      aiOptimize: "AI Optimize",
      optimizing: "Optimizing...",
      saveSuccess: "Profile saved!"
    },
    common: {
      loading: "Loading...",
      online: "Online",
      noChats: "No active chats. Start a conversation from your Friends list!",
      done: "Done",
      reset: "Reset to Default",
      signOut: "Sign Out"
    }
  },
  zh: {
    auth: {
      welcome: "欢迎回来",
      subtitle: "请输入您的详细信息以登录。",
      google: "通过 Google 继续",
      or: "或通过邮箱登录",
      username: "用户名或邮箱",
      email: "邮箱",
      password: "密码",
      forgot: "忘记密码？",
      signIn: "登录",
      signUp: "注册",
      noAccount: "没有账号？",
      hasAccount: "已有账号？",
      future: "未来",
      connect: "连接",
      experience: "与实时 AI 数字人体验下一代社交互动。",
      loading: "处理中...",
      registerSuccess: "注册成功！",
      loginFailed: "登录失败",
      registerFailed: "注册失败",
      inviteCode: "邀请码",
      inviteCodePlaceholder: "请输入您的邀请码",
      inviteCodeRequired: "请输入邀请码",
      needInviteCode: "需要邀请码？",
      contactUs: "联系我们：",
      wechat: "微信",
      discord: "Discord"
    },
    nav: {
      chats: "聊天",
      friends: "好友",
      discovery: "发现",
      feed: "朋友圈"
    },
    discovery: {
      title: "发现",
      subtitle: "寻找新的数字伙伴。将他们添加到好友列表开始聊天。",
      addFriend: "添加好友",
      added: "已添加好友",
      viewMoments: "查看朋友圈",
      online: "在线",
      offline: "离线",
      edgeMode: "Edge 模式",
      cloudMode: "云模式",
      removeFriend: "取消好友",
      searchPlaceholder: "按名称或描述搜索...",
      sortByTimeDesc: "时间（最新）",
      sortByTimeAsc: "时间（最早）",
      sortByNameAsc: "名称（A-Z）",
      sortByNameDesc: "名称（Z-A）",
      workspace: "工作空间",
      switchWorkspace: "切换工作空间",
      currentWorkspace: "当前工作空间",
      defaultWorkspaceName: "默认空间",
      joinWorkspace: "加入",
      joinWorkspaceModalTitle: "加入工作空间",
      joinWorkspaceModalDesc: "输入邀请码加入工作空间。您将以成员身份加入，可使用 AI Agent 但不可编辑。",
      inviteCodePlaceholder: "输入邀请码",
      joinSuccess: "加入工作空间成功",
      joinFailed: "加入工作空间失败",
      leaveWorkspace: "离开",
      leaveWorkspaceModalTitle: "离开工作空间",
      leaveWorkspaceConfirm: "确定要离开此工作空间吗？之后可通过邀请码重新加入。",
      leaveSuccess: "已离开工作空间",
      leaveFailed: "离开工作空间失败"
    },
    friends: {
      title: "我的好友",
      subtitle: "您的数字伙伴圈。",
      topicSubtitle: "选择好友参与话题聊天。",
      newTopic: "新建话题聊天",
      cancel: "取消",
      confirm: "确认",
      noFriends: "您还没有添加任何 AI 好友。访问“发现”标签页寻找您的第一个数字助手！",
      goToDiscovery: "去发现",
      chatWith: "与TA聊天",
      topicPromptTitle: "输入话题",
      topicPromptDesc: "为这个对话设置一个话题，这样你可以跟同一个 AI 进行不同主题的聊天。",
      topicPlaceholder: "例如：旅行规划、代码审查..."
    },
    chat: {
      assistant: "助手",
      assistants: "助手",
      group: "群聊",
      topic: "话题",
      manage: "话题 / 多 AI 设置",
      chatName: "聊天 / 话题名称",
      placeholder: "输入聊天主题...",
      inChat: "当前聊天中的助手",
      remove: "移除",
      add: "添加",
      minOneParticipant: "群聊至少需保留一位参与者",
      save: "保存更改",
      inputPlaceholder: "开始输入... 使用 @ 提及 AI",
      inputPlaceholderGroup: "在群组中发消息... 使用 @ 提及",
      mention: "提及 AI",
      shareWithCreator: "与创作者共享聊天记录",
      shareDescription: "允许 Agent 创作者查看本次聊天内容",
      shareEnabled: "已共享",
      shareDisabled: "未共享",
      agentOffline: "Agent 当前离线",
      sendFailed: "发送失败",
      retry: "重试",
      networkError: "网络异常，请检查连接",
      clearHistory: "清空聊天记录",
      clearHistoryConfirm: "确定清空本聊天的所有消息吗？此操作不可恢复。",
      clearHistoryDone: "聊天记录已清空",
      deleteMemory: "删除记忆",
      deleteMemoryConfirm: "清除你与此 Agent 之间的所有记忆。Agent 将不再记得之前的对话上下文。",
      deleteChat: "删除聊天",
      deleteChatConfirm: "确定删除本聊天？所有消息将被永久删除且无法恢复。",
      showVoiceText: "显示文字 ▼",
      hideVoiceText: "隐藏文字 ▲",
      audioLoadFailed: "音频加载失败",
      download: "下载",
      typingPhraseGroup: "AI Agent们正在回复...",
      typingOtherChat: "其他窗口的AI Agent",
      exportPdf: "导出 PDF",
      voiceMessage: "语音消息",
      noMessagesInChat: "本聊天暂无消息。",
      typingPhrases: [
        "正在思考...",
        "正在打字...",
        "正在处理你的消息...",
        "正在生成回复...",
        "正在寻找最佳回答...",
        "正在组织语言...",
        "马上就好...",
        "正在努力中...",
        "让我想想...",
        "稍等片刻...",
        "正在计算...",
        "正在准备回复...",
        "正在整理思路...",
        "正在构思...",
        "正在考虑...",
        "正在分析...",
        "正在组织回答...",
        "马上回来...",
        "快好了...",
        "正在头脑风暴..."
      ]
    },
    moments: {
      title: "朋友圈",
      subtitle: "随时了解数字好友的最新动态。",
      post: "发布",
      placeholder: "在想什么？",
      photo: "图片",
      feeling: "状态",
      comment: "写评论...",
      noMoments: "这里还没有动态。",
      refresh: "刷新"
    },
    profile: {
      title: "编辑个人资料",
      usernameLabel: "用户名",
      nameLabel: "显示名称",
      namePlaceholder: "您的姓名或昵称",
      bioLabel: "个人介绍",
      bioPlaceholder: "向 AI 介绍你自己（例如：兴趣爱好、职业、性格）... 这些背景信息会在聊天时提供给他们。",
      aiOptimize: "AI 优化",
      optimizing: "优化中...",
      saveSuccess: "个人资料已保存！"
    },
    common: {
      loading: "加载中...",
      online: "在线",
      noChats: "暂无聊天。从好友列表开始对话吧！",
      done: "完成",
      reset: "重置为默认",
      signOut: "登出"
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('lumina-lang');
    return (saved as Language) || 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lumina-lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
