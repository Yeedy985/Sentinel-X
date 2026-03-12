'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Mail, Lock } from 'lucide-react';
import { adminApi, setToken } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await adminApi.login({ email, password });
    if (res.success && res.data) {
      const data = res.data as any;
      setToken(data.token);
      router.push('/admin/dashboard');
    } else {
      setError(res.error || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0e1a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sentinel-X</h1>
          <p className="text-sm text-slate-500 mt-1.5">Admin Console</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-400 block mb-2">管理员邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-slate-800/60 text-[15px] text-white placeholder-slate-600 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-all"
                placeholder="admin@sentinel.aags.app"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 block mb-2">密码</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-slate-800/60 text-[15px] text-white placeholder-slate-600 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-all"
                placeholder="输入密码"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl font-semibold text-[15px] transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            登录管理后台
          </button>
        </form>
      </div>
    </div>
  );
}
