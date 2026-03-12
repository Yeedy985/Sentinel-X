'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Mail, Lock, User } from 'lucide-react';
import { api, setToken } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.register({ email, password, nickname: nickname || undefined });
    if (res.success && res.data) {
      const data = res.data as any;
      setToken(data.token);
      router.push('/dashboard');
    } else {
      setError(res.error || '注册失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <Shield className="w-7 h-7 text-cyan-400" />
            Sentinel-X
          </Link>
          <p className="text-slate-500 mt-2">创建你的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">昵称 (可选)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="你的昵称"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="至少6位密码"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            注册
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          已有账号？{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            登录
          </Link>
        </p>

        <div className="mt-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-xs text-emerald-400">注册即赠送 5 Token，可立即体验扫描服务</p>
        </div>
      </div>
    </div>
  );
}
