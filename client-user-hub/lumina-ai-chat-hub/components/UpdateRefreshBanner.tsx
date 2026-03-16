import React, { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** 从 version.json 检测是否有新版本（构建时生成，部署后 buildTime 会变） */
async function fetchServerBuildTime(): Promise<number | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.buildTime === 'number' ? data.buildTime : null;
  } catch {
    return null;
  }
}

/**
 * PWA 更新提示条：当检测到新版本（Service Worker 更新或 version.json 变化）时显示横幅，用户点击后刷新。
 * 配合 vite.config 中 registerType: 'prompt' 与构建生成的 version.json，避免后台更新后前端仍用旧缓存导致不同步。
 */
export default function UpdateRefreshBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh: () => {},
  });

  const [serverNewVersion, setServerNewVersion] = useState(false);
  const initialBuildTimeRef = useRef<number | null>(null);

  // 运行时版本检查：切回页面时拉取 version.json，若 buildTime 与首次加载时不同则提示刷新
  useEffect(() => {
    if (import.meta.env.DEV) return;

    const check = async () => {
      const buildTime = await fetchServerBuildTime();
      if (buildTime == null) return;
      if (initialBuildTimeRef.current === null) {
        initialBuildTimeRef.current = buildTime;
        return;
      }
      if (buildTime !== initialBuildTimeRef.current) {
        setServerNewVersion(true);
      }
    };

    check();
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleRefresh = () => {
    if (needRefresh) {
      updateServiceWorker(true);
    } else {
      window.location.reload();
    }
  };

  const show = needRefresh || serverNewVersion;
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-primary/95 text-black px-4 py-2.5 shadow-lg safe-area-inset-top">
      <span className="text-sm font-medium">发现新版本，请刷新以获取最新功能</span>
      <button
        type="button"
        onClick={handleRefresh}
        className="px-4 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 font-bold text-sm transition-colors"
      >
        立即刷新
      </button>
    </div>
  );
}
