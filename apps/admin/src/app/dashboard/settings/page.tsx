'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, Loader2 } from 'lucide-react';
import { adminApi, isLoggedIn } from '@/lib/api';

const SETTING_LABELS: Record<string, { label: string; type: 'number' | 'boolean' | 'string'; desc: string }> = {
  registration_enabled: { label: '开放注册', type: 'boolean', desc: '是否允许新用户注册' },
  auto_scan_interval_minutes: { label: '定时扫描间隔 (分钟)', type: 'number', desc: '后台自动执行300信号扫描的间隔，设为 0 则关闭自动扫描。扫描结果会缓存，缓存窗口内的用户请求直接推送缓存内容' },
  new_user_bonus_tokens: { label: '新用户赠送 Token', type: 'number', desc: '注册赠送的 Token 数量' },
  scan_price_basic: { label: '基础扫描费用', type: 'number', desc: '每次基础扫描消耗的 Token' },
  scan_price_with_search: { label: '搜索增强扫描费用', type: 'number', desc: '含搜索增强的扫描消耗 Token' },
  cache_window_minutes: { label: '缓存窗口 (分钟)', type: 'number', desc: '同类扫描结果缓存复用时间' },
  max_scans_per_user_per_hour: { label: '每小时扫描上限', type: 'number', desc: '单用户每小时最多扫描次数' },
  max_concurrent_scans: { label: '最大并发扫描', type: 'number', desc: '系统同时处理的最大扫描数' },
  token_to_cny_rate: { label: 'Token 汇率 (CNY)', type: 'number', desc: '每 Token 对应人民币价格' },
  maintenance_mode: { label: '维护模式', type: 'boolean', desc: '开启后所有扫描请求将返回维护提示' },
  announcement: { label: '公告', type: 'string', desc: '显示在公共主页的系统公告' },
};

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
    <div className="p-6 xl:p-8 space-y-8">
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
    </div>
  );
}
