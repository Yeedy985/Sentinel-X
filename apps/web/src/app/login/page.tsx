'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { api, setToken } from '@/lib/api';
import { useI18n } from '@/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ email, password });
      if (res.success && res.data) {
        const data = res.data as any;
        setToken(data.token);
        router.push('/dashboard');
      } else {
        setError(res.error || t('auth.loginBtn') + ' failed');
      }
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#020617] relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">AlphaSentinel</span>
          </Link>
          <p className="text-slate-400 mt-3 text-sm">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/15 text-red-300 text-[13px] font-medium flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-2 uppercase tracking-wider">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[14px] text-white placeholder-slate-600 focus:border-cyan-500/40 focus:bg-white/[0.04] focus:outline-none transition-all duration-200"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-2 uppercase tracking-wider">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[14px] text-white placeholder-slate-600 focus:border-cyan-500/40 focus:bg-white/[0.04] focus:outline-none transition-all duration-200"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full py-3.5 rounded-xl font-bold text-[14px] overflow-hidden transition-all duration-300 disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('auth.loginBtn')}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            {t('auth.goRegister')}
          </Link>
        </p>
      </div>
    </div>
  );
}
