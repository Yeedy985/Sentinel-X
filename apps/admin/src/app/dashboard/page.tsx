'use client';

import { useEffect, useState } from 'react';
import { Users, Coins, Loader2, Activity, AlertTriangle, ChevronLeft, ChevronRight, Cpu, Radio, Zap } from 'lucide-react';
import { adminApi } from '@/lib/api';

type LogTab = 'system' | 'calls';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Log tabs
  const [logTab, setLogTab] = useState<LogTab>('system');
  const [systemScans, setSystemScans] = useState<any[]>([]);
  const [systemPage, setSystemPage] = useState(1);
  const [systemTotalPages, setSystemTotalPages] = useState(0);
  const [systemTotal, setSystemTotal] = useState(0);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [callPage, setCallPage] = useState(1);
  const [callTotalPages, setCallTotalPages] = useState(0);
  const [callTotal, setCallTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (logTab === 'system') loadSystemScans(systemPage);
    else loadCallLogs(callPage);
  }, [logTab]);

  const loadStats = async () => {
    setLoading(true);
    const res = await adminApi.getDashboard();
    if (res.success) setStats(res.data);
    setLoading(false);
    // 加载默认日志
    loadSystemScans(1);
  };

  const loadSystemScans = async (page: number) => {
    setLogsLoading(true);
    const res = await adminApi.getSystemScans(page);
    if (res.success) {
      const d = res.data as any;
      setSystemScans(d.data || []);
      setSystemPage(d.page);
      setSystemTotalPages(d.totalPages);
      setSystemTotal(d.total);
    }
    setLogsLoading(false);
  };

  const loadCallLogs = async (page: number) => {
    setLogsLoading(true);
    const res = await adminApi.getCallLogs(page);
    if (res.success) {
      const d = res.data as any;
      setCallLogs(d.data || []);
      setCallPage(d.page);
      setCallTotalPages(d.totalPages);
      setCallTotal(d.total);
    }
    setLogsLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  const today = stats?.today || {};
  const month = stats?.thisMonth || {};

  return (
    <div className="p-6 xl:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">运营仪表盘</h1>
        <p className="text-sm text-slate-500 mt-1">Sentinel-X 服务运营数据概览</p>
      </div>

      {/* Today Stat Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">今日概览</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
          <StatCard icon={Activity} label="今日扫描" value={today.totalScans ?? 0} color="text-emerald-400" bg="bg-emerald-500/8" sub={`真实 ${today.realScans ?? 0} · 缓存 ${today.cachedScans ?? 0}`} />
          <StatCard icon={Coins} label="今日收入" value={`$${(today.revenue ?? 0).toFixed(2)}`} color="text-amber-400" bg="bg-amber-500/8" sub={`成本 $${(today.cost ?? 0).toFixed(2)}`} />
          <StatCard icon={Users} label="活跃用户" value={today.activeUsers ?? 0} color="text-cyan-400" bg="bg-cyan-500/8" sub={`新注册 ${today.newUsers ?? 0}`} />
          <StatCard icon={AlertTriangle} label="今日利润" value={`$${(today.profit ?? 0).toFixed(2)}`} color={(today.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} bg={(today.profit ?? 0) >= 0 ? 'bg-emerald-500/8' : 'bg-red-500/8'} sub={`利润率 ${today.revenue > 0 ? ((today.profitRate ?? 0) * 100).toFixed(1) : 0}%`} />
        </div>
      </div>

      {/* Month + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">本月统计</h3>
          <div className="space-y-3">
            <DetailRow label="总扫描" value={`${month.totalScans ?? 0} 次`} />
            <DetailRow label="总收入 (USD)" value={`$${(month.revenue ?? 0).toFixed(2)}`} />
            <DetailRow label="总 LLM 成本" value={`$${(month.cost ?? 0).toFixed(2)}`} />
            <DetailRow label="净利润" value={`$${(month.profit ?? 0).toFixed(2)}`} />
            <DetailRow label="新注册用户" value={`${month.newUsers ?? 0} 人`} />
            <DetailRow label="充值总额" value={`${month.rechargeTotal ?? 0}`} />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">今日详情</h3>
          <div className="space-y-3">
            <DetailRow label="缓存命中率" value={`${today.totalScans > 0 ? ((today.cacheHitRate ?? 0) * 100).toFixed(1) : 0}%`} />
            <DetailRow label="今日充值" value={`${today.rechargeTotal ?? 0}`} />
            <DetailRow label="LLM 成本" value={`$${(today.cost ?? 0).toFixed(4)}`} />
            <DetailRow label="收入 (USD)" value={`$${(today.revenue ?? 0).toFixed(4)}`} />
            <DetailRow label="净利润" value={`$${(today.profit ?? 0).toFixed(4)}`} />
            <DetailRow label="利润率" value={`${today.revenue > 0 ? ((today.profitRate ?? 0) * 100).toFixed(1) : 0}%`} />
          </div>
        </div>
      </div>

      {/* ==================== 扫描记录 / 调用记录 ==================== */}
      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-slate-800/40 bg-white/[0.01]">
          <button
            onClick={() => setLogTab('system')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-all ${logTab === 'system' ? 'border-orange-400 text-orange-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <Cpu className="w-4 h-4" /> 扫描记录
            <span className="text-xs bg-slate-800/80 px-2 py-0.5 rounded-full">{systemTotal}</span>
          </button>
          <button
            onClick={() => setLogTab('calls')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-all ${logTab === 'calls' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <Radio className="w-4 h-4" /> 调用记录
            <span className="text-xs bg-slate-800/80 px-2 py-0.5 rounded-full">{callTotal}</span>
          </button>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : logTab === 'system' ? (
          <div>
            <div className="px-6 py-2.5 text-xs text-slate-600 border-b border-slate-800/30">
              管理后台按配置的自动扫描时间执行300信号分析，每次记录 Token 消耗
            </div>
            <div className="divide-y divide-slate-800/20">
              {systemScans.length === 0 && (
                <div className="text-center text-sm text-slate-600 py-16">暂无扫描记录</div>
              )}
              {systemScans.map((s: any) => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <code className="text-xs font-mono text-slate-400">{s.briefingId}</code>
                      <StatusBadge status={s.status} />
                      {s.enableSearch && <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">搜索增强</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-3 flex-wrap">
                      <span>{new Date(s.startedAt).toLocaleString('zh-CN')}</span>
                      {s.completedAt && <span>耗时 {Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)}s</span>}
                      {s.analyzerProvider && <span className="text-slate-500">{s.searcherProvider ? `${s.searcherProvider}/${s.searcherModel}` : ''} → {s.analyzerProvider}/{s.analyzerModel}</span>}
                    </div>
                    {s.errorMessage && <div className="text-xs text-red-400 mt-1">❌ {s.errorMessage}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {s.status === 'COMPLETED' ? (
                      <>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-semibold text-amber-400">{s.tokenCostTotal.toLocaleString()} Token</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          搜索 {s.tokenCostSearch.toLocaleString()} + 分析 {s.tokenCostAnalyze.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.signalCount} 信号 · {s.alertCount} 预警 · ${s.realCostUsd.toFixed(4)}
                        </div>
                      </>
                    ) : s.status === 'FAILED' ? (
                      <span className="text-sm text-red-400 font-medium">失败</span>
                    ) : (
                      <span className="text-sm text-amber-400">处理中</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {systemTotalPages > 1 && (
              <Pagination page={systemPage} totalPages={systemTotalPages} onPage={loadSystemScans} />
            )}
          </div>
        ) : (
          <div>
            <div className="px-6 py-2.5 text-xs text-slate-600 border-b border-slate-800/30">
              用户通过公共主页调用300信号扫描服务，缓存时间内推送上次真实扫描结果
            </div>
            <div className="divide-y divide-slate-800/20">
              {callLogs.length === 0 && (
                <div className="text-center text-sm text-slate-600 py-16">暂无调用记录</div>
              )}
              {callLogs.map((r: any) => (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {r.isCached ? (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400">缓存推送</span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">真实调用</span>
                      )}
                      <span className="text-sm text-slate-300">{r.userNickname || r.userEmail}</span>
                      <code className="text-xs font-mono text-slate-600">{r.briefingId}</code>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-3 flex-wrap">
                      <span>{new Date(r.startedAt).toLocaleString('zh-CN')}</span>
                      {r.status === 'COMPLETED' && <span>{r.signalCount} 信号 · {r.alertCount} 预警</span>}
                    </div>
                    {r.errorMessage && <div className="text-xs text-red-400 mt-1">❌ {r.errorMessage}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400">-{r.tokenCost} Token</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      成本 ${r.realCostUsd.toFixed(4)} · 收入 ${r.revenueUsd.toFixed(4)}
                    </div>
                    <div className="text-xs text-emerald-400 font-medium">
                      利润 ${r.profitUsd.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {callTotalPages > 1 && (
              <Pagination page={callPage} totalPages={callTotalPages} onPage={loadCallLogs} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function StatCard({ icon: Icon, label, value, color, bg, sub }: { icon: any; label: string; value: any; color: string; bg: string; sub?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40 hover:border-slate-700/50 transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1.5">{sub}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">完成</span>;
    case 'FAILED':
      return <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">失败</span>;
    case 'PROCESSING':
      return <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">处理中</span>;
    default:
      return <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">排队中</span>;
  }
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-5 py-4 border-t border-slate-800/30">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-slate-500">{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
