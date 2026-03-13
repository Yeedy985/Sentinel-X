'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Brain, BarChart3, Lock, Coins, TrendingUp, Users, Clock, RefreshCw, ArrowRight, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

function useSiteConfig() {
  const [bonusTokens, setBonusTokens] = useState<number | null>(null);
  useEffect(() => {
    api.getSiteConfig().then(res => {
      if (res.success && res.data) {
        setBonusTokens((res.data as any).newUserBonusTokens ?? null);
      }
    }).catch(() => {});
  }, []);
  return { bonusTokens };
}

// ==================== 动画背景粒子 ====================
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.3 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${p.a})`;
        ctx.fill();
      }
      // 连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(6,182,212,${0.06 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ==================== 策略广场卡片 ====================
interface PlazaItem {
  shareCode: string; nickname: string; symbol: string; baseAsset: string; quoteAsset: string;
  strategyName: string; pnlUsdt: number; pnlPercent: number; runSeconds: number;
  matchCount: number; totalGrids: number; maxDrawdownPct: number; minInvestUsdt: number;
  chartPoints: number[]; isRunning: boolean; copyCount: number; lastSyncAt: string | null; createdAt: string;
}

function MiniChart({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 72, h = 24;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((p - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtRuntime(s: number) { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600); return d > 0 ? `${d}天` : h > 0 ? `${h}时` : `${Math.floor(s / 60)}分`; }

// ==================== 主页 ====================
export default function HomePage() {
  const { bonusTokens } = useSiteConfig();
  const [plazaItems, setPlazaItems] = useState<PlazaItem[]>([]);
  const [plazaLoading, setPlazaLoading] = useState(true);
  const [plazaSort, setPlazaSort] = useState<'pnl' | 'copies' | 'newest'>('pnl');

  const loadPlaza = async () => {
    setPlazaLoading(true);
    try {
      const res = await fetch(`/api/strategy/plaza?pageSize=8&sort=${plazaSort}`);
      const json = await res.json();
      if (json.success) setPlazaItems(json.data.items || []);
    } catch {}
    setPlazaLoading(false);
  };

  useEffect(() => { loadPlaza(); }, [plazaSort]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ───── Nav ───── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-bold tracking-tight">AlphaSentinel</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="#features" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">功能</a>
            <a href="#pricing" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">定价</a>
            <a href="#plaza" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">策略广场</a>
            <Link href="/docs" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">API 文档</Link>
            <div className="w-px h-5 bg-white/10 mx-2" />
            <Link href="/login" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">登录</Link>
            <Link href="/register" className="px-4 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-all">注册</Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden">
        <ParticleField />
        {/* 渐变光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-xs font-medium mb-6 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI 驱动 · 300 信号矩阵 · 实时预警
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              加密市场智能扫描
            </span>
            <br />
            <span className="text-white/90">量化你的市场直觉</span>
          </h1>
          <p className="text-base text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Perplexity 搜索 + DeepSeek/Gemini 深度分析，输出方向·波动·风险三大核心指数，自动推送预警到你的交易客户端。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="group px-7 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center gap-2">
              {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/docs" className="px-7 py-2.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-slate-300 hover:text-white transition-all hover:bg-white/5">
              查看 API
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">核心能力</h2>
            <p className="text-sm text-slate-500">为量化交易者打造的专业级市场情报</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: '300 信号矩阵', desc: '覆盖 10 大类别，精准量化方向、波动与风险', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { icon: Zap, title: 'AI 双管线分析', desc: 'Perplexity 搜索 + DeepSeek/Gemini 深度推理', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: BarChart3, title: 'SD/SV/SR 指数', desc: '方向·波动·风险三大核心指数，一目了然', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: Shield, title: '实时预警推送', desc: 'SSE + Telegram/WhatsApp，不错过重大事件', color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { icon: Lock, title: 'API Token 认证', desc: '安全接入，支持客户端无缝集成', color: 'text-rose-400', bg: 'bg-rose-500/10' },
              { icon: Coins, title: '透明计费', desc: '按实际 LLM 消耗扣费，智能缓存降低成本', color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                <div className={`p-2.5 rounded-xl ${f.bg} shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">透明定价</h2>
            <p className="text-sm text-slate-500">按实际 LLM 消耗扣费，用多少付多少</p>
          </div>

          {/* 单一扫描服务卡片 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-cyan-500/5 to-transparent border border-cyan-500/20 hover:border-cyan-500/30 transition-all">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold mb-1">AI 全链路扫描</h3>
                <p className="text-xs text-slate-500">Perplexity 联网搜索 + DeepSeek/Gemini 深度分析</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">每次扫描费用</p>
                <p className="text-sm font-semibold text-cyan-400">按实际 LLM 消耗</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-5">
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 300 信号矩阵全量分析</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> SD / SV / SR 三大核心指数</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> Perplexity 实时联网搜索</li>
              </ul>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 最新新闻 / 政策 / 监管动态</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> SSE 实时推送预警</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 扫描失败自动退回 Token</li>
              </ul>
            </div>

            {/* 计费流程 */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              {[
                { step: '1', text: '发起扫描' },
                { step: '2', text: 'LLM 搜索 + 分析' },
                { step: '3', text: '按实际消耗扣费' },
                { step: '4', text: '获取简报结果' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{s.text}</span>
                  </div>
                  {i < 3 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">缓存窗口内重复请求不会重复调用 LLM，节省成本</p>
        </div>
      </section>

      {/* ───── Strategy Plaza ───── */}
      <section id="plaza" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h2 className="text-xl font-bold">策略广场</h2>
              </div>
              <p className="text-xs text-slate-500">AAGS 用户分享的实盘网格策略，收益实时同步</p>
            </div>
            <div className="flex items-center gap-1.5">
              {([
                { key: 'pnl' as const, label: '收益最高' },
                { key: 'copies' as const, label: '复制最多' },
                { key: 'newest' as const, label: '最新' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPlazaSort(opt.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    plazaSort === opt.key
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button onClick={loadPlaza} disabled={plazaLoading} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors ml-1" title="刷新">
                <RefreshCw className={`w-3.5 h-3.5 ${plazaLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {plazaLoading && plazaItems.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-5 h-5 text-slate-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-600">加载中...</p>
            </div>
          ) : plazaItems.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5">
              <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">暂无分享策略</p>
              <p className="text-xs text-slate-600 mt-1">在 AAGS 客户端中分享您的策略，即可展示在这里</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plazaItems.map(item => {
                const pos = item.pnlPercent >= 0;
                return (
                  <div key={item.shareCode} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold">{item.baseAsset}/{item.quoteAsset}</span>
                        <span className="text-[10px] text-slate-600 px-1.5 py-0.5 rounded bg-white/5">{item.totalGrids}格</span>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <p className={`text-lg font-bold tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pos ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                        </p>
                        <p className={`text-[10px] ${pos ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                          {pos ? '+' : ''}{item.pnlUsdt.toFixed(2)} USDT
                        </p>
                      </div>
                      <MiniChart points={item.chartPoints || []} positive={pos} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2.5 border-t border-white/5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRuntime(item.runSeconds)}</span>
                      <span>回撤 {item.maxDrawdownPct.toFixed(1)}%</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.copyCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center text-[10px] text-slate-600 mt-4">
            数据由 AAGS 用户实时上报，仅供参考 · 在客户端中可一键复制使用
          </p>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-b from-cyan-500/5 to-transparent border border-white/5">
            <h2 className="text-2xl font-bold mb-3">开始使用 AlphaSentinel</h2>
            <p className="text-sm text-slate-400 mb-6">
              {bonusTokens != null && bonusTokens > 0 ? `注册即送 ${bonusTokens.toLocaleString()} Token，` : ''}立即体验 AI 驱动的市场扫描
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/register" className="group px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-cyan-500/15 flex items-center gap-2">
                {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/docs" className="group px-6 py-2.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2">
                API 文档 <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-4">
            <span>© 2026 AlphaSentinel</span>
            <Link href="/docs" className="hover:text-slate-400 transition-colors">API 文档</Link>
          </div>
          <span>alphinel.com</span>
        </div>
      </footer>
    </div>
  );
}
