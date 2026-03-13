'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Brain, Grid3X3, Code2, ArrowRight, ChevronRight,
  Zap, BarChart3, Shield, Activity, Sparkles, Globe, Radio, Cpu, LineChart, Lock,
  Clock, TrendingUp, Eye, MessageSquare,
} from 'lucide-react';
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
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth * devicePixelRatio; canvas.height = canvas.offsetHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.4 + 0.08,
        hue: Math.random() > 0.5 ? 190 : 220,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,65%,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(200,70%,60%,${0.07 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }} />;
}

// ==================== 主页 ====================
export default function HomePage() {
  const { bonusTokens } = useSiteConfig();

  const products = [
    {
      href: '/pricing',
      icon: Brain,
      color: 'cyan',
      title: 'AI 全链路扫描',
      desc: '每小时自动扫描全球加密市场，Perplexity 实时联网 + DeepSeek/Gemini 深度推理，300+ 信号量化为方向·波动·风险三大指数',
      cta: '了解定价',
      gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
      border: 'hover:border-cyan-500/30',
      iconBg: 'from-cyan-500 to-blue-600',
      glow: 'group-hover:shadow-cyan-500/20',
    },
    {
      href: '/grid',
      icon: Grid3X3,
      color: 'amber',
      title: '网格量化交易',
      desc: '基于 AI 扫描结果自动调参的三层网格策略，实盘策略广场排行，一键复制高手参数，AAGS 客户端跨平台运行',
      cta: '浏览策略',
      gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
      border: 'hover:border-amber-500/30',
      iconBg: 'from-amber-500 to-orange-600',
      glow: 'group-hover:shadow-amber-500/20',
    },
    {
      href: '/docs',
      icon: Code2,
      color: 'violet',
      title: 'API 开发接口',
      desc: '将扫描能力集成到你自己的交易系统，RESTful API + SSE 实时推送，完整接口文档与代码示例',
      cta: '查看文档',
      gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
      border: 'hover:border-violet-500/30',
      iconBg: 'from-violet-500 to-purple-600',
      glow: 'group-hover:shadow-violet-500/20',
    },
  ];

  const whyNeeded = [
    {
      icon: Eye,
      title: '信息严重爆炸，人脑无法处理',
      desc: '加密市场 24/7 不间断，全球新闻、链上数据、宏观政策、社交情绪……每天产生的信息量远超任何人能消化的极限。不借助顶级 AI 模型来检索、过滤和分析，你永远无法得知真实的市场全貌。',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: TrendingUp,
      title: '信息差 = 决策优势',
      desc: '全面信息化时代，人与人之间的信息差正在被拉平——但往往就是那一点点细小的信息差，决定了你比别人更聪明的选择。让你的信息始终领先一步，让你的每一次决策都建立在科学分析之上。',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Clock,
      title: '全自动扫描，永不遗漏',
      desc: '设置每小时一次的全自动扫描，连接 Telegram / WhatsApp 即时通知。你的每一次微小成本，都换来全球最新消息的完美分析结果——你在睡觉，AI 在替你看盘。',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: MessageSquare,
      title: '极低成本，极高回报',
      desc: '一次扫描的成本不到一杯咖啡的零头，但它综合了 13+ 数据源、300+ 信号维度、顶级 AI 模型的深度推理。你得到的不是原始数据，而是经过充分分析的可执行洞察。',
      color: 'from-violet-500 to-purple-600',
    },
  ];

  const stats = [
    { num: '300+', label: '信号矩阵覆盖', icon: Radio, color: 'from-cyan-400 to-blue-500' },
    { num: '10', label: '信号分组类别', icon: BarChart3, color: 'from-emerald-400 to-teal-500' },
    { num: '3', label: '核心指数 SD/SV/SR', icon: Activity, color: 'from-amber-400 to-orange-500' },
    { num: '24/7', label: '实时扫描推送', icon: Zap, color: 'from-violet-400 to-purple-500' },
  ];

  const features = [
    { icon: Globe, title: '13+ 全球数据源', desc: 'Binance · CoinGecko · DeFi Llama · Alternative.me 等实时采集，覆盖价格、链上、宏观、情绪全维度' },
    { icon: Cpu, title: '顶级 AI 模型管线', desc: 'Perplexity 实时联网搜索 + DeepSeek / Gemini 深度推理，不是简单汇总，而是真正的分析与判断' },
    { icon: LineChart, title: '300+ 信号量化引擎', desc: '时间衰减 · 置信度加权 · 多模型交叉验证，输出方向 / 波动 / 风险三大可执行指数' },
    { icon: Lock, title: '安全透明', desc: 'API Token 鉴权 · AES-256 加密存储 · 扫描失败自动退费 · 开源透明' },
    { icon: Sparkles, title: 'AI 驱动网格调参', desc: '扫描结果直接驱动网格策略自动调整间距、偏移、熔断参数，真正的 AI + 量化闭环' },
    { icon: Shield, title: '风控 + 即时通知', desc: '风险过高自动熔断 · 最大回撤监控 · Telegram / WhatsApp 即时推送，你在睡觉也安心' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <Navbar />

      {/* ═══════ Hero ═══════ */}
      <section className="relative pt-32 pb-24 sm:pt-36 sm:pb-28 px-5 sm:px-8 overflow-hidden">
        <ParticleField />
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent font-semibold">AI 驱动</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">300 信号矩阵</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">网格量化</span>
          </div>

          <h1 className="text-[40px] sm:text-[56px] md:text-[64px] font-extrabold tracking-[-0.02em] leading-[1.08] mb-6">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              信息爆炸时代
            </span>
            <br />
            <span className="text-white">你需要 AI 替你看盘</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            全球加密市场 24/7 不停歇，海量新闻、链上数据、宏观政策每秒涌来——
            <br className="hidden sm:block" />
            <span className="text-slate-300">顶级 AI 模型帮你检索、分析、判断</span>，让你的信息始终领先，决策始终科学。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="group relative w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-[15px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_100%] group-hover:animate-[shimmer_1.5s_ease-in-out]" />
              <span className="relative flex items-center justify-center gap-2">
                {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </Link>
            <Link href="/grid" className="group w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-[15px] text-slate-300 border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03] hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
              探索网格量化
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ 为什么你需要 ═══════ */}
      <section className="py-20 sm:py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">为什么你需要 AlphaSentinel</h2>
            <p className="text-base text-slate-400">在信息严重过载的时代，不用 AI 就是在裸奔</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mb-20">
            {whyNeeded.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="group p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">核心产品</h2>
            <p className="text-base text-slate-400">从市场情报到策略执行的全链路解决方案</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {products.map((p, i) => {
              const Icon = p.icon;
              return (
                <Link key={i} href={p.href} className={`group relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] ${p.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${p.glow} overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.iconBg} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2.5 tracking-tight">{p.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-5">{p.desc}</p>
                    <span className={`text-sm font-medium text-${p.color}-400 flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-300`}>
                      {p.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ 数字统计 ═══════ */}
      <section className="py-16 sm:py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] text-center transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <Icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-b ${s.color} bg-clip-text text-transparent mb-1.5`}>{s.num}</p>
                    <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ 技术能力 ═══════ */}
      <section className="py-20 sm:py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">底层技术</h2>
            <p className="text-base text-slate-400">不是简单的数据聚合，而是真正的 AI 深度分析管线</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="group p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.025] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] group-hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition-colors duration-300">
                      <Icon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold mb-1.5 tracking-tight">{f.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="py-20 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-10 sm:p-14 rounded-3xl overflow-hidden text-center">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-blue-500/[0.03] to-transparent" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">让信息差成为你的优势</h2>
              <p className="text-base text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                {bonusTokens != null && bonusTokens > 0 ? `注册即送 ${bonusTokens.toLocaleString()} Token，` : ''}每一次微小的成本，都换来全球最新消息的完美分析。让你的信息始终领先，决策始终科学。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register" className="group relative w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-[15px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link href="/grid" className="group w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-[15px] text-slate-300 border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03] hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
                  网格量化 <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
