'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Save, Loader2, Trash2, X, Search, Brain, Eye, EyeOff, Shield, Check, AlertTriangle, ChevronRight, Lock, Play, Radio, Clock, ChevronLeft, ChevronDown, Timer, Pause, RotateCcw } from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/api';

// ==================== Provider 配置 (与前端 LLM_PROVIDERS 对齐) ====================
const LLM_PROVIDERS: Record<string, {
  name: string;
  defaultUrl: string;
  defaultModel: string;
  supportedRoles: string[];
  description: string;
}> = {
  perplexity: {
    name: 'Perplexity',
    defaultUrl: 'https://api.perplexity.ai/chat/completions',
    defaultModel: 'sonar-pro',
    supportedRoles: ['SEARCHER'],
    description: '联网搜索，自动检索最新网页信息',
  },
  google: {
    name: 'Google Gemini',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultModel: 'gemini-2.5-flash',
    supportedRoles: ['SEARCHER', 'ANALYZER', 'ANALYZER_BACKUP'],
    description: '搜索 + 推理，Google Search 工具',
  },
  openai: {
    name: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    supportedRoles: ['ANALYZER', 'ANALYZER_BACKUP'],
    description: 'GPT-4o 强推理能力',
  },
  anthropic: {
    name: 'Anthropic',
    defaultUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    supportedRoles: ['ANALYZER', 'ANALYZER_BACKUP'],
    description: 'Claude 深度分析',
  },
  deepseek: {
    name: 'DeepSeek',
    defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    supportedRoles: ['ANALYZER', 'ANALYZER_BACKUP'],
    description: '性价比高，中文能力强',
  },
  custom: {
    name: '自定义',
    defaultUrl: '',
    defaultModel: '',
    supportedRoles: ['SEARCHER', 'ANALYZER', 'ANALYZER_BACKUP'],
    description: 'OpenAI 兼容端点',
  },
};

const ROLE_OPTIONS = [
  { value: 'SEARCHER', label: '搜索 Searcher', emoji: '🔍', desc: '联网搜索实时市场情报', rec: '推荐 Perplexity / Gemini', color: 'blue', icon: Search },
  { value: 'ANALYZER', label: '分析 Analyzer', emoji: '🧠', desc: '深度分析300信号矩阵', rec: '推荐 DeepSeek / GPT / Gemini', color: 'purple', icon: Brain },
  { value: 'ANALYZER_BACKUP', label: '备用 Backup', emoji: '🛡', desc: '主分析失败时自动降级', rec: '推荐配置不同厂商', color: 'amber', icon: Shield },
];

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[15px] text-white placeholder-slate-500 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all';

// ==================== 全局自动扫描单例 (不随页面切换销毁) ====================
const _adminAutoScan = {
  running: false,
  intervalId: null as ReturnType<typeof setInterval> | null,
  countdownId: null as ReturnType<typeof setInterval> | null,
  countdown: 0,
  totalSec: 0,
  count: 0,
  scanFn: null as (() => void) | null,
  listeners: new Set<() => void>(),
  notify() { this.listeners.forEach(fn => fn()); },
  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.countdownId) { clearInterval(this.countdownId); this.countdownId = null; }
    this.running = false;
    this.countdown = 0;
    this.notify();
  },
  start(mins: number, scanFn: () => void) {
    this.stop();
    this.scanFn = scanFn;
    this.running = true;
    this.totalSec = mins * 60;
    this.countdown = this.totalSec;
    this.count++;
    scanFn();
    this.countdownId = setInterval(() => {
      this.countdown = this.countdown <= 1 ? this.totalSec : this.countdown - 1;
      this.notify();
    }, 1000);
    this.intervalId = setInterval(() => {
      this.count++;
      if (this.scanFn) this.scanFn();
      this.notify();
    }, mins * 60 * 1000);
    this.notify();
  },
};

function emptyForm() {
  return { role: 'ANALYZER', provider: 'deepseek', model: 'deepseek-chat', apiUrl: 'https://api.deepseek.com/v1/chat/completions', apiKey: '', priority: 0, enabled: true };
}

export default function PipelinesPage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showKey, setShowKey] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanBriefingId, setScanBriefingId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [scanLogsPage, setScanLogsPage] = useState(1);
  const [scanLogsTotalPages, setScanLogsTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [listCollapsed, setListCollapsed] = useState(true);
  const [autoScanEnabled, setAutoScanEnabled] = useState(_adminAutoScan.running);
  const [autoScanInterval, setAutoScanInterval] = useState(0);
  const [autoScanCountdown, setAutoScanCountdown] = useState(_adminAutoScan.countdown);
  const [autoScanCount, setAutoScanCount] = useState(_adminAutoScan.count);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
    loadScanLogs(1);
    loadAutoScanInterval();
  }, []);

  const loadAutoScanInterval = async () => {
    const res = await adminApi.getSettings();
    if (res.success && res.data) {
      const mins = Number(res.data.auto_scan_interval_minutes) || 0;
      setAutoScanInterval(mins);
    }
  };

  // 同步全局自动扫描状态到组件
  useEffect(() => {
    const sync = () => {
      setAutoScanEnabled(_adminAutoScan.running);
      setAutoScanCountdown(_adminAutoScan.countdown);
      setAutoScanCount(_adminAutoScan.count);
    };
    _adminAutoScan.listeners.add(sync);
    sync();
    return () => { _adminAutoScan.listeners.delete(sync); };
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getPipelines();
    if (res.success) setPipelines((res.data as any[]) || []);
    setLoading(false);
  };

  const handleRoleChange = (role: string) => {
    setForm(prev => {
      const newForm = { ...prev, role };
      const cfg = LLM_PROVIDERS[prev.provider];
      if (!cfg || !cfg.supportedRoles.includes(role)) {
        const fallback = Object.entries(LLM_PROVIDERS).find(([, c]) => c.supportedRoles.includes(role));
        if (fallback) {
          newForm.provider = fallback[0];
          newForm.apiUrl = fallback[1].defaultUrl;
          newForm.model = fallback[1].defaultModel;
        }
      }
      return newForm;
    });
  };

  const handleProviderChange = (provider: string) => {
    const cfg = LLM_PROVIDERS[provider];
    if (!cfg) return;
    setForm(prev => {
      const newForm = { ...prev, provider, apiUrl: cfg.defaultUrl, model: cfg.defaultModel };
      if (!cfg.supportedRoles.includes(prev.role)) {
        newForm.role = cfg.supportedRoles[0];
      }
      return newForm;
    });
  };

  const handleCreate = async () => {
    setSaving(-1);
    await adminApi.createPipeline(form);
    setForm(emptyForm());
    setEditId(null);
    await load();
    setSaving(null);
  };

  const handleSave = async (id: number) => {
    setSaving(id);
    const payload: any = { ...form };
    if (!payload.apiKey) delete payload.apiKey;
    await adminApi.updatePipeline(id, payload);
    setEditId(null);
    setForm(emptyForm());
    await load();
    setSaving(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此管线？')) return;
    setSaving(id);
    await adminApi.deletePipeline(id);
    await load();
    setSaving(null);
  };

  const handleToggle = async (p: any) => {
    setSaving(p.id);
    await adminApi.updatePipeline(p.id, { enabled: !p.enabled });
    await load();
    setSaving(null);
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({ role: p.role, provider: p.provider, model: p.model, apiUrl: p.apiUrl, apiKey: '', priority: p.priority, enabled: p.enabled });
    setFormCollapsed(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const cancelForm = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowKey(false);
  };

  const loadScanLogs = async (page: number) => {
    const res = await adminApi.getSystemScans(page, 10);
    if (res.success && res.data) {
      setScanLogs(res.data.data || []);
      setScanLogsPage(res.data.page || 1);
      setScanLogsTotalPages(res.data.totalPages || 1);
    }
  };

  const handleTriggerScan = async (enableSearch = true) => {
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    const res = await adminApi.triggerScan(enableSearch);
    if (!res.success) {
      setScanError(res.error || '\u89e6\u53d1\u626b\u63cf\u5931\u8d25');
      setScanning(false);
      return;
    }
    const briefingId = res.data?.briefingId;
    setScanBriefingId(briefingId);
    const poll = setInterval(async () => {
      const status = await adminApi.getScanStatus(briefingId);
      if (status.success && status.data) {
        const s = status.data;
        if (s.status === 'COMPLETED' || s.status === 'FAILED') {
          clearInterval(poll);
          setScanResult(s);
          setScanning(false);
          if (s.status === 'FAILED') setScanError(s.errorMessage || '\u626b\u63cf\u5931\u8d25');
          loadScanLogs(1);
        }
      }
    }, 3000);
    setTimeout(() => {
      clearInterval(poll);
      setScanning(false);
      setScanError('\u626b\u63cf\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5 Worker \u65e5\u5fd7');
    }, 300000);
  };

  const startAutoScan = () => {
    if (autoScanInterval <= 0) return;
    _adminAutoScan.start(autoScanInterval, () => handleTriggerScan(true));
  };

  const stopAutoScan = () => {
    _adminAutoScan.stop();
  };

  // 保持 scanFn 指向最新的 handleTriggerScan
  useEffect(() => {
    if (_adminAutoScan.running) {
      _adminAutoScan.scanFn = () => handleTriggerScan(true);
    }
  });

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const searchers = pipelines.filter(p => p.role === 'SEARCHER');
  const analyzers = pipelines.filter(p => p.role === 'ANALYZER');
  const backups = pipelines.filter(p => p.role === 'ANALYZER_BACKUP');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const providerCfg = LLM_PROVIDERS[form.provider];

  return (
    <div className="p-6 xl:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          LLM 管线配置
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px]">配置搜索与分析 LLM，支持多厂商切换与备用降级</p>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="rounded-2xl border border-slate-800/40 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Step 0 */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/15">
            <span className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-xs font-bold">0</span>
            <div>
              <p className="text-sm font-medium text-cyan-300">数据采集</p>
              <p className="text-xs text-slate-500">免费 API</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          {/* Step 1 */}
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border ${searchers.find(s => s.enabled) ? 'bg-blue-500/8 border-blue-500/15' : 'bg-slate-800/40 border-slate-700/30 border-dashed'}`}>
            <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className={`text-sm font-medium ${searchers.find(s => s.enabled) ? 'text-blue-300' : 'text-slate-500'}`}>搜索 LLM</p>
              <p className="text-xs text-slate-500">
                {searchers.find(s => s.enabled)
                  ? LLM_PROVIDERS[searchers.find(s => s.enabled)!.provider]?.name || searchers.find(s => s.enabled)!.provider
                  : '可选 · 未配置'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          {/* Step 2 */}
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border ${analyzers.find(a => a.enabled) ? 'bg-purple-500/8 border-purple-500/15' : 'bg-slate-800/40 border-red-500/20 border-dashed'}`}>
            <span className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className={`text-sm font-medium ${analyzers.find(a => a.enabled) ? 'text-purple-300' : 'text-red-400'}`}>分析 LLM</p>
              <p className="text-xs text-slate-500">
                {analyzers.find(a => a.enabled)
                  ? LLM_PROVIDERS[analyzers.find(a => a.enabled)!.provider]?.name || analyzers.find(a => a.enabled)!.provider
                  : '必需 · 未配置'}
              </p>
            </div>
          </div>
          {/* Backup */}
          {backups.some(b => b.enabled) && (
            <>
              <span className="text-slate-600 text-xs">↘</span>
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
                <span className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center text-xs font-bold">B</span>
                <div>
                  <p className="text-sm font-medium text-amber-300">备用</p>
                  <p className="text-xs text-slate-500">{LLM_PROVIDERS[backups.find(b => b.enabled)!.provider]?.name}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 配置表单 */}
      <div ref={formRef} className={`rounded-2xl border overflow-hidden transition-all ${editId ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.03]' : 'border-slate-800/40 bg-white/[0.02]'}`}>
        <button onClick={() => setFormCollapsed(!formCollapsed)} className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/30 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <h2 className="text-lg font-semibold text-white">{editId ? '编辑管线' : '配置新管线'}</h2>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${formCollapsed ? '' : 'rotate-180'}`} />
        </button>
        {!formCollapsed && <div className="p-6 space-y-6">
          {/* 角色选择 */}
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-3">选择角色</label>
            <div className="grid grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((r) => {
                const active = form.role === r.value;
                const colorStyles: Record<string, { active: string; inactive: string; text: string }> = {
                  blue:   { active: 'border-blue-500/50 bg-blue-600/10 ring-1 ring-blue-500/20', inactive: 'border-slate-700/50 hover:border-slate-600', text: 'text-blue-400' },
                  purple: { active: 'border-purple-500/50 bg-purple-600/10 ring-1 ring-purple-500/20', inactive: 'border-slate-700/50 hover:border-slate-600', text: 'text-purple-400' },
                  amber:  { active: 'border-amber-500/50 bg-amber-600/10 ring-1 ring-amber-500/20', inactive: 'border-slate-700/50 hover:border-slate-600', text: 'text-amber-400' },
                };
                const style = colorStyles[r.color];
                const Icon = r.icon;
                return (
                  <button
                    key={r.value}
                    className={`relative p-4 rounded-xl border text-left transition-all ${active ? style.active : style.inactive}`}
                    onClick={() => handleRoleChange(r.value)}
                  >
                    {active && <div className="absolute top-2.5 right-2.5"><Check className={`w-4 h-4 ${style.text}`} /></div>}
                    <div className="flex items-center gap-2.5 mb-2">
                      <Icon className={`w-5 h-5 ${active ? style.text : 'text-slate-500'}`} />
                      <span className={`text-[15px] font-semibold ${active ? style.text : 'text-slate-300'}`}>{r.emoji} {r.label}</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
                    <p className="text-xs text-slate-600 mt-1">{r.rec}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 模型提供商 */}
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-3">选择模型</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(LLM_PROVIDERS).map(([key, cfg]) => {
                const supported = cfg.supportedRoles.includes(form.role);
                const active = form.provider === key;
                return (
                  <button
                    key={key}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      !supported ? 'border-slate-800/50 bg-slate-900/30 opacity-30 cursor-not-allowed' :
                      active ? 'border-purple-500/50 bg-purple-600/8 ring-1 ring-purple-500/20' : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/30'
                    }`}
                    onClick={() => supported && handleProviderChange(key)}
                    disabled={!supported}
                  >
                    {active && supported && <div className="absolute top-2.5 right-2.5"><Check className="w-4 h-4 text-purple-400" /></div>}
                    <p className={`text-[15px] font-semibold ${active && supported ? 'text-purple-300' : supported ? 'text-slate-200' : 'text-slate-600'}`}>{cfg.name}</p>
                    <p className={`text-sm mt-1 ${supported ? 'text-slate-500' : 'text-slate-700'}`}>{cfg.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 配置字段 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-2">
                API Key {editId && <span className="text-slate-600 font-normal">(留空不修改)</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  className={`${inputCls} pl-10 pr-11`}
                  type={showKey ? 'text' : 'password'}
                  placeholder={editId ? '留空则不修改 API Key' : 'sk-...'}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-2">API 地址</label>
              <input className={inputCls} value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} placeholder={providerCfg?.defaultUrl || 'https://...'} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-2">模型名称</label>
              <input className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={providerCfg?.defaultModel || 'model-name'} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-2">优先级 <span className="text-slate-600 font-normal">(越小越优先)</span></label>
              <input className={inputCls} type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-[15px] font-medium text-white disabled:opacity-50 transition-all shadow-lg shadow-purple-900/20"
              onClick={() => editId ? handleSave(editId) : handleCreate()}
              disabled={saving !== null || !form.model || !form.apiUrl || (!editId && !form.apiKey)}
            >
              {saving !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? '保存修改' : '保存配置'}
            </button>
            {editId && (
              <button onClick={cancelForm} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-[15px] hover:text-white hover:bg-slate-700 transition-all">
                <X className="w-4 h-4" />取消
              </button>
            )}
          </div>
        </div>}
      </div>

      {/* 已配置列表 - 按角色分组 */}
      {(searchers.length > 0 || analyzers.length > 0 || backups.length > 0) && (
        <div className="rounded-2xl border border-slate-800/40 bg-white/[0.02] overflow-hidden">
          <button onClick={() => setListCollapsed(!listCollapsed)} className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <h2 className="text-lg font-semibold text-white">已配置管线 <span className="text-sm font-normal text-slate-500 ml-2">{pipelines.length} 条</span></h2>
            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${listCollapsed ? '' : 'rotate-180'}`} />
          </button>
          {!listCollapsed && <div className="p-6 space-y-6">
          {searchers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-blue-400 font-medium">
                <Search className="w-4 h-4" />
                搜索 Searcher
              </div>
              {searchers.map((p) => (
                <PipelineCard key={p.id} p={p} color="blue" saving={saving} onToggle={handleToggle} onEdit={startEdit} onDelete={handleDelete} editId={editId} />
              ))}
            </div>
          )}
          {analyzers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-purple-400 font-medium">
                <Brain className="w-4 h-4" />
                分析 Analyzer
              </div>
              {analyzers.map((p) => (
                <PipelineCard key={p.id} p={p} color="purple" saving={saving} onToggle={handleToggle} onEdit={startEdit} onDelete={handleDelete} editId={editId} />
              ))}
            </div>
          )}
          {backups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                <Shield className="w-4 h-4" />
                备用 Analyzer Backup
              </div>
              {backups.map((p) => (
                <PipelineCard key={p.id} p={p} color="amber" saving={saving} onToggle={handleToggle} onEdit={startEdit} onDelete={handleDelete} editId={editId} />
              ))}
            </div>
          )}
          </div>}
        </div>
      )}
      {pipelines.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Cpu className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base">暂无管线配置</p>
          <p className="text-sm text-slate-600 mt-1">在上方表单中选择角色和模型后保存即可</p>
        </div>
      )}

      {/* ==================== 手动扫描 ==================== */}
      <div className="rounded-2xl border border-slate-800/40 bg-white/[0.02] p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              手动扫描
            </h2>
            <p className="text-sm text-slate-500 mt-1">使用当前管线配置执行一次完整的300信号扫描</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTriggerScan(false)}
              disabled={scanning || !analyzers.find(a => a.enabled)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] border border-slate-800/40 text-slate-300 hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              基础扫描
            </button>
            <button
              onClick={() => handleTriggerScan(true)}
              disabled={scanning || !analyzers.find(a => a.enabled)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> 搜索增强扫描</>}
            </button>
          </div>
        </div>

        {scanning && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-300">扫描进行中...</p>
              <p className="text-xs text-slate-500 mt-0.5">任务 ID: {scanBriefingId || '...'}</p>
            </div>
          </div>
        )}

        {scanError && !scanning && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{scanError}</p>
          </div>
        )}

        {scanResult && scanResult.status === 'COMPLETED' && !scanning && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">扫描完成</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="text-xs text-slate-500">触发信号</div>
                <div className="text-lg font-bold text-cyan-400">{scanResult.signalCount ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="text-xs text-slate-500">警报</div>
                <div className="text-lg font-bold text-amber-400">{scanResult.alertCount ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="text-xs text-slate-500">Token 消耗</div>
                <div className="text-lg font-bold text-purple-400">{scanResult.tokenCostTotal ?? 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="text-xs text-slate-500">实际成本</div>
                <div className="text-lg font-bold text-red-400">${(scanResult.realCostUsd ?? 0).toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 自动扫描 ==================== */}
      <div className="rounded-2xl border border-slate-800/40 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-400" />
              自动扫描
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              按设定间隔自动执行搜索增强扫描（当前间隔: {autoScanInterval > 0 ? `${autoScanInterval} 分钟` : <span className="text-red-400">未设置，请到 Settings 页面配置</span>}）
            </p>
          </div>
          <div className="flex items-center gap-3">
            {autoScanEnabled ? (
              <button
                onClick={stopAutoScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all"
              >
                <Pause className="w-4 h-4" />
                停止自动扫描
              </button>
            ) : (
              <button
                onClick={startAutoScan}
                disabled={autoScanInterval <= 0 || scanning || !analyzers.find(a => a.enabled)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Play className="w-4 h-4" />
                启动自动扫描
              </button>
            )}
          </div>
        </div>

        {autoScanEnabled && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-sm font-medium text-orange-300">自动扫描运行中</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>已执行 <span className="font-semibold text-orange-400">{autoScanCount}</span> 次</span>
              <span>下次扫描: <span className="font-mono font-semibold text-orange-300">{formatCountdown(autoScanCountdown)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 扫描记录 ==================== */}
      <div className="rounded-2xl border border-slate-800/40 bg-white/[0.02] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/30 bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            扫描记录
          </h2>
        </div>
        {scanLogs.length > 0 ? (
          <div className="divide-y divide-slate-800/20">
            {scanLogs.map((log: any) => (
              <div key={log.id} className="hover:bg-white/[0.01] transition-colors">
                <div className="px-6 py-3.5 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                  <div className="shrink-0">
                    {log.status === 'COMPLETED'
                      ? <Check className="w-4 h-4 text-emerald-400" />
                      : log.status === 'FAILED'
                      ? <AlertTriangle className="w-4 h-4 text-red-400" />
                      : log.status === 'PROCESSING'
                      ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      : <Clock className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{log.briefingId}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${log.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : log.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {log.status}
                      </span>
                      {log.enableSearch && <span className="text-xs bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded">搜索增强</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{log.analyzerProvider}/{log.analyzerModel}</span>
                      {log.searcherProvider && <span>搜索: {log.searcherProvider}/{log.searcherModel}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 text-sm">
                    <div className="text-right">
                      <div className="text-slate-400">信号 <span className="font-semibold text-cyan-400">{log.signalCount}</span> / 警报 <span className="font-semibold text-amber-400">{log.alertCount}</span></div>
                    </div>
                    <div className="text-right w-20">
                      <div className="text-xs text-slate-500">Token</div>
                      <div className="font-semibold text-purple-400">{log.tokenCostTotal}</div>
                    </div>
                    <div className="text-right w-20">
                      <div className="text-xs text-slate-500">成本</div>
                      <div className="font-semibold text-red-400">${Number(log.realCostUsd || 0).toFixed(4)}</div>
                    </div>
                    <div className="text-right w-36">
                      <div className="text-xs text-slate-500">时间</div>
                      <div className="text-slate-300 text-xs">{new Date(log.startedAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {expandedLog === log.id && (
                  <div className="px-6 pb-5 space-y-4">
                    {/* 基础信息 */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-slate-800/30 space-y-3">
                      {log.errorMessage && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          {log.errorMessage}
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">搜索 Token:</span>
                          <span className="ml-2 font-medium text-slate-300">{log.tokenCostSearch}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">分析 Token:</span>
                          <span className="ml-2 font-medium text-slate-300">{log.tokenCostAnalyze}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">总 Token:</span>
                          <span className="ml-2 font-semibold text-purple-400">{log.tokenCostTotal}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">耗时:</span>
                          <span className="ml-2 font-medium text-slate-300">
                            {log.completedAt ? `${((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000).toFixed(1)}s` : '-'}
                          </span>
                        </div>
                      </div>
                      {log.completedAt && (
                        <div className="text-xs text-slate-600">
                          开始: {new Date(log.startedAt).toLocaleString('zh-CN')} → 完成: {new Date(log.completedAt).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>

                    {/* Briefing Data 详情 */}
                    {log.briefingData && (() => {
                      const bd = log.briefingData;
                      const signals = bd.triggeredSignals || [];
                      const alerts = bd.alerts || [];
                      const summary = bd.marketSummary || '';
                      // 计算评分
                      const totalImpact = signals.reduce((sum: number, s: any) => sum + (Number(s.impact) || 0), 0);
                      const avgConfidence = signals.length > 0 ? signals.reduce((sum: number, s: any) => sum + (Number(s.confidence) || 0), 0) / signals.length : 0;
                      const hasCritical = alerts.some((a: any) => a.level === 'critical');

                      return (
                        <div className="space-y-4">
                          {/* Sentinel-X 实时评分 */}
                          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-900/40 border border-slate-700/40">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Sentinel-X 实时评分</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${totalImpact > 0 ? 'text-emerald-400' : totalImpact < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                  {totalImpact > 0 ? '+' : ''}{totalImpact}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">综合 Impact</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-cyan-400">{signals.length}</div>
                                <div className="text-xs text-slate-500 mt-1">触发信号</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-amber-400">{(avgConfidence * 100).toFixed(0)}%</div>
                                <div className="text-xs text-slate-500 mt-1">平均置信度</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${hasCritical ? 'text-red-400' : alerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {hasCritical ? '⚠️ 高危' : alerts.length > 0 ? `${alerts.length} 警告` : '✅ 安全'}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">风险等级</div>
                              </div>
                            </div>
                          </div>

                          {/* 市场综合分析 */}
                          {summary && (
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                              <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 市场综合分析</h3>
                              <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
                            </div>
                          )}

                          {/* 警报 */}
                          {alerts.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-red-300">🚨 警报 ({alerts.length})</h3>
                              {alerts.map((alert: any, idx: number) => (
                                <div key={idx} className={`p-3 rounded-xl border ${alert.level === 'critical' ? 'bg-red-500/5 border-red-500/20' : alert.level === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${alert.level === 'critical' ? 'bg-red-500/20 text-red-400' : alert.level === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                      {alert.level?.toUpperCase()}
                                    </span>
                                    <span className="text-sm font-semibold text-white">{alert.title}</span>
                                    {alert.group && <span className="text-xs text-slate-500">{alert.group}</span>}
                                  </div>
                                  <p className="text-sm text-slate-400">{alert.description}</p>
                                  {alert.relatedCoins && <div className="flex gap-1.5 mt-2">{(Array.isArray(alert.relatedCoins) ? alert.relatedCoins : []).map((c: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">{c}</span>)}</div>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 触发信号详情 */}
                          {signals.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-cyan-300">📡 触发信号详情 ({signals.length})</h3>
                              <div className="space-y-2">
                                {signals.map((sig: any, idx: number) => {
                                  const impact = Number(sig.impact) || 0;
                                  const confidence = Number(sig.confidence) || 0;
                                  return (
                                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-slate-800/30">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-slate-600 font-mono">#{sig.signalId}</span>
                                            <span className="text-sm font-semibold text-white">{sig.title}</span>
                                          </div>
                                          <p className="text-sm text-slate-400 mt-1 leading-relaxed">{sig.summary}</p>
                                          {sig.source && <p className="text-xs text-slate-600 mt-1.5">来源: {sig.source}</p>}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <div className={`text-lg font-bold ${impact > 0 ? 'text-emerald-400' : impact < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                            {impact > 0 ? '+' : ''}{impact}
                                          </div>
                                          <div className="text-center">
                                            <div className="text-sm font-semibold text-amber-400">{(confidence * 100).toFixed(0)}%</div>
                                            <div className="text-xs text-slate-600">置信度</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">暂无扫描记录</p>
          </div>
        )}
        {scanLogsTotalPages > 1 && (
          <div className="flex items-center justify-center gap-5 py-3 border-t border-slate-800/20">
            <button disabled={scanLogsPage <= 1} onClick={() => loadScanLogs(scanLogsPage - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-500">{scanLogsPage} / {scanLogsTotalPages}</span>
            <button disabled={scanLogsPage >= scanLogsTotalPages} onClick={() => loadScanLogs(scanLogsPage + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 管线卡片 ====================
function PipelineCard({ p, color, saving, onToggle, onEdit, onDelete, editId }: {
  p: any;
  color: string;
  saving: number | null;
  onToggle: (p: any) => void;
  onEdit: (p: any) => void;
  onDelete: (id: number) => void;
  editId: number | null;
}) {
  const colorMap: Record<string, { border: string; dot: string; statusBg: string; statusText: string }> = {
    blue:   { border: 'border-blue-500/25 bg-blue-600/5', dot: 'bg-blue-400 shadow-blue-400/40', statusBg: 'bg-blue-500/15', statusText: 'text-blue-400' },
    purple: { border: 'border-purple-500/25 bg-purple-600/5', dot: 'bg-purple-400 shadow-purple-400/40', statusBg: 'bg-purple-500/15', statusText: 'text-purple-400' },
    amber:  { border: 'border-amber-500/25 bg-amber-600/5', dot: 'bg-amber-400 shadow-amber-400/40', statusBg: 'bg-amber-500/15', statusText: 'text-amber-400' },
  };
  const c = colorMap[color] || colorMap.purple;
  const isEditing = editId === p.id;

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isEditing ? 'border-purple-500/40 ring-1 ring-purple-500/20 bg-purple-600/5' : p.enabled ? c.border : 'border-slate-800/50 bg-slate-900/30'}`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEditing ? 'bg-purple-400 shadow-sm shadow-purple-400/40' : p.enabled ? `${c.dot} shadow-sm` : 'bg-slate-700'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {isEditing && <span className="text-xs font-medium text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md">编辑中</span>}
            <span className={`text-base font-semibold ${p.enabled ? 'text-white' : 'text-slate-500'}`}>
              {LLM_PROVIDERS[p.provider]?.name || p.provider}
            </span>
            <span className={`text-sm px-2 py-0.5 rounded-md ${p.enabled ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-800/60 text-slate-600'}`}>
              {p.model}
            </span>
            {p.priority > 0 && <span className="text-xs text-slate-600 bg-slate-800/40 px-1.5 py-0.5 rounded">P{p.priority}</span>}
          </div>
          <div className={`text-sm mt-1.5 flex items-center gap-2 flex-wrap ${p.enabled ? 'text-slate-500' : 'text-slate-600'}`}>
            <span className="truncate max-w-[280px]">{p.apiUrl || '未配置 URL'}</span>
            <span className="text-slate-700">·</span>
            {p.apiKeyEnc
              ? <span className="flex items-center gap-1 text-emerald-500/70"><Lock className="w-3 h-3" />Key 已加密</span>
              : <span className="flex items-center gap-1 text-amber-500/70"><AlertTriangle className="w-3 h-3" />Key 未配置</span>
            }
            {p.updatedAt && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-slate-600">{new Date(p.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
            p.enabled
              ? `${c.statusBg} ${c.statusText}`
              : 'bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-600/60'
          }`}
          onClick={() => onToggle(p)}
          disabled={saving === p.id}
        >
          {saving === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.enabled ? '✓ 已启用' : '启用'}
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
            isEditing ? 'bg-purple-600/20 text-purple-400' : 'bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-600/60'
          }`}
          onClick={() => onEdit(p)}
        >
          编辑
        </button>
        <button className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" onClick={() => onDelete(p.id)}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
