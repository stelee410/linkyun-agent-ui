import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { PLACEHOLDER } from '../lib/placeholder';
import { ThemePreset } from '../types';
import { login, register } from '../services/api';
import { setAuth, type AuthState } from '../lib/auth';

interface AuthScreenProps {
  onLogin: (auth: AuthState) => void;
}

type AuthMode = 'login' | 'register';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, applyPreset } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!username.trim() || !email.trim() || !password) {
        setError(language === 'zh' ? '请填写所有字段' : 'Please fill in all fields');
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
        const res = await register(username.trim(), email.trim().toLowerCase(), password);
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
  };

  return (
    <div className="min-h-screen w-full flex bg-background-dark relative text-theme-text">
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

      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-24 border-r border-border-dark overflow-hidden">
        <div className="absolute top-12 left-12 flex items-center gap-3">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined font-bold text-2xl">blur_on</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Linkyun AI</h2>
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-12 p-1 rounded-3xl bg-gradient-to-br from-primary/30 to-transparent shadow-2xl">
            <img 
              src={PLACEHOLDER.hero} 
              alt="AI" 
              className="rounded-2xl w-full h-auto aspect-square object-cover opacity-80"
            />
          </div>
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            {t.auth.connect} <span className="text-primary">{t.auth.future}</span>
          </h1>
          <p className="text-secondary text-xl leading-relaxed mb-10 font-medium">
            {t.auth.experience}
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <img key={i} className="size-10 rounded-full ring-2 ring-background-dark object-cover" src={PLACEHOLDER.avatar} alt="User" />
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

          <div className="mb-12">
            <h2 className="text-4xl font-extrabold mb-3">
              {mode === 'login' ? t.auth.welcome : t.auth.signUp}
            </h2>
            <p className="text-secondary font-medium">
              {mode === 'login' ? t.auth.subtitle : (language === 'zh' ? '创建账号以开始使用' : 'Create an account to get started')}
            </p>
          </div>

          <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-surface-dark border border-border-dark hover:opacity-80 transition-all py-4 px-6 rounded-2xl font-bold mb-8 opacity-60 cursor-not-allowed"
            disabled
            title={language === 'zh' ? '即将支持' : 'Coming soon'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            {t.auth.google}
          </button>

          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t border-border-dark"></div>
            <span className="flex-shrink mx-4 opacity-40 text-xs font-bold uppercase tracking-widest">{t.auth.or}</span>
            <div className="flex-grow border-t border-border-dark"></div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3 opacity-50">{t.auth.username}</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">person</span>
                <input 
                  className="w-full pl-12 pr-4 py-4 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30"
                  placeholder="john@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-3 opacity-50">{t.auth.email}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">email</span>
                  <input 
                    type="email"
                    className="w-full pl-12 pr-4 py-4 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold uppercase tracking-widest opacity-50">{t.auth.password}</label>
                {mode === 'login' && (
                  <a className="text-xs font-bold text-primary hover:underline" href="#">{t.auth.forgot}</a>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xl">lock</span>
                <input 
                  type="password"
                  className="w-full pl-12 pr-4 py-4 bg-background-dark border border-border-dark rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:opacity-30"
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
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
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

          <p className="mt-10 text-center opacity-50 font-medium">
            {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary font-bold hover:underline"
            >
              {mode === 'login' ? t.auth.signUp : t.auth.signIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
