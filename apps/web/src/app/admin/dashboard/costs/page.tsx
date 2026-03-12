'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Save, Loader2 } from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

export default function CostsPage() {
  const router = useRouter();
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getCosts();
    if (res.success) setCosts((res.data as any[]) || []);
    setLoading(false);
  };

  const handleUpdate = async (id: number, value: string) => {
    setSaving(id);
    await adminApi.updateCost(id, { costPerCall: parseFloat(value) || 0 });
    await load();
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-5 xl:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          LLM 成本配置
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px]">配置各 LLM 模型的每次调用成本，用于财务利润计算</p>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40 bg-white/[0.01]">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Provider</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">角色</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">每次调用成本 (USD)</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-16"></th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-b border-slate-800/20 hover:bg-white/[0.015] transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-cyan-400">{c.provider}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${c.role === 'SEARCHER' ? 'bg-blue-500/10 text-blue-400' : c.role === 'ANALYZER' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {c.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">{c.model}</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.000001"
                    defaultValue={c.costPerCall}
                    onBlur={(e) => handleUpdate(c.id, e.target.value)}
                    className="w-32 text-right px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  {saving === c.id && <Loader2 className="w-4 h-4 animate-spin text-amber-400 inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {costs.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base">暂无成本配置</p>
          <p className="text-sm text-slate-600 mt-1">请先运行 <code className="text-amber-400">pnpm db:seed</code> 初始化数据</p>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">说明</h3>
        <ul className="text-sm text-slate-500 space-y-2">
          <li>- **每次调用成本**：每次调用该 LLM 的预估 USD 成本，失焦自动保存</li>
          <li>- 扫描工作流按角色调用对应管线，成本自动记录到扫描记录中</li>
          <li>- 实际成本用于财务报表的利润计算</li>
        </ul>
      </div>
    </div>
  );
}
