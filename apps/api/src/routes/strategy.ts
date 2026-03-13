/**
 * Strategy Plaza Routes — 策略广场
 * POST   /api/strategy/share       — 分享策略 (需登录)
 * PUT    /api/strategy/:code/sync  — 同步收益数据 (需登录, 仅策略拥有者)
 * DELETE /api/strategy/:code       — 取消分享 (需登录, 仅策略拥有者)
 * GET    /api/strategy/plaza       — 策略广场列表 (公开)
 * GET    /api/strategy/:code       — 策略详情 (公开)
 * POST   /api/strategy/:code/copy  — 记录复制次数 (公开)
 */
import { Hono } from 'hono';
import { db } from '@sentinel/db';
import { requireApiToken } from '../middleware/auth';
import type { ApiResponse } from '@sentinel/shared';
import crypto from 'node:crypto';

export const strategyRoutes = new Hono();

// 生成唯一短码
function generateShareCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

// ── 分享策略 (需登录) ──
strategyRoutes.post('/share', requireApiToken, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const { symbol, baseAsset, quoteAsset, strategyName, nickname, gridConfig,
      pnlUsdt, pnlPercent, runSeconds, matchCount, totalGrids,
      maxDrawdownPct, minInvestUsdt, chartPoints, isRunning } = body;

    if (!symbol || !strategyName || !gridConfig) {
      return c.json<ApiResponse>({ success: false, error: '缺少必要字段: symbol, strategyName, gridConfig' }, 400);
    }

    // 每个用户最多分享 10 个策略
    const existing = await db.sharedStrategy.count({ where: { userId, status: 'ACTIVE' } });
    if (existing >= 10) {
      return c.json<ApiResponse>({ success: false, error: '每个用户最多分享 10 个策略' }, 400);
    }

    // 生成唯一 shareCode
    let shareCode = generateShareCode();
    let attempts = 0;
    while (await db.sharedStrategy.findUnique({ where: { shareCode } })) {
      shareCode = generateShareCode();
      if (++attempts > 10) {
        return c.json<ApiResponse>({ success: false, error: '生成分享码失败，请重试' }, 500);
      }
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { nickname: true } });

    // 清理 gridConfig 中可能的非法 JSON 值 (Infinity, NaN, undefined 等)
    const safeGridConfig = JSON.parse(JSON.stringify(gridConfig));

    const strategy = await db.sharedStrategy.create({
      data: {
        shareCode,
        userId,
        nickname: nickname || user?.nickname || '匿名用户',
        symbol,
        baseAsset: baseAsset || symbol.replace(/USDT$/i, ''),
        quoteAsset: quoteAsset || 'USDT',
        strategyName,
        gridConfig: safeGridConfig,
        pnlUsdt: pnlUsdt ?? 0,
        pnlPercent: pnlPercent ?? 0,
        runSeconds: runSeconds ?? 0,
        matchCount: matchCount ?? 0,
        totalGrids: totalGrids ?? 0,
        maxDrawdownPct: maxDrawdownPct ?? 0,
        minInvestUsdt: minInvestUsdt ?? 0,
        chartPoints: chartPoints ?? [],
        isRunning: isRunning ?? true,
        lastSyncAt: new Date(),
      },
    });

    return c.json<ApiResponse>({
      success: true,
      data: { shareCode: strategy.shareCode, id: strategy.id },
    }, 201);
  } catch (err: any) {
    console.error('[Strategy Share Error]', err);
    return c.json<ApiResponse>({ success: false, error: err.message || '分享策略失败' }, 500);
  }
});

// ── 同步收益数据 (需登录, 仅拥有者) ──
strategyRoutes.put('/:code/sync', requireApiToken, async (c) => {
  const userId = c.get('userId');
  const shareCode = c.req.param('code');

  const strategy = await db.sharedStrategy.findUnique({ where: { shareCode } });
  if (!strategy) {
    return c.json<ApiResponse>({ success: false, error: '策略不存在' }, 404);
  }
  if (strategy.userId !== userId) {
    return c.json<ApiResponse>({ success: false, error: '无权操作此策略' }, 403);
  }
  if (strategy.status !== 'ACTIVE') {
    return c.json<ApiResponse>({ success: false, error: '策略已下架' }, 400);
  }

  // 频率限制: 最少 60 秒间隔
  if (strategy.lastSyncAt && Date.now() - strategy.lastSyncAt.getTime() < 60_000) {
    return c.json<ApiResponse>({ success: true, data: { throttled: true } });
  }

  const body = await c.req.json();
  const { pnlUsdt, pnlPercent, runSeconds, matchCount, totalGrids,
    maxDrawdownPct, chartPoints, isRunning } = body;

  await db.sharedStrategy.update({
    where: { shareCode },
    data: {
      ...(pnlUsdt !== undefined && { pnlUsdt }),
      ...(pnlPercent !== undefined && { pnlPercent }),
      ...(runSeconds !== undefined && { runSeconds }),
      ...(matchCount !== undefined && { matchCount }),
      ...(totalGrids !== undefined && { totalGrids }),
      ...(maxDrawdownPct !== undefined && { maxDrawdownPct }),
      ...(chartPoints !== undefined && { chartPoints }),
      ...(isRunning !== undefined && { isRunning }),
      lastSyncAt: new Date(),
    },
  });

  return c.json<ApiResponse>({ success: true, data: { synced: true } });
});

// ── 取消分享 (需登录, 仅拥有者) ──
strategyRoutes.delete('/:code', requireApiToken, async (c) => {
  const userId = c.get('userId');
  const shareCode = c.req.param('code');

  const strategy = await db.sharedStrategy.findUnique({ where: { shareCode } });
  if (!strategy) {
    return c.json<ApiResponse>({ success: false, error: '策略不存在' }, 404);
  }
  if (strategy.userId !== userId) {
    return c.json<ApiResponse>({ success: false, error: '无权操作此策略' }, 403);
  }

  await db.sharedStrategy.update({
    where: { shareCode },
    data: { status: 'HIDDEN' },
  });

  return c.json<ApiResponse>({ success: true, data: { hidden: true } });
});

// ── 策略广场列表 (公开, 无需登录) ──
strategyRoutes.get('/plaza', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('pageSize') || '20')));
  const sort = c.req.query('sort') || 'pnl'; // pnl | copies | newest | runtime
  const symbol = c.req.query('symbol');       // 筛选交易对
  const minRunDays = parseInt(c.req.query('minRunDays') || '0');
  const minPnlPercent = parseFloat(c.req.query('minPnlPercent') || '-999999');
  const maxPnlPercent = parseFloat(c.req.query('maxPnlPercent') || '999999');

  const where: any = {
    status: 'ACTIVE',
    pnlPercent: { gte: minPnlPercent, lte: maxPnlPercent },
  };
  if (symbol) where.symbol = symbol;
  if (minRunDays > 0) where.runSeconds = { gte: minRunDays * 86400 };

  let orderBy: any;
  switch (sort) {
    case 'copies': orderBy = { copyCount: 'desc' as const }; break;
    case 'newest': orderBy = { createdAt: 'desc' as const }; break;
    case 'runtime': orderBy = { runSeconds: 'desc' as const }; break;
    default: orderBy = { pnlPercent: 'desc' as const }; break;
  }

  const [data, total] = await Promise.all([
    db.sharedStrategy.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        shareCode: true,
        nickname: true,
        symbol: true,
        baseAsset: true,
        quoteAsset: true,
        strategyName: true,
        pnlUsdt: true,
        pnlPercent: true,
        runSeconds: true,
        matchCount: true,
        totalGrids: true,
        maxDrawdownPct: true,
        minInvestUsdt: true,
        chartPoints: true,
        isRunning: true,
        copyCount: true,
        lastSyncAt: true,
        createdAt: true,
      },
    }),
    db.sharedStrategy.count({ where }),
  ]);

  // Decimal → number for JSON
  const items = data.map(d => ({
    ...d,
    pnlUsdt: Number(d.pnlUsdt),
    pnlPercent: Number(d.pnlPercent),
    maxDrawdownPct: Number(d.maxDrawdownPct),
    minInvestUsdt: Number(d.minInvestUsdt),
  }));

  return c.json<ApiResponse>({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// ── 策略详情 (公开, 含 gridConfig) ──
strategyRoutes.get('/:code', async (c) => {
  const shareCode = c.req.param('code');

  // 防止 "plaza" 被当成 :code 匹配
  if (shareCode === 'plaza' || shareCode === 'share') return c.notFound();

  const strategy = await db.sharedStrategy.findUnique({
    where: { shareCode },
    select: {
      shareCode: true,
      nickname: true,
      symbol: true,
      baseAsset: true,
      quoteAsset: true,
      strategyName: true,
      gridConfig: true,
      pnlUsdt: true,
      pnlPercent: true,
      runSeconds: true,
      matchCount: true,
      totalGrids: true,
      maxDrawdownPct: true,
      minInvestUsdt: true,
      chartPoints: true,
      isRunning: true,
      copyCount: true,
      lastSyncAt: true,
      createdAt: true,
      status: true,
    },
  });

  if (!strategy || strategy.status !== 'ACTIVE') {
    return c.json<ApiResponse>({ success: false, error: '策略不存在或已下架' }, 404);
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      ...strategy,
      pnlUsdt: Number(strategy.pnlUsdt),
      pnlPercent: Number(strategy.pnlPercent),
      maxDrawdownPct: Number(strategy.maxDrawdownPct),
      minInvestUsdt: Number(strategy.minInvestUsdt),
    },
  });
});

// ── 记录复制 (公开) ──
strategyRoutes.post('/:code/copy', async (c) => {
  const shareCode = c.req.param('code');

  const strategy = await db.sharedStrategy.findUnique({ where: { shareCode } });
  if (!strategy || strategy.status !== 'ACTIVE') {
    return c.json<ApiResponse>({ success: false, error: '策略不存在或已下架' }, 404);
  }

  await db.sharedStrategy.update({
    where: { shareCode },
    data: { copyCount: { increment: 1 } },
  });

  return c.json<ApiResponse>({ success: true, data: { copyCount: strategy.copyCount + 1 } });
});
