'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Shield, Zap, Brain, BarChart3, Lock, Coins, FileCode, ChevronDown, Copy, Check, TrendingUp, Users, Clock, RefreshCw } from 'lucide-react';
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

const features = [
  {
    icon: Brain,
    title: '300 信号矩阵',
    desc: '覆盖 10 大类别、300 条市场信号，精准量化市场方向、波动与风险',
    color: 'text-cyan-400',
  },
  {
    icon: Zap,
    title: 'AI 双管线分析',
    desc: 'Perplexity 实时搜索 + DeepSeek/Gemini 深度分析，双引擎驱动',
    color: 'text-amber-400',
  },
  {
    icon: BarChart3,
    title: '三大核心指数',
    desc: 'SD 方向指数、SV 波动指数、SR 风险指数，一目了然',
    color: 'text-emerald-400',
  },
  {
    icon: Shield,
    title: '实时预警推送',
    desc: 'SSE 实时推送 + Telegram/WhatsApp 自动转发，不错过任何重大事件',
    color: 'text-violet-400',
  },
  {
    icon: Lock,
    title: 'API 令牌认证',
    desc: '安全的 API Token 体系，支持客户端无缝集成',
    color: 'text-rose-400',
  },
  {
    icon: Coins,
    title: 'Token 计费透明',
    desc: '按次扣费，余额可查，智能缓存降低成本',
    color: 'text-orange-400',
  },
];

export default function HomePage() {
  const { bonusTokens } = useSiteConfig();
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold">AlphaSentinel</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#strategy-plaza" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              策略广场
            </a>
            <a href="#api-docs" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              API 文档
            </a>
            <Link href="/login" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              登录
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors">
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            AI 驱动的加密市场智能扫描
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              AlphaSentinel
            </span>
            <br />
            <span className="text-slate-200">市场智能扫描服务</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            基于 300 条信号矩阵，通过 Perplexity 搜索引擎 + DeepSeek/Gemini 分析管线，
            实时监控加密市场动态，输出方向、波动、风险三大核心指数，
            并自动推送预警到你的交易客户端。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-cyan-500/20">
              {bonusTokens != null && bonusTokens > 0 ? `立即注册 — 赠送 ${bonusTokens} Token` : '立即注册'}
            </Link>
            <Link href="/login" className="px-8 py-3 border border-slate-700 hover:border-slate-500 rounded-xl font-medium text-slate-300 hover:text-white transition-all">
              已有账号？登录
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">核心能力</h2>
          <p className="text-slate-500 text-center mb-12">为量化交易者打造的专业级市场情报服务</p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-all group">
                <f.icon className={`w-10 h-10 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">简单透明的定价</h2>
          <p className="text-slate-500 mb-12">按次计费，用多少付多少</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50">
              <div className="text-4xl font-bold text-cyan-400 mb-2">1 <span className="text-lg text-slate-500">Token</span></div>
              <div className="text-lg font-medium mb-4">基础扫描</div>
              <ul className="text-sm text-slate-400 space-y-2 text-left">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 300 信号矩阵分析</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> SD/SV/SR 三大指数</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 预警推送</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> SSE 实时流</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-b from-cyan-900/20 to-slate-900/50 border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">2 <span className="text-lg text-slate-500">Token</span></div>
              <div className="text-lg font-medium mb-4">搜索增强扫描</div>
              <ul className="text-sm text-slate-400 space-y-2 text-left">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 包含基础扫描全部功能</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">★</span> Perplexity 实时搜索</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">★</span> 最新新闻/政策/监管动态</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">★</span> 更高信号精确度</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-6">5 分钟内重复请求将命中缓存，不消耗额外 LLM 成本</p>
        </div>
      </section>

      {/* Strategy Plaza */}
      <StrategyPlazaSection />

      {/* API Docs */}
      <ApiDocsSection />

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© 2026 AlphaSentinel</span>
          <span>alphinel.com</span>
        </div>
      </footer>
    </div>
  );
}

// ==================== 策略广场展示区 ====================
interface PlazaItem {
  shareCode: string;
  nickname: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  strategyName: string;
  pnlUsdt: number;
  pnlPercent: number;
  runSeconds: number;
  matchCount: number;
  totalGrids: number;
  maxDrawdownPct: number;
  minInvestUsdt: number;
  chartPoints: number[];
  isRunning: boolean;
  copyCount: number;
  lastSyncAt: string | null;
  createdAt: string;
}

function MiniChart({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 80, h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatPlazaRuntime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}天${hours}时`;
  if (hours > 0) return `${hours}时`;
  return `${Math.floor(seconds / 60)}分`;
}

function StrategyPlazaSection() {
  const [items, setItems] = useState<PlazaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'pnl' | 'copies' | 'newest'>('pnl');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategy/plaza?pageSize=8&sort=${sort}`);
      const json = await res.json();
      if (json.success) setItems(json.data.items || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [sort]);

  return (
    <section id="strategy-plaza" className="py-20 px-6 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4">
            <TrendingUp className="w-4 h-4" />
            策略广场
          </div>
          <h2 className="text-3xl font-bold mb-3">实盘策略展示</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm">
            来自 AAGS 用户分享的真实网格交易策略，收益数据实时同步，一键复制即可使用
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([
            { key: 'pnl' as const, label: '收益率最高' },
            { key: 'copies' as const, label: '复制最多' },
            { key: 'newest' as const, label: '最新分享' },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sort === opt.key
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button onClick={loadData} disabled={loading} className="ml-2 p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors" title="刷新">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cards grid */}
        {loading && items.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">暂无分享策略</p>
            <p className="text-xs text-slate-600 mt-1">在 AAGS 客户端中分享您的策略，它将展示在这里</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(item => {
              const positive = item.pnlPercent >= 0;
              return (
                <div key={item.shareCode} className="rounded-xl p-4 border border-slate-800/60 bg-slate-900/50 hover:border-slate-700/60 transition-all group">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-white">{item.baseAsset}/{item.quoteAsset}</span>
                      <span className="ml-2 text-xs text-slate-600">网格×{item.totalGrids}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className={`text-xs ${item.isRunning ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {item.isRunning ? '运行中' : '已停止'}
                      </span>
                    </div>
                  </div>

                  {/* PnL + Chart */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">收益率</p>
                      <p className={`text-xl font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {positive ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                      </p>
                      <p className={`text-xs ${positive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {positive ? '+' : ''}{item.pnlUsdt.toFixed(2)} USDT
                      </p>
                    </div>
                    <MiniChart points={item.chartPoints || []} positive={positive} />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-800/60 pt-3">
                    <div>
                      <p className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 运行</p>
                      <p className="text-slate-300 font-medium mt-0.5">{formatPlazaRuntime(item.runSeconds)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">回撤</p>
                      <p className="text-slate-300 font-medium mt-0.5">{item.maxDrawdownPct.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> 使用</p>
                      <p className="text-slate-300 font-medium mt-0.5">{item.copyCount}人</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between">
                    <span className="text-xs text-slate-600 truncate max-w-[120px]">{item.nickname}</span>
                    <span className="text-xs text-slate-600">{item.strategyName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-xs text-slate-600">
            策略数据由 AAGS 用户实时上报，仅供参考 · 在 AAGS 客户端中可一键复制使用
          </p>
        </div>
      </div>
    </section>
  );
}

// ==================== API 接口文档 ====================
const API_BASE = 'https://alphinel.com';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  title: string;
  desc: string;
  auth: 'API Token' | 'JWT' | '无';
  headers: Record<string, string>;
  request?: { body?: Record<string, string>; query?: Record<string, string> };
  response: string;
  example?: string;
  notes?: string[];
  statusCodes?: { code: number; desc: string }[];
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/scan/request',
    title: '请求扫描',
    desc: '请求执行一次 300 信号矩阵扫描。系统将预扣 Token，扫描完成后结果可通过简报接口获取或 SSE 实时推送。',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx', 'Content-Type': 'application/json' },
    request: {
      body: {
        'enableSearch': 'boolean — 是否启用 Perplexity 搜索增强 (默认 true，消耗 2 Token；false 则仅基础分析，消耗 1 Token)',
      },
    },
    response: `{
  "success": true,
  "data": {
    "briefingId": "brf_1710000000_a1b2c3d4",
    "estimatedSeconds": 30,
    "tokenCost": 2,
    "cached": false
  }
}`,
    notes: [
      '若 5 分钟内有相同类型的扫描缓存，将直接返回缓存结果 (cached=true, estimatedSeconds=0)',
      '频率限制：默认每用户每小时最多 3 次',
      'briefingId 用于后续查询简报结果',
    ],
    statusCodes: [
      { code: 200, desc: '成功 — 扫描已提交或命中缓存' },
      { code: 402, desc: 'Token 余额不足' },
      { code: 429, desc: '超出频率限制' },
      { code: 503, desc: '服务维护中' },
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/briefings',
    title: '获取简报列表',
    desc: '获取当前用户最近的扫描简报结果，包含市场摘要、触发信号、预警信息和管线详情。',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx' },
    request: {
      query: {
        'limit': 'number — 返回数量，1~20，默认 10',
        'after': 'string — 增量拉取，传入某个 briefingId，只返回该简报之后的新数据',
      },
    },
    response: `{
  "success": true,
  "data": [
    {
      "briefingId": "brf_1710000000_a1b2c3d4",
      "timestamp": 1710000030000,
      "marketSummary": "BTC 突破 95000 美元...",
      "triggeredSignals": [
        {
          "signalId": 1,
          "impact": 8,
          "confidence": 0.85,
          "title": "BTC突破关键阻力位",
          "summary": "价格突破95000美元心理关口...",
          "source": "Perplexity搜索"
        }
      ],
      "alerts": [
        {
          "title": "重大突破预警",
          "description": "BTC价格突破关键技术位...",
          "level": "critical",
          "group": "G1_BTC_CORE",
          "relatedCoins": ["BTC"],
          "source": "DeepSeek分析"
        }
      ],
      "pipelineInfo": {
        "hasSearcher": true,
        "hasMarketData": true,
        "searcherProvider": "perplexity",
        "analyzerProvider": "deepseek"
      }
    }
  ]
}`,
    notes: [
      'triggeredSignals 中的 signalId 对应 300 信号矩阵中的信号编号 (1~300)',
      'alerts.level 取值: "critical"(紧急) / "warning"(一般) / "info"(信息)',
      '信号 impact 取值范围 -10 ~ +10，正值看涨，负值看跌',
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/stream',
    title: 'SSE 实时推送',
    desc: '建立 Server-Sent Events 长连接，实时接收扫描完成后的简报推送。适用于实时监控场景。',
    auth: 'API Token',
    headers: {},
    request: {
      query: {
        'token': 'string — API Token (URL参数传递，因 EventSource 不支持自定义 Header)',
      },
    },
    response: `event: connected
data: {"userId":1,"version":"1.0.0"}

event: heartbeat
data: {"t":1710000015000}

event: briefing
data: {"briefingId":"brf_...","timestamp":...,"marketSummary":"...","triggeredSignals":[...],"alerts":[...],"pipelineInfo":{...}}`,
    example: `const es = new EventSource(
  '${API_BASE}/api/scan/stream?token=stx_xxxxxxxx'
);

es.addEventListener('briefing', (event) => {
  const briefing = JSON.parse(event.data);
  console.log('新简报:', briefing.marketSummary);
  console.log('触发信号:', briefing.triggeredSignals.length);
  console.log('预警:', briefing.alerts.length);
});

es.addEventListener('heartbeat', () => {
  // 服务器每 15 秒发送一次心跳
});`,
    notes: [
      'EventSource 会自动重连，无需手动处理断线',
      '心跳间隔 15 秒，用于保持连接活跃',
      '简报推送事件名为 "briefing"，数据格式与 /briefings 接口一致',
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/status',
    title: '服务状态',
    desc: '检查公共服务运行状态和当前用户的 Token 余额。可用于健康检查和余额监控。',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx' },
    response: `{
  "success": true,
  "data": {
    "ok": true,
    "version": "1.0.0",
    "tokenBalance": 15,
    "message": null
  }
}`,
    notes: [
      'ok=false 时表示服务维护中，此时 message 包含维护说明',
      'tokenBalance 为当前用户 Token 余额',
    ],
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    title: '用户注册',
    desc: '注册新账号，注册成功即赠送 Token（数量以管理后台配置为准）。',
    auth: '无',
    headers: { 'Content-Type': 'application/json' },
    request: {
      body: {
        'email': 'string — 邮箱地址 (唯一)',
        'password': 'string — 密码 (至少 6 位)',
        'nickname': 'string? — 昵称 (可选)',
      },
    },
    response: `{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "Trader",
      "tokenBalance": 5,
      "status": "active",
      "createdAt": "2026-03-12T00:00:00.000Z"
    }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    title: '用户登录',
    desc: '使用邮箱和密码登录，返回 JWT Token。',
    auth: '无',
    headers: { 'Content-Type': 'application/json' },
    request: {
      body: {
        'email': 'string — 邮箱地址',
        'password': 'string — 密码',
      },
    },
    response: `{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "email": "...", "tokenBalance": 15, ... }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/user/tokens',
    title: '创建 API Token',
    desc: '创建一个用于调用扫描接口的 API Token。Token 仅在创建时完整显示一次，请妥善保存。',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...', 'Content-Type': 'application/json' },
    request: {
      body: {
        'name': 'string? — Token 名称备注 (可选)',
      },
    },
    response: `{
  "success": true,
  "data": {
    "id": 1,
    "token": "stx_a1b2c3d4e5f6...",
    "tokenPrefix": "stx_a1b2",
    "name": "我的交易机器人"
  }
}`,
    notes: [
      'API Token 以 stx_ 前缀开头',
      '完整 Token 仅此一次返回，后续只能查看前缀',
      '调用扫描相关接口时使用此 Token 认证',
    ],
  },
  {
    method: 'GET',
    path: '/api/user/tokens',
    title: 'API Token 列表',
    desc: '列出当前用户所有 API Token（仅显示前缀）。',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...' },
    response: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "tokenPrefix": "stx_a1b2",
      "name": "我的交易机器人",
      "lastUsedAt": "2026-03-12T00:00:00.000Z",
      "isRevoked": false,
      "createdAt": "2026-03-10T00:00:00.000Z"
    }
  ]
}`,
  },
  {
    method: 'DELETE',
    path: '/api/user/tokens/:id',
    title: '吊销 API Token',
    desc: '永久吊销指定的 API Token，吊销后该 Token 无法再用于认证。',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...' },
    response: `{ "success": true, "message": "Token 已吊销" }`,
  },
];

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-sm overflow-x-auto">
        <code className={`language-${lang} text-slate-300`}>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ ep, defaultOpen = false }: { ep: ApiEndpoint; defaultOpen?: boolean }) {
  const methodColor: Record<string, string> = {
    GET: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    DELETE: 'bg-red-600/20 text-red-400 border-red-500/30',
  };

  return (
    <details open={defaultOpen} className="rounded-xl border border-slate-800/50 overflow-hidden group/ep">
      <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-800/30 transition-colors list-none [&::-webkit-details-marker]:hidden">
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${methodColor[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-sm text-cyan-400 font-mono">{ep.path}</code>
        <span className="text-sm text-slate-400 ml-2">{ep.title}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
          ep.auth === 'API Token' ? 'bg-amber-600/10 text-amber-400 border-amber-500/20'
          : ep.auth === 'JWT' ? 'bg-violet-600/10 text-violet-400 border-violet-500/20'
          : 'bg-slate-700/50 text-slate-500 border-slate-600/30'
        }`}>
          {ep.auth}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform duration-200 group-open/ep:rotate-180" />
      </summary>

      <div className="px-4 pb-4 space-y-4 border-t border-slate-800/50 pt-4">
        <p className="text-sm text-slate-400">{ep.desc}</p>

        {/* Headers */}
        {Object.keys(ep.headers).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Headers</h5>
            <div className="space-y-1">
              {Object.entries(ep.headers).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <code className="text-cyan-400 font-mono">{k}:</code>
                  <code className="text-slate-400">{v}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Body / Query */}
        {ep.request?.body && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Body (JSON)</h5>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-1.5 text-slate-500 font-medium">字段</th>
                  <th className="text-left py-1.5 text-slate-500 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ep.request.body).map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-800/50">
                    <td className="py-1.5"><code className="text-cyan-400 font-mono text-xs">{k}</code></td>
                    <td className="py-1.5 text-slate-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ep.request?.query && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Query Parameters</h5>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-1.5 text-slate-500 font-medium">参数</th>
                  <th className="text-left py-1.5 text-slate-500 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ep.request.query).map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-800/50">
                    <td className="py-1.5"><code className="text-cyan-400 font-mono text-xs">{k}</code></td>
                    <td className="py-1.5 text-slate-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Response */}
        <div>
          <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</h5>
          <CodeBlock code={ep.response} />
        </div>

        {/* Code Example */}
        {ep.example && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">代码示例</h5>
            <CodeBlock code={ep.example} lang="javascript" />
          </div>
        )}

        {/* Notes */}
        {ep.notes && ep.notes.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <h5 className="text-xs font-semibold text-slate-500 mb-2">备注</h5>
            <ul className="space-y-1">
              {ep.notes.map((n, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                  <span className="text-cyan-500 mt-0.5">•</span> {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Codes */}
        {ep.statusCodes && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">HTTP 状态码</h5>
            <div className="grid grid-cols-2 gap-2">
              {ep.statusCodes.map((sc) => (
                <div key={sc.code} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                    sc.code < 300 ? 'bg-emerald-600/15 text-emerald-400'
                    : sc.code < 500 ? 'bg-amber-600/15 text-amber-400'
                    : 'bg-red-600/15 text-red-400'
                  }`}>{sc.code}</span>
                  <span className="text-slate-400">{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function ApiDocsSection() {
  const scanEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/scan'));
  const authEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/auth'));
  const userEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/user'));

  return (
    <section id="api-docs" className="py-20 px-6 border-t border-slate-800/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            <FileCode className="w-4 h-4" />
            开发者接口
          </div>
          <h2 className="text-3xl font-bold mb-4">API 接口文档</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            通过 RESTful API 接入 AlphaSentinel 300 信号扫描服务。所有扫描相关接口使用 API Token 认证，
            用户管理接口使用 JWT 认证。
          </p>
        </div>

        {/* Base URL */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Base URL</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-lg font-mono text-cyan-400">{API_BASE}</code>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider">认证方式</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-1 rounded-full bg-amber-600/10 text-amber-400 border border-amber-500/20">
                  API Token — 扫描接口
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20">
                  JWT — 用户管理
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> 快速开始
          </h3>
          <CodeBlock lang="bash" code={`# 1. 注册账号
curl -X POST ${API_BASE}/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your_password"}'

# 2. 登录获取 JWT
curl -X POST ${API_BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your_password"}'

# 3. 用 JWT 创建 API Token
curl -X POST ${API_BASE}/api/user/tokens \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Bot"}'
# 返回: { "data": { "token": "stx_xxxxxxxx" } }  ← 保存此 Token

# 4. 调用扫描接口
curl -X POST ${API_BASE}/api/scan/request \\
  -H "Authorization: Bearer stx_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"enableSearch":true}'

# 5. 获取扫描结果
curl ${API_BASE}/api/scan/briefings?limit=1 \\
  -H "Authorization: Bearer stx_xxxxxxxx"`} />
        </div>

        {/* Scan Endpoints */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" /> 扫描接口
            <span className="text-xs text-slate-500 font-normal ml-1">核心功能 — 使用 API Token 认证</span>
          </h3>
          <div className="space-y-3">
            {scanEndpoints.map((ep, i) => (
              <EndpointCard key={ep.path} ep={ep} defaultOpen={i === 0} />
            ))}
          </div>
        </div>

        {/* Auth Endpoints */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-400" /> 认证接口
            <span className="text-xs text-slate-500 font-normal ml-1">注册登录 — 无需认证</span>
          </h3>
          <div className="space-y-3">
            {authEndpoints.map((ep) => (
              <EndpointCard key={ep.path} ep={ep} />
            ))}
          </div>
        </div>

        {/* User Endpoints */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" /> 用户接口
            <span className="text-xs text-slate-500 font-normal ml-1">Token 管理 — 使用 JWT 认证</span>
          </h3>
          <div className="space-y-3">
            {userEndpoints.map((ep) => (
              <EndpointCard key={ep.path} ep={ep} />
            ))}
          </div>
        </div>

        {/* Error Format */}
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="text-lg font-semibold mb-3">通用错误格式</h3>
          <p className="text-sm text-slate-400 mb-3">所有接口在失败时返回统一的错误格式：</p>
          <CodeBlock code={`{
  "success": false,
  "error": "错误描述信息"
}`} />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { code: 400, desc: '请求参数错误' },
              { code: 401, desc: '认证失败/Token 无效' },
              { code: 402, desc: 'Token 余额不足' },
              { code: 404, desc: '资源不存在' },
              { code: 409, desc: '邮箱已注册' },
              { code: 429, desc: '频率限制' },
              { code: 500, desc: '服务器内部错误' },
              { code: 503, desc: '服务维护中' },
            ].map((sc) => (
              <div key={sc.code} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                  sc.code < 300 ? 'bg-emerald-600/15 text-emerald-400'
                  : sc.code < 500 ? 'bg-amber-600/15 text-amber-400'
                  : 'bg-red-600/15 text-red-400'
                }`}>{sc.code}</span>
                <span className="text-slate-400">{sc.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal Matrix Reference */}
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-b from-cyan-900/10 to-slate-900/50 border border-cyan-500/15">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" /> 300 信号矩阵参考
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            扫描结果中的 <code className="text-cyan-400">triggeredSignals[].signalId</code> 对应以下 10 大信号组：
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {[
              { id: 'G1', name: 'BTC 核心', range: '1~30' },
              { id: 'G2', name: 'ETH 生态', range: '31~60' },
              { id: 'G3', name: '山寨/Meme', range: '61~90' },
              { id: 'G4', name: 'DeFi/CEX', range: '91~120' },
              { id: 'G5', name: '宏观经济', range: '121~150' },
              { id: 'G6', name: '监管政策', range: '151~180' },
              { id: 'G7', name: '技术指标', range: '181~210' },
              { id: 'G8', name: '链上数据', range: '211~240' },
              { id: 'G9', name: '市场情绪', range: '241~270' },
              { id: 'G10', name: '黑天鹅', range: '271~300' },
            ].map((g) => (
              <div key={g.id} className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30">
                <span className="text-cyan-400 font-bold">{g.id}</span>
                <span className="text-slate-400 ml-1.5">{g.name}</span>
                <div className="text-slate-600 mt-0.5">#{g.range}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            每条信号包含 impact(-10~+10)、confidence(0~1)、category(D=方向/V=波动/R=风险) 三大维度，
            经过时间衰减 + 置信度加权 + tanh 压缩后输出 SD/SV/SR 三大核心指数。
          </p>
        </div>
      </div>
    </section>
  );
}
