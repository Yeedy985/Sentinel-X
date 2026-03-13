'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Brain, Grid3X3, Lock, ArrowRight, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

// ==================== 主页 ====================
export default function HomePage() {
  const { bonusTokens } = useSiteConfig();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* ───── Hero ───── */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        <ParticleField />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-xs font-medium mb-6 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI 驱动 · 300 信号矩阵 · 网格量化
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              加密市场智能扫描
            </span>
            <br />
            <span className="text-white/90">量化你的市场直觉</span>
          </h1>
          <p className="text-base text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            AI 全链路市场扫描 + 自动化网格交易策略，从情报分析到策略执行，一站式量化交易平台。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="group px-7 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center gap-2">
              {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/grid" className="px-7 py-2.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-slate-300 hover:text-white transition-all hover:bg-white/5">
              网格量化
            </Link>
          </div>
        </div>
      </section>

      {/* ───── 产品入口卡片 ───── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
          {/* AI 扫描 */}
          <Link href="/pricing" className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 w-fit mb-4">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-semibold mb-2">AI 全链路扫描</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">300 信号矩阵 · Perplexity 搜索 + DeepSeek/Gemini 深度分析 · SD/SV/SR 三大指数</p>
            <span className="text-xs text-cyan-400 flex items-center gap-1 group-hover:gap-2 transition-all">
              了解详情 <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* 网格量化 */}
          <Link href="/grid" className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 transition-all">
            <div className="p-2.5 rounded-xl bg-amber-500/10 w-fit mb-4">
              <Grid3X3 className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold mb-2">网格量化交易</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">自动化网格策略 · 策略广场实盘排行 · AAGS 客户端下载</p>
            <span className="text-xs text-amber-400 flex items-center gap-1 group-hover:gap-2 transition-all">
              浏览策略 <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* API 文档 */}
          <Link href="/docs" className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all">
            <div className="p-2.5 rounded-xl bg-violet-500/10 w-fit mb-4">
              <Lock className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="font-semibold mb-2">API 接口文档</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">RESTful API + SSE 实时推送 · Token 认证 · 完整接口参考</p>
            <span className="text-xs text-violet-400 flex items-center gap-1 group-hover:gap-2 transition-all">
              查看文档 <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ───── 亮点数字 ───── */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { num: '300+', label: '信号矩阵', color: 'text-cyan-400' },
            { num: '10', label: '信号类别', color: 'text-emerald-400' },
            { num: '3', label: '核心指数 SD/SV/SR', color: 'text-amber-400' },
            { num: '24/7', label: '实时预警推送', color: 'text-violet-400' },
          ].map((s, i) => (
            <div key={i}>
              <p className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.num}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
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
              <Link href="/grid" className="group px-6 py-2.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2">
                网格量化 <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
