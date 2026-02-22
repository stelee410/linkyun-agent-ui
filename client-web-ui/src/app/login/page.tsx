"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (mode === "login") {
        res = await login(username.trim(), password);
      } else {
        if (!email.trim()) {
          setError("请输入邮箱");
          setLoading(false);
          return;
        }
        res = await register(username.trim(), email.trim(), password);
      }

      if (res.success && res.data) {
        setAuth(res.data.api_key, res.data.creator.username);
        router.push("/dashboard");
      } else {
        setError(res.error?.message || "操作失败");
      }
    } catch (err) {
      setError("网络错误，请检查 API 地址");
    } finally {
      setLoading(false);
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  return (
    <div className="min-h-screen flex">
      {/* 左侧：品牌展示区，布局参考设计稿，背景使用 logo 图（同心圆科技感） */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-[#0a0a0a] flex-col items-center justify-center p-10 overflow-hidden text-center"
        style={{
          backgroundImage: "url(/images/logo.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center max-w-md">
          <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
            <span className="text-5xl" aria-hidden>🤖</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white tracking-tight">Linkyun Agent</h2>
          <p className="text-slate-300 text-lg xl:text-xl mt-4 leading-relaxed">
            专业级 AI 数字人创作者工作台，
            <br />
            开启您的数字孪生新时代。
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          <span className="w-8 h-1 rounded-full bg-primary" aria-hidden />
          <span className="w-8 h-1 rounded-full bg-slate-600" aria-hidden />
          <span className="w-8 h-1 rounded-full bg-slate-600" aria-hidden />
        </div>
      </div>

      {/* 右侧：登录/注册表单 */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-surface min-h-screen">
        <div className="w-full max-w-sm">
          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-semibold text-text-primary">欢迎回来</h1>
              <p className="text-text-secondary text-sm mt-1 mb-8">请输入您的账号信息以继续</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-text-primary">注册账号</h1>
              <p className="text-text-secondary text-sm mt-1 mb-8">创建您的 Creator 账号</p>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                用户名{mode === "register" ? " (3-100 字符)" : ""}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <UserIcon className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名或邮箱"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm text-text-secondary mb-1">邮箱</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                    <UserIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-text-secondary">
                  密码{mode === "register" ? " (至少 8 位)" : ""}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => {}}
                  >
                    忘记密码?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <LockIcon className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  minLength={mode === "register" ? 8 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="remember" className="text-sm text-text-secondary">
                  记住我
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-text-secondary">或者</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-text-secondary">
              {mode === "login" ? (
                <>
                  没有账号?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setError(""); }}
                    className="font-semibold text-primary hover:underline"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); }}
                    className="font-semibold text-primary hover:underline"
                  >
                    登录
                  </button>
                </>
              )}
            </p>
          </div>

          <footer className="mt-12 text-center text-xs text-text-secondary space-y-1">
            <p>© 2024 Linkyun Agent. 保留所有权利。</p>
            <p>API: {apiUrl}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
