'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Brain, Zap, BarChart3, Shield, Lock, Coins, ChevronRight, ArrowRight } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">

          {/* ───── 标题 ───── */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
              <Brain className="w-3.5 h-3.5" />
              AI 全链路扫描
            </div>
            <h1 className="text-3xl font-bold mb-3">透明定价</h1>
            <p className="text-sm text-slate-500">按实际 LLM 消耗扣费，用多少付多少</p>
          </div>

          {/* ───── 扫描服务卡片 ───── */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-cyan-500/5 to-transparent border border-cyan-500/20 mb-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold mb-1">AI 全链路扫描</h2>
                <p className="text-xs text-slate-500">Perplexity 联网搜索 + DeepSeek/Gemini 深度分析</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">每次扫描费用</p>
                <p className="text-sm font-semibold text-cyan-400">按实际 LLM 消耗</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 300 信号矩阵全量分析</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> SD / SV / SR 三大核心指数</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> Perplexity 实时联网搜索</li>
              </ul>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 最新新闻 / 政策 / 监管动态</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> SSE 实时推送预警</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span> 扫描失败自动退回 Token</li>
              </ul>
            </div>

            {/* 计费流程 */}
            <div className="flex items-center gap-3 pt-5 border-t border-white/5">
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

          {/* ───── 核心能力 ───── */}
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-5 text-center">核心能力</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Brain, title: '300 信号矩阵', desc: '覆盖 10 大类别，精准量化方向、波动与风险', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { icon: Zap, title: 'AI 双管线分析', desc: 'Perplexity 搜索 + DeepSeek/Gemini 深度推理', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { icon: BarChart3, title: 'SD/SV/SR 指数', desc: '方向·波动·风险三大核心指数，一目了然', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: Shield, title: '实时预警推送', desc: 'SSE + Telegram/WhatsApp，不错过重大事件', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: Lock, title: 'API Token 认证', desc: '安全接入，支持客户端无缝集成', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { icon: Coins, title: '透明计费', desc: '按实际 LLM 消耗扣费，智能缓存降低成本', color: 'text-orange-400', bg: 'bg-orange-500/10' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className={`p-2.5 rounded-xl ${f.bg} shrink-0`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">{f.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ───── 计费说明 ───── */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-10">
            <h4 className="text-sm font-semibold mb-3">计费说明</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2"><span className="text-cyan-400 shrink-0 mt-0.5">•</span> 每次扫描按实际调用的 LLM Token 数量扣费，不同模型和内容长度费用不同</li>
              <li className="flex items-start gap-2"><span className="text-cyan-400 shrink-0 mt-0.5">•</span> 缓存窗口内重复请求不会重复调用 LLM，节省成本</li>
              <li className="flex items-start gap-2"><span className="text-cyan-400 shrink-0 mt-0.5">•</span> 扫描失败自动退回已扣除的 Token</li>
              <li className="flex items-start gap-2"><span className="text-cyan-400 shrink-0 mt-0.5">•</span> 通过 USDT 充值兑换 Token，支持 TRC20 网络</li>
            </ul>
          </div>

          {/* ───── CTA ───── */}
          <div className="text-center">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-cyan-500/5 to-transparent border border-white/5">
              <h3 className="text-xl font-bold mb-2">立即开始</h3>
              <p className="text-sm text-slate-400 mb-5">
                {bonusTokens != null && bonusTokens > 0 ? `注册即送 ${bonusTokens.toLocaleString()} Token` : '注册后即可体验'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/register" className="group px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-cyan-500/15 flex items-center gap-2">
                  {bonusTokens != null && bonusTokens > 0 ? `免费注册 · 送 ${bonusTokens.toLocaleString()} Token` : '免费注册'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/docs" className="group px-6 py-2.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2">
                  API 文档 <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
