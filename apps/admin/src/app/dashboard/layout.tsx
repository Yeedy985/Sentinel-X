'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, BarChart3, Cpu, DollarSign, Settings, TrendingUp, LogOut, Zap } from 'lucide-react';
import { clearToken, isLoggedIn } from '@/lib/api';
import { useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: BarChart3, color: 'text-emerald-400' },
  { href: '/dashboard/signals', label: '信号矩阵', icon: Zap, color: 'text-yellow-400' },
  { href: '/dashboard/pipelines', label: 'LLM 管线', icon: Cpu, color: 'text-purple-400' },
  { href: '/dashboard/costs', label: '计费配置', icon: DollarSign, color: 'text-amber-400' },
  { href: '/dashboard/users', label: '用户管理', icon: Users, color: 'text-cyan-400' },
  { href: '/dashboard/finance', label: '财务报表', icon: TrendingUp, color: 'text-emerald-400' },
  { href: '/dashboard/settings', label: '系统设置', icon: Settings, color: 'text-slate-400' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoggedIn()) router.push('/login');
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#0a0e1a]">
      <aside className="w-64 border-r border-slate-800/40 bg-[#0d1220] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/30">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-orange-400" />
          </div>
          <div>
            <span className="font-bold text-[15px] tracking-wide text-white">Sentinel-X</span>
            <span className="text-[10px] text-slate-600 block -mt-0.5">Admin Console</span>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 py-5 px-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
                  active
                    ? 'bg-white/[0.06] text-white font-medium shadow-sm'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? item.color : 'text-slate-600 group-hover:text-slate-400'}`} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </Link>
            );
          })}
        </nav>
        {/* Logout */}
        <div className="p-3 border-t border-slate-800/30">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] text-slate-600 hover:text-red-400 w-full transition-all hover:bg-red-500/5">
            <LogOut className="w-[18px] h-[18px]" />
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-[#0a0e1a]">
        {children}
      </main>
    </div>
  );
}
