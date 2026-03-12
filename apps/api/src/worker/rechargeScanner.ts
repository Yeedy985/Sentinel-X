/**
 * Recharge Scanner Worker
 * 定时扫描锁定中的收款地址，查询链上 USDT 交易，
 * 金额匹配 + 时间在订单创建之后 → 自动确认充值 + 兑换 Token
 *
 * TRC20 USDT 合约: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 * ERC20 USDT 合约: 0xdAC17F958D2ee523a2206206994597C13D831ec7
 */
import { db } from '@sentinel/db';

const TRC20_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const ERC20_USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const TRONGRID_BASE = 'https://api.trongrid.io';
const DEFAULT_SCAN_INTERVAL_SECONDS = 5;

// 从数据库读取扫链间隔（秒）
async function getScanIntervalMs(): Promise<number> {
  try {
    const setting = await db.adminSetting.findUnique({ where: { key: 'recharge_scan_interval_seconds' } });
    const seconds = Number(setting?.value ?? DEFAULT_SCAN_INTERVAL_SECONDS);
    return Math.max(1, seconds) * 1000;
  } catch {
    return DEFAULT_SCAN_INTERVAL_SECONDS * 1000;
  }
}

// ── TRC20: 查询地址的 USDT 转入记录 ──
async function getTrc20Transfers(address: string, sinceTimestamp: number): Promise<Array<{
  txId: string;
  amount: number; // USDT (6 decimals)
  timestamp: number;
  from: string;
}>> {
  try {
    const url = `${TRONGRID_BASE}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&only_to=true&contract_address=${TRC20_USDT_CONTRACT}&min_timestamp=${sinceTimestamp}&limit=20&order_by=block_timestamp,desc`;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const apiKey = process.env.TRONGRID_API_KEY;
    if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey;

    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const json: any = await res.json();
    const data = json.data || [];
    return data.map((tx: any) => ({
      txId: tx.transaction_id,
      amount: Number(tx.value) / 1e6, // USDT has 6 decimals
      timestamp: tx.block_timestamp,
      from: tx.from,
    }));
  } catch (e) {
    console.error(`[RechargeScanner] TRC20 query failed for ${address}:`, e);
    return [];
  }
}

// ── ERC20: 查询地址的 USDT 转入记录 ──
async function getErc20Transfers(address: string, sinceTimestamp: number): Promise<Array<{
  txId: string;
  amount: number;
  timestamp: number;
  from: string;
}>> {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${ERC20_USDT_CONTRACT}&address=${address}&page=1&offset=20&sort=desc&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const json: any = await res.json();
    if (json.status !== '1' || !json.result) return [];

    return json.result
      .filter((tx: any) => tx.to.toLowerCase() === address.toLowerCase())
      .filter((tx: any) => Number(tx.timeStamp) * 1000 >= sinceTimestamp)
      .map((tx: any) => ({
        txId: tx.hash,
        amount: Number(tx.value) / 1e6, // USDT has 6 decimals
        timestamp: Number(tx.timeStamp) * 1000,
        from: tx.from,
      }));
  } catch (e) {
    console.error(`[RechargeScanner] ERC20 query failed for ${address}:`, e);
    return [];
  }
}

// ── 自动确认并兑换 ──
async function approveRecharge(rechargeId: number, txId: string) {
  const record = await db.rechargeRecord.findFirst({
    where: { id: rechargeId, status: 'PENDING' },
  });
  if (!record) return;

  const usdtAmount = Number(record.amount) / 100;

  // 读取汇率
  const rateSetting = await db.adminSetting.findUnique({ where: { key: 'token_to_cny_rate' } });
  const dynamicRate = Number(rateSetting?.value ?? 10);
  const tokensToGrant = Math.floor(usdtAmount * dynamicRate);

  if (tokensToGrant <= 0) return;

  await db.$transaction(async (tx) => {
    await tx.rechargeRecord.update({
      where: { id: rechargeId },
      data: {
        status: 'COMPLETED',
        txRef: txId,
        note: `${record.note || ''} | 链上自动验证通过 | 已兑换 ${tokensToGrant} Token`,
      },
    });

    const user = await tx.user.update({
      where: { id: record.userId },
      data: { tokenBalance: { increment: BigInt(tokensToGrant) } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId: record.userId,
        type: 'RECHARGE',
        amount: BigInt(tokensToGrant),
        balanceAfter: user.tokenBalance,
        refId: `recharge_${rechargeId}`,
        description: `链上自动确认: ${usdtAmount} USDT → ${tokensToGrant} Token (TX: ${txId.slice(0, 16)}...)`,
      },
    });
  });

  // 解锁收款地址
  try {
    await db.paymentAddress.updateMany({
      where: { lockedOrderId: rechargeId },
      data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
    });
  } catch {}

  console.log(`[RechargeScanner] ✅ Auto-approved recharge #${rechargeId}: ${usdtAmount} USDT, TX: ${txId.slice(0, 20)}...`);
}

// ── 超时订单自动标记失败 + 释放地址 ──
async function expireTimedOutOrders() {
  // 1. 从设置读取锁定时长（默认15分钟）
  let lockMinutes = 15;
  try {
    const setting = await db.adminSetting.findUnique({ where: { key: 'address_lock_minutes' } });
    if (setting?.value) lockMinutes = Number(setting.value);
  } catch {}
  const cutoff = new Date(Date.now() - lockMinutes * 60 * 1000);

  // 2. 直接按订单创建时间判断：所有 PENDING 订单创建超过 lockMinutes 分钟的，全部标记 FAILED
  const expiredOrders = await db.rechargeRecord.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    select: { id: true, note: true },
  });

  if (expiredOrders.length > 0) {
    for (const order of expiredOrders) {
      await db.rechargeRecord.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          note: `${order.note || ''} | 充值超时未支付，系统自动关闭`,
        },
      });

      // 释放关联的地址
      try {
        await db.paymentAddress.updateMany({
          where: { lockedOrderId: order.id },
          data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
        });
      } catch {}

      console.log(`[RechargeScanner] ⏰ Order #${order.id} expired (>${lockMinutes}min), marked as FAILED`);
    }
  }

  // 3. 释放所有过期的锁定地址（兜底）
  await db.paymentAddress.updateMany({
    where: { status: 'LOCKED', lockExpiresAt: { lt: new Date() } },
    data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
  });
}

// ── 主扫描循环 ──
async function scanLockedAddresses() {
  try {
    // 先处理超时订单：标记失败 + 释放地址
    await expireTimedOutOrders();

    // 获取所有锁定中的地址（有关联的充值订单）
    const lockedAddresses = await db.paymentAddress.findMany({
      where: {
        status: 'LOCKED',
        lockedOrderId: { not: null },
      },
    });

    if (lockedAddresses.length === 0) return;

    for (const addr of lockedAddresses) {
      const orderId = addr.lockedOrderId!;

      // 查找对应的充值订单
      const order = await db.rechargeRecord.findFirst({
        where: { id: orderId, status: 'PENDING' },
      });
      if (!order) continue;

      const expectedUsdtAmount = Number(order.amount) / 100;
      const orderCreatedAt = order.createdAt.getTime();

      // 根据网络查询链上交易
      let transfers: Array<{ txId: string; amount: number; timestamp: number; from: string }> = [];
      if (addr.network === 'TRC20') {
        transfers = await getTrc20Transfers(addr.address, orderCreatedAt);
      } else if (addr.network === 'ERC20') {
        transfers = await getErc20Transfers(addr.address, orderCreatedAt);
      }

      // 匹配: 找到金额相符(允许±0.01误差)且时间在订单创建之后的交易
      const matched = transfers.find(tx =>
        Math.abs(tx.amount - expectedUsdtAmount) < 0.01 &&
        tx.timestamp >= orderCreatedAt
      );

      if (matched) {
        await approveRecharge(orderId, matched.txId);
      }
    }
  } catch (e) {
    console.error('[RechargeScanner] Scan error:', e);
  }
}

// ── 启动扫描器 (动态间隔，从设置读取) ──
export function startRechargeScanner() {
  console.log(`[RechargeScanner] 🔍 Started (default interval: ${DEFAULT_SCAN_INTERVAL_SECONDS}s, configurable in admin settings)`);

  async function loop() {
    await scanLockedAddresses();
    const intervalMs = await getScanIntervalMs();
    setTimeout(loop, intervalMs);
  }

  // 启动后延迟5秒开始第一次扫描
  setTimeout(loop, 5_000);
}
