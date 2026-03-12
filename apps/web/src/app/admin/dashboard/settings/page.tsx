'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, Loader2, ShieldCheck, Plus, Trash2, Edit3, X } from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/adminApi';

const SETTING_LABELS: Record<string, { label: string; type: 'number' | 'boolean' | 'string'; desc: string }> = {
  registration_enabled: { label: '开放注册', type: 'boolean', desc: '是否允许新用户注册' },
  auto_scan_interval_minutes: { label: '定时扫描间隔 (分钟)', type: 'number', desc: '后台自动执行300信号扫描的间隔，设为 0 则关闭自动扫描。扫描结果会缓存，缓存窗口内的用户请求直接推送缓存内容' },
  new_user_bonus_tokens: { label: '新用户赠送 Token', type: 'number', desc: '注册赠送的 Token 数量' },
  scan_price_basic: { label: '基础扫描费用', type: 'number', desc: '每次基础扫描消耗的 Token' },
  scan_price_with_search: { label: '搜索增强扫描费用', type: 'number', desc: '含搜索增强的扫描消耗 Token' },
  cache_window_minutes: { label: '缓存窗口 (分钟)', type: 'number', desc: '同类扫描结果缓存复用时间' },
  max_scans_per_user_per_hour: { label: '每小时扫描上限', type: 'number', desc: '单用户每小时最多扫描次数' },
  max_concurrent_scans: { label: '最大并发扫描', type: 'number', desc: '系统同时处理的最大扫描数' },
  token_to_cny_rate: { label: 'USDT 兑换比率', type: 'number', desc: '1 USDT 可兑换的 Token 数量（如设为 10 则 1 USDT = 10 Token）' },
  maintenance_mode: { label: '维护模式', type: 'boolean', desc: '开启后所有扫描请求将返回维护提示' },
  announcement: { label: '公告', type: 'string', desc: '显示在公共主页的系统公告' },
};

// ── 管理员账号管理面板 ──
function AdminAccountPanel() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadAdmins = async () => {
    setLoading(true);
    const res = await adminApi.getAdmins();
    if (res.success) setAdmins(res.data as any[] || []);
    setLoading(false);
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleAdd = async () => {
    if (!addForm.email.trim() || !addForm.password.trim()) { setMsg('邮箱和密码为必填项'); return; }
    setSaving(true);
    setMsg('');
    const res = await adminApi.createAdmin(addForm);
    if (res.success) {
      setMsg('✓ 管理员已创建');
      setShowAdd(false);
      setAddForm({ email: '', password: '', name: '' });
      loadAdmins();
    } else {
      setMsg('✗ ' + (res.error || '创建失败'));
    }
    setSaving(false);
  };

  const handleEdit = async (id: number) => {
    setSaving(true);
    setMsg('');
    const updates: any = {};
    if (editForm.email) updates.email = editForm.email;
    if (editForm.password) updates.password = editForm.password;
    if (editForm.name !== undefined) updates.name = editForm.name;
    if (Object.keys(updates).length === 0) { setMsg('无修改'); setSaving(false); return; }

    const res = await adminApi.updateAdmin(id, updates);
    if (res.success) {
      setMsg('✓ 已保存');
      setEditingId(null);
      loadAdmins();
    } else {
      setMsg('✗ ' + (res.error || '保存失败'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此管理员账号吗？')) return;
    setMsg('');
    const res = await adminApi.deleteAdmin(id);
    if (res.success) {
      setMsg('✓ 已删除');
      loadAdmins();
    } else {
      setMsg('✗ ' + (res.error || '删除失败'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          管理员账号
        </h2>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs ${msg.startsWith('✓') ? 'text-emerald-400' : msg.startsWith('✗') ? 'text-red-400' : 'text-amber-400'}`}>{msg}</span>}
          <button
            onClick={() => { setShowAdd(!showAdd); setMsg(''); }}
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> 添加管理员
          </button>
        </div>
      </div>

      {/* 添加新管理员表单 */}
      {showAdd && (
        <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
          <h3 className="text-sm font-semibold text-purple-300">新建管理员</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">邮箱 *</label>
              <input value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="admin@example.com" className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:border-purple-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">密码 *</label>
              <input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder="设置密码" className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:border-purple-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">昵称</label>
              <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="可选" className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:border-purple-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} 创建
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs px-4 py-2 rounded-lg text-slate-500 hover:bg-white/5 transition-all">取消</button>
          </div>
        </div>
      )}

      {/* 管理员列表 */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
      ) : (
        <div className="space-y-2">
          {admins.map(a => (
            <div key={a.id} className="p-4 rounded-2xl bg-white/[0.02] border border-slate-800/40 hover:border-slate-700/50 transition-colors">
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">邮箱</label>
                      <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">新密码</label>
                      <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="留空不修改" className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">昵称</label>
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(a.id)} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 保存
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white/5 transition-all">
                      <X className="w-3 h-3" /> 取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{a.email}</p>
                      <p className="text-xs text-slate-500">{a.name || '未设置昵称'} · ID: {a.id} · 创建于 {new Date(a.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingId(a.id); setEditForm({ email: a.email, password: '', name: a.name || '' }); setMsg(''); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    >
                      <Edit3 className="w-3 h-3" /> 编辑
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <div className="text-center py-6 text-sm text-slate-500">暂无管理员账号</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getSettings();
    if (res.success) {
      setSettings((res.data as Record<string, any>) || {});
    }
    setLoading(false);
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(key);
    await adminApi.updateSetting(key, value);
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
    <div className="p-6 xl:p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-slate-700/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
          系统设置
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px]">管理 Sentinel-X 的全局运行参数</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(SETTING_LABELS).map(([key, config]) => (
          <div key={key} className={`p-5 rounded-2xl bg-white/[0.02] border border-slate-800/40 hover:border-slate-700/50 transition-colors ${config.type === 'string' ? 'md:col-span-2 xl:col-span-3' : ''}`}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[15px] font-semibold text-slate-200">{config.label}</label>
              {config.type !== 'boolean' && (
                <button
                  onClick={() => handleSave(key, settings[key])}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  {saving === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  保存
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">{config.desc}</p>
            {config.type === 'boolean' ? (
              <button
                onClick={() => {
                  const newVal = !settings[key];
                  setSettings({ ...settings, [key]: newVal });
                  handleSave(key, newVal);
                }}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${settings[key] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 hover:text-slate-300'}`}
              >
                {settings[key] ? '✓ 已开启' : '已关闭'}
              </button>
            ) : config.type === 'number' ? (
              <input
                type="number"
                value={settings[key] ?? 0}
                onChange={(e) => setSettings({ ...settings, [key]: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[15px] text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-all"
              />
            ) : (
              <input
                type="text"
                value={settings[key] ?? ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[15px] text-white placeholder-slate-600 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-all"
              />
            )}
          </div>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-800/40" />

      {/* 管理员账号管理 */}
      <AdminAccountPanel />
    </div>
  );
}
