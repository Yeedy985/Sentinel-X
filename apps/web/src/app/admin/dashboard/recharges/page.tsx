'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Loader2, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

type StatusFilter = '' | 'PENDING' | 'COMPLETED' | 'FAILED';

interface RechargeItem {
  id: number;
  userId: number;
  userEmail: string;
  userNickname: string | null;
  amount: number;
  method: string;
  txRef: string | null;
  status: string;
  note: string | null;
  createdAt: string;
}

export default function RechargesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<RechargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [operating, setOperating] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/admin/login'); return; }
    load();
  }, []);

  useEffect(() => { load(1); }, [statusFilter]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getRecharges(p, statusFilter || undefined);
      if (res.success) {
        const d = res.data as any;
        setOrders(d.data || []);
        setPage(d.page);
        setTotalPages(d.totalPages);
        setTotal(d.total);
      }
    } catch (e) {
      console.error('Failed to load recharges:', e);
    }
    setLoading(false);
  }, [statusFilter, page]);

  const handleApprove = async (id: number) => {
    if (!confirm('确认审核通过？将自动为用户充值 Token')) return;
    setOperating(id);
    const res = await adminApi.approveRecharge(id);
    if (res.success) {
      alert(res.message || '已确认');
      await load();
    } else {
      alert((res as any).error || '操作失败');
    }
    setOperating(null);
  };

  const handleReject = async (id: number) => {
    const reason = prompt('拒绝原因（可选）：');
    if (reason === null) return; // user cancelled
    setOperating(id);
    const res = await adminApi.rejectRecharge(id, reason || undefined);
    if (res.success) {
      await load();
    } else {
      alert((res as any).error || '操作失败');
    }
    setOperating(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400"><Clock className="w-3 h-3" />待审核</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-3 h-3" />已完成</span>;
      case 'FAILED': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-red-500/10 text-red-400"><XCircle className="w-3 h-3" />已拒绝</span>;
      default: return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="p-5 xl:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            充值审核
          </h1>
          <p className="text-sm text-slate-400 mt-2 ml-[52px]">共 {total} 条充值记录</p>
        </div>
        {/* Status Filter */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-slate-800/40">
          {([
            { key: '' as StatusFilter, label: '全部' },
            { key: 'PENDING' as StatusFilter, label: '待审核' },
            { key: 'COMPLETED' as StatusFilter, label: '已完成' },
            { key: 'FAILED' as StatusFilter, label: '已拒绝' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === f.key
                  ? 'bg-amber-500/15 text-amber-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40 bg-white/[0.01]">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400 w-16">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">用户</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-400 w-28">金额</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-400 w-24">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">备注</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-400 w-44">时间</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-400 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-600 text-sm">
                  暂无充值记录
                </td>
              </tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="border-b border-slate-800/20 hover:bg-white/[0.015] transition-colors">
                <td className="px-4 py-3 text-slate-500 font-mono text-sm">#{o.id}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-white font-medium">{o.userEmail}</div>
                  {o.userNickname && <div className="text-xs text-slate-500">{o.userNickname}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-cyan-400">{o.amount} USDT</span>
                </td>
                <td className="px-4 py-3 text-center">{statusBadge(o.status)}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{o.note || '-'}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">{new Date(o.createdAt).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  {o.status === 'PENDING' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleApprove(o.id)}
                        disabled={operating === o.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-all disabled:opacity-40"
                      >
                        {operating === o.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '✓ 通过'}
                      </button>
                      <button
                        onClick={() => handleReject(o.id)}
                        disabled={operating === o.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all disabled:opacity-40"
                      >
                        ✗ 拒绝
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-sm text-slate-500">第 {page} / {totalPages} 页</span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}
