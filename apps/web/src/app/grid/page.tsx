'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Users, Clock, RefreshCw, BarChart3, Download, Monitor, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';

// ==================== 策略广场 ====================
interface PlazaItem {
  shareCode: string; nickname: string; symbol: string; baseAsset: string; quoteAsset: string;
  strategyName: string; pnlUsdt: number; pnlPercent: number; runSeconds: number;
  matchCount: number; totalGrids: number; maxDrawdownPct: number; minInvestUsdt: number;
  chartPoints: number[]; isRunning: boolean; copyCount: number; lastSyncAt: string | null; createdAt: string;
}

function MiniChart({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 80, h = 28;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((p - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtRuntime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}天` : h > 0 ? `${h}时` : `${Math.floor(s / 60)}分`;
}

// ==================== 网格量化页面 ====================
export default function GridPage() {
  const PAGE_SIZE = 6; // 2行 × 3列
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
      if (json.success) {
        setItems(json.data.items || []);
        setTotal(json.data.total || 0);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadPlaza(page, sort); }, [page, sort]);

  const handleSort = (s: 'pnl' | 'copies' | 'newest') => {
    setSort(s);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ───── Nav ───── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-bold tracking-tight">AlphaSentinel</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/grid" className="px-3 py-1.5 text-sm text-white bg-white/5 rounded-lg font-medium">网格量化</Link>
            <Link href="/pricing" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">AI 扫描</Link>
            <Link href="/docs" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">API 文档</Link>
            <div className="w-px h-5 bg-white/10 mx-2" />
            <Link href="/login" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">登录</Link>
            <Link href="/register" className="px-4 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-all">注册</Link>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto">

          {/* ═══════ 策略广场 ═══════ */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <h1 className="text-2xl font-bold">策略广场</h1>
                </div>
                <p className="text-sm text-slate-500">AAGS 用户分享的实盘网格策略，收益实时同步</p>
              </div>
              <div className="flex items-center gap-1.5">
                {([
                  { key: 'pnl' as const, label: '收益最高' },
                  { key: 'copies' as const, label: '复制最多' },
                  { key: 'newest' as const, label: '最新' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleSort(opt.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      sort === opt.key
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button onClick={() => loadPlaza(page, sort)} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors ml-1" title="刷新">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 策略卡片 2行×3列 */}
            {loading && items.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCw className="w-5 h-5 text-slate-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-600">加载中...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-white/[0.01] border border-white/5">
                <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">暂无分享策略</p>
                <p className="text-xs text-slate-600 mt-1">在 AAGS 客户端中分享您的策略，即可展示在这里</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const pos = item.pnlPercent >= 0;
                  return (
                    <div key={item.shareCode} className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{item.baseAsset}/{item.quoteAsset}</span>
                          <span className="text-[10px] text-slate-600 px-1.5 py-0.5 rounded bg-white/5">{item.totalGrids}格</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        </div>
                        <span className="text-[10px] text-slate-600">{item.nickname}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className={`text-xl font-bold tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                          </p>
                          <p className={`text-xs ${pos ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                            {pos ? '+' : ''}{item.pnlUsdt.toFixed(2)} USDT
                          </p>
                        </div>
                        <MiniChart points={item.chartPoints || []} positive={pos} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-white/5">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRuntime(item.runSeconds)}</span>
                        <span>回撤 {item.maxDrawdownPct.toFixed(1)}%</span>
                        <span>最低 {item.minInvestUsdt.toFixed(0)} U</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.copyCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 翻页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      page === p
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-slate-600 mt-4">
              数据由 AAGS 用户实时上报，仅供参考 · 在客户端中可一键复制使用
            </p>
          </section>

          {/* ═══════ AAGS 下载 ═══════ */}
          <section>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">AAGS 客户端下载</h2>
              <p className="text-sm text-slate-500">Alpha Auto Grid System — 自动化网格量化交易客户端</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* Windows */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                  <Monitor className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold mb-1">Windows</h3>
                <p className="text-xs text-slate-500 mb-4">Windows 10/11 64-bit</p>
                <a
                  href="/downloads/AAGS-Setup.exe"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-sm font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  下载 .exe
                </a>
                <p className="text-[10px] text-slate-600 mt-3">v1.0.0 · 约 85 MB</p>
              </div>

              {/* macOS */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <Monitor className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-1">macOS</h3>
                <p className="text-xs text-slate-500 mb-4">macOS 12+ (Intel / Apple Silicon)</p>
                <a
                  href="/downloads/AAGS.dmg"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-sm font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  下载 .dmg
                </a>
                <p className="text-[10px] text-slate-600 mt-3">v1.0.0 · 约 90 MB</p>
              </div>

              {/* Android */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold mb-1">Android</h3>
                <p className="text-xs text-slate-500 mb-4">Android 8.0+</p>
                <a
                  href="/downloads/AAGS.apk"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-sm font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  下载 .apk
                </a>
                <p className="text-[10px] text-slate-600 mt-3">v1.0.0 · 约 45 MB</p>
              </div>
            </div>

            <div className="mt-8 max-w-2xl mx-auto p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="text-sm font-semibold mb-3">AAGS 功能亮点</h4>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 币安现货网格自动交易</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI 市场情绪扫描集成</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 策略分享到策略广场</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 一键复制他人策略参数</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 实时收益追踪和图表</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Telegram/WhatsApp 通知</div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-4">
            <span>© 2026 AlphaSentinel</span>
            <Link href="/grid" className="hover:text-slate-400 transition-colors">网格量化</Link>
            <Link href="/pricing" className="hover:text-slate-400 transition-colors">AI 扫描</Link>
            <Link href="/docs" className="hover:text-slate-400 transition-colors">API 文档</Link>
          </div>
          <span>alphinel.com</span>
        </div>
      </footer>
    </div>
  );
}
