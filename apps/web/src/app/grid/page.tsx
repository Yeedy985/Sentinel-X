'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  TrendingUp, RefreshCw, BarChart3, Download, Monitor, Smartphone,
  ChevronLeft, ChevronRight, Grid3X3, Share2, Copy, LineChart, Bell, Zap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useI18n } from '@/i18n';

// ==================== 策略广场 ====================
interface PlazaItem {
  shareCode: string; nickname: string; symbol: string; baseAsset: string; quoteAsset: string;
  strategyName: string; pnlUsdt: number; pnlPercent: number; runSeconds: number;
  matchCount: number; totalGrids: number; maxDrawdownPct: number; minInvestUsdt: number;
  chartPoints: number[]; isRunning: boolean; copyCount: number; lastSyncAt: string | null; createdAt: string;
}

function PnlChart({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 120, h = 40;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = w / (points.length - 1);
  const color = positive ? '#0ecb81' : '#f6465d';
  const pts = points.map((p, i) => ({ x: i * step, y: h - ((p - min) / range) * (h - 6) - 3 }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`cg-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#cg-${positive ? 'g' : 'r'})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtRuntime(s: number) {
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}时 ${mins}分`;
  if (hours > 0) return `${hours}时 ${mins}分`;
  return `${mins}分`;
}

// ==================== 网格量化页面 ====================
export default function GridPage() {
  const { t, locale } = useI18n();
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
    { name: 'Windows', sub: 'Windows 10/11 64-bit', icon: Monitor, file: 'https://github.com/Yeedy985/AAGS/releases/download/v1.0.0/AAGS.Setup.1.0.0.exe', ext: '.exe', size: '107 MB', color: 'cyan', gradient: 'from-cyan-500 to-blue-600', glow: 'hover:shadow-cyan-500/20', comingSoon: false },
    { name: 'macOS', sub: 'macOS 12+ (Intel / Apple Silicon)', icon: Monitor, file: '', ext: '.dmg', size: '', color: 'violet', gradient: 'from-violet-500 to-purple-600', glow: 'hover:shadow-violet-500/20', comingSoon: true },
    { name: 'Android', sub: 'Android 8.0+', icon: Smartphone, file: '', ext: '.apk', size: '', color: 'emerald', gradient: 'from-emerald-500 to-teal-600', glow: 'hover:shadow-emerald-500/20', comingSoon: true },
  ];

  const highlights = [
    { icon: Grid3X3, text: t('grid.highlight1') },
    { icon: Zap, text: t('grid.highlight2') },
    { icon: Share2, text: t('grid.highlight3') },
    { icon: Copy, text: t('grid.highlight4') },
    { icon: LineChart, text: t('grid.highlight5') },
    { icon: Bell, text: t('grid.highlight6') },
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
            <span className="text-amber-300">{t('grid.badge')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">{t('grid.title1')}</span>
            <span className="text-white">{t('grid.title2')}</span>
          </h1>
          <p className="text-base text-slate-400 max-w-xl mx-auto">{t('grid.subtitle')}</p>
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
                  <h2 className="text-2xl font-extrabold tracking-tight">{t('grid.plazaTitle')}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">{t('grid.plazaSubtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {([
                  { key: 'pnl' as const, label: t('grid.sortPnl') },
                  { key: 'copies' as const, label: t('grid.sortCopies') },
                  { key: 'newest' as const, label: t('grid.sortNewest') },
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
                <button onClick={() => loadPlaza(page, sort)} disabled={loading} className="p-2.5 rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-all ml-1" title={t('grid.refresh')}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 策略卡片 */}
            {loading && items.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 text-amber-400/50 animate-spin mx-auto mb-4" />
                <p className="text-base text-slate-400 font-medium">{t('grid.loading')}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06]">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/10 flex items-center justify-center mx-auto mb-5">
                  <BarChart3 className="w-10 h-10 text-amber-500/40" />
                </div>
                <p className="text-xl font-bold text-slate-300 mb-2">{t('grid.emptyTitle')}</p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{t('grid.emptyDesc')}</p>
                <a href="#download" className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 border border-amber-500/20 text-sm font-semibold hover:from-amber-500/25 hover:to-orange-500/15 transition-all">
                  <Download className="w-4 h-4" />
                  {t('grid.downloadAAGS')}
                </a>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const pos = item.pnlPercent >= 0;
                  return (
                    <div key={item.shareCode} className="p-5 rounded-2xl border transition-all hover:border-slate-600" style={{ background: '#181A20', borderColor: 'rgba(43,47,54,0.8)' }}>
                      {/* Row 1: Symbol + Grids + Online dot */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-white tracking-tight">{item.baseAsset}/{item.quoteAsset}</span>
                          <span className="text-[11px] text-slate-500 bg-[#2B2F36] px-1.5 py-0.5 rounded font-medium">{item.totalGrids}{locale === 'zh' ? '格' : ' grids'}</span>
                          <span className="relative flex h-2 w-2">
                            {item.isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${item.isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium">{item.nickname}</span>
                      </div>

                      {/* Row 2: 盈亏标签 + 收益曲线 */}
                      <div className="flex items-end justify-between mb-0.5">
                        <div>
                          <p className="text-[11px] text-slate-500 mb-1">{t('grid.pnlLabel')}</p>
                          <p className={`text-xl font-bold tabular-nums tracking-tight leading-none ${pos ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                            {pos ? '+' : ''}{item.pnlUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <PnlChart points={item.chartPoints || []} positive={pos} />
                      </div>

                      {/* Row 3: 收益率 / 运行时间 / 最小投资额 */}
                      <div className="grid grid-cols-3 gap-x-3 mt-3">
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0.5">{t('grid.returnRate')}</p>
                          <p className={`text-[13px] font-bold ${pos ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                            {pos ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0.5">{t('grid.runtime')}</p>
                          <p className="text-[13px] font-semibold text-slate-200">{fmtRuntime(item.runSeconds)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0.5">{t('grid.minInvest')}</p>
                          <p className="text-[13px] font-semibold text-slate-200">{item.minInvestUsdt.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</p>
                        </div>
                      </div>

                      {/* Row 4: 24h/总匹配次数 / 7天最大回撤 */}
                      <div className="grid grid-cols-2 gap-x-3 mt-2.5 pt-2.5 border-t border-[#2B2F36]">
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0.5">{t('grid.matchCount')}</p>
                          <p className="text-[13px] font-semibold text-slate-300">{item.matchCount}/{item.totalGrids}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0.5">{t('grid.maxDrawdown')}</p>
                          <p className="text-[13px] font-semibold text-slate-300">{item.maxDrawdownPct.toFixed(2)}%</p>
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

            <p className="text-center text-xs text-slate-500 mt-6">{t('grid.dataNote')}</p>
          </section>

          {/* ═══════ AAGS 下载 ═══════ */}
          <section id="download">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-cyan-500/[0.08] border border-cyan-500/[0.15] text-sm font-medium mb-5">
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300">{t('grid.downloadBadge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">{t('grid.clientTitle')}</h2>
              <p className="text-base text-slate-400">{t('grid.clientDesc')}</p>
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
                      {dl.comingSoon ? (
                        <>
                          <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-white/[0.04] border border-white/[0.08] cursor-not-allowed">
                            {t('grid.comingSoon')}
                          </span>
                          <p className="text-xs text-slate-600 mt-4">{t('grid.stayTuned')}</p>
                        </>
                      ) : (
                        <>
                          <a
                            href={dl.file}
                            className={`group/btn relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-${dl.color}-500/20`}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-r ${dl.gradient}`} />
                            <div className={`absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity`} />
                            <Download className="relative w-4 h-4" />
                            <span className="relative">{t('grid.download')} {dl.ext}</span>
                          </a>
                          <p className="text-xs text-slate-500 mt-4">v1.0.0 · {t('common.about')} {dl.size}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 功能亮点 */}
            <div className="mt-10 max-w-3xl mx-auto p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-lg font-bold mb-6 text-center">{t('grid.highlightsTitle')}</h4>
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
