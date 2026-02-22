"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, setAuth } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import {
  Creator,
  getProfile,
  updateProfile,
  changePassword,
} from "@/lib/api";
import { CreatorAvatarUpload } from "@/components/CreatorAvatarUpload";

export default function ProfilePage() {
  const router = useRouter();
  const { auth, isReady } = useAuth();
  const [profile, setProfile] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 基本信息表单
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [description, setDescription] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // 修改密码表单
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (isReady && !auth?.apiKey) {
      router.replace("/login");
    }
  }, [isReady, auth?.apiKey, router]);

  // auth 就绪时先用本地用户名预填，避免输入框闪烁空值
  useEffect(() => {
    if (auth?.username) {
      setUsername((prev) => (prev === "" ? auth!.username : prev));
    }
  }, [auth?.username]);

  useEffect(() => {
    if (!auth?.apiKey) return;
    const load = async () => {
      setLoading(true);
      const res = await getProfile(auth.apiKey);
      if (res.success && res.data) {
        const c = res.data;
        setProfile(c);
        setUsername(c.username || "");
        setFullName(c.metadata?.full_name || "");
        setDescription(c.metadata?.description || "");
      } else {
        setError(res.error?.message || "加载失败");
      }
      setLoading(false);
    };
    load();
  }, [auth?.apiKey]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.apiKey) return;
    setError("");
    setSuccess("");
    setSavingProfile(true);
    const res = await updateProfile(auth.apiKey, {
      username: username.trim(),
      full_name: fullName.trim() || undefined,
      description: description.trim() || undefined,
    });
    if (res.success && res.data) {
      setProfile(res.data);
      setAuth(auth.apiKey, res.data.username);
      setSuccess("个人资料已更新");
      window.dispatchEvent(new Event("creator-profile-updated"));
    } else {
      setError(res.error?.message || "更新失败");
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.apiKey) return;
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 8) {
      setError("新密码至少需要 8 个字符");
      return;
    }
    setSavingPassword(true);
    const res = await changePassword(auth.apiKey, currentPassword, newPassword);
    if (res.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("密码已更新");
    } else {
      setError(res.error?.message || "修改密码失败");
    }
    setSavingPassword(false);
  };

  if (!isReady || !auth?.apiKey) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-text-secondary">
        加载中...
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-text-secondary">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">个人设置</h1>
        <p className="text-text-secondary text-sm mt-1">
          管理您的个人资料和账户安全
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 underline hover:no-underline"
          >
            关闭
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-2 underline hover:no-underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* 基本信息 */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          基本信息
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <CreatorAvatarUpload
            creator={profile}
            apiKey={auth!.apiKey}
            onSuccess={(c) => {
              setProfile(c);
              setError("");
              setSuccess("头像已更新");
              window.dispatchEvent(new Event("creator-profile-updated"));
            }}
            onError={(msg) => setError(msg)}
          />
          <div className="flex-1 text-sm text-text-secondary">
            <p>点击头像区域可上传、裁剪或移除您的个人头像。</p>
            <p className="mt-1">支持 JPG、PNG 等常见图片格式，建议正方形图片。</p>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="3-100 个字符"
              minLength={3}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              显示名称
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="您的姓名或昵称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              个人描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="简短介绍您自己..."
            />
          </div>
          {profile && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={profile.email || ""}
                readOnly
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-text-secondary cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">邮箱暂不支持修改</p>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile || !username.trim()}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {savingProfile ? "保存中..." : "保存资料"}
            </button>
          </div>
        </form>
      </section>

      {/* 修改密码 */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          修改密码
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              当前密码
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="输入当前密码"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="至少 8 个字符"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              确认新密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="再次输入新密码"
              minLength={8}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {savingPassword ? "修改中..." : "修改密码"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
