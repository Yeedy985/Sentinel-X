'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Upload, Trash2, Loader2, Lock, Unlock, Edit3, Save, X,
  FileText, CheckCircle, AlertTriangle, Clock, Plus,
} from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

type Network = 'TRC20' | 'ERC20';
interface Addr {
  id: number;
  address: string;
  network: Network;
  status: 'IDLE' | 'LOCKED';
  lockExpiresAt: string | null;
  lockedByUser: number | null;
  lockedOrderId: number | null;
  createdAt: string;
}
interface Stats {
  trc20Total: number; trc20Idle: number; trc20Locked: number;
  erc20Total: number; erc20Idle: number; erc20Locked: number;
}

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [stats, setStats] = useState<Stats>({ trc20Total: 0, trc20Idle: 0, trc20Locked: 0, erc20Total: 0, erc20Idle: 0, erc20Locked: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Network>('TRC20');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/admin/login'); return; }
    load();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPaymentAddresses();
      if (res.success) {
        setAddresses((res.data as any).addresses || []);
        setStats((res.data as any).stats || stats);
      }
    } catch (e) {
      console.error('Failed to load payment addresses:', e);
    }
    setLoading(false);
  }, []);

  const filtered = addresses.filter(a => a.network === tab);

  // ── 文件导入 ──
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    let lines: string[] = [];
    const text = await file.text();

    if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // CSV/简单文本: 每行一个地址，或逗号分隔
      lines = text.split(/[\r\n,;]+/).map(l => l.trim()).filter(l => l.length > 10);
    } else {
      // TXT: 每行一个地址
      lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 10);
    }

    if (lines.length === 0) {
      setImportResult({ imported: 0, skipped: 0 });
      setImporting(false);
      return;
    }

    const res = await adminApi.importPaymentAddresses(tab, lines);
    if (res.success) {
      setImportResult(res.data as any);
      await load();
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── 手动添加 ──
  const handleManualAdd = async () => {
    const lines = manualInput.split(/[\r\n,;]+/).map(l => l.trim()).filter(l => l.length > 10);
    if (lines.length === 0) return;
    setAddingManual(true);
    const res = await adminApi.importPaymentAddresses(tab, lines);
    if (res.success) {
      setImportResult(res.data as any);
      setManualInput('');
      await load();
    }
    setAddingManual(false);
  };

  // ── 编辑 ──
  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    setSaving(true);
    const res = await adminApi.updatePaymentAddress(id, { address: editValue.trim() });
    if (res.success) {
      setEditingId(null);
      await load();
    }
    setSaving(false);
  };

  // ── 删除 ──
  const handleDelete = async (id: number) => {
    await adminApi.deletePaymentAddress(id);
    await load();
  };

  // ── 解锁 ──
  const handleUnlock = async (id: number) => {
    await adminApi.unlockPaymentAddress(id);
    await load();
  };

  // ── 倒计时显示 ──
  const formatCountdown = (expiresAt: string | null) => {
    if (!expiresAt) return '已过期';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return '已过期';
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const curStats = tab === 'TRC20'
    ? { total: stats.trc20Total, idle: stats.trc20Idle, locked: stats.trc20Locked }
    : { total: stats.erc20Total, idle: stats.erc20Idle, locked: stats.erc20Locked };

  return (
    <div className="p-5 xl:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          收款地址管理
        </h1>
        <p className="text-sm text-slate-400 mt-2 ml-[52px]">管理用户充值时分配的 USDT 收款地址，支持 TRC20 / ERC20 双网络</p>
      </div>

      {/* Network Tabs + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-slate-800/40">
          {(['TRC20', 'ERC20'] as Network[]).map(n => (
            <button
              key={n}
              onClick={() => setTab(n)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === n
                  ? 'bg-indigo-500/15 text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">总计 <span className="font-semibold text-white">{curStats.total}</span></span>
          <span className="text-emerald-400/80">空闲 <span className="font-semibold text-emerald-400">{curStats.idle}</span></span>
          <span className="text-amber-400/80">锁定 <span className="font-semibold text-amber-400">{curStats.locked}</span></span>
        </div>
      </div>

      {/* Import Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File Import */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-[15px] font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            文件导入
          </h3>
          <p className="text-sm text-slate-500 mb-4">支持 TXT / CSV 文件，每行一个地址</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-sm font-medium transition-all disabled:opacity-40"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            选择文件导入到 {tab}
          </button>
          {importResult && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-slate-800/30 text-sm">
              <span className="text-emerald-400">✓ 导入 {importResult.imported} 个</span>
              {importResult.skipped > 0 && <span className="text-amber-400 ml-3">跳过 {importResult.skipped} 个(已存在)</span>}
            </div>
          )}
        </div>

        {/* Manual Add */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40">
          <h3 className="text-[15px] font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            手动添加
          </h3>
          <p className="text-sm text-slate-500 mb-3">每行一个地址，支持批量粘贴</p>
          <textarea
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder={`粘贴 ${tab} 地址，每行一个...`}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none resize-none font-mono"
          />
          <button
            onClick={handleManualAdd}
            disabled={addingManual || !manualInput.trim()}
            className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 text-sm font-medium transition-all disabled:opacity-40"
          >
            {addingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            添加到 {tab}
          </button>
        </div>
      </div>

      {/* Address Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-slate-800/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40 bg-white/[0.01]">
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-400 w-12">ID</th>
              <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-400">地址</th>
              <th className="px-5 py-3.5 text-center text-sm font-semibold text-slate-400 w-28">状态</th>
              <th className="px-5 py-3.5 text-center text-sm font-semibold text-slate-400 w-32">锁定倒计时</th>
              <th className="px-5 py-3.5 text-center text-sm font-semibold text-slate-400 w-20">用户</th>
              <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-400 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-600 text-sm">
                  暂无 {tab} 收款地址，请导入或手动添加
                </td>
              </tr>
            )}
            {filtered.map(addr => (
              <tr key={addr.id} className="border-b border-slate-800/20 hover:bg-white/[0.015] transition-colors">
                <td className="px-5 py-3.5 text-slate-500 font-mono text-sm">{addr.id}</td>
                <td className="px-5 py-3.5">
                  {editingId === addr.id ? (
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(addr.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                  ) : (
                    <span className="text-sm font-mono text-slate-200 break-all">{addr.address}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {addr.status === 'IDLE' ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" /> 空闲
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400">
                      <Lock className="w-3.5 h-3.5" /> 锁定
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {addr.status === 'LOCKED' && addr.lockExpiresAt ? (
                    <span className="text-sm text-amber-400 font-mono flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatCountdown(addr.lockExpiresAt)}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-600">-</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center text-sm text-slate-500">
                  {addr.lockedByUser ?? '-'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {editingId === addr.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(addr.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          title="保存"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 transition-all"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(addr.id); setEditValue(addr.address); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {addr.status === 'LOCKED' && (
                          <button
                            onClick={() => handleUnlock(addr.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            title="解锁"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(addr.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
