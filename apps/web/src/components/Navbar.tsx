'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User, LogOut } from 'lucide-react';
import { isLoggedIn, clearToken } from '@/lib/api';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setLogged(isLoggedIn());
  }, []);

  const handleLogout = () => {
    clearToken();
    setLogged(false);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/grid', label: '网格量化' },
    { href: '/pricing', label: 'AI 扫描' },
    { href: '/docs', label: 'API 文档' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-bold tracking-tight">AlphaSentinel</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              pathname === '/'
                ? 'text-white bg-white/5 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            首页
          </Link>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isActive(link.href)
                  ? 'text-white bg-white/5 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="w-px h-5 bg-white/10 mx-2" />
          {logged ? (
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                  pathname === '/dashboard'
                    ? 'text-cyan-400 bg-cyan-500/10 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                我的
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="退出登录"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">登录</Link>
              <Link href="/register" className="px-4 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-all">注册</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
