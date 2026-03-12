'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ChevronLeft, ChevronRight, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    loadUsers();
  }, []);

  const loadUsers = async (p = 1) => {
    setLoading(true);
    const res = await adminApi.getUsers(p);
    if (res.success) {
      const d = res.data as any;
      setUsers(d.data || []);
      setPage(d.page);
      setTotalPages(d.totalPages);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: number, current: string) => {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await adminApi.updateUserStatus(id, newStatus);
    loadUsers(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-6 xl:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          用户管理
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px]">管理已注册用户的状态和 Token 余额</p>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40 bg-white/[0.01]">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">邮箱</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">昵称</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Token 余额</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">注册时间</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/20 hover:bg-white/[0.015] transition-colors">
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{u.id}</td>
                <td className="px-6 py-4 text-sm text-slate-200">{u.email}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{u.nickname || '-'}</td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-amber-400">{u.tokenBalance}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {u.status === 'ACTIVE' ? '正常' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleStatus(u.id, u.status)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${u.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                  >
                    {u.status === 'ACTIVE' ? <Ban className="w-3.5 h-3.5 inline mr-1" /> : <CheckCircle className="w-3.5 h-3.5 inline mr-1" />}
                    {u.status === 'ACTIVE' ? '禁用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-5">
          <button disabled={page <= 1} onClick={() => loadUsers(page - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => loadUsers(page + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
