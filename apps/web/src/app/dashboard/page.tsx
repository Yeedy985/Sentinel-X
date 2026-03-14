'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Coins, Key, History, FileText, LogOut, Plus, Copy, Trash2,
  Loader2, ChevronLeft, ChevronRight, Wallet, ArrowRightLeft,
  CircleDollarSign, CheckCircle2, Clock, XCircle, QrCode, ExternalLink,
  Activity, Zap, TrendingUp,
} from 'lucide-react';
import { api, clearToken, isLoggedIn } from '@/lib/api';
import { useI18n } from '@/i18n';
import { QRCodeSVG } from 'qrcode.react';

type TabKey = 'recharge' | 'history' | 'tokens' | 'transactions' | 'scans';

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>('recharge');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [copied, setCopied] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [scanPage, setScanPage] = useState(1);
  const [scanTotal, setScanTotal] = useState(0);
  const [rechargePage, setRechargePage] = useState(1);
  const [rechargeTotal, setRechargeTotal] = useState(0);

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeOrder, setRechargeOrder] = useState<any>(null);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [usdtRate, setUsdtRate] = useState(10);
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [lockCountdown, setLockCountdown] = useState('');
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes, cRes] = await Promise.all([api.getProfile(), api.getTokens(), api.getConfig()]);
      if (pRes.success) setProfile(pRes.data);
      else if (pRes.error) setMessage({ type: 'error', text: locale === 'zh' ? `加载用户信息失败: ${pRes.error}` : `Failed to load profile: ${pRes.error}` });
      if (tRes.success) setTokens((tRes.data as any[]) || []);
      if (cRes.success) setUsdtRate((cRes.data as any)?.usdtToTokenRate || 10);
    } catch (err: any) {
      setMessage({ type: 'error', text: locale === 'zh' ? '连接服务器失败，请检查网络后刷新重试' : 'Connection failed, please check your network and refresh' });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const res = await api.getProfile();
    if (res.success) setProfile(res.data);
  };

  const loadTransactions = async (page = 1) => {
    try {
      const res = await api.getTransactions(page);
      if (res.success) {
        const d = res.data as any;
        setTransactions(d.data || []);
        setTxPage(d.page);
        setTxTotal(d.totalPages);
      }
    } catch {}
  };

  const loadScans = async (page = 1) => {
    try {
      const res = await api.getScans(page);
      if (res.success) {
        const d = res.data as any;
        setScans(d.data || []);
        setScanPage(d.page);
        setScanTotal(d.totalPages);
      }
    } catch {}
  };

  const loadRecharges = async (page = 1) => {
    try {
      const res = await api.getRecharges(page);
      if (res.success) {
        const d = res.data as any;
        setRecharges(d.data || []);
        setRechargePage(d.page);
        setRechargeTotal(d.totalPages);
      }
    } catch {}
  };

  useEffect(() => {
    if (tab === 'transactions') loadTransactions();
    if (tab === 'scans') loadScans();
    if (tab === 'history') loadRecharges();
  }, [tab]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Lock countdown timer ──
  useEffect(() => {
    if (!rechargeOrder?.lockExpiresAt) { setLockCountdown(''); return; }
    const tick = () => {
      const diff = new Date(rechargeOrder.lockExpiresAt).getTime() - Date.now();
      if (diff <= 0) { setLockCountdown(locale === 'zh' ? '已过期' : 'Expired'); return; }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setLockCountdown(`${min}:${sec.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [rechargeOrder?.lockExpiresAt]);

  // ── Recharge Flow ──
  const handleCreateRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < 1) { showMsg('error', locale === 'zh' ? '最低充值 1 USDT' : 'Minimum recharge is 1 USDT'); return; }
    setRechargeLoading(true);
    try {
      const res = await api.createRecharge(amount, selectedNetwork);
      if (res.success) {
        setRechargeOrder(res.data);
        setPaidConfirmed(false);
        showMsg('success', locale === 'zh' ? `充值订单已创建: ${amount} USDT (${selectedNetwork})` : `Recharge order created: ${amount} USDT (${selectedNetwork})`);
        setRechargeAmount('');
      } else {
        showMsg('error', (res as any).error || (locale === 'zh' ? '创建失败' : 'Creation failed'));
      }
    } catch {
      showMsg('error', locale === 'zh' ? '网络连接失败，请重试' : 'Network error, please retry');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: number) => {
    setRechargeLoading(true);
    try {
      const res = await api.confirmRecharge(orderId);
      if (res.success) {
        showMsg('success', locale === 'zh' ? '已确认到账，请点击“兑换Token”' : 'Payment confirmed, please click "Exchange Token"');
        if (rechargeOrder?.id === orderId) {
          setRechargeOrder({ ...rechargeOrder, status: 'COMPLETED' });
        }
        loadRecharges(rechargePage);
      } else {
        showMsg('error', (res as any).error || (locale === 'zh' ? '确认失败' : 'Confirmation failed'));
      }
    } catch (err: any) {
      showMsg('error', locale === 'zh' ? '网络连接失败，请重试' : 'Network error, please retry');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleExchange = async (rechargeId: number) => {
    setExchangeLoading(rechargeId);
    try {
      const res = await api.exchange(rechargeId);
      if (res.success) {
        const d = res.data as any;
        showMsg('success', locale === 'zh' ? `成功兑换 ${d.tokensGranted} Token！当前余额: ${d.newBalance}` : `Exchanged ${d.tokensGranted} tokens! Balance: ${d.newBalance}`);
        await refreshProfile();
        loadRecharges(rechargePage);
        setRechargeOrder(null);
      } else {
        showMsg('error', (res as any).error || (locale === 'zh' ? '兑换失败' : 'Exchange failed'));
      }
    } catch {
      showMsg('error', locale === 'zh' ? '网络连接失败，请重试' : 'Network error, please retry');
    } finally {
      setExchangeLoading(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Token Management ──
  const handleCreateToken = async () => {
    setCreating(true);
    try {
      const res = await api.createToken(newTokenName || undefined);
      if (res.success) {
        const d = res.data as any;
        setCreatedToken(d.token);
        setNewTokenName('');
        const tRes = await api.getTokens();
        if (tRes.success) setTokens((tRes.data as any[]) || []);
      } else {
        showMsg('error', (res as any).error || (locale === 'zh' ? '创建失败' : 'Creation failed'));
      }
    } catch {
      showMsg('error', locale === 'zh' ? '网络连接失败，请重试' : 'Network error, please retry');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await api.revokeToken(id);
      const tRes = await api.getTokens();
      if (tRes.success) setTokens((tRes.data as any[]) || []);
    } catch {
      showMsg('error', locale === 'zh' ? '撤销失败，请重试' : 'Revoke failed, please retry');
    }
  };

  const handleLogout = () => { clearToken(); router.push('/login'); };

  const txDesc = (desc: string) => {
    if (locale !== 'zh') {
      const map: Record<string, string> = {
        '注册赠送': 'Registration Bonus',
        '扫描消耗': 'Scan Cost',
        '扫描退回': 'Scan Refund',
        '充值兑换': 'Recharge Exchange',
        '管理员调整': 'Admin Adjustment',
      };
      return map[desc] || desc;
    }
    return desc;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15"><Clock className="w-3 h-3" />{locale === 'zh' ? '待支付' : 'Pending'}</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"><CheckCircle2 className="w-3 h-3" />{locale === 'zh' ? '已完成' : 'Completed'}</span>;
      case 'FAILED': return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/15"><XCircle className="w-3 h-3" />{locale === 'zh' ? '失败' : 'Failed'}</span>;
      default: return <span className="text-[10px] text-slate-500">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#020617]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-500 tracking-wide">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* ─── Header ─── */}
      <nav className="border-b border-white/[0.04] bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-all duration-300">
                <Shield className="w-3.5 h-3.5 text-white" />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <span className="font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">AlphaSentinel</span>
            </Link>
            <div className="hidden sm:flex items-center gap-0.5 ml-2">
              <Link href="/" className="px-3 py-1.5 text-[13px] text-slate-500 hover:text-slate-200 rounded-lg hover:bg-white/[0.04] transition-all duration-200">{t('nav.home')}</Link>
              <Link href="/grid" className="px-3 py-1.5 text-[13px] text-slate-500 hover:text-slate-200 rounded-lg hover:bg-white/[0.04] transition-all duration-200">{t('nav.grid')}</Link>
              <Link href="/pricing" className="px-3 py-1.5 text-[13px] text-slate-500 hover:text-slate-200 rounded-lg hover:bg-white/[0.04] transition-all duration-200">{t('nav.pricing')}</Link>
              <Link href="/docs" className="px-3 py-1.5 text-[13px] text-slate-500 hover:text-slate-200 rounded-lg hover:bg-white/[0.04] transition-all duration-200">{t('nav.docs')}</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/15">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300 tabular-nums">{profile?.tokenBalance ?? 0}</span>
              <span className="text-[10px] text-amber-400/50">Token</span>
            </div>
            <span className="text-xs text-slate-500 hidden md:inline">{profile?.email}</span>
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title={t('nav.logout')}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ─── Global Message Modal ─── */}
        {message && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMessage(null)}>
            <div className={`mx-4 max-w-md w-full p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200 ${
              message.type === 'success'
                ? 'bg-[#0d1a1a] border border-emerald-500/30'
                : 'bg-[#1a0d0d] border border-red-500/30'
            }`} onClick={(e) => e.stopPropagation()}>
              {message.type === 'success'
                ? <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                : <XCircle className="w-12 h-12 text-red-400" />}
              <p className={`text-sm font-semibold leading-relaxed ${
                message.type === 'success' ? 'text-emerald-300' : 'text-red-300'
              }`}>{message.text}</p>
              <button
                onClick={() => setMessage(null)}
                className="mt-1 px-6 py-2 text-xs font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08] transition-all"
              >
                {locale === 'zh' ? '知道了' : 'OK'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] to-orange-600/[0.04] border border-amber-500/[0.12] hover:border-amber-500/[0.2] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/[0.06]">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-400/60 mb-3 tracking-wider uppercase">
              <Coins className="w-3.5 h-3.5" />{locale === 'zh' ? 'Token 余额' : 'Token Balance'}
            </div>
            <div className="text-4xl font-extrabold text-amber-400 tracking-tight tabular-nums">{profile?.tokenBalance ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-2">{locale === 'zh' ? '每次扫描按实际 AI 消耗扣除' : 'Charged per actual AI usage per scan'}</div>
          </div>
          <div className="group relative p-5 rounded-2xl bg-gradient-to-br from-cyan-500/[0.08] to-blue-600/[0.04] border border-cyan-500/[0.12] hover:border-cyan-500/[0.2] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/[0.06]">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-400/60 mb-3 tracking-wider uppercase">
              <TrendingUp className="w-3.5 h-3.5" />{locale === 'zh' ? '兑换费率' : 'Exchange Rate'}
            </div>
            <div className="text-4xl font-extrabold text-cyan-400 tracking-tight">1<span className="text-lg text-cyan-500/60 mx-0.5">:</span>{usdtRate}</div>
            <div className="text-[11px] text-slate-500 mt-2">{locale === 'zh' ? 'USDT 充值即可兑换' : 'Recharge USDT to exchange'}</div>
          </div>
          <div className="group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400/60 mb-3 tracking-wider uppercase">
              <Key className="w-3.5 h-3.5" />{locale === 'zh' ? 'API 令牌' : 'API Tokens'}
            </div>
            <div className="text-4xl font-extrabold text-slate-200 tracking-tight tabular-nums">{tokens.filter(t => !t.isRevoked).length}</div>
            <div className="text-[11px] text-slate-500 mt-2">{locale === 'zh' ? '用于客户端和 API 调用扫描' : 'For client and API scan calls'}</div>
          </div>
          <div className="group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400/60 mb-3 tracking-wider uppercase">
              <Activity className="w-3.5 h-3.5" />{locale === 'zh' ? '账号状态' : 'Account Status'}
            </div>
            <div className="text-4xl font-extrabold tracking-tight">
              <span className={profile?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}>{profile?.status === 'ACTIVE' ? (locale === 'zh' ? '正常' : 'Active') : (locale === 'zh' ? '异常' : 'Inactive')}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">{locale === 'zh' ? '注册于' : 'Registered'} {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '-'}</div>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-0.5 border-b border-white/[0.05] overflow-x-auto pb-px">
          {([
            { key: 'recharge' as TabKey, label: locale === 'zh' ? 'USDT 充值' : 'USDT Recharge', icon: Wallet },
            { key: 'history' as TabKey, label: locale === 'zh' ? '充值记录' : 'Recharge History', icon: History },
            { key: 'tokens' as TabKey, label: locale === 'zh' ? 'API 令牌' : 'API Tokens', icon: Key },
            { key: 'transactions' as TabKey, label: locale === 'zh' ? 'Token 流水' : 'Token Transactions', icon: FileText },
            { key: 'scans' as TabKey, label: locale === 'zh' ? '扫描记录' : 'Scan History', icon: Zap },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap ${
                tab === key
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tab === key && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />}
            </button>
          ))}
        </div>

        {/* ==================== USDT 充值 Tab ==================== */}
        {tab === 'recharge' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Create Recharge Order */}
            <div className="space-y-6">
              <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-5">
                <div>
                  <h3 className="text-[15px] font-bold flex items-center gap-2.5 tracking-tight">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <CircleDollarSign className="w-4 h-4 text-cyan-400" />
                    </div>
                    {locale === 'zh' ? 'USDT 充值' : 'USDT Recharge'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 ml-[42px] leading-relaxed">
                    {locale === 'zh' ? '充值 USDT 兑换为 Token，即可使用 AI 扫描服务' : 'Recharge USDT to exchange for tokens and use the AI scanning service'}<br />
                    {locale === 'zh' ? '费率' : 'Rate'}: <span className="text-cyan-400 font-semibold">1 USDT = {usdtRate} Token</span>
                  </p>
                </div>

                {/* Network Selection */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-2.5 block uppercase tracking-wider">{locale === 'zh' ? '选择网络' : 'Select Network'}</label>
                  <div className="flex gap-2">
                    {(['TRC20', 'ERC20'] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => setSelectedNetwork(n)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          selectedNetwork === n
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                            : 'bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-white/[0.08]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Amounts */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-2.5 block uppercase tracking-wider">{locale === 'zh' ? '快捷金额' : 'Quick Amounts'}</label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map(a => (
                      <button
                        key={a}
                        onClick={() => setRechargeAmount(String(a))}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          rechargeAmount === String(a)
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                            : 'bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1]'
                        }`}
                      >
                        {a} USDT
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-2.5 block uppercase tracking-wider">{locale === 'zh' ? '自定义金额' : 'Custom Amount'}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder={locale === 'zh' ? '输入 USDT 金额' : 'Enter USDT amount'}
                      className="w-full px-4 py-3 pr-16 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">USDT</span>
                  </div>
                </div>

                {/* Preview */}
                {rechargeAmount && Number(rechargeAmount) >= 1 && (
                  <div className="p-4 rounded-xl bg-cyan-500/[0.05] border border-cyan-500/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{locale === 'zh' ? '充值金额' : 'Amount'}</span>
                      <span className="font-semibold text-white">{rechargeAmount} USDT</span>
                    </div>
                    <div className="h-px bg-white/[0.04] my-2.5" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{locale === 'zh' ? '可获得' : 'You get'}</span>
                      <span className="font-bold text-amber-400 text-base">{Math.floor(Number(rechargeAmount) * usdtRate)} Token</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateRecharge}
                  disabled={rechargeLoading || !rechargeAmount || Number(rechargeAmount) < 1}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25"
                >
                  {rechargeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  {locale === 'zh' ? '创建充值订单' : 'Create Recharge Order'}
                </button>
              </div>

              {/* Recharge Flow Info */}
              <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.04] space-y-4">
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{locale === 'zh' ? '充值流程' : 'Recharge Flow'}</h4>
                <div className="space-y-3">
                  {(locale === 'zh' ? [
                    { step: '1', text: '选择充值金额，创建充值订单' },
                    { step: '2', text: '复制收款地址，在链上转入对应金额的 USDT' },
                    { step: '3', text: '点击「我已支付」，系统自动验证链上交易' },
                    { step: '4', text: '确认到账后 Token 自动到账，即可使用' },
                  ] : [
                    { step: '1', text: 'Select amount and create recharge order' },
                    { step: '2', text: 'Copy wallet address and transfer USDT on-chain' },
                    { step: '3', text: 'Click "I have paid", system verifies on-chain transaction' },
                    { step: '4', text: 'Tokens are credited automatically after confirmation' },
                  ]).map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/15">{step}</span>
                      <span className="text-[12px] text-slate-400 leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Payment Details / Active Order */}
            <div className="space-y-6">
              {rechargeOrder ? (
                <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-bold flex items-center gap-2.5 tracking-tight">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-amber-400" />
                      </div>
                      {locale === 'zh' ? '支付信息' : 'Payment Info'}
                    </h3>
                    {statusBadge(rechargeOrder.status)}
                  </div>

                  {/* Amount */}
                  <div className="text-center py-5 rounded-xl bg-white/[0.02]">
                    <div className="text-5xl font-extrabold text-white tracking-tight">{rechargeOrder.usdtAmount} <span className="text-xl text-slate-500 font-medium">USDT</span></div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">≈ {rechargeOrder.usdtAmount * usdtRate} Token</div>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{locale === 'zh' ? '收款钱包地址' : 'Wallet Address'} ({rechargeOrder.network})</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white/[0.04] p-3.5 rounded-xl font-mono break-all text-cyan-300 border border-white/[0.06] leading-relaxed">{rechargeOrder.walletAddress}</code>
                      <button
                        onClick={() => handleCopy(rechargeOrder.walletAddress, 'wallet')}
                        className="p-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all border border-white/[0.06] shrink-0"
                      >
                        {copied === 'wallet' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                    {copied === 'wallet' && <p className="text-[11px] text-emerald-400 font-medium">{locale === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard'}</p>}
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="p-3 bg-white rounded-2xl">
                      <QRCodeSVG value={rechargeOrder.walletAddress} size={180} level="H" />
                    </div>
                    <p className="text-[11px] text-slate-500">{locale === 'zh' ? '扫描二维码获取收款地址' : 'Scan QR code for wallet address'}</p>
                  </div>

                  {/* Network Warning */}
                  <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 text-xs text-amber-400/80 leading-relaxed">
                    <strong className="text-amber-300">{locale === 'zh' ? '注意' : 'Warning'}:</strong> {locale === 'zh' ? <>请确保使用 <span className="font-bold text-amber-300">{rechargeOrder.network}</span> 网络转账，其他网络转账将无法到账</> : <>Please use <span className="font-bold text-amber-300">{rechargeOrder.network}</span> network. Transfers via other networks cannot be received</>}
                  </div>

                  {/* Lock Countdown */}
                  {rechargeOrder.lockExpiresAt && lockCountdown && (
                    <div className="p-3.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-indigo-300">
                        <Clock className="w-4 h-4" />
                        <span>{locale === 'zh' ? '地址锁定倒计时' : 'Lock countdown'}</span>
                      </div>
                      <span className={`text-lg font-bold font-mono ${lockCountdown === '已过期' ? 'text-red-400' : 'text-indigo-300'}`}>
                        {lockCountdown}
                      </span>
                    </div>
                  )}

                  {/* Order Info */}
                  <div className="space-y-2 text-xs px-1">
                    <div className="flex justify-between"><span className="text-slate-500">{locale === 'zh' ? '订单号' : 'Order ID'}</span><span className="font-mono text-slate-300 font-medium">#{rechargeOrder.id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">{locale === 'zh' ? '网络' : 'Network'}</span><span className="text-slate-300 font-medium">{rechargeOrder.network}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">{locale === 'zh' ? '有效期至' : 'Expires'}</span><span className="text-slate-300">{new Date(rechargeOrder.expiresAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span></div>
                  </div>

                  {/* Actions */}
                  {rechargeOrder.status === 'PENDING' && !paidConfirmed && (
                    <button
                      onClick={() => setPaidConfirmed(true)}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/15"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {locale === 'zh' ? '我已支付' : 'I Have Paid'}
                    </button>
                  )}

                  {rechargeOrder.status === 'PENDING' && paidConfirmed && (
                    <div className="space-y-3">
                      <button
                        disabled
                        className="w-full py-3.5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {locale === 'zh' ? '请等待支付确认中...' : 'Waiting for payment confirmation...'}
                      </button>
                      <div className="p-3.5 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/15 text-center space-y-1.5">
                        <p className="text-xs text-cyan-400 font-medium">{locale === 'zh' ? '系统正在自动验证链上交易' : 'System is verifying on-chain transaction'}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {locale === 'zh' ? '确认到账后将自动为您充值 Token，请勿关闭页面' : 'Tokens will be credited after confirmation. Please do not close this page.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {rechargeOrder.status === 'COMPLETED' && (
                    <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        {locale === 'zh' ? '充值已完成' : 'Recharge Completed'}
                      </div>
                      <p className="text-xs text-slate-500">{locale === 'zh' ? 'Token 已到账，请刷新页面查看余额' : 'Tokens credited. Refresh to see your balance.'}</p>
                    </div>
                  )}

                  {/* 允许创建新订单 */}
                  <button
                    onClick={() => { setRechargeOrder(null); setPaidConfirmed(false); }}
                    className="w-full py-2.5 text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] rounded-xl transition-all border border-dashed border-white/[0.06]"
                  >
                    + {locale === 'zh' ? '创建新的充值订单' : 'Create New Order'}
                  </button>
                </div>
              ) : (
                <div className="p-10 rounded-2xl bg-white/[0.015] border border-dashed border-white/[0.06] flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{locale === 'zh' ? <>在左侧选择充值金额并创建订单<br />这里将显示收款地址和二维码</> : <>Select amount on the left and create an order<br />Wallet address and QR code will appear here</>}</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== 充值记录 Tab ==================== */}
        {tab === 'history' && (
          <div className="space-y-3">
            {recharges.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <History className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-sm text-slate-500">{locale === 'zh' ? '暂无充值记录' : 'No recharge records'}</p>
              </div>
            )}
            {recharges.map((r: any) => (
              <div key={r.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white tabular-nums">{r.amount} USDT</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/[0.06]">{r.method}</span>
                    {statusBadge(r.status)}
                    {r.note?.includes('已兑换') && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">{locale === 'zh' ? '已兑换' : 'Exchanged'}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1.5">
                    {new Date(r.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                    {r.txRef && <span className="text-slate-500"> · TX: {r.txRef}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === 'PENDING' && (
                    <span className="px-3.5 py-2 text-xs font-semibold bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/15 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {locale === 'zh' ? '等待确认' : 'Pending'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {rechargeTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button disabled={rechargePage <= 1} onClick={() => loadRecharges(rechargePage - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500 tabular-nums font-medium">{rechargePage} / {rechargeTotal}</span>
                <button disabled={rechargePage >= rechargeTotal} onClick={() => loadRecharges(rechargePage + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* ==================== API 令牌 Tab ==================== */}
        {tab === 'tokens' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder={locale === 'zh' ? '令牌名称 (可选)' : 'Token name (optional)'}
                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
              />
              <button
                onClick={handleCreateToken}
                disabled={creating}
                className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/15"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {locale === 'zh' ? '创建令牌' : 'Create Token'}
              </button>
            </div>
            {createdToken && (
              <div className="p-5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-3">
                <p className="text-sm text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {locale === 'zh' ? '令牌已创建，请立即复制！此令牌仅显示一次。' : 'Token created! Copy it now — it will only be shown once.'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white/[0.04] p-3.5 rounded-xl font-mono break-all text-emerald-200 border border-white/[0.06] leading-relaxed">{createdToken}</code>
                  <button onClick={() => handleCopy(createdToken, 'token')} className="p-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all border border-white/[0.06]">
                    {copied === 'token' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
                {copied === 'token' && <p className="text-[11px] text-emerald-400 font-medium">{locale === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard'}</p>}
              </div>
            )}
            <div className="space-y-2.5">
              {tokens.map((t) => (
                <div key={t.id} className={`p-4 rounded-2xl border transition-all ${t.isRevoked ? 'border-white/[0.03] bg-white/[0.01] opacity-40' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <code className="text-sm font-mono text-slate-200 font-medium">{t.tokenPrefix}...</code>
                      {t.name && <span className="text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">{t.name}</span>}
                      {t.isRevoked && <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/15">{locale === 'zh' ? '已吊销' : 'Revoked'}</span>}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1.5 ml-[38px]">
                      {locale === 'zh' ? '创建于' : 'Created'} {new Date(t.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                      {t.lastUsedAt && <span className="text-slate-500"> · {locale === 'zh' ? '最后使用' : 'Last used'} {new Date(t.lastUsedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span>}
                    </div>
                  </div>
                  {!t.isRevoked && (
                    <button onClick={() => handleRevoke(t.id)} className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {tokens.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                    <Key className="w-6 h-6 text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-500">{locale === 'zh' ? '还没有创建 API 令牌' : 'No API tokens yet'}</p>
                  <p className="text-xs text-slate-600 mt-1">{locale === 'zh' ? '创建令牌后填入 AAGS 客户端，即可开始 AI 智能扫描' : 'Create a token and enter it in the AAGS client to start AI scanning'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== Token 流水 Tab ==================== */}
        {tab === 'transactions' && (
          <div className="space-y-2.5">
            {transactions.map((t: any) => (
              <div key={t.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-slate-200">{txDesc(t.description || t.type)}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{new Date(t.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold tabular-nums ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">{locale === 'zh' ? '余额' : 'Balance'} {t.balanceAfter}</div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-sm text-slate-500">{locale === 'zh' ? '暂无交易记录' : 'No transaction records'}</p>
              </div>
            )}
            {txTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button disabled={txPage <= 1} onClick={() => loadTransactions(txPage - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500 tabular-nums font-medium">{txPage} / {txTotal}</span>
                <button disabled={txPage >= txTotal} onClick={() => loadTransactions(txPage + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* ==================== 扫描记录 Tab ==================== */}
        {tab === 'scans' && (
          <div className="space-y-2.5">
            {scans.map((s: any) => (
              <div key={s.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shrink-0">{locale === 'zh' ? '实时扫描' : 'Live Scan'}</span>
                    <code className="text-[11px] font-mono text-slate-500">{s.briefingId?.slice(0, 16)}...</code>
                    {s.enableSearch && <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/15">{locale === 'zh' ? '搜索增强' : 'Search+'}</span>}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                      s.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                      s.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                    }`}>
                      {s.status === 'COMPLETED' ? (locale === 'zh' ? '✓ 完成' : '✓ Done') : s.status === 'FAILED' ? (locale === 'zh' ? '✗ 失败' : '✗ Failed') : s.status === 'PROCESSING' ? (locale === 'zh' ? '处理中' : 'Processing') : (locale === 'zh' ? '排队中' : 'Queued')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1.5">
                    {new Date(s.startedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                    {s.status === 'COMPLETED' && (
                      <span className="text-slate-500"> · <span className="text-cyan-500/70">{s.signalCount} {locale === 'zh' ? '信号' : 'signals'}</span> · <span className="text-amber-500/70">{s.alertCount} {locale === 'zh' ? '预警' : 'alerts'}</span></span>
                    )}
                    {s.status === 'FAILED' && s.errorMessage && <span className="text-red-400/70"> · {s.errorMessage}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-amber-400 tabular-nums">-{s.tokenCost} Token</div>
                </div>
              </div>
            ))}
            {scans.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-sm text-slate-500">{locale === 'zh' ? '暂无扫描记录' : 'No scan records'}</p>
                <p className="text-xs text-slate-600 mt-1">{locale === 'zh' ? '在 AAGS 客户端中发起扫描，每次扫描都是一份完整的 AI 市场分析报告' : 'Start a scan in the AAGS client. Each scan is a complete AI market analysis report.'}</p>
              </div>
            )}
            {scanTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button disabled={scanPage <= 1} onClick={() => loadScans(scanPage - 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500 tabular-nums font-medium">{scanPage} / {scanTotal}</span>
                <button disabled={scanPage >= scanTotal} onClick={() => loadScans(scanPage + 1)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
