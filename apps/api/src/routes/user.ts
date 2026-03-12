/**
 * User Routes — 用户信息 / API令牌 / Token流水 / 扫描记录 / 充值 / 兑换
 * GET    /api/user/profile
 * POST   /api/user/tokens          — 创建 API Token
 * GET    /api/user/tokens           — 列出 API Tokens
 * DELETE /api/user/tokens/:id       — 吊销 API Token
 * GET    /api/user/transactions     — Token 流水
 * GET    /api/user/scans            — 扫描记录
 * POST   /api/user/recharge         — 创建 USDT 充值订单
 * GET    /api/user/recharges        — 充值记录
 * POST   /api/user/recharge/:id/confirm — 确认到账 (模拟)
 * POST   /api/user/exchange         — USDT 充值兑换 Token
 */
import { Hono } from 'hono';
import { db } from '@sentinel/db';
import { requireAuth } from '../middleware/auth';
import { generateApiToken } from '../lib/crypto';
import {
  USDT_WALLET_ADDRESS, USDT_NETWORK, USDT_TO_TOKEN_RATE,
  MIN_USDT_RECHARGE, RECHARGE_EXPIRY_MINUTES,
} from '@sentinel/shared';
import type {
  ApiResponse, UserProfile, ApiTokenInfo, ApiTokenCreatedResponse,
  TokenTransactionInfo, ScanRecordInfo, PaginatedResponse,
  RechargeRecordInfo, RechargeOrderResponse, ExchangeResponse,
} from '@sentinel/shared';

// ── 动态读取管理配置 ──
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.adminSetting.findUnique({ where: { key } });
  return s ? (s.value as T) : fallback;
}

export const userRoutes = new Hono();

// ── 公开配置 (无需登录) ──
userRoutes.get('/config', async (c) => {
  const rateRaw = await getSetting('token_to_cny_rate', 10);
  const rate = Number(rateRaw);
  const billingMode = String(await getSetting('billing_mode', 'fixed'));
  return c.json<ApiResponse>({
    success: true,
    data: { usdtToTokenRate: rate, billingMode },
  });
});

userRoutes.use('*', requireAuth);

// ── 用户信息 ──
userRoutes.get('/profile', async (c) => {
  const userId = c.get('userId');
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);

  return c.json<ApiResponse<UserProfile>>({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      tokenBalance: Number(user.tokenBalance),
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// ── 创建 API Token ──
userRoutes.post('/tokens', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ name?: string }>().catch(() => ({}));

  // 限制每用户最多10个 Token
  const count = await db.apiToken.count({ where: { userId, isRevoked: false } });
  if (count >= 10) {
    return c.json<ApiResponse>({ success: false, error: '最多创建10个API令牌' }, 400);
  }

  const { raw, hash, prefix } = generateApiToken();

  const token = await db.apiToken.create({
    data: {
      userId,
      tokenHash: hash,
      tokenPrefix: prefix,
      name: (body as any)?.name?.trim() || null,
    },
  });

  return c.json<ApiResponse<ApiTokenCreatedResponse>>({
    success: true,
    data: {
      id: token.id,
      token: raw,
      tokenPrefix: token.tokenPrefix,
      name: token.name,
    },
    message: '请立即复制令牌，此令牌仅显示一次',
  }, 201);
});

// ── 列出 API Tokens ──
userRoutes.get('/tokens', async (c) => {
  const userId = c.get('userId');
  const tokens = await db.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json<ApiResponse<ApiTokenInfo[]>>({
    success: true,
    data: tokens.map((t) => ({
      id: t.id,
      tokenPrefix: t.tokenPrefix,
      name: t.name,
      lastUsedAt: t.lastUsedAt?.toISOString() || null,
      isRevoked: t.isRevoked,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

// ── 吊销 API Token ──
userRoutes.delete('/tokens/:id', async (c) => {
  const userId = c.get('userId');
  const tokenId = Number(c.req.param('id'));

  const token = await db.apiToken.findFirst({ where: { id: tokenId, userId } });
  if (!token) {
    return c.json<ApiResponse>({ success: false, error: '令牌不存在' }, 404);
  }

  await db.apiToken.update({ where: { id: tokenId }, data: { isRevoked: true } });

  return c.json<ApiResponse>({ success: true, message: '令牌已吊销' });
});

// ── Token 流水 ──
userRoutes.get('/transactions', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const [total, transactions] = await Promise.all([
    db.tokenTransaction.count({ where: { userId } }),
    db.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return c.json<ApiResponse<PaginatedResponse<TokenTransactionInfo>>>({
    success: true,
    data: {
      data: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        refId: t.refId,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ── 扫描记录 ──
userRoutes.get('/scans', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const where = { userId, briefingId: { not: { startsWith: 'admin-' } } };
  const [total, scans] = await Promise.all([
    db.scanRecord.count({ where }),
    db.scanRecord.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return c.json<ApiResponse<PaginatedResponse<ScanRecordInfo>>>({
    success: true,
    data: {
      data: scans.map((s) => ({
        id: s.id,
        briefingId: s.briefingId,
        tokenCost: s.tokenCost,
        status: s.status,
        isCached: false,
        signalCount: s.signalCount,
        alertCount: s.alertCount,
        enableSearch: s.enableSearch,
        realCostUsd: Number(s.realCostUsd),
        errorMessage: s.errorMessage,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ── 自动解锁过期收款地址 ──
async function unlockExpiredPaymentAddresses() {
  await db.paymentAddress.updateMany({
    where: { status: 'LOCKED', lockExpiresAt: { lt: new Date() } },
    data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
  });
}

// ── 创建 USDT 充值订单 ──
userRoutes.post('/recharge', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ amount: number; network?: string }>().catch(() => ({ amount: 0, network: undefined }));
  const amount = Number(body.amount);
  const network = (body.network === 'ERC20' ? 'ERC20' : 'TRC20') as 'TRC20' | 'ERC20';

  if (!amount || amount < MIN_USDT_RECHARGE) {
    return c.json<ApiResponse>({ success: false, error: `最低充值 ${MIN_USDT_RECHARGE} USDT` }, 400);
  }

  // 先解锁过期地址
  await unlockExpiredPaymentAddresses();

  // 从数据库分配一个空闲地址，锁定时间从设置读取（默认15分钟）
  const lockMinutes = Number(await getSetting('address_lock_minutes', 15));
  const lockExpiresAt = new Date(Date.now() + lockMinutes * 60 * 1000);

  // 在事务中原子地：创建订单 + 分配并锁定地址（FOR UPDATE SKIP LOCKED 防并发冲突）
  const result = await db.$transaction(async (tx) => {
    // 创建充值记录
    const record = await tx.rechargeRecord.create({
      data: {
        userId,
        amount: BigInt(Math.round(amount * 100)),
        method: 'USDT',
        status: 'PENDING',
        note: `${amount} USDT via ${network}`,
      },
    });

    // 用 FOR UPDATE SKIP LOCKED 原子抢占一个空闲地址
    const rows: any[] = await tx.$queryRaw`
      SELECT id, address FROM "payment_addresses"
      WHERE network = ${network} AND status = 'IDLE'
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (rows.length === 0) {
      // 没有可用地址，回滚事务（删除刚创建的订单）
      await tx.rechargeRecord.delete({ where: { id: record.id } });
      return { noAddress: true } as any;
    }

    const addrId = rows[0].id;
    const walletAddress = rows[0].address;

    await tx.paymentAddress.update({
      where: { id: addrId },
      data: {
        status: 'LOCKED',
        lockExpiresAt,
        lockedByUser: userId,
        lockedOrderId: record.id,
      },
    });

    return { record, walletAddress, noAddress: false };
  });

  if (result.noAddress) {
    return c.json<ApiResponse>({ success: false, error: '当前充值用户较多，收款地址暂时不足，请稍后再试' }, 503);
  }

  const orderExpiresAt = new Date(Date.now() + RECHARGE_EXPIRY_MINUTES * 60 * 1000);

  return c.json<ApiResponse<RechargeOrderResponse>>({
    success: true,
    data: {
      id: result.record.id,
      usdtAmount: amount,
      walletAddress: result.walletAddress,
      network,
      status: 'PENDING',
      expiresAt: orderExpiresAt.toISOString(),
      lockExpiresAt: result.addressLocked ? lockExpiresAt.toISOString() : undefined,
    } as any,
  }, 201);
});

// ── 充值记录 ──
userRoutes.get('/recharges', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const [total, records] = await Promise.all([
    db.rechargeRecord.count({ where: { userId } }),
    db.rechargeRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return c.json<ApiResponse<PaginatedResponse<RechargeRecordInfo>>>({
    success: true,
    data: {
      data: records.map((r) => ({
        id: r.id,
        amount: Number(r.amount) / 100, // 分→元
        method: r.method,
        txRef: r.txRef,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ── 确认充值到账 (已禁用用户端操作，由管理员后台确认) ──
userRoutes.post('/recharge/:id/confirm', async (c) => {
  return c.json<ApiResponse>({ success: false, error: '充值确认需由管理员审核，请耐心等待' }, 403);
});

// ── USDT 充值兑换为 Token (已禁用用户端操作，由管理员后台确认后自动兑换) ──
userRoutes.post('/exchange', async (c) => {
  return c.json<ApiResponse>({ success: false, error: '充值兑换需由管理员审核确认，请耐心等待' }, 403);
});
