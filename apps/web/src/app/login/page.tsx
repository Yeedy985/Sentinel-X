'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Mail, Lock } from 'lucide-react';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.login({ email, password });
    if (res.success && res.data) {
      const data = res.data as any;
      setToken(data.token);
      router.push('/dashboard');
    } else {
      setError(res.error || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">AlphaSentinel</span>
          </Link>
          <p className="text-slate-500 mt-3 text-sm">登录到你的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-300 text-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-2 uppercase tracking-wider">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-2 uppercase tracking-wider">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
                placeholder="输入密码"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            登录
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          还没有账号？{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            免费注册
          </Link>
        </p>
      </div>
    </div>
  );
}
