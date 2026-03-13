'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User, LogOut, Menu, X } from 'lucide-react';
import { isLoggedIn, clearToken } from '@/lib/api';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [logged, setLogged] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setLogged(isLoggedIn());
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setLogged(false);
    window.location.href = '/';
  };

  const allLinks = [
    { href: '/', label: '首页' },
    { href: '/grid', label: '网格量化' },
    { href: '/pricing', label: 'AI 扫描' },
    { href: '/docs', label: 'API 文档' },
  ];

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#020617]/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-105">
              <Shield className="w-[18px] h-[18px] text-white drop-shadow-sm" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AlphaSentinel
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {allLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive(link.href)
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                )}
              </Link>
            ))}

            <div className="w-px h-5 bg-white/[0.08] mx-3" />

            {logged ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard"
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    pathname === '/dashboard'
                      ? 'text-cyan-400 bg-cyan-500/[0.08]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  我的
                  {pathname === '/dashboard' && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all duration-200">
                  登录
                </Link>
                <Link href="/register" className="group relative px-5 py-2 text-sm font-semibold text-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 group-hover:from-cyan-400 group-hover:to-blue-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">免费注册</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 left-0 right-0 bg-[#0a0f1e] border-b border-white/[0.06] p-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {allLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? 'text-white bg-white/[0.06]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/[0.06] my-2" />
            {logged ? (
              <>
                <Link href="/dashboard" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  我的账户
                </Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                  退出登录
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/login" className="flex-1 py-3 text-center text-sm font-medium text-slate-300 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-all">登录</Link>
                <Link href="/register" className="flex-1 py-3 text-center text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600">免费注册</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
