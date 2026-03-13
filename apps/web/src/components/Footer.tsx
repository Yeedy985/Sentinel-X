import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.04] bg-[#020617]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white/80">AlphaSentinel</span>
            </Link>
            <p className="text-[11px] text-slate-600 leading-relaxed">AI 驱动的加密市场智能分析<br />与自动化网格量化交易平台</p>
          </div>
          {/* 产品 */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">产品</h4>
            <div className="space-y-2">
              <Link href="/pricing" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">AI 全链路扫描</Link>
              <Link href="/grid" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">网格量化交易</Link>
              <Link href="/grid" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">策略广场</Link>
            </div>
          </div>
          {/* 开发者 */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">开发者</h4>
            <div className="space-y-2">
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">API 文档</Link>
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">快速开始</Link>
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">接口参考</Link>
            </div>
          </div>
          {/* 账户 */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">账户</h4>
            <div className="space-y-2">
              <Link href="/register" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">免费注册</Link>
              <Link href="/login" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">登录</Link>
              <Link href="/dashboard" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">控制面板</Link>
            </div>
          </div>
        </div>
        <div className="h-px bg-white/[0.04] mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <span>© 2026 AlphaSentinel. All rights reserved.</span>
          <span className="text-slate-700">alphinel.com</span>
        </div>
      </div>
    </footer>
  );
}
