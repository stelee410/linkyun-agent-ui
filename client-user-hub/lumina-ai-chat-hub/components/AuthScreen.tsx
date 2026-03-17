import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { PLACEHOLDER, getRandomHeroPlaceholder } from '../lib/placeholder';
import { ThemePreset } from '../types';
import {
  getConfiguredBaseUrl,
  getDefaultBaseUrl,
  login,
  register,
  setConfiguredBaseUrl,
} from '../services/api';
import { setAuth, type AuthState } from '../lib/auth';

interface AuthScreenProps {
  onLogin: (auth: AuthState) => void;
}

type AuthMode = 'login' | 'register';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, applyPreset } = useTheme();
  const heroPlaceholder = useMemo(() => getRandomHeroPlaceholder(), []);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceUrl, setServiceUrl] = useState(getConfiguredBaseUrl() ?? getDefaultBaseUrl());
  const [serviceUrlMessage, setServiceUrlMessage] = useState<string | null>(null);
  const [showServiceConfig, setShowServiceConfig] = useState(false);

  const serviceUrlHost = useMemo(() => {
    try {
      return new URL(serviceUrl).host;
    } catch {
      return serviceUrl;
    }
  }, [serviceUrl]);

  const presets: { id: ThemePreset; name: string; icon: string }[] = [
    { id: 'lumina', name: 'Lumina Dark', icon: 'blur_on' },
    { id: 'lumina-light', name: 'Lumina Light', icon: 'light_mode' },
    { id: 'facebook', name: 'Facebook', icon: 'facebook' },
    { id: 'wechat', name: 'WeChat', icon: 'chat' },
    { id: 'retro80s', name: 'Retro 80s', icon: 'magic_button' },
    { id: 'gameboy', name: 'Gameboy', icon: 'videogame_asset' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'login') {
      if (!username.trim() || !password) {
        setError(language === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
        return;
      }
    } else {
      if (!username.trim() || !email.trim() || !password || !inviteCode.trim()) {
        setError(inviteCode.trim() ? (language === 'zh' ? '请填写所有字段' : 'Please fill in all fields') : t.auth.inviteCodeRequired);
        return;
      }
      if (password.length < 8) {
        setError(language === 'zh' ? '密码至少 8 位' : 'Password must be at least 8 characters');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(username.trim(), password);
        if (res.success && res.data?.api_key && res.data?.creator) {
          const auth: AuthState = { apiKey: res.data.api_key, creator: res.data.creator };
          setAuth(auth.apiKey, auth.creator);
          onLogin(auth);
        } else {
          setError(res.error?.message ?? (language === 'zh' ? '登录失败，账户数据异常' : 'Login failed, account data invalid'));
        }
      } else {
        const res = await register(username.trim(), email.trim().toLowerCase(), password, inviteCode.trim());
        if (res.success && res.data?.api_key && res.data?.creator) {
          const auth: AuthState = { apiKey: res.data.api_key, creator: res.data.creator };
          setAuth(auth.apiKey, auth.creator);
          onLogin(auth);
        } else {
          setError(res.error?.message ?? (language === 'zh' ? '注册失败' : 'Registration failed'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'zh' ? '网络错误，请稍后重试' : 'Network error, please try again'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
    setInviteCode('');
  };

  const handleSaveServiceUrl = () => {
    const trimmed = serviceUrl.trim();
    if (!trimmed) {
      setServiceUrlMessage(language === 'zh' ? '请输入后台服务地址' : 'Please enter backend service URL');
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setServiceUrlMessage(language === 'zh' ? '仅支持 http/https 地址' : 'Only http/https URLs are supported');
        return;
      }
      setConfiguredBaseUrl(trimmed);
      setServiceUrl(parsed.toString().replace(/\/+$/, ''));
      setServiceUrlMessage(language === 'zh' ? '后台服务地址已保存' : 'Backend service URL saved');
    } catch {
      setServiceUrlMessage(language === 'zh' ? '地址格式不正确' : 'Invalid URL format');
    }
  };

  const handleResetServiceUrl = () => {
    setConfiguredBaseUrl(null);
    const fallback = getDefaultBaseUrl();
    setServiceUrl(fallback);
    setServiceUrlMessage(
      language === 'zh'
        ? `已恢复默认地址：${fallback}`
        : `Reset to default URL: ${fallback}`
    );
  };

  return (
    <div className="w-full flex bg-background-dark relative text-theme-text overflow-hidden" style={{ height: 'var(--vh, 100dvh)', minHeight: 'var(--vh, 100dvh)' }}>
      {/* Global Language & Theme Switchers */}
      <div className="absolute top-6 right-6 z-50 flex gap-3">
        <div className="relative">
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="px-4 py-2 bg-surface-dark border border-border-dark rounded-xl text-xs font-bold text-primary hover:opacity-80 transition-all flex items-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined text-sm">palette</span>
            {presets.find(p => p.id === theme.preset)?.name || 'Theme'}
          </button>
          
          {showThemeMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => { applyPreset(p.id); setShowThemeMenu(false); }}
                  className={`w-full px-4 py-3 text-left text-xs font-bold flex items-center gap-3 transition-colors ${theme.preset === p.id ? 'bg-primary text-white' : 'opacity-70 hover:bg-border-dark hover:opacity-100'}`}
                >
                  <span className="material-symbols-outlined text-sm">{p.icon}</span>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          className="px-4 py-2 bg-surface-dark border border-border-dark rounded-xl text-xs font-bold text-primary hover:opacity-80 transition-all flex items-center gap-2 shadow-lg"
        >
          <span className="material-symbols-outlined text-sm">language</span>
          {language === 'en' ? '简体中文' : 'English'}
        </button>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center p-24 border-r border-border-dark overflow-hidden">
        <div className="w-full max-w-lg flex items-center gap-3 mb-10 relative z-20">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined font-bold text-2xl">blur_on</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Linkyun AI</h2>
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 p-1 rounded-3xl bg-gradient-to-br from-primary/30 to-transparent shadow-2xl">
            <img 
              src={heroPlaceholder} 
              alt="AI" 
              className="rounded-2xl w-full h-auto max-h-[52vh] object-contain opacity-80"
            />
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold mb-4 leading-tight">
            {t.auth.connect} <span className="text-primary">{t.auth.future}</span>
          </h1>
          <p className="text-secondary text-xl leading-relaxed mb-10 font-medium">
            {t.auth.experience}
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <img key={i} className="size-10 rounded-full ring-2 ring-background-dark object-cover" src={`/placeholder/avatar-${i}.jpg`} alt="User" />
              ))}
            </div>
            <p className="text-sm font-semibold opacity-80">10k+ Users online</p>
          </div>
        </div>

        <div className="absolute -bottom-32 -right-32 size-[500px] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-24 bg-background-dark">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined font-bold">blur_on</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Linkyun AI</h2>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold mb-1">
              {mode === 'login' ? t.auth.welcome : t.auth.signUp}
            </h2>
            <p className="text-secondary text-sm font-medium">
              {mode === 'login' ? t.auth.subtitle : (language === 'zh' ? '创建账号以开始使用' : 'Create an account to get started')}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{t.auth.username}</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">person</span>
                <input 
                  className="w-full pl-11 pr-3 py-3 bg-background-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                  placeholder="john@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>
            {mode === 'register' && (
              <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{t.auth.inviteCode}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">confirmation_number</span>
                  <input 
                    className="w-full pl-11 pr-3 py-3 bg-background-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                    placeholder={t.auth.inviteCodePlaceholder}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{t.auth.email}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">email</span>
                  <input 
                    type="email"
                    className="w-full pl-11 pr-3 py-3 bg-background-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>
              </>
            )}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest opacity-50">{t.auth.password}</label>
                {mode === 'login' && (
                  <a className="text-xs font-bold text-primary hover:underline" href="#">{t.auth.forgot}</a>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">lock</span>
                <input 
                  type="password"
                  className="w-full pl-11 pr-3 py-3 bg-background-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
              {mode === 'register' && (
                <p className="mt-2 text-xs opacity-50">{language === 'zh' ? '至少 8 个字符' : 'At least 8 characters'}</p>
              )}
            </div>
            <div>
              <div className="rounded-xl border border-border-dark bg-surface-dark/50">
                <button
                  type="button"
                  onClick={() => setShowServiceConfig((v) => !v)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                    {language === 'zh' ? '高级设置：后台服务地址' : 'Advanced: Backend Service URL'}
                  </span>
                  <span className="material-symbols-outlined text-base opacity-70">
                    {showServiceConfig ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {!showServiceConfig && (
                  <div className="px-3 pb-3">
                    <p className="text-[11px] opacity-60 break-all">{serviceUrlHost}</p>
                  </div>
                )}
                {showServiceConfig && (
                  <div className="px-3 pb-3 border-t border-border-dark">
                    <input
                      type="url"
                      className="mt-3 w-full px-3 py-3 bg-background-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30 text-sm"
                      value={serviceUrl}
                      onChange={(e) => {
                        setServiceUrl(e.target.value);
                        if (serviceUrlMessage) setServiceUrlMessage(null);
                      }}
                      placeholder={getDefaultBaseUrl()}
                      disabled={loading}
                    />
                    <p className="mt-2 text-[10px] opacity-50">
                      {language === 'zh'
                        ? `默认使用 .env.local 的 VITE_API_URL（当前默认：${getDefaultBaseUrl()}）`
                        : `Defaults to VITE_API_URL from .env.local (current default: ${getDefaultBaseUrl()})`}
                    </p>
                    {serviceUrlMessage && (
                      <p className="mt-2 text-xs text-primary">{serviceUrlMessage}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveServiceUrl}
                        disabled={loading}
                        className="px-3 py-2 bg-primary hover:opacity-90 disabled:opacity-60 text-white font-bold rounded-lg transition-all text-xs"
                      >
                        {language === 'zh' ? '保存地址' : 'Save URL'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetServiceUrl}
                        disabled={loading}
                        className="px-3 py-2 border border-border-dark rounded-lg text-xs font-bold opacity-80 hover:opacity-100 transition-all"
                      >
                        {language === 'zh' ? '恢复默认' : 'Reset Default'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-2 text-sm"
            >
              {loading ? (
                <>
                  {t.auth.loading}
                  <span className="material-symbols-outlined font-bold animate-spin">progress_activity</span>
                </>
              ) : (
                <>
                  {mode === 'login' ? t.auth.signIn : t.auth.signUp}
                  <span className="material-symbols-outlined font-bold">{mode === 'login' ? 'login' : 'person_add'}</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center opacity-50 font-medium text-sm">
            {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary font-bold hover:underline"
            >
              {mode === 'login' ? t.auth.signUp : t.auth.signIn}
            </button>
          </p>

          {mode === 'register' && (
            <div className="mt-4 p-3 rounded-xl bg-surface-dark border border-border-dark">
              <p className="text-xs font-bold opacity-80 mb-2">{t.auth.needInviteCode} {t.auth.contactUs}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1.5 opacity-90">
                  <span className="material-symbols-outlined text-base">chat</span>
                  {t.auth.wechat}: <code className="bg-background-dark px-1.5 py-0.5 rounded text-primary">stephenliy</code>
                </span>
                <a href="https://discord.gg/KV8uGwYp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                  <span className="material-symbols-outlined text-base">forum</span>
                  Discord
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
