'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, ChevronLeft, ChevronRight, Ban, CheckCircle, Loader2,
  ChevronDown, ChevronUp, Edit3, Save, X, Key, BarChart3,
  Search, AlertTriangle, Zap, Database, Clock, Shield,
} from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

// ── 用户详情展开面板 ──
function UserDetailPanel({ userId, onClose, onUpdated }: { userId: number; onClose: () => void; onUpdated: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getUserDetail(userId);
    if (res.success) {
      setData(res.data);
      const u = res.data.user;
      setForm({ email: u.email, nickname: u.nickname || '', password: '', tokenBalance: u.tokenBalance, status: u.status });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const updates: any = {};
    const u = data.user;
    if (form.email !== u.email) updates.email = form.email;
    if (form.nickname !== (u.nickname || '')) updates.nickname = form.nickname;
    if (form.password) updates.password = form.password;
    if (form.tokenBalance !== u.tokenBalance) updates.tokenBalance = form.tokenBalance;
    if (form.status !== u.status) updates.status = form.status;

    if (Object.keys(updates).length === 0) { setMsg('无修改'); setSaving(false); return; }
    const res = await adminApi.updateUser(userId, updates);
    if (res.success) {
      setMsg('✓ 已保存');
      setEditing(false);
      load();
      onUpdated();
    } else {
      setMsg('✗ ' + (res.error || '保存失败'));
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>;
  if (!data) return <div className="p-6 text-red-400 text-sm">加载失败</div>;

  const { user, stats, recentRecords } = data;

  return (
    <div className="border-t border-slate-800/40 bg-slate-900/30">
      {/* 用户信息编辑 */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-cyan-400" /> 用户信息
          </h3>
          <div className="flex items-center gap-2">
            {msg && <span className={`text-xs ${msg.startsWith('✓') ? 'text-emerald-400' : msg.startsWith('✗') ? 'text-red-400' : 'text-slate-500'}`}>{msg}</span>}
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 保存
                </button>
                <button onClick={() => { setEditing(false); setForm({ email: user.email, nickname: user.nickname || '', password: '', tokenBalance: user.tokenBalance, status: user.status }); }} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white/5 transition-all">
                  <X className="w-3 h-3" /> 取消
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all">
                <Edit3 className="w-3 h-3" /> 编辑
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">邮箱</label>
            {editing ? (
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
            ) : (
              <p className="text-sm text-slate-200">{user.email}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">昵称</label>
            {editing ? (
              <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
            ) : (
              <p className="text-sm text-slate-400">{user.nickname || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">密码 (哈希)</label>
            {editing ? (
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="留空不修改" className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none" />
            ) : (
              <p className="text-xs text-slate-600 font-mono truncate" title={user.passwordHash}>{user.passwordHash.slice(0, 20)}...</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Token 余额</label>
            {editing ? (
              <input type="number" value={form.tokenBalance} onChange={e => setForm({ ...form, tokenBalance: parseInt(e.target.value) || 0 })} className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
            ) : (
              <p className="text-sm font-semibold text-amber-400">{user.tokenBalance}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">状态</label>
            {editing ? (
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
                <option value="ACTIVE">正常</option>
                <option value="SUSPENDED">禁用</option>
                <option value="BANNED">封禁</option>
              </select>
            ) : (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {user.status === 'ACTIVE' ? '正常' : user.status === 'SUSPENDED' ? '已禁用' : '已封禁'}
              </span>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">注册时间</label>
            <p className="text-sm text-slate-500">{new Date(user.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>

        {/* API 令牌 */}
        {user.apiTokens && user.apiTokens.length > 0 && (
          <div>
            <h4 className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1"><Key className="w-3.5 h-3.5" /> API 令牌 ({user.apiTokens.length})</h4>
            <div className="space-y-1.5">
              {user.apiTokens.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40 text-sm">
                  <span className="font-mono text-cyan-400">{t.tokenPrefix}...</span>
                  <span className="text-slate-500">{t.name || '未命名'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.isRevoked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {t.isRevoked ? '已撤销' : '有效'}
                  </span>
                  {t.lastUsedAt && <span className="text-xs text-slate-600 ml-auto">最后使用: {new Date(t.lastUsedAt).toLocaleString('zh-CN')}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 调用统计 */}
      <div className="px-5 pb-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" /> 公共服务调用统计
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: '总扫描', value: stats.totalScans, icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, color: 'text-white' },
            { label: '成功', value: stats.completedScans, icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />, color: 'text-emerald-400' },
            { label: '失败', value: stats.failedScans, icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />, color: 'text-red-400' },
            { label: '命中缓存', value: `${stats.cachedScans} (${(stats.cacheHitRate * 100).toFixed(1)}%)`, icon: <Database className="w-3.5 h-3.5 text-cyan-400" />, color: 'text-cyan-400' },
            { label: '搜索增强', value: stats.searchScans, icon: <Search className="w-3.5 h-3.5 text-blue-400" />, color: 'text-blue-400' },
            { label: 'Token 消耗', value: stats.totalTokenSpent, icon: <Zap className="w-3.5 h-3.5 text-orange-400" />, color: 'text-orange-400' },
            { label: '产生收入', value: `$${stats.totalRevenueUsd.toFixed(4)}`, icon: <BarChart3 className="w-3.5 h-3.5 text-green-400" />, color: 'text-green-400' },
            { label: '充值次数', value: stats.rechargeCount, icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />, color: 'text-indigo-400' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-1">
                {s.icon}
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 最近扫描记录 */}
        {recentRecords && recentRecords.length > 0 && (
          <div>
            <h4 className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 最近扫描记录
            </h4>
            <div className="rounded-xl border border-slate-800/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/20 text-xs text-slate-500">
                    <th className="px-3 py-2 text-left">时间</th>
                    <th className="px-3 py-2 text-left">Briefing ID</th>
                    <th className="px-3 py-2 text-center">状态</th>
                    <th className="px-3 py-2 text-center">缓存</th>
                    <th className="px-3 py-2 text-center">搜索</th>
                    <th className="px-3 py-2 text-right">Token</th>
                    <th className="px-3 py-2 text-right">信号</th>
                    <th className="px-3 py-2 text-right">预警</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r: any) => (
                    <tr key={r.id} className="border-t border-slate-800/20 hover:bg-white/[0.01]">
                      <td className="px-3 py-2 text-slate-500">{new Date(r.startedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-xs">{r.briefingId.slice(0, 16)}...</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {r.status === 'COMPLETED' ? '完成' : r.status === 'FAILED' ? '失败' : '处理中'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{r.isCached ? <span className="text-cyan-400 text-xs">✓ 缓存</span> : <span className="text-slate-600 text-xs">实时</span>}</td>
                      <td className="px-3 py-2 text-center">{r.enableSearch ? <span className="text-blue-400 text-xs">✓</span> : <span className="text-slate-600 text-xs">-</span>}</td>
                      <td className="px-3 py-2 text-right text-orange-400">{r.tokenCost}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{r.signalCount}</td>
                      <td className="px-3 py-2 text-right">{r.alertCount > 0 ? <span className="text-red-400">{r.alertCount}</span> : <span className="text-slate-600">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主页面 ──
export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    loadUsers();
  }, []);

  const loadUsers = async (p = 1, search?: string) => {
    setLoading(true);
    const res = await adminApi.getUsers(p, 20);
    if (res.success) {
      const d = res.data as any;
      setUsers(d.data || []);
      setPage(d.page);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-6 xl:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            用户管理
          </h1>
          <p className="text-sm text-slate-500 mt-2 ml-[52px]">共 {total} 个注册用户 · 点击用户行展开详情和统计</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40 bg-white/[0.01]">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">ID</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">邮箱</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">昵称</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Token</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">扫描次数</th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">注册时间</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <React.Fragment key={u.id}>
                <tr
                  className={`border-b border-slate-800/20 hover:bg-white/[0.015] transition-colors cursor-pointer ${expandedUser === u.id ? 'bg-white/[0.02]' : ''}`}
                  onClick={() => toggleExpand(u.id)}
                >
                  <td className="px-5 py-4 text-slate-600 font-mono text-sm">{u.id}</td>
                  <td className="px-5 py-4 text-sm text-slate-200">{u.email}</td>
                  <td className="px-5 py-4 text-sm text-slate-400">{u.nickname || '-'}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-amber-400">{u.tokenBalance}</td>
                  <td className="px-5 py-4 text-right text-sm text-slate-500">{u.scanCount || 0}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {u.status === 'ACTIVE' ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); adminApi.updateUserStatus(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE').then(() => loadUsers(page)); }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${u.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                      >
                        {u.status === 'ACTIVE' ? <Ban className="w-3 h-3 inline mr-1" /> : <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {u.status === 'ACTIVE' ? '禁用' : '启用'}
                      </button>
                      {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </td>
                </tr>
                {expandedUser === u.id && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <UserDetailPanel userId={u.id} onClose={() => setExpandedUser(null)} onUpdated={() => loadUsers(page)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
