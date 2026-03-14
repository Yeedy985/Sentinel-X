'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shield, Zap, Brain, BarChart3, Lock, FileCode, ChevronDown, Copy, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useI18n } from '@/i18n';

// ==================== API 接口文档 ====================
const API_BASE = 'https://alphinel.com';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  title: string;
  desc: string;
  auth: 'API Token' | 'JWT' | '无' | 'None';
  headers: Record<string, string>;
  request?: { body?: Record<string, string>; query?: Record<string, string> };
  response: string;
  example?: string;
  notes?: string[];
  statusCodes?: { code: number; desc: string }[];
}

function getApiEndpoints(locale: string): ApiEndpoint[] {
  const zh = locale === 'zh';
  return [
  {
    method: 'POST',
    path: '/api/scan/request',
    title: zh ? '请求扫描' : 'Request Scan',
    desc: zh ? '请求执行一次 300 信号矩阵扫描。扫描完成后按实际 LLM 消耗扣除 Token，失败自动退回。结果可通过简报接口获取或 SSE 实时推送。' : 'Request a 300-signal matrix scan. Tokens are charged based on actual LLM usage after completion; refunded on failure. Results available via briefings endpoint or SSE push.',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx', 'Content-Type': 'application/json' },
    request: {
      body: {
        'enableSearch': zh ? 'boolean — 是否启用 Perplexity 搜索增强 (默认 true，当前服务固定启用搜索增强，费用按实际 LLM 消耗扣除)' : 'boolean — Enable Perplexity search enhancement (default true, currently always enabled, charged by actual LLM usage)',
      },
    },
    response: `{
  "success": true,
  "data": {
    "briefingId": "brf_1710000000_a1b2c3d4",
    "estimatedSeconds": 30,
    "tokenCost": 1530,
    "cached": false
  }
}`,
    notes: zh ? [
      'tokenCost 为实际 LLM 消耗的 Token 数，每次扫描可能不同',
      '缓存窗口内重复请求不会重复调用 LLM，但仍按同等费用扣除',
      '频率限制：默认每用户每小时最多 3 次',
      'briefingId 用于后续查询简报结果',
    ] : [
      'tokenCost is the actual LLM token consumption, may vary per scan',
      'Repeated requests within cache window won\'t re-invoke LLM, but still charged equally',
      'Rate limit: 3 requests per user per hour by default',
      'briefingId is used to query briefing results later',
    ],
    statusCodes: [
      { code: 200, desc: zh ? '成功 — 扫描已提交或命中缓存' : 'Success — Scan submitted or cache hit' },
      { code: 402, desc: zh ? 'Token 余额不足' : 'Insufficient token balance' },
      { code: 429, desc: zh ? '超出频率限制' : 'Rate limit exceeded' },
      { code: 503, desc: zh ? '服务维护中' : 'Service under maintenance' },
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/briefings',
    title: zh ? '获取简报列表' : 'Get Briefings',
    desc: zh ? '获取当前用户最近的扫描简报结果，包含市场摘要、触发信号、预警信息和管线详情。' : 'Retrieve recent scan briefings including market summary, triggered signals, alerts, and pipeline info.',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx' },
    request: {
      query: {
        'limit': zh ? 'number — 返回数量，1~20，默认 10' : 'number — Results count, 1~20, default 10',
        'after': zh ? 'string — 增量拉取，传入某个 briefingId，只返回该简报之后的新数据' : 'string — Incremental fetch, pass a briefingId to get only newer briefings',
      },
    },
    response: `{
  "success": true,
  "data": [
    {
      "briefingId": "brf_1710000000_a1b2c3d4",
      "timestamp": 1710000030000,
      "marketSummary": "BTC broke through $95,000...",
      "triggeredSignals": [
        {
          "signalId": 1,
          "impact": 8,
          "confidence": 0.85,
          "title": "BTC breaks key resistance",
          "summary": "Price broke through $95,000 psychological level...",
          "source": "Perplexity Search"
        }
      ],
      "alerts": [
        {
          "title": "Major breakout alert",
          "description": "BTC price broke key technical level...",
          "level": "critical",
          "group": "G1_BTC_CORE",
          "relatedCoins": ["BTC"],
          "source": "DeepSeek Analysis"
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
    notes: zh ? [
      'triggeredSignals 中的 signalId 对应 300 信号矩阵中的信号编号 (1~300)',
      'alerts.level 取值: "critical"(紧急) / "warning"(一般) / "info"(信息)',
      '信号 impact 取值范围 -10 ~ +10，正值看涨，负值看跌',
    ] : [
      'signalId in triggeredSignals maps to signal #1~300 in the signal matrix',
      'alerts.level: "critical" / "warning" / "info"',
      'Signal impact range: -10 ~ +10, positive = bullish, negative = bearish',
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/stream',
    title: zh ? 'SSE 实时推送' : 'SSE Real-time Push',
    desc: zh ? '建立 Server-Sent Events 长连接，实时接收扫描完成后的简报推送。适用于实时监控场景。' : 'Establish a Server-Sent Events connection to receive briefing push notifications in real-time.',
    auth: 'API Token',
    headers: {},
    request: {
      query: {
        'token': zh ? 'string — API Token (URL参数传递，因 EventSource 不支持自定义 Header)' : 'string — API Token (passed as URL param since EventSource doesn\'t support custom headers)',
      },
    },
    response: `event: connected
data: {"userId":1,"version":"1.0.0"}

event: heartbeat
data: {"t":1710000015000}

event: briefing
data: {"briefingId":"brf_...","timestamp":...,"marketSummary":"...","triggeredSignals":[...],"alerts":[...],"pipelineInfo":{...}}`,
    example: zh ? `const es = new EventSource(
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
});` : `const es = new EventSource(
  '${API_BASE}/api/scan/stream?token=stx_xxxxxxxx'
);

es.addEventListener('briefing', (event) => {
  const briefing = JSON.parse(event.data);
  console.log('New briefing:', briefing.marketSummary);
  console.log('Triggered signals:', briefing.triggeredSignals.length);
  console.log('Alerts:', briefing.alerts.length);
});

es.addEventListener('heartbeat', () => {
  // Server sends heartbeat every 15 seconds
});`,
    notes: zh ? [
      'EventSource 会自动重连，无需手动处理断线',
      '心跳间隔 15 秒，用于保持连接活跃',
      '简报推送事件名为 "briefing"，数据格式与 /briefings 接口一致',
    ] : [
      'EventSource auto-reconnects, no manual handling needed',
      'Heartbeat interval: 15 seconds, keeps connection alive',
      'Briefing push event name is "briefing", same format as /briefings endpoint',
    ],
  },
  {
    method: 'GET',
    path: '/api/scan/status',
    title: zh ? '服务状态' : 'Service Status',
    desc: zh ? '检查公共服务运行状态和当前用户的 Token 余额。可用于健康检查和余额监控。' : 'Check service status and current user token balance. Useful for health checks and balance monitoring.',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx' },
    response: `{
  "success": true,
  "data": {
    "ok": true,
    "version": "1.0.0",
    "tokenBalance": 18500,
    "message": null
  }
}`,
    notes: zh ? [
      'ok=false 时表示服务维护中，此时 message 包含维护说明',
      'tokenBalance 为当前用户 Token 余额',
    ] : [
      'ok=false means service is under maintenance, message contains details',
      'tokenBalance is the current user\'s token balance',
    ],
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    title: zh ? '用户注册' : 'Register',
    desc: zh ? '注册新账号，注册成功即赠送 Token（数量以管理后台配置为准）。' : 'Register a new account. Bonus tokens are granted upon registration (amount configured by admin).',
    auth: zh ? '无' : 'None',
    headers: { 'Content-Type': 'application/json' },
    request: {
      body: {
        'email': zh ? 'string — 邮箱地址 (唯一)' : 'string — Email address (unique)',
        'password': zh ? 'string — 密码 (至少 6 位)' : 'string — Password (min 6 characters)',
        'nickname': zh ? 'string? — 昵称 (可选)' : 'string? — Nickname (optional)',
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
      "tokenBalance": 20000,
      "status": "active",
      "createdAt": "2026-03-12T00:00:00.000Z"
    }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    title: zh ? '用户登录' : 'Login',
    desc: zh ? '使用邮箱和密码登录，返回 JWT Token。' : 'Login with email and password, returns a JWT token.',
    auth: zh ? '无' : 'None',
    headers: { 'Content-Type': 'application/json' },
    request: {
      body: {
        'email': zh ? 'string — 邮箱地址' : 'string — Email address',
        'password': zh ? 'string — 密码' : 'string — Password',
      },
    },
    response: `{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "email": "...", "tokenBalance": 20000, ... }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/user/tokens',
    title: zh ? '创建 API Token' : 'Create API Token',
    desc: zh ? '创建一个用于调用扫描接口的 API Token。Token 仅在创建时完整显示一次，请妥善保存。' : 'Create an API token for calling scan endpoints. The full token is only shown once upon creation — save it securely.',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...', 'Content-Type': 'application/json' },
    request: {
      body: {
        'name': zh ? 'string? — Token 名称备注 (可选)' : 'string? — Token name/note (optional)',
      },
    },
    response: `{
  "success": true,
  "data": {
    "id": 1,
    "token": "stx_a1b2c3d4e5f6...",
    "tokenPrefix": "stx_a1b2",
    "name": "My Trading Bot"
  }
}`,
    notes: zh ? [
      'API Token 以 stx_ 前缀开头',
      '完整 Token 仅此一次返回，后续只能查看前缀',
      '调用扫描相关接口时使用此 Token 认证',
    ] : [
      'API Token starts with stx_ prefix',
      'Full token is only returned once, only prefix shown afterwards',
      'Use this token for scan endpoint authentication',
    ],
  },
  {
    method: 'GET',
    path: '/api/user/tokens',
    title: zh ? 'API Token 列表' : 'List API Tokens',
    desc: zh ? '列出当前用户所有 API Token（仅显示前缀）。' : 'List all API tokens for the current user (prefix only).',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...' },
    response: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "tokenPrefix": "stx_a1b2",
      "name": "My Trading Bot",
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
    title: zh ? '吊销 API Token' : 'Revoke API Token',
    desc: zh ? '永久吊销指定的 API Token，吊销后该 Token 无法再用于认证。' : 'Permanently revoke the specified API token. It can no longer be used for authentication.',
    auth: 'JWT',
    headers: { 'Authorization': 'Bearer eyJhbGci...' },
    response: `{ "success": true, "message": "Token revoked" }`,
  },
];
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="p-5 bg-[#0a0f1e] border border-white/[0.06] rounded-xl text-[13px] overflow-x-auto">
        <code className={`language-${lang} text-slate-300 leading-relaxed`}>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ ep, defaultOpen = false }: { ep: ApiEndpoint; defaultOpen?: boolean }) {
  const { locale } = useI18n();
  const zh = locale === 'zh';
  const methodColor: Record<string, string> = {
    GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <details open={defaultOpen} className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden group/ep hover:border-white/[0.1] transition-colors duration-200">
      <summary className="flex items-center gap-3 p-5 cursor-pointer hover:bg-white/[0.02] transition-colors duration-200 list-none [&::-webkit-details-marker]:hidden">
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${methodColor[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-[13px] text-cyan-400 font-mono">{ep.path}</code>
        <span className="text-[13px] text-slate-400 ml-2 font-medium">{ep.title}</span>
        <span className={`ml-auto text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
          ep.auth === 'API Token' ? 'bg-amber-500/[0.08] text-amber-400 border-amber-500/15'
          : ep.auth === 'JWT' ? 'bg-violet-500/[0.08] text-violet-400 border-violet-500/15'
          : 'bg-white/[0.03] text-slate-500 border-white/[0.06]'
        }`}>
          {ep.auth}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-600 transition-transform duration-200 group-open/ep:rotate-180" />
      </summary>

      <div className="px-5 pb-5 space-y-5 border-t border-white/[0.04] pt-5">
        <p className="text-[13px] text-slate-400 leading-relaxed">{ep.desc}</p>

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
                  <th className="text-left py-1.5 text-slate-500 font-medium">{zh ? '字段' : 'Field'}</th>
                  <th className="text-left py-1.5 text-slate-500 font-medium">{zh ? '说明' : 'Description'}</th>
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
                  <th className="text-left py-1.5 text-slate-500 font-medium">{zh ? '参数' : 'Parameter'}</th>
                  <th className="text-left py-1.5 text-slate-500 font-medium">{zh ? '说明' : 'Description'}</th>
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
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{zh ? '代码示例' : 'Code Example'}</h5>
            <CodeBlock code={ep.example} lang="javascript" />
          </div>
        )}

        {/* Notes */}
        {ep.notes && ep.notes.length > 0 && (
          <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.05]">
            <h5 className="text-[11px] font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">{zh ? '备注' : 'Notes'}</h5>
            <ul className="space-y-1.5">
              {ep.notes.map((n, i) => (
                <li key={i} className="text-[12px] text-slate-400 flex items-start gap-2 leading-relaxed">
                  <span className="text-cyan-400/60 mt-0.5 shrink-0">•</span> {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Codes */}
        {ep.statusCodes && (
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{zh ? 'HTTP 状态码' : 'HTTP Status Codes'}</h5>
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

export default function DocsPage() {
  const { locale } = useI18n();
  const endpoints = getApiEndpoints(locale);
  const scanEndpoints = endpoints.filter(ep => ep.path.startsWith('/api/scan'));
  const authEndpoints = endpoints.filter(ep => ep.path.startsWith('/api/auth'));
  const userEndpoints = endpoints.filter(ep => ep.path.startsWith('/api/user'));
  const zh = locale === 'zh';

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <Navbar />

      {/* ═══════ Hero ═══════ */}
      <section className="relative pt-28 pb-8 sm:pt-32 sm:pb-12 px-5 sm:px-8 text-center overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] text-sm font-medium mb-6">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-violet-300">{locale === 'zh' ? '开发者接口' : 'Developer API'}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">{locale === 'zh' ? 'API 接口文档' : 'API Documentation'}</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {locale === 'zh'
              ? '将 AlphaSentinel 的 AI 扫描能力集成到你自己的交易系统或机器人，几行代码即可接入 300+ 信号扫描服务。'
              : 'Integrate AlphaSentinel AI scanning into your own trading system or bot. Just a few lines of code to access the 300+ signal scanning service.'
            }
          </p>
        </div>
      </section>

      <div className="px-5 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto">

          {/* Base URL */}
          <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base URL</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="text-[17px] font-mono font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{API_BASE}</code>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/[0.06] text-amber-400 border border-amber-500/[0.12] font-medium">
                  API Token — {locale === 'zh' ? '扫描接口' : 'Scan API'}
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/[0.06] text-violet-400 border border-violet-500/[0.12] font-medium">
                  JWT — {locale === 'zh' ? '用户管理' : 'User Mgmt'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{locale === 'zh' ? '快速开始' : 'Quick Start'}</h3>
            </div>
            <CodeBlock lang="bash" code={zh ? `# 1. 注册账号
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
  -H "Authorization: Bearer stx_xxxxxxxx"` : `# 1. Register an account
curl -X POST ${API_BASE}/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your_password"}'

# 2. Login to get JWT
curl -X POST ${API_BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your_password"}'

# 3. Create API Token with JWT
curl -X POST ${API_BASE}/api/user/tokens \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Bot"}'
# Returns: { "data": { "token": "stx_xxxxxxxx" } }  ← Save this token

# 4. Call scan endpoint
curl -X POST ${API_BASE}/api/scan/request \\
  -H "Authorization: Bearer stx_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"enableSearch":true}'

# 5. Get scan results
curl ${API_BASE}/api/scan/briefings?limit=1 \\
  -H "Authorization: Bearer stx_xxxxxxxx"`} />
          </div>

          {/* Scan Endpoints */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{locale === 'zh' ? '扫描接口' : 'Scan Endpoints'}</h3>
                <p className="text-sm text-slate-400">{locale === 'zh' ? '核心功能 — 发起扫描、获取简报、SSE 实时推送' : 'Core — Start scan, get briefings, SSE real-time push'}</p>
              </div>
            </div>
            <div className="space-y-3">
              {scanEndpoints.map((ep, i) => (
                <EndpointCard key={ep.path} ep={ep} defaultOpen={i === 0} />
              ))}
            </div>
          </div>

          {/* Auth Endpoints */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{locale === 'zh' ? '认证接口' : 'Auth Endpoints'}</h3>
                <p className="text-sm text-slate-400">{locale === 'zh' ? '注册、登录 — 无需认证即可调用' : 'Register, Login — No auth required'}</p>
              </div>
            </div>
            <div className="space-y-3">
              {authEndpoints.map((ep) => (
                <EndpointCard key={ep.path} ep={ep} />
              ))}
            </div>
          </div>

          {/* User Endpoints */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{locale === 'zh' ? '用户接口' : 'User Endpoints'}</h3>
                <p className="text-sm text-slate-400">{locale === 'zh' ? 'API Token 的创建、列表和吁销管理' : 'API Token creation, listing, and revocation'}</p>
              </div>
            </div>
            <div className="space-y-3">
              {userEndpoints.map((ep) => (
                <EndpointCard key={`${ep.method} ${ep.path}`} ep={ep} />
              ))}
            </div>
          </div>

          {/* Error Format */}
          <div className="relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
            <h3 className="text-lg font-bold mb-3 tracking-tight">{locale === 'zh' ? '通用错误格式' : 'Error Format'}</h3>
            <p className="text-sm text-slate-400 mb-4">{locale === 'zh' ? '所有接口失败时返回统一的 JSON 错误格式：' : 'All endpoints return a unified JSON error format on failure:'}</p>
            <CodeBlock code={zh ? `{
  "success": false,
  "error": "错误描述信息"
}` : `{
  "success": false,
  "error": "Error description message"
}`} />
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(zh ? [
                { code: 400, desc: '请求参数错误' },
                { code: 401, desc: '认证失败/Token 无效' },
                { code: 402, desc: 'Token 余额不足' },
                { code: 404, desc: '资源不存在' },
                { code: 409, desc: '邮箱已注册' },
                { code: 429, desc: '频率限制' },
                { code: 500, desc: '服务器内部错误' },
                { code: 503, desc: '服务维护中' },
              ] : [
                { code: 400, desc: 'Bad request parameters' },
                { code: 401, desc: 'Auth failed / Invalid token' },
                { code: 402, desc: 'Insufficient token balance' },
                { code: 404, desc: 'Resource not found' },
                { code: 409, desc: 'Email already registered' },
                { code: 429, desc: 'Rate limit exceeded' },
                { code: 500, desc: 'Internal server error' },
                { code: 503, desc: 'Service under maintenance' },
              ]).map((sc) => (
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
          <div className="relative mt-12 p-7 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] via-blue-500/[0.02] to-transparent" />
            <div className="absolute inset-0 border border-cyan-500/[0.12] rounded-2xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{locale === 'zh' ? '300 信号矩阵参考' : '300 Signal Matrix Reference'}</h3>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                {zh
                  ? <>每次扫描结果中的 <code className="text-cyan-400 bg-cyan-500/[0.08] px-1.5 py-0.5 rounded">triggeredSignals</code> 包含被触发的信号，对应以下 10 大信号组：</>
                  : <>Each scan result's <code className="text-cyan-400 bg-cyan-500/[0.08] px-1.5 py-0.5 rounded">triggeredSignals</code> contains triggered signals mapped to the following 10 signal groups:</>}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                {(zh ? [
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
                ] : [
                  { id: 'G1', name: 'BTC Core', range: '1~30' },
                  { id: 'G2', name: 'ETH Ecosystem', range: '31~60' },
                  { id: 'G3', name: 'Altcoin/Meme', range: '61~90' },
                  { id: 'G4', name: 'DeFi/CEX', range: '91~120' },
                  { id: 'G5', name: 'Macro Economy', range: '121~150' },
                  { id: 'G6', name: 'Regulation', range: '151~180' },
                  { id: 'G7', name: 'Technical', range: '181~210' },
                  { id: 'G8', name: 'On-chain Data', range: '211~240' },
                  { id: 'G9', name: 'Sentiment', range: '241~270' },
                  { id: 'G10', name: 'Black Swan', range: '271~300' },
                ]).map((g) => (
                  <div key={g.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                    <span className="text-cyan-400 font-bold">{g.id}</span>
                    <span className="text-slate-300 ml-1.5 font-medium">{g.name}</span>
                    <div className="text-slate-600 mt-0.5">#{g.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                {zh
                  ? '每条信号包含影响力(impact)、置信度(confidence)、类别(D=方向/V=波动/R=风险) 三大维度，综合计算后输出 SD(方向) / SV(波动) / SR(风险) 三大核心可执行指数。'
                  : 'Each signal contains impact, confidence, and category (D=Direction/V=Volatility/R=Risk). Combined, they produce three core actionable indices: SD (Direction) / SV (Volatility) / SR (Risk).'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
