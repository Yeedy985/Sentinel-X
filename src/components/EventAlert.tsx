import { useState } from 'react';
import {
  Bell, BellRing, Trash2, Send, Eye, EyeOff, CheckCircle,
  AlertTriangle, Info, Loader2, MessageCircle, Plus, ChevronDown, Settings2, Pencil, X,
} from 'lucide-react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { encrypt, decrypt } from '../services/crypto';
import { notifyAlert, getGlobalPushSettings, saveGlobalPushSettings, testScanResultPush, diagnosticTest } from '../services/notificationService';
import type { GlobalPushSettings } from '../services/notificationService';
import { SIGNAL_GROUPS } from '../services/sentinelEngine';
import type { NotificationConfig, AlertLevel, EventAlert as EventAlertType } from '../types';

// ==================== 子组件: 通知渠道配置 ====================
function NotificationConfigPanel() {
  const configs = useLiveQuery(() => db.notificationConfigs.toArray(), []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [channel, setChannel] = useState<'telegram' | 'whatsapp'>('telegram');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [waApiUrl, setWaApiUrl] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState('');
  const [testingScan, setTestingScan] = useState(false);

  // ── 全局推送设置 ──
  const [gps, setGps] = useState<GlobalPushSettings>(getGlobalPushSettings);
  const updateGps = (patch: Partial<GlobalPushSettings>) => {
    const next = { ...gps, ...patch };
    setGps(next);
    saveGlobalPushSettings(next);
  };
  const toggleLevel = (level: AlertLevel) => {
    const levels = gps.alertLevels.includes(level)
      ? gps.alertLevels.filter(l => l !== level)
      : [...gps.alertLevels, level];
    updateGps({ alertLevels: levels });
  };

  const resetForm = () => {
    setBotToken(''); setChatId(''); setWaApiUrl(''); setWaApiKey(''); setWaPhone('');
    setEditingId(null); setShowForm(false); setShowKey(false);
  };

  const openEditForm = (c: NotificationConfig) => {
    setEditingId(c.id!);
    setChannel(c.channel);
    if (c.channel === 'telegram') {
      try { setBotToken(c.telegramBotToken ? decrypt(c.telegramBotToken) : ''); } catch { setBotToken(''); }
      setChatId(c.telegramChatId || '');
    } else {
      setWaApiUrl(c.whatsappApiUrl || '');
      try { setWaApiKey(c.whatsappApiKey ? decrypt(c.whatsappApiKey) : ''); } catch { setWaApiKey(''); }
      setWaPhone(c.whatsappPhone || '');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        // 更新已有渠道
        const update: Partial<NotificationConfig> = { channel };
        if (channel === 'telegram') {
          if (botToken) update.telegramBotToken = encrypt(botToken);
          update.telegramChatId = chatId || undefined;
        } else {
          update.whatsappApiUrl = waApiUrl || undefined;
          if (waApiKey) update.whatsappApiKey = encrypt(waApiKey);
          update.whatsappPhone = waPhone || undefined;
        }
        await db.notificationConfigs.update(editingId, update);
      } else {
        // 新增渠道
        const config: Omit<NotificationConfig, 'id'> = {
          channel,
          enabled: true,
          alertLevels: gps.alertLevels,
          pushScanResults: gps.pushScanResults,
          pushAlerts: gps.pushAlerts,
          quietHoursStart: gps.quietHoursStart || undefined,
          quietHoursEnd: gps.quietHoursEnd || undefined,
          createdAt: Date.now(),
        };
        if (channel === 'telegram') {
          config.telegramBotToken = botToken ? encrypt(botToken) : undefined;
          config.telegramChatId = chatId || undefined;
        } else {
          config.whatsappApiUrl = waApiUrl || undefined;
          config.whatsappApiKey = waApiKey ? encrypt(waApiKey) : undefined;
          config.whatsappPhone = waPhone || undefined;
        }
        await db.notificationConfigs.add(config);
      }
      resetForm();
    } catch (err: any) {
      console.error('保存通知配置失败:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (editingId === id) resetForm();
    await db.notificationConfigs.delete(id);
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    await db.notificationConfigs.update(id, { enabled });
  };

  const handleTest = async (config: NotificationConfig) => {
    if (!config.id) return;
    setTesting(config.id);
    setTestResult('');
    try {
      const result = await diagnosticTest(config);
      setTestResult(result);
    } catch (err: any) {
      setTestResult(`❌ 异常: ${err.message}`);
    }
    setTesting(null);
    setTimeout(() => setTestResult(''), 15000);
  };

  // ── 渠道配置表单 (新增 / 编辑共用) ──
  const renderChannelForm = () => (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-300">
          {editingId ? '✏️ 编辑渠道' : '➕ 添加渠道'}
        </h4>
        <button className="p-1 text-slate-500 hover:text-slate-300" onClick={resetForm}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 渠道选择 (新增时可切换，编辑时锁定) */}
      {!editingId && (
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">推送渠道</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                channel === 'telegram' ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setChannel('telegram')}
            >
              <span className="font-medium block">📱 Telegram</span>
              <span className="text-sm text-slate-500 mt-1 block">通过 Bot API 推送消息</span>
            </button>
            <button
              className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                channel === 'whatsapp' ? 'border-green-500 bg-green-600/10 text-green-400' : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setChannel('whatsapp')}
            >
              <span className="font-medium block">💬 WhatsApp</span>
              <span className="text-sm text-slate-500 mt-1 block">通过 WhatsApp Business API</span>
            </button>
          </div>
        </div>
      )}

      {/* Telegram 配置 */}
      {channel === 'telegram' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Bot Token</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showKey ? 'text' : 'password'}
                placeholder="从 @BotFather 获取"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-1">在 Telegram 中搜索 @BotFather 创建 Bot</p>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Chat ID</label>
            <input
              className="input-field"
              placeholder="你的 Chat ID 或群组 ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-sm text-slate-600 mt-1">发送 /start 给 @userinfobot 获取</p>
          </div>
        </div>
      )}

      {/* WhatsApp 配置 */}
      {channel === 'whatsapp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">API 地址</label>
              <input className="input-field" placeholder="https://graph.facebook.com/v18.0/..." value={waApiUrl} onChange={(e) => setWaApiUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">API Key / Token</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showKey ? 'text' : 'password'}
                  placeholder="WhatsApp Business API Token"
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">接收手机号</label>
            <input className="input-field w-60" placeholder="+86 138xxxx" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? '保存修改' : '添加'}
        </button>
        <button className="btn-secondary text-sm" onClick={resetForm}>取消</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <details open>
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-lg font-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(234,179,8,0.05) 100%)' }}>
              <Bell className="w-4.5 h-4.5 text-amber-400" />
            </div>
            消息推送配置
          </h3>
          <ChevronDown className="w-5 h-5 text-slate-500 transition-transform duration-200 details-open:rotate-180" />
        </summary>
        <div className="space-y-5 mt-4">

      {/* ════════ 全局推送设置 ════════ */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-4">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          推送设置
          <span className="text-xs text-slate-500 font-normal ml-1">对所有已添加渠道统一生效</span>
        </h4>

        {/* 推送内容 */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">推送内容</label>
          <div className="flex gap-3 flex-wrap">
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              gps.pushScanResults ? 'border-blue-500/50 bg-blue-600/10 text-blue-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}>
              <input type="checkbox" checked={gps.pushScanResults} onChange={e => updateGps({ pushScanResults: e.target.checked })} className="accent-blue-500" />
              <span className="text-sm font-medium">📡 信号300扫描结果</span>
            </label>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              gps.pushAlerts ? 'border-amber-500/50 bg-amber-600/10 text-amber-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}>
              <input type="checkbox" checked={gps.pushAlerts} onChange={e => updateGps({ pushAlerts: e.target.checked })} className="accent-amber-500" />
              <span className="text-sm font-medium">🚨 预警信息</span>
            </label>
          </div>
          <p className="text-xs text-slate-600 mt-1.5">勾选后，每次扫描完成将自动推送对应内容到所有已启用的渠道</p>
        </div>

        {/* 预警推送级别 */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">预警推送级别 <span className="text-slate-600">(仅当勾选「预警信息」时生效)</span></label>
          <div className="flex gap-2">
            {([
              { level: 'critical' as AlertLevel, label: '🚨 紧急', color: 'red' },
              { level: 'warning' as AlertLevel, label: '⚠️ 警告', color: 'amber' },
              { level: 'info' as AlertLevel, label: 'ℹ️ 信息', color: 'blue' },
            ]).map(({ level, label, color }) => (
              <button
                key={level}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  gps.alertLevels.includes(level)
                    ? `border-${color}-500/50 bg-${color}-600/10 text-${color}-400`
                    : 'border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
                onClick={() => toggleLevel(level)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 免打扰时段 */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">免打扰时段 <span className="text-slate-600">(紧急事件不受限制)</span></label>
          <div className="flex items-center gap-2">
            <input className="input-field w-28 text-center text-sm" type="time" value={gps.quietHoursStart} onChange={(e) => updateGps({ quietHoursStart: e.target.value })} />
            <span className="text-slate-500">至</span>
            <input className="input-field w-28 text-center text-sm" type="time" value={gps.quietHoursEnd} onChange={(e) => updateGps({ quietHoursEnd: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ════════ 渠道列表 + 添加 ════════ */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          推送渠道 ({configs?.filter(c => c.enabled).length || 0} 个已启用)
        </p>
        <button className="btn-primary text-sm flex items-center gap-1 shrink-0" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> 添加渠道
        </button>
      </div>

      {showForm && !editingId && renderChannelForm()}

      {/* 已配置的渠道列表 */}
      {configs && configs.length > 0 && (
        <div className="space-y-2">
          {configs.map((c) => (
            <div key={c.id} className={`rounded-lg border overflow-hidden ${c.enabled ? 'border-amber-500/20 bg-amber-600/5' : 'border-slate-800 bg-slate-800/30'}`}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.channel === 'telegram' ? '📱' : '💬'}</span>
                  <div>
                    <span className="font-medium text-sm">{c.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}</span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {c.channel === 'telegram' ? `Chat ID: ${c.telegramChatId || '-'}` : `手机: ${c.whatsappPhone || '-'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testing === c.id ? (
                    <span className="text-sm text-amber-400"><Loader2 className="w-3 h-3 animate-spin inline" /> 测试中...</span>
                  ) : (
                    <button className="text-sm px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600" onClick={() => handleTest(c)}>
                      <Send className="w-3 h-3 inline mr-1" />测试
                    </button>
                  )}
                  <button
                    className="text-sm px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                    onClick={() => { if (editingId === c.id) { resetForm(); } else { openEditForm(c); } }}
                  >
                    <Pencil className="w-3 h-3 inline mr-1" />{editingId === c.id ? '收起' : '编辑'}
                  </button>
                  <button
                    className={`text-sm px-2 py-1 rounded ${c.enabled ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    onClick={() => handleToggle(c.id!, !c.enabled)}
                  >
                    {c.enabled ? '已启用' : '启用'}
                  </button>
                  <button className="p-1 text-slate-500 hover:text-red-400" onClick={() => handleDelete(c.id!)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* 内联编辑表单 */}
              {editingId === c.id && showForm && (
                <div className="border-t border-slate-700/30">
                  {renderChannelForm()}
                </div>
              )}
            </div>
          ))}
          {testResult && <pre className="text-sm text-blue-400 text-center mt-2 whitespace-pre-line font-sans">{testResult}</pre>}
          {/* 测试推送上次扫描 */}
          <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-800/50">
            <button
              className="text-sm px-3 py-1.5 rounded-lg bg-cyan-600/15 text-cyan-400 hover:bg-cyan-600/25 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={testingScan}
              onClick={async () => {
                setTestingScan(true);
                setTestResult('');
                try {
                  const res = await testScanResultPush();
                  if (res.success) {
                    setTestResult(`✅ 上次扫描结果已推送到 ${res.channels.join(', ')}`);
                  } else {
                    setTestResult(`❌ ${res.error || '推送失败'}`);
                  }
                } catch (err: any) {
                  setTestResult(`❌ ${err.message}`);
                }
                setTestingScan(false);
                setTimeout(() => setTestResult(''), 10000);
              }}
            >
              {testingScan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              测试推送上次扫描结果
            </button>
          </div>
        </div>
      )}
        </div>
      </details>
    </div>
  );
}

// ==================== 主组件: 消息中心 ====================
export default function EventAlertPage() {
  const alerts = useLiveQuery(
    () => db.eventAlerts.orderBy('createdAt').reverse().limit(100).toArray(),
    [],
  );
  const [sending, setSending] = useState<number | null>(null);

  const handleManualNotify = async (alert: EventAlertType) => {
    if (!alert.id) return;
    setSending(alert.id);
    try {
      await notifyAlert(alert);
    } catch (err) {
      console.error('手动推送失败:', err);
    }
    setSending(null);
  };

  const handleAcknowledge = async (id: number) => {
    await db.eventAlerts.update(id, { acknowledgedAt: Date.now() });
  };

  const handleClearAll = async () => {
    if (!confirm('确定清除所有预警记录？')) return;
    await db.eventAlerts.clear();
  };

  const levelIcon = (l: AlertLevel) => {
    if (l === 'critical') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (l === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  };
  const levelBorder = (l: AlertLevel) => {
    if (l === 'critical') return 'border-l-red-500';
    if (l === 'warning') return 'border-l-amber-500';
    return 'border-l-blue-500';
  };
  const levelLabel = (l: AlertLevel) => {
    if (l === 'critical') return '紧急';
    if (l === 'warning') return '警告';
    return '信息';
  };

  const unacknowledged = alerts?.filter(a => !a.acknowledgedAt) || [];
  const acknowledged = alerts?.filter(a => a.acknowledgedAt) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">消息中心</h1>
        {alerts && alerts.length > 0 && (
          <button className="btn-secondary text-sm" onClick={handleClearAll}>
            <Trash2 className="w-4 h-4 inline mr-1" /> 清除全部
          </button>
        )}
      </div>

      {/* 通知渠道配置 */}
      <NotificationConfigPanel />

      {/* 未处理的预警 */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' }}>
            <BellRing className="w-4.5 h-4.5 text-red-400" />
          </div>
          待处理预警
          {unacknowledged.length > 0 && (
            <span className="text-sm px-2 py-0.5 rounded-full bg-red-600/20 text-red-400">{unacknowledged.length}</span>
          )}
        </h3>
        {unacknowledged.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无待处理的预警事件</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unacknowledged.map((alert) => {
              const grp = SIGNAL_GROUPS.find(g => g.id === alert.group);
              return (
                <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${levelBorder(alert.level)} space-y-2`} style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,41,59,0.3) 100%)', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.15)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {levelIcon(alert.level)}
                      <span className={`text-sm px-1.5 py-0.5 rounded font-medium ${
                        alert.level === 'critical' ? 'bg-red-600/20 text-red-400' : alert.level === 'warning' ? 'bg-amber-600/20 text-amber-400' : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {levelLabel(alert.level)}
                      </span>
                      <span className="text-sm text-slate-500">{grp?.icon || '🔔'} {grp?.label || alert.group}</span>
                    </div>
                    <span className="text-sm text-slate-600">{new Date(alert.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{alert.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {alert.relatedCoins.map(c => (
                      <span key={c} className="text-sm px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-400">{c}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>来源: {alert.source}</span>
                      {alert.notified && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          已推送 ({alert.notifyChannels.join(', ')})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!alert.notified && (
                        <button
                          className="text-sm px-2 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                          onClick={() => handleManualNotify(alert)}
                          disabled={sending === alert.id}
                        >
                          {sending === alert.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Send className="w-3 h-3 inline mr-1" />}
                          推送
                        </button>
                      )}
                      <button
                        className="text-sm px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                        onClick={() => handleAcknowledge(alert.id!)}
                      >
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        已知晓
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 历史预警 */}
      {acknowledged.length > 0 && (
        <div className="card space-y-3">
          <details className="group">
            <summary className="text-lg font-semibold flex items-center gap-3 cursor-pointer">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(100,116,139,0.15) 0%, rgba(100,116,139,0.05) 100%)' }}>
                <Bell className="w-4.5 h-4.5 text-slate-400" />
              </div>
              历史预警
              <span className="text-sm text-slate-500 font-normal">({acknowledged.length})</span>
            </summary>
            <div className="space-y-2 mt-4">
              {acknowledged.map((alert) => {
                const grp = SIGNAL_GROUPS.find(g => g.id === alert.group);
                return (
                  <div key={alert.id} className="p-3 rounded-xl opacity-60" style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(51,65,85,0.2)' }}>
                    <div className="flex items-center gap-2">
                      {levelIcon(alert.level)}
                      <span className="text-sm text-slate-500">{grp?.icon || '🔔'} {grp?.label || alert.group}</span>
                      <span className="font-medium text-sm flex-1">{alert.title}</span>
                      <span className="text-sm text-slate-600">{new Date(alert.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
