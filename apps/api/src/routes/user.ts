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
  return c.json<ApiResponse>({
    success: true,
    data: { usdtToTokenRate: rate },
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

// ── 创建 USDT 充值订单 ──
userRoutes.post('/recharge', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ amount: number }>().catch(() => ({ amount: 0 }));
  const amount = Number(body.amount);

  if (!amount || amount < MIN_USDT_RECHARGE) {
    return c.json<ApiResponse>({ success: false, error: `最低充值 ${MIN_USDT_RECHARGE} USDT` }, 400);
  }

  const expiresAt = new Date(Date.now() + RECHARGE_EXPIRY_MINUTES * 60 * 1000);

  const record = await db.rechargeRecord.create({
    data: {
      userId,
      amount: BigInt(Math.round(amount * 100)), // 存分, 如 10 USDT = 1000
      method: 'USDT',
      status: 'PENDING',
      note: `${amount} USDT via ${USDT_NETWORK}`,
    },
  });

  return c.json<ApiResponse<RechargeOrderResponse>>({
    success: true,
    data: {
      id: record.id,
      usdtAmount: amount,
      walletAddress: USDT_WALLET_ADDRESS,
      network: USDT_NETWORK,
      status: 'PENDING',
      expiresAt: expiresAt.toISOString(),
    },
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

// ── 确认充值到账 (开发/模拟用，生产环境需区块链回调替代) ──
userRoutes.post('/recharge/:id/confirm', async (c) => {
  const userId = c.get('userId');
  const rechargeId = Number(c.req.param('id'));
  const body = await c.req.json<{ txRef?: string }>().catch(() => ({}));

  const record = await db.rechargeRecord.findFirst({
    where: { id: rechargeId, userId, status: 'PENDING' },
  });
  if (!record) {
    return c.json<ApiResponse>({ success: false, error: '充值订单不存在或已处理' }, 404);
  }

  await db.rechargeRecord.update({
    where: { id: rechargeId },
    data: {
      status: 'COMPLETED',
      txRef: (body as any)?.txRef || `manual_${Date.now()}`,
    },
  });

  return c.json<ApiResponse>({ success: true, message: '充值已确认，请兑换Token' });
});

// ── USDT 充值兑换为 Token ──
userRoutes.post('/exchange', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ rechargeId: number }>().catch(() => ({ rechargeId: 0 }));
  const rechargeId = Number(body.rechargeId);

  if (!rechargeId) {
    return c.json<ApiResponse>({ success: false, error: '请提供充值订单ID' }, 400);
  }

  const record = await db.rechargeRecord.findFirst({
    where: { id: rechargeId, userId, status: 'COMPLETED', method: 'USDT' },
  });
  if (!record) {
    return c.json<ApiResponse>({ success: false, error: '充值订单不存在、未完成或已兑换' }, 404);
  }

  // 检查是否已兑换 (通过 note 中 "已兑换" 标记)
  if (record.note?.includes('已兑换')) {
    return c.json<ApiResponse>({ success: false, error: '此订单已兑换过Token' }, 400);
  }

  const usdtAmount = Number(record.amount) / 100; // 分→元
  const dynamicRate = Number(await getSetting('token_to_cny_rate', USDT_TO_TOKEN_RATE));
  const tokensToGrant = Math.floor(usdtAmount * dynamicRate);

  if (tokensToGrant <= 0) {
    return c.json<ApiResponse>({ success: false, error: '充值金额过小，无法兑换' }, 400);
  }

  // 事务: 标记已兑换 + 增加余额 + 写流水
  const result = await db.$transaction(async (tx) => {
    await tx.rechargeRecord.update({
      where: { id: rechargeId },
      data: { note: `${record.note || ''} | 已兑换 ${tokensToGrant} Token` },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: BigInt(tokensToGrant) } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        type: 'RECHARGE',
        amount: BigInt(tokensToGrant),
        balanceAfter: user.tokenBalance,
        refId: `recharge_${rechargeId}`,
        description: `USDT充值兑换 ${usdtAmount} USDT → ${tokensToGrant} Token (费率: 1 USDT = ${dynamicRate} Token)`,
      },
    });

    return { tokensGranted: tokensToGrant, newBalance: Number(user.tokenBalance) };
  });

  return c.json<ApiResponse<ExchangeResponse>>({
    success: true,
    data: {
      tokensGranted: result.tokensGranted,
      newBalance: result.newBalance,
      rate: dynamicRate,
    },
    message: `成功兑换 ${result.tokensGranted} Token`,
  });
});
