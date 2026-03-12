'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Loader2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

const PERIODS = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 },
];

export default function FinancePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load(days);
  }, []);

  const load = async (d: number) => {
    setLoading(true);
    setDays(d);
    const res = await adminApi.getFinance(d);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const daily = data?.daily || [];

  return (
    <div className="p-6 xl:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            财务报表
          </h1>
          <p className="text-sm text-slate-500 mt-2 ml-[52px]">收入、成本与利润分析</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-slate-800/40">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => load(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${days === p.value ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
        <SummaryCard label="总扫描" value={`${summary.totalScans ?? 0} 次`} color="text-cyan-400" bg="bg-cyan-500/8" />
        <SummaryCard label="总收入 (USD)" value={`$${(summary.totalRevenue ?? 0).toFixed(2)}`} color="text-emerald-400" bg="bg-emerald-500/8" />
        <SummaryCard label="总 LLM 成本" value={`$${(summary.totalCost ?? 0).toFixed(2)}`} color="text-red-400" bg="bg-red-500/8" />
        <SummaryCard label="净利润 (USD)" value={`$${(summary.totalProfit ?? 0).toFixed(2)}`} color={(summary.totalProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} bg={(summary.totalProfit ?? 0) >= 0 ? 'bg-emerald-500/8' : 'bg-red-500/8'} />
      </div>

      {/* Chart */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/40">
        <h3 className="text-sm font-semibold text-slate-300 mb-5">日收入 vs 成本</h3>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 12, fontSize: 13, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="revenue" name="收入 (USD)" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cost" name="LLM 成本" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-slate-600 py-12 text-sm">暂无数据</div>
        )}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">扫描统计</h3>
          <div className="space-y-3">
            <DetailRow label="总扫描次数" value={`${summary.totalScans ?? 0} 次`} />
            <DetailRow label="缓存命中次数" value={`${summary.cachedScans ?? 0} 次`} />
            <DetailRow label="缓存命中率" value={`${summary.totalScans > 0 ? ((summary.cachedScans / summary.totalScans) * 100).toFixed(1) : 0}%`} />
            <DetailRow label="实际 LLM 调用" value={`${(summary.totalScans ?? 0) - (summary.cachedScans ?? 0)} 次`} />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">利润分析</h3>
          <div className="space-y-3">
            <DetailRow label="总收入" value={`$${(summary.totalRevenue ?? 0).toFixed(2)}`} />
            <DetailRow label="总 LLM 成本" value={`$${(summary.totalCost ?? 0).toFixed(2)}`} />
            <DetailRow label="净利润" value={`$${(summary.totalProfit ?? 0).toFixed(2)}`} />
            <DetailRow label="利润率" value={`${summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, bg }: { label: string; value: any; color: string; bg: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40 hover:border-slate-700/50 transition-colors">
      <div className="text-sm text-slate-500 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
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
