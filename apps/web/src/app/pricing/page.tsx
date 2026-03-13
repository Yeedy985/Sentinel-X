'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Brain, Zap, BarChart3, Shield, Lock, Coins, ChevronRight, ArrowRight,
  Sparkles, Radio, Globe, Bell, Search, FileText, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PricingPage() {
  const [bonusTokens, setBonusTokens] = useState<number | null>(null);
  useEffect(() => {
    api.getSiteConfig().then(res => {
      if (res.success && res.data) {
        setBonusTokens((res.data as any).newUserBonusTokens ?? null);
      }
    }).catch(() => {});
  }, []);

  const capabilities = [
    { icon: Brain, title: '300+ 信号全景扫描', desc: '覆盖10大类别，从 BTC 核心到黑天鹅事件，不放过任何可能影响你决策的细节', gradient: 'from-cyan-500 to-blue-600' },
    { icon: Zap, title: '顶级 AI 深度分析', desc: '不是简单汇总新闻，而是 Perplexity 实时联网搜索 + DeepSeek/Gemini 深度推理，输出可执行的市场判断', gradient: 'from-amber-500 to-orange-600' },
    { icon: BarChart3, title: '三大核心指数', desc: 'SD方向 · SV波动 · SR风险——一眼看清市场状态，不再被海量信息淆没', gradient: 'from-emerald-500 to-teal-600' },
    { icon: Bell, title: '睡觉也不错过重大事件', desc: '连接 Telegram / WhatsApp，关键预警即时推送到手机，全自动运行无需盯盘', gradient: 'from-violet-500 to-purple-600' },
    { icon: Lock, title: '开放 API 接入', desc: '标准 RESTful + SSE 实时推送，可集成到任何交易系统或自建机器人', gradient: 'from-rose-500 to-pink-600' },
    { icon: Coins, title: '成本极低，绝不多扣', desc: '按实际 AI 消耗扣费，5分钟缓存智能省钱，扫描失败自动退回 Token', gradient: 'from-orange-500 to-red-600' },
  ];

  const scanFeatures = [
    { icon: Radio, text: '300+ 信号维度全景扫描' },
    { icon: BarChart3, text: '输出方向 / 波动 / 风险三大可执行指数' },
    { icon: Search, text: 'Perplexity 实时联网，抓取最新全球动态' },
    { icon: Globe, text: '覆盖新闻、政策、链上数据、市场情绪全维度' },
    { icon: Zap, text: '即时推送到 Telegram / WhatsApp' },
    { icon: Shield, text: '扫描失败自动退费，绝不多扣一分' },
  ];

  const steps = [
    { num: '01', title: '发起扫描', desc: '客户端一键触发或定时自动', color: 'from-cyan-400 to-blue-500' },
    { num: '02', title: 'AI 深度分析', desc: '联网搜索 + 多模型推理', color: 'from-blue-400 to-violet-500' },
    { num: '03', title: '按量扣费', desc: '用多少付多少，绝不多扣', color: 'from-violet-400 to-purple-500' },
    { num: '04', title: '收到简报', desc: '完整分析 + 可执行建议', color: 'from-purple-400 to-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <Navbar />

      {/* ═══════ Hero ═══════ */}
      <section className="relative pt-28 pb-8 sm:pt-32 sm:pb-12 px-5 sm:px-8 text-center overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-cyan-500/[0.08] border border-cyan-500/[0.15] text-sm font-medium mb-6">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-cyan-300">AI 全链路扫描</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">每次扫描不到一杯咖啡的零头</span>
          </h1>
          <p className="text-base text-slate-400 max-w-lg mx-auto">但你得到的是 13+ 数据源、300+ 信号维度、顶级 AI 模型的深度分析结果</p>
        </div>
      </section>

      <div className="px-5 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto">

          {/* ═══════ 扫描服务卡片 ═══════ */}
          <section className="relative mb-20 p-7 sm:p-10 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.05] via-blue-500/[0.02] to-transparent" />
            <div className="absolute inset-0 border border-cyan-500/[0.15] rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

            <div className="relative">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">AI 全链路扫描</h2>
                    <p className="text-sm text-slate-400">一次扫描 = 全球最新消息的完美分析结果</p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-slate-500 mb-1">每次扫描费用</p>
                  <p className="text-base font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">按实际 LLM 消耗</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {scanFeatures.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/[0.08] flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5 text-cyan-400" />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">{f.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* 计费流程 */}
              <div className="pt-6 border-t border-white/[0.06]">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4">计费流程</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {steps.map((s, i) => (
                    <div key={i} className="relative">
                      <div className={`text-xs font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent mb-2`}>{s.num}</div>
                      <h4 className="text-sm font-bold mb-1">{s.title}</h4>
                      <p className="text-xs text-slate-400">{s.desc}</p>
                      {i < 3 && (
                        <ChevronRight className="hidden sm:block absolute top-1/2 -right-3 w-3.5 h-3.5 text-slate-700" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ═══════ 核心能力 ═══════ */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">为什么选择我们</h2>
              <p className="text-base text-slate-400">不是另一个新闻聚合器，而是真正的 AI 深度分析服务</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {capabilities.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 overflow-hidden">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-base font-bold mb-2 tracking-tight">{f.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═══════ 计费说明 ═══════ */}
          <section className="mb-20">
            <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <h4 className="text-base font-bold">计费说明</h4>
              </div>
              <div className="space-y-3">
                {[
                  '按实际 AI 消耗计费，用多少付多少，不同扫描内容费用可能不同',
                  '5 分钟缓存窗口智能省钱，重复请求不会重复扣费',
                  '扫描失败自动全额退回，绝不多扣一分',
                  'USDT 充值兑换 Token，支持 TRC20 网络',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400/60 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-400 leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════ CTA ═══════ */}
          <section>
            <div className="relative p-10 sm:p-14 rounded-3xl overflow-hidden text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-blue-500/[0.03] to-transparent" />
              <div className="absolute inset-0 border border-white/[0.06] rounded-3xl" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">别再被信息爆炸淆没了</h3>
                <p className="text-base text-slate-400 mb-8 max-w-lg mx-auto">
                  {bonusTokens != null && bonusTokens > 0 ? `注册即送 ${bonusTokens.toLocaleString()} Token，` : ''}让顶级 AI 替你检索、分析、判断，每次扫描都是一份完美的市场情报
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
                  <Link href="/docs" className="group w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-[15px] text-slate-300 border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03] hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
                    API 文档 <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
