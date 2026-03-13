'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Clock, RefreshCw, BarChart3, Download, Monitor, Smartphone,
  ChevronLeft, ChevronRight, Grid3X3, Share2, Copy, LineChart, Shield, Bell, Zap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ==================== 策略广场 ====================
interface PlazaItem {
  shareCode: string; nickname: string; symbol: string; baseAsset: string; quoteAsset: string;
  strategyName: string; pnlUsdt: number; pnlPercent: number; runSeconds: number;
  matchCount: number; totalGrids: number; maxDrawdownPct: number; minInvestUsdt: number;
  chartPoints: number[]; isRunning: boolean; copyCount: number; lastSyncAt: string | null; createdAt: string;
}

function MiniChart({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 90, h = 32;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = w / (points.length - 1);
  const pts = points.map((p, i) => ({ x: i * step, y: h - ((p - min) / range) * (h - 6) - 3 }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    + ` L${w},${h} L0,${h} Z`;
  const color = positive ? '#10b981' : '#ef4444';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`cg-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#cg-${positive ? 'g' : 'r'})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtRuntime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}天` : h > 0 ? `${h}时` : `${Math.floor(s / 60)}分`;
}

// ==================== 网格量化页面 ====================
export default function GridPage() {
  const PAGE_SIZE = 6;
  const [items, setItems] = useState<PlazaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'pnl' | 'copies' | 'newest'>('pnl');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPlaza = async (p = page, s = sort) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategy/plaza?pageSize=${PAGE_SIZE}&page=${p}&sort=${s}`);
      const json = await res.json();
      if (json.success) { setItems(json.data.items || []); setTotal(json.data.total || 0); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadPlaza(page, sort); }, [page, sort]);

  const handleSort = (s: 'pnl' | 'copies' | 'newest') => { setSort(s); setPage(1); };

  const downloads = [
    { name: 'Windows', sub: 'Windows 10/11 64-bit', icon: Monitor, file: '/downloads/AAGS-Setup.exe', ext: '.exe', size: '85 MB', color: 'cyan', gradient: 'from-cyan-500 to-blue-600', glow: 'hover:shadow-cyan-500/20' },
    { name: 'macOS', sub: 'macOS 12+ (Intel / Apple Silicon)', icon: Monitor, file: '/downloads/AAGS.dmg', ext: '.dmg', size: '90 MB', color: 'violet', gradient: 'from-violet-500 to-purple-600', glow: 'hover:shadow-violet-500/20' },
    { name: 'Android', sub: 'Android 8.0+', icon: Smartphone, file: '/downloads/AAGS.apk', ext: '.apk', size: '45 MB', color: 'emerald', gradient: 'from-emerald-500 to-teal-600', glow: 'hover:shadow-emerald-500/20' },
  ];

  const highlights = [
    { icon: Grid3X3, text: '币安现货网格全自动交易' },
    { icon: Zap, text: 'AI 扫描结果自动驱动策略调参' },
    { icon: Share2, text: '一键分享你的策略到广场' },
    { icon: Copy, text: '一键复制高手的策略参数' },
    { icon: LineChart, text: '实时收益曲线和详细报表' },
    { icon: Bell, text: '异常和熔断即时通知到手机' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <Navbar />

      {/* ═══════ Hero ═══════ */}
      <section className="relative pt-24 pb-4 sm:pt-28 sm:pb-6 px-5 sm:px-8 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-500/[0.08] border border-amber-500/[0.15] text-sm font-medium mb-5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Grid3X3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-amber-300">网格量化交易</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">策略广场</span>
            <span className="text-white"> & AAGS 客户端</span>
          </h1>
          <p className="text-base text-slate-400 max-w-xl mx-auto">看看别人怎么赚钱，一键复制高手参数，AI 驱动的网格量化自动交易</p>
        </div>
      </section>

      <div className="px-5 sm:px-8 pb-20">
        <div className="max-w-6xl mx-auto">

          {/* ═══════ 策略广场 ═══════ */}
          <section className="mb-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">实盘策略排行</h2>
                  <p className="text-sm text-slate-400 mt-0.5">真实用户分享的实盘策略，收益和参数完全透明</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {([
                  { key: 'pnl' as const, label: '收益最高' },
                  { key: 'copies' as const, label: '复制最多' },
                  { key: 'newest' as const, label: '最新' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleSort(opt.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      sort === opt.key
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button onClick={() => loadPlaza(page, sort)} disabled={loading} className="p-2.5 rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-all ml-1" title="刷新">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 策略卡片 */}
            {loading && items.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 text-amber-400/50 animate-spin mx-auto mb-4" />
                <p className="text-base text-slate-400 font-medium">加载策略数据...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06]">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/10 flex items-center justify-center mx-auto mb-5">
                  <BarChart3 className="w-10 h-10 text-amber-500/40" />
                </div>
                <p className="text-xl font-bold text-slate-300 mb-2">策略广场即将上线</p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">下载 AAGS 客户端，创建并分享你的网格策略，即可展示在这里</p>
                <a href="#download" className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 border border-amber-500/20 text-sm font-semibold hover:from-amber-500/25 hover:to-orange-500/15 transition-all">
                  <Download className="w-4 h-4" />
                  下载 AAGS 客户端
                </a>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const pos = item.pnlPercent >= 0;
                  return (
                    <div key={item.shareCode} className="group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${pos ? 'from-emerald-500/[0.03]' : 'from-red-500/[0.03]'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold tracking-tight">{item.baseAsset}<span className="text-slate-500 font-medium">/{item.quoteAsset}</span></span>
                            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] font-medium">{item.totalGrids}格</span>
                            <span className="relative flex h-2 w-2">
                              {item.isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${item.isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-medium">{item.nickname}</span>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className={`text-2xl font-extrabold tabular-nums tracking-tight ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pos ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                            </p>
                            <p className={`text-[11px] font-medium ${pos ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                              {pos ? '+' : ''}{item.pnlUsdt.toFixed(2)} USDT
                            </p>
                          </div>
                          <MiniChart points={item.chartPoints || []} positive={pos} />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-white/[0.05]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRuntime(item.runSeconds)}</span>
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{item.maxDrawdownPct.toFixed(1)}%</span>
                          <span>≥{item.minInvestUsdt.toFixed(0)}U</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.copyCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 翻页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      page === p
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-500 mt-6">所有数据由用户实盘实时上报，完全透明 · 在客户端中可一键复制高手参数</p>
          </section>

          {/* ═══════ AAGS 下载 ═══════ */}
          <section id="download">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-cyan-500/[0.08] border border-cyan-500/[0.15] text-sm font-medium mb-5">
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300">客户端下载</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">AAGS 客户端</h2>
              <p className="text-base text-slate-400">下载即用，连接你的币安账户，让 AI 驱动的网格策略自动替你交易</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {downloads.map((dl, i) => {
                const Icon = dl.icon;
                return (
                  <div key={i} className={`group relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-${dl.color}-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${dl.glow} text-center overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-b from-${dl.color}-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dl.gradient} flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold mb-1.5">{dl.name}</h3>
                      <p className="text-sm text-slate-400 mb-5">{dl.sub}</p>
                      <a
                        href={dl.file}
                        className={`group/btn relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-${dl.color}-500/20`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${dl.gradient}`} />
                        <div className={`absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity`} />
                        <Download className="relative w-4 h-4" />
                        <span className="relative">下载 {dl.ext}</span>
                      </a>
                      <p className="text-xs text-slate-500 mt-4">v1.0.0 · 约 {dl.size}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 功能亮点 */}
            <div className="mt-10 max-w-3xl mx-auto p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-lg font-bold mb-6 text-center">功能亮点</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {highlights.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">{h.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
