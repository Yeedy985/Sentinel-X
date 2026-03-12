'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Coins, Key, History, FileText, LogOut, Plus, Copy, Trash2,
  Loader2, ChevronLeft, ChevronRight, Wallet, ArrowRightLeft,
  CircleDollarSign, CheckCircle2, Clock, XCircle, QrCode, ExternalLink,
} from 'lucide-react';
import { api, clearToken, isLoggedIn } from '@/lib/api';

type TabKey = 'recharge' | 'history' | 'tokens' | 'transactions' | 'scans';

export default function DashboardPage() {
  const router = useRouter();
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

  const USDT_RATE = 10; // 1 USDT = 10 Token
  const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([api.getProfile(), api.getTokens()]);
    if (pRes.success) setProfile(pRes.data);
    if (tRes.success) setTokens((tRes.data as any[]) || []);
    setLoading(false);
  };

  const refreshProfile = async () => {
    const res = await api.getProfile();
    if (res.success) setProfile(res.data);
  };

  const loadTransactions = async (page = 1) => {
    const res = await api.getTransactions(page);
    if (res.success) {
      const d = res.data as any;
      setTransactions(d.data || []);
      setTxPage(d.page);
      setTxTotal(d.totalPages);
    }
  };

  const loadScans = async (page = 1) => {
    const res = await api.getScans(page);
    if (res.success) {
      const d = res.data as any;
      setScans(d.data || []);
      setScanPage(d.page);
      setScanTotal(d.totalPages);
    }
  };

  const loadRecharges = async (page = 1) => {
    const res = await api.getRecharges(page);
    if (res.success) {
      const d = res.data as any;
      setRecharges(d.data || []);
      setRechargePage(d.page);
      setRechargeTotal(d.totalPages);
    }
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

  // ── Recharge Flow ──
  const handleCreateRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < 1) { showMsg('error', '最低充值 1 USDT'); return; }
    setRechargeLoading(true);
    const res = await api.createRecharge(amount);
    if (res.success) {
      setRechargeOrder(res.data);
      showMsg('success', `充值订单已创建: ${amount} USDT`);
      setRechargeAmount('');
    } else {
      showMsg('error', (res as any).error || '创建失败');
    }
    setRechargeLoading(false);
  };

  const handleConfirmPayment = async (orderId: number) => {
    setRechargeLoading(true);
    const res = await api.confirmRecharge(orderId);
    if (res.success) {
      showMsg('success', '已确认到账，请点击"兑换Token"');
      if (rechargeOrder?.id === orderId) {
        setRechargeOrder({ ...rechargeOrder, status: 'COMPLETED' });
      }
      loadRecharges(rechargePage);
    } else {
      showMsg('error', (res as any).error || '确认失败');
    }
    setRechargeLoading(false);
  };

  const handleExchange = async (rechargeId: number) => {
    setExchangeLoading(rechargeId);
    const res = await api.exchange(rechargeId);
    if (res.success) {
      const d = res.data as any;
      showMsg('success', `成功兑换 ${d.tokensGranted} Token！当前余额: ${d.newBalance}`);
      await refreshProfile();
      loadRecharges(rechargePage);
      setRechargeOrder(null);
    } else {
      showMsg('error', (res as any).error || '兑换失败');
    }
    setExchangeLoading(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Token Management ──
  const handleCreateToken = async () => {
    setCreating(true);
    const res = await api.createToken(newTokenName || undefined);
    if (res.success) {
      const d = res.data as any;
      setCreatedToken(d.token);
      setNewTokenName('');
      const tRes = await api.getTokens();
      if (tRes.success) setTokens((tRes.data as any[]) || []);
    }
    setCreating(false);
  };

  const handleRevoke = async (id: number) => {
    await api.revokeToken(id);
    const tRes = await api.getTokens();
    if (tRes.success) setTokens((tRes.data as any[]) || []);
  };

  const handleLogout = () => { clearToken(); router.push('/login'); };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" />待支付</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />已完成</span>;
      case 'FAILED': return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" />失败</span>;
      default: return <span className="text-[10px] text-slate-500">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Shield className="w-5 h-5 text-cyan-400" />
            Sentinel-X
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-medium">{profile?.tokenBalance ?? 0}</span>
              <span className="text-slate-500">Token</span>
            </div>
            <span className="text-xs text-slate-500">{profile?.email}</span>
            <button onClick={handleLogout} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Global Message */}
        {message && (
          <div className={`mb-6 p-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-xs text-amber-400/70 mb-2"><Coins className="w-3.5 h-3.5" />Token 余额</div>
            <div className="text-3xl font-bold text-amber-400">{profile?.tokenBalance ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-1">1 Token = 1次基础扫描</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-xs text-cyan-400/70 mb-2"><CircleDollarSign className="w-3.5 h-3.5" />兑换费率</div>
            <div className="text-3xl font-bold text-cyan-400">1:{USDT_RATE}</div>
            <div className="text-[10px] text-slate-500 mt-1">1 USDT = {USDT_RATE} Token</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Key className="w-3.5 h-3.5" />API 令牌</div>
            <div className="text-3xl font-bold text-slate-200">{tokens.filter(t => !t.isRevoked).length}</div>
            <div className="text-[10px] text-slate-500 mt-1">有效令牌数</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Shield className="w-3.5 h-3.5" />账号状态</div>
            <div className="text-3xl font-bold text-emerald-400">{profile?.status === 'ACTIVE' ? '正常' : '异常'}</div>
            <div className="text-[10px] text-slate-500 mt-1">注册于 {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '-'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800/50 overflow-x-auto">
          {([
            { key: 'recharge' as TabKey, label: 'USDT 充值', icon: Wallet },
            { key: 'history' as TabKey, label: '充值记录', icon: History },
            { key: 'tokens' as TabKey, label: 'API 令牌', icon: Key },
            { key: 'transactions' as TabKey, label: 'Token 流水', icon: FileText },
            { key: 'scans' as TabKey, label: '扫描记录', icon: History },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ==================== USDT 充值 Tab ==================== */}
        {tab === 'recharge' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Create Recharge Order */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-cyan-400" />
                  USDT 充值
                </h3>
                <p className="text-xs text-slate-500">
                  通过 USDT (TRC20) 充值后兑换为 Sentinel-X Token。费率: <span className="text-cyan-400 font-medium">1 USDT = {USDT_RATE} Token</span>
                </p>

                {/* Quick Amounts */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">快捷金额</label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map(a => (
                      <button
                        key={a}
                        onClick={() => setRechargeAmount(String(a))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          rechargeAmount === String(a)
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {a} USDT
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">自定义金额</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        placeholder="输入 USDT 金额"
                        className="w-full px-3 py-2.5 pr-16 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">USDT</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {rechargeAmount && Number(rechargeAmount) >= 1 && (
                  <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">充值金额</span>
                      <span className="font-medium">{rechargeAmount} USDT</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-slate-400">可获得 Token</span>
                      <span className="font-bold text-amber-400">{Math.floor(Number(rechargeAmount) * USDT_RATE)} Token</span>
                    </div>
                    <div className="flex items-center justify-center mt-1">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateRecharge}
                  disabled={rechargeLoading || !rechargeAmount || Number(rechargeAmount) < 1}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/10"
                >
                  {rechargeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  创建充值订单
                </button>
              </div>

              {/* Recharge Flow Info */}
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400">充值流程</h4>
                <div className="space-y-2">
                  {[
                    { step: '1', text: '选择充值金额，创建充值订单' },
                    { step: '2', text: '复制钱包地址，在链上转入 USDT (TRC20)' },
                    { step: '3', text: '点击"我已支付"确认转账' },
                    { step: '4', text: '点击"兑换Token"将 USDT 转为 Token' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-cyan-600/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                      <span className="text-xs text-slate-400">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Payment Details / Active Order */}
            <div className="space-y-6">
              {rechargeOrder ? (
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-amber-400" />
                      支付信息
                    </h3>
                    {statusBadge(rechargeOrder.status)}
                  </div>

                  {/* Amount */}
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-white">{rechargeOrder.usdtAmount} <span className="text-lg text-slate-400">USDT</span></div>
                    <div className="text-xs text-slate-500 mt-1">≈ {rechargeOrder.usdtAmount * USDT_RATE} Token</div>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">收款钱包地址 ({rechargeOrder.network})</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-slate-800 p-3 rounded-lg font-mono break-all text-cyan-300 border border-slate-700">{rechargeOrder.walletAddress}</code>
                      <button
                        onClick={() => handleCopy(rechargeOrder.walletAddress, 'wallet')}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                      >
                        {copied === 'wallet' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {copied === 'wallet' && <p className="text-[10px] text-emerald-400">已复制到剪贴板</p>}
                  </div>

                  {/* Network Warning */}
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
                    <strong>注意:</strong> 请确保使用 <span className="font-bold text-amber-300">{rechargeOrder.network}</span> 网络转账，其他网络转账将无法到账！
                  </div>

                  {/* Order Info */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">订单号</span><span className="font-mono text-slate-300">#{rechargeOrder.id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">有效期至</span><span className="text-slate-300">{new Date(rechargeOrder.expiresAt).toLocaleString('zh-CN')}</span></div>
                  </div>

                  {/* Actions */}
                  {rechargeOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleConfirmPayment(rechargeOrder.id)}
                      disabled={rechargeLoading}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {rechargeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      我已支付
                    </button>
                  )}

                  {rechargeOrder.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleExchange(rechargeOrder.id)}
                      disabled={exchangeLoading === rechargeOrder.id}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      {exchangeLoading === rechargeOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                      兑换 {rechargeOrder.usdtAmount * USDT_RATE} Token
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 text-center min-h-[300px]">
                  <Wallet className="w-12 h-12 text-slate-700" />
                  <p className="text-sm text-slate-500">在左侧选择金额创建充值订单后<br />这里将显示支付信息</p>
                </div>
              )}

              {/* Exchange Rate Info */}
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Token 用途</h4>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between"><span>基础扫描 (无搜索增强)</span><span className="text-slate-300">1 Token/次</span></div>
                  <div className="flex justify-between"><span>搜索增强扫描</span><span className="text-slate-300">2 Token/次</span></div>
                  <div className="flex justify-between"><span>扫描结果有效期</span><span className="text-slate-300">5 分钟</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 充值记录 Tab ==================== */}
        {tab === 'history' && (
          <div className="space-y-3">
            {recharges.length === 0 && (
              <p className="text-center text-sm text-slate-600 py-12">暂无充值记录</p>
            )}
            {recharges.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.amount} USDT</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{r.method}</span>
                    {statusBadge(r.status)}
                    {r.note?.includes('已兑换') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">已兑换</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">
                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                    {r.txRef && <span> · TX: {r.txRef}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => handleConfirmPayment(r.id)}
                      className="px-3 py-1.5 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg transition-colors"
                    >
                      确认到账
                    </button>
                  )}
                  {r.status === 'COMPLETED' && !r.note?.includes('已兑换') && (
                    <button
                      onClick={() => handleExchange(r.id)}
                      disabled={exchangeLoading === r.id}
                      className="px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {exchangeLoading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                      兑换Token
                    </button>
                  )}
                </div>
              </div>
            ))}
            {rechargeTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button disabled={rechargePage <= 1} onClick={() => loadRecharges(rechargePage - 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500">{rechargePage} / {rechargeTotal}</span>
                <button disabled={rechargePage >= rechargeTotal} onClick={() => loadRecharges(rechargePage + 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* ==================== API 令牌 Tab ==================== */}
        {tab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="令牌名称 (可选)"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={handleCreateToken}
                disabled={creating}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                创建令牌
              </button>
            </div>
            {createdToken && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <p className="text-sm text-emerald-400 font-medium">令牌已创建，请立即复制！此令牌仅显示一次。</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-900 p-2 rounded font-mono break-all">{createdToken}</code>
                  <button onClick={() => handleCopy(createdToken, 'token')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied === 'token' && <p className="text-xs text-emerald-400">已复制到剪贴板</p>}
              </div>
            )}
            <div className="space-y-2">
              {tokens.map((t) => (
                <div key={t.id} className={`p-3 rounded-xl border ${t.isRevoked ? 'border-slate-800/30 bg-slate-900/20 opacity-50' : 'border-slate-800/50 bg-slate-900/50'} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-slate-300">{t.tokenPrefix}...</code>
                      {t.name && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{t.name}</span>}
                      {t.isRevoked && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">已吊销</span>}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      创建于 {new Date(t.createdAt).toLocaleString('zh-CN')}
                      {t.lastUsedAt && ` · 最后使用 ${new Date(t.lastUsedAt).toLocaleString('zh-CN')}`}
                    </div>
                  </div>
                  {!t.isRevoked && (
                    <button onClick={() => handleRevoke(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {tokens.length === 0 && (
                <p className="text-center text-sm text-slate-600 py-8">还没有创建 API 令牌</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== Token 流水 Tab ==================== */}
        {tab === 'transactions' && (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between">
                <div>
                  <div className="text-sm">{t.description || t.type}</div>
                  <div className="text-[10px] text-slate-600">{new Date(t.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </div>
                  <div className="text-[10px] text-slate-600">余额 {t.balanceAfter}</div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-sm text-slate-600 py-8">暂无交易记录</p>
            )}
            {txTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button disabled={txPage <= 1} onClick={() => loadTransactions(txPage - 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500">{txPage} / {txTotal}</span>
                <button disabled={txPage >= txTotal} onClick={() => loadTransactions(txPage + 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* ==================== 扫描记录 Tab ==================== */}
        {tab === 'scans' && (
          <div className="space-y-2">
            {scans.map((s: any) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.isCached ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">缓存推送</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">真实调用</span>
                    )}
                    <code className="text-xs font-mono text-slate-400">{s.briefingId}</code>
                    {s.enableSearch && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">搜索增强</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {s.status === 'COMPLETED' ? '完成' : s.status === 'FAILED' ? '失败' : s.status === 'PROCESSING' ? '处理中' : '排队中'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">
                    {new Date(s.startedAt).toLocaleString('zh-CN')}
                    {s.status === 'COMPLETED' && <span> · {s.signalCount} 信号 · {s.alertCount} 预警</span>}
                    {s.status === 'FAILED' && s.errorMessage && <span className="text-red-400"> · {s.errorMessage}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-amber-400">-{s.tokenCost} Token</div>
                  {s.realCostUsd !== undefined && s.realCostUsd > 0 && (
                    <div className="text-[10px] text-slate-600 mt-0.5">消耗 ${Number(s.realCostUsd).toFixed(4)}</div>
                  )}
                </div>
              </div>
            ))}
            {scans.length === 0 && (
              <p className="text-center text-sm text-slate-600 py-8">暂无扫描记录</p>
            )}
            {scanTotal > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button disabled={scanPage <= 1} onClick={() => loadScans(scanPage - 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-500">{scanPage} / {scanTotal}</span>
                <button disabled={scanPage >= scanTotal} onClick={() => loadScans(scanPage + 1)} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
