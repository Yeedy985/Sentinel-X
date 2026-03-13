'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shield, Zap, Brain, BarChart3, Lock, FileCode, ChevronDown, Copy, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
    desc: '请求执行一次 300 信号矩阵扫描。扫描完成后按实际 LLM 消耗扣除 Token，失败自动退回。结果可通过简报接口获取或 SSE 实时推送。',
    auth: 'API Token',
    headers: { 'Authorization': 'Bearer stx_xxxxxxxx', 'Content-Type': 'application/json' },
    request: {
      body: {
        'enableSearch': 'boolean — 是否启用 Perplexity 搜索增强 (默认 true，当前服务固定启用搜索增强，费用按实际 LLM 消耗扣除)',
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
    notes: [
      'tokenCost 为实际 LLM 消耗的 Token 数，每次扫描可能不同',
      '缓存窗口内重复请求不会重复调用 LLM，但仍按同等费用扣除',
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
    "tokenBalance": 18500,
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
    "user": { "id": 1, "email": "...", "tokenBalance": 20000, ... }
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
          <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.05]">
            <h5 className="text-[11px] font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">备注</h5>
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

export default function DocsPage() {
  const scanEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/scan'));
  const authEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/auth'));
  const userEndpoints = API_ENDPOINTS.filter(ep => ep.path.startsWith('/api/user'));

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
            <span className="text-violet-300">开发者接口</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">API 接口文档</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            将 AlphaSentinel 的 AI 扫描能力集成到你自己的交易系统或机器人，几行代码即可接入 300+ 信号扫描服务。
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
                  API Token — 扫描接口
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/[0.06] text-violet-400 border border-violet-500/[0.12] font-medium">
                  JWT — 用户管理
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
              <h3 className="text-xl font-bold tracking-tight">快速开始</h3>
            </div>
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
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">扫描接口</h3>
                <p className="text-sm text-slate-400">核心功能 — 发起扫描、获取简报、SSE 实时推送</p>
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
                <h3 className="text-xl font-bold tracking-tight">认证接口</h3>
                <p className="text-sm text-slate-400">注册、登录 — 无需认证即可调用</p>
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
                <h3 className="text-xl font-bold tracking-tight">用户接口</h3>
                <p className="text-sm text-slate-400">API Token 的创建、列表和吁销管理</p>
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
            <h3 className="text-lg font-bold mb-3 tracking-tight">通用错误格式</h3>
            <p className="text-sm text-slate-400 mb-4">所有接口失败时返回统一的 JSON 错误格式：</p>
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
          <div className="relative mt-12 p-7 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] via-blue-500/[0.02] to-transparent" />
            <div className="absolute inset-0 border border-cyan-500/[0.12] rounded-2xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">300 信号矩阵参考</h3>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                每次扫描结果中的 <code className="text-cyan-400 bg-cyan-500/[0.08] px-1.5 py-0.5 rounded">triggeredSignals</code> 包含被触发的信号，对应以下 10 大信号组：
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
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
                  <div key={g.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                    <span className="text-cyan-400 font-bold">{g.id}</span>
                    <span className="text-slate-300 ml-1.5 font-medium">{g.name}</span>
                    <div className="text-slate-600 mt-0.5">#{g.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                每条信号包含影响力(impact)、置信度(confidence)、类别(D=方向/V=波动/R=风险) 三大维度，
                综合计算后输出 SD(方向) / SV(波动) / SR(风险) 三大核心可执行指数。
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
