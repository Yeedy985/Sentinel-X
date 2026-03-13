'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';
import { Search, RotateCcw, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Zap, Shield, TrendingUp, Activity } from 'lucide-react';

interface Signal {
  id: number;
  signalId: number;
  group: string;
  name: string;
  impact: number;
  halfLife: number;
  confidence: number;
  category: string;
  triggerCondition: string;
  positiveDesc: string;
  negativeDesc: string;
  enabled: boolean;
}

interface GroupStat {
  id: string;
  total: number;
  enabled: number;
}

const GROUP_META: Record<string, { label: string; icon: string }> = {
  G1:  { label: '宏观流动性', icon: '💰' },
  G2:  { label: '央行与利率政策', icon: '🏦' },
  G3:  { label: '监管与合规', icon: '⚖️' },
  G4:  { label: '机构资金流', icon: '🏛️' },
  G5:  { label: '链上物理流', icon: '⛓️' },
  G6:  { label: '市场结构', icon: '📐' },
  G7:  { label: '情绪指标', icon: '🧠' },
  G8:  { label: '叙事与赛道', icon: '🚀' },
  G9:  { label: '黑天鹅与安全', icon: '🦢' },
  G10: { label: '关键人物与地缘', icon: '🎯' },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  D: { label: '方向', color: 'text-blue-400 bg-blue-500/10', icon: TrendingUp },
  V: { label: '波动', color: 'text-amber-400 bg-amber-500/10', icon: Activity },
  R: { label: '风险', color: 'text-red-400 bg-red-500/10', icon: Shield },
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<{ total: number; enabled: number; groups: GroupStat[] }>({ total: 0, enabled: 0, groups: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Signal>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSignals({
        group: filterGroup || undefined,
        search: search || undefined,
      });
      const data = res.data || res;
      setSignals(data.signals || []);
      setStats(data.stats || { total: 0, enabled: 0, groups: [] });
    } catch {
      setSignals([]);
    }
    setLoading(false);
  }, [filterGroup, search]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const toggleSignal = async (sig: Signal) => {
    await adminApi.updateSignal(sig.id, { enabled: !sig.enabled });
    setSignals(prev => prev.map(s => s.id === sig.id ? { ...s, enabled: !s.enabled } : s));
  };

  const toggleGroup = async (group: string, enable: boolean) => {
    await adminApi.toggleSignalGroup(group, enable);
    await fetchSignals();
    showMessage(`${group} 组已${enable ? '启用' : '禁用'}`);
  };

  const handleReset = async () => {
    if (!confirm('确定要恢复所有300条信号为默认值？这将覆盖所有自定义修改。')) return;
    setResetting(true);
    try {
      const res = await adminApi.resetSignals();
      showMessage(res.message || '已恢复默认');
      await fetchSignals();
    } catch {
      showMessage('恢复失败');
    }
    setResetting(false);
  };

  const startEdit = (sig: Signal) => {
    setEditingId(sig.id);
    setEditForm({ impact: sig.impact, halfLife: sig.halfLife, confidence: sig.confidence, category: sig.category });
  };

  const saveEdit = async (sig: Signal) => {
    setSaving(true);
    try {
      await adminApi.updateSignal(sig.id, editForm);
      setSignals(prev => prev.map(s => s.id === sig.id ? { ...s, ...editForm } : s));
      setEditingId(null);
      showMessage(`#${sig.signalId} 已更新`);
    } catch {
      showMessage('更新失败');
    }
    setSaving(false);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleExpand = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const expandAll = () => {
    const allGroups = [...new Set(signals.map(s => s.group))];
    setExpandedGroups(new Set(allGroups));
  };

  const collapseAll = () => setExpandedGroups(new Set());

  // 按组分组
  const grouped = new Map<string, Signal[]>();
  for (const sig of signals) {
    const list = grouped.get(sig.group) || [];
    list.push(sig);
    grouped.set(sig.group, list);
  }
  const sortedGroups = [...grouped.keys()].sort((a, b) => {
    const na = parseInt(a.replace('G', ''));
    const nb = parseInt(b.replace('G', ''));
    return na - nb;
  });

  return (
    <div className="p-5 xl:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            信号矩阵管理
          </h1>
          <p className="text-sm text-slate-500 mt-2 ml-[52px]">
            管理 AlphaSentinel 300条信号的启用状态与参数
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            <span className="text-emerald-400 font-semibold text-base">{stats.enabled}</span>
            <span className="mx-1 text-slate-600">/</span>
            <span className="text-base">{stats.total}</span>
            <span className="ml-1.5">启用</span>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-slate-800/40 text-slate-300 transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            恢复默认
          </button>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-emerald-600/90 text-white text-sm font-medium shadow-lg shadow-emerald-900/30">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索信号名称或触发条件..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 transition-all"
          />
        </div>
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white focus:outline-none"
        >
          <option value="">全部组</option>
          {Object.entries(GROUP_META).map(([id, meta]) => (
            <option key={id} value={id}>{meta.icon} {id} {meta.label}</option>
          ))}
        </select>
        <button onClick={expandAll} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-slate-800/40 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
          全部展开
        </button>
        <button onClick={collapseAll} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-slate-800/40 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
          全部折叠
        </button>
      </div>

      {/* Group Stats Bar */}
      <div className="flex flex-wrap gap-2">
        {stats.groups.map(g => {
          const meta = GROUP_META[g.id] || { label: g.id, icon: '📋' };
          const allEnabled = g.enabled === g.total;
          const noneEnabled = g.enabled === 0;
          return (
            <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-slate-800/30 text-xs">
              <span>{meta.icon}</span>
              <span className="text-slate-400">{g.id}</span>
              <span className={`font-semibold ${allEnabled ? 'text-emerald-400' : noneEnabled ? 'text-red-400' : 'text-amber-400'}`}>
                {g.enabled}/{g.total}
              </span>
              <button
                onClick={() => toggleGroup(g.id, !allEnabled)}
                className="ml-0.5 text-slate-500 hover:text-white transition-colors"
                title={allEnabled ? '禁用整组' : '启用整组'}
              >
                {allEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {loading && <div className="text-center text-slate-500 py-12">加载中...</div>}

      {/* Signal Groups */}
      {!loading && sortedGroups.map(group => {
        const sigs = grouped.get(group) || [];
        const meta = GROUP_META[group] || { label: group, icon: '📋' };
        const expanded = expandedGroups.has(group);
        const enabledCount = sigs.filter(s => s.enabled).length;

        return (
          <div key={group} className="rounded-2xl border border-slate-800/40 overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleExpand(group)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                <span className="text-lg">{meta.icon}</span>
                <span className="font-semibold text-[15px] text-slate-200">[{group}] {meta.label}</span>
                <span className="text-xs text-slate-600">({sigs.length}条)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${enabledCount === sigs.length ? 'text-emerald-400' : enabledCount === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {enabledCount}/{sigs.length} 启用
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleGroup(group, enabledCount < sigs.length); }}
                  className="px-3 py-1 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-all"
                >
                  {enabledCount === sigs.length ? '全部禁用' : '全部启用'}
                </button>
              </div>
            </button>

            {/* Signal List */}
            {expanded && (
              <div className="divide-y divide-slate-800/20">
                {sigs.map(sig => {
                  const cat = CATEGORY_LABELS[sig.category] || CATEGORY_LABELS.D;
                  const isEditing = editingId === sig.id;
                  const CatIcon = cat.icon;

                  return (
                    <div
                      key={sig.id}
                      className={`px-5 py-3 flex items-center gap-3 transition-colors ${sig.enabled ? 'bg-transparent hover:bg-white/[0.01]' : 'bg-slate-900/20 opacity-50'}`}
                    >
                      {/* Toggle */}
                      <button onClick={() => toggleSignal(sig)} className="shrink-0">
                        {sig.enabled
                          ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                          : <ToggleLeft className="w-5 h-5 text-slate-600" />
                        }
                      </button>

                      {/* Signal ID */}
                      <span className="text-sm text-slate-600 font-mono w-9 text-right shrink-0">#{sig.signalId}</span>

                      {/* Category Badge */}
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${cat.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {cat.label}
                      </span>

                      {/* Name + Condition */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{sig.name}</div>
                        <div className="text-xs text-slate-600 truncate mt-0.5">{sig.triggerCondition} · {sig.positiveDesc} / {sig.negativeDesc}</div>
                      </div>

                      {/* Impact / HalfLife / Confidence */}
                      {!isEditing ? (
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-mono text-xs font-medium ${sig.impact > 0 ? 'text-emerald-400' : sig.impact < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {sig.impact > 0 ? '+' : ''}{sig.impact}
                          </span>
                          <span className="text-xs text-slate-500" title="半衰期(分钟)">{sig.halfLife}m</span>
                          <span className="text-xs text-slate-500" title="置信度">{(sig.confidence * 100).toFixed(0)}%</span>
                          <button
                            onClick={() => startEdit(sig)}
                            className="px-2 py-0.5 rounded text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white"
                          >
                            编辑
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            value={editForm.impact ?? sig.impact}
                            onChange={e => setEditForm(f => ({ ...f, impact: Number(e.target.value) }))}
                            className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs text-center"
                            title="Impact"
                          />
                          <input
                            type="number"
                            value={editForm.halfLife ?? sig.halfLife}
                            onChange={e => setEditForm(f => ({ ...f, halfLife: Number(e.target.value) }))}
                            className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs text-center"
                            title="半衰期(min)"
                          />
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={editForm.confidence ?? sig.confidence}
                            onChange={e => setEditForm(f => ({ ...f, confidence: Number(e.target.value) }))}
                            className="w-14 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs text-center"
                            title="置信度"
                          />
                          <select
                            value={editForm.category ?? sig.category}
                            onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs"
                          >
                            <option value="D">D方向</option>
                            <option value="V">V波动</option>
                            <option value="R">R风险</option>
                          </select>
                          <button
                            onClick={() => saveEdit(sig)}
                            disabled={saving}
                            className="px-2 py-0.5 rounded text-xs bg-blue-600/80 hover:bg-blue-500/80 text-white disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-400 hover:text-white"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {!loading && signals.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base">暂无信号数据</p>
          <p className="text-sm text-slate-600 mt-1">请先运行 <code className="text-yellow-400">pnpm db:seed</code> 初始化300条信号</p>
        </div>
      )}
    </div>
  );
}
