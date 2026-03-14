/**
 * Scan Routes — 扫描请求 / 简报获取 / SSE流 / 状态检查
 * POST /api/scan/request    — 请求一次扫描 (Token预扣)
 * GET  /api/scan/briefings  — 获取简报列表
 * GET  /api/scan/stream     — SSE 实时推送
 * GET  /api/scan/status     — 服务状态 + Token余额
 */
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { db } from '@sentinel/db';
import { requireApiToken } from '../middleware/auth';
import { SERVICE_VERSION, calculateScores } from '@sentinel/shared';
import type { ApiResponse, ScanResponse, ScanStatusResponse, BriefingResponse, ServerSignalDef } from '@sentinel/shared';
import * as crypto from 'node:crypto';
import { scanQueue } from '../worker/scanWorker';

export const scanRoutes = new Hono();
scanRoutes.use('*', requireApiToken);

// ── 获取管理配置 ──
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.adminSetting.findUnique({ where: { key } });
  return s ? (s.value as T) : fallback;
}

// ── POST /request — 请求扫描 ──
scanRoutes.post('/request', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ enableSearch?: boolean }>().catch(() => ({}));
  const enableSearch = true; // 所有扫描均含搜索增强

  // 辅助: 创建失败记录并返回错误
  const failAndRecord = async (errorMessage: string, statusCode: number, cost = 0) => {
    const failBriefingId = `fail_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await db.scanRecord.create({
      data: {
        userId,
        briefingId: failBriefingId,
        tokenCost: 0,
        status: 'FAILED',
        isCached: false,
        enableSearch,
        errorMessage,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    return c.json<ApiResponse>({ success: false, error: errorMessage }, statusCode as any);
  };

  // 检查维护模式
  const maintenance = await getSetting('maintenance_mode', false);
  if (maintenance) {
    return failAndRecord('服务正在维护中，请稍后再试', 503);
  }

  // 频率限制
  const maxPerHour = await getSetting('max_scans_per_user_per_hour', 3);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await db.scanRecord.count({
    where: { userId, startedAt: { gte: oneHourAgo } },
  });
  if (recentCount >= maxPerHour) {
    return failAndRecord(`每小时最多请求 ${maxPerHour} 次扫描`, 429);
  }

  // 计费模式
  const billingMode = await getSetting('billing_mode', 'fixed');
  const isActualBilling = String(billingMode) === 'actual';

  // 计算费用 (固定模式预扣; 实际模式仅检查余额 > 0)
  const fixedCost = await getSetting('scan_price_fixed', 2);

  // 检查余额
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return failAndRecord('Token 余额不足', 402);
  }
  const balance = Number(user.tokenBalance);
  if (isActualBilling) {
    if (balance <= 0) {
      return failAndRecord(`Token 余额不足，当前余额 ${balance}`, 402);
    }
  } else {
    if (balance < fixedCost) {
      return failAndRecord(`Token 余额不足，需要 ${fixedCost} Token，当前余额 ${balance}`, 402);
    }
  }

  // 检查缓存
  const cacheWindowRaw = await getSetting('cache_window_minutes', 5);
  const cacheWindow = Number(cacheWindowRaw);
  const cacheKey = enableSearch ? 'scan_with_search' : 'scan_basic';
  const now = new Date();
  const cacheExpiry = new Date(now.getTime() - cacheWindow * 60 * 1000);
  console.log(`[Cache] check: cacheWindow=${cacheWindow} (raw=${JSON.stringify(cacheWindowRaw)}), cacheKey=${cacheKey}, now=${now.toISOString()}, cacheExpiry=${cacheExpiry.toISOString()}`);
  const cached = await db.scanCache.findFirst({
    where: {
      cacheKey,
      searcherUsed: enableSearch,
      expiresAt: { gt: now },
      createdAt: { gte: cacheExpiry },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (cached) {
    console.log(`[Cache] HIT: id=${cached.id}, createdAt=${cached.createdAt.toISOString()}, expiresAt=${cached.expiresAt.toISOString()}, age=${Math.round((now.getTime() - cached.createdAt.getTime()) / 1000)}s`);
  } else {
    console.log('[Cache] MISS: no valid cache found');
  }

  const briefingId = `brf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (cached) {
    // ────── 缓存命中 ──────
    const briefingData = cached.briefingData as any;
    // 计算本次扣费: 固定模式用 fixedCost; 实际模式用缓存中记录的上次真实 LLM token 数
    const cachedTotalTokens = briefingData?._tokenUsage?.totalTokens ?? 0;
    const tokenCost = isActualBilling ? cachedTotalTokens : fixedCost;

    // 余额二次检查 (实际模式下缓存 token 数可能很大)
    if (Number(user.tokenBalance) < tokenCost) {
      return failAndRecord(`Token 余额不足，需要 ${tokenCost} Token，当前余额 ${Number(user.tokenBalance)}`, 402);
    }

    // 扣费
    if (tokenCost > 0) {
      const newBalance = Number(user.tokenBalance) - tokenCost;
      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { tokenBalance: BigInt(newBalance) },
        }),
        db.tokenTransaction.create({
          data: {
            userId,
            type: 'SCAN_DEDUCT',
            amount: BigInt(-tokenCost),
            balanceAfter: BigInt(newBalance),
            refId: briefingId,
            description: isActualBilling
              ? `扫描扣费 (按实际消耗 ${tokenCost} Token)${enableSearch ? ' 含搜索增强' : ''}`
              : `扫描扣费${enableSearch ? ' (含搜索增强)' : ''}`,
          },
        }),
      ]);
    }

    // 查原始（非缓存）扫描记录的真实耗时，用于伪装时间
    const originalRecord = await db.scanRecord.findFirst({
      where: { cacheId: cached.id, isCached: false },
      select: { startedAt: true, completedAt: true },
    }) || await db.scanRecord.findFirst({
      where: { isCached: false, enableSearch, status: 'COMPLETED', completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: { startedAt: true, completedAt: true },
    });
    // 计算原始扫描耗时 (毫秒)，默认 30-45 秒
    const originalDurationMs = originalRecord?.completedAt
      ? originalRecord.completedAt.getTime() - originalRecord.startedAt.getTime()
      : (30 + Math.random() * 15) * 1000;

    const fakeStartedAt = new Date();
    const fakeCompletedAt = new Date(fakeStartedAt.getTime() + originalDurationMs);

    // 收入 = 用户消耗的 Token / tokenRate (1 USDT = tokenRate Token)
    const tokenRate = Number(await getSetting('token_to_cny_rate', 100000));
    const revenueUsd = tokenRate > 0 ? tokenCost / tokenRate : 0;

    // 计算 SD/SV/SR 评分 (缓存推送复用原始简报的信号)
    const signalDefsRaw = await db.signalDefinition.findMany({ where: { enabled: true } });
    const signalDefMap = new Map<number, ServerSignalDef>(
      signalDefsRaw.map(d => [d.signalId, { signalId: d.signalId, group: d.group, category: d.category, impact: d.impact, halfLife: d.halfLife, confidence: d.confidence }])
    );
    const scores = calculateScores(briefingData?.triggeredSignals || [], signalDefMap);

    await db.scanRecord.create({
      data: {
        userId,
        briefingId,
        tokenCost,
        status: 'COMPLETED',
        isCached: true,
        cacheId: cached.id,
        signalCount: briefingData?.triggeredSignals?.length ?? 0,
        alertCount: briefingData?.alerts?.length ?? 0,
        enableSearch,
        realCostUsd: 0,
        revenueUsd,
        profitUsd: revenueUsd,
        scoreDirection: scores.scoreDirection,
        scoreVolatility: scores.scoreVolatility,
        scoreRisk: scores.scoreRisk,
        briefingData: cached.briefingData as any ?? undefined,
        startedAt: fakeStartedAt,
        completedAt: fakeCompletedAt,
      },
    });

    return c.json<ApiResponse<ScanResponse>>({
      success: true,
      data: {
        briefingId,
        estimatedSeconds: Math.ceil(originalDurationMs / 1000),
        tokenCost,
        cached: true,
      },
    });
  }

  // ────── 无缓存: 真实扫描 ──────
  // 固定模式: 预扣 fixedCost; 实际模式: 预扣 0 (worker 完成后按实际 token 扣费)
  const tokenCost = isActualBilling ? 0 : fixedCost;

  if (tokenCost > 0) {
    const newBalance = Number(user.tokenBalance) - tokenCost;
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { tokenBalance: BigInt(newBalance) },
      }),
      db.tokenTransaction.create({
        data: {
          userId,
          type: 'SCAN_DEDUCT',
          amount: BigInt(-tokenCost),
          balanceAfter: BigInt(newBalance),
          refId: briefingId,
          description: `扫描扣费${enableSearch ? ' (含搜索增强)' : ''}`,
        },
      }),
    ]);
  }

  // 查询管线信息，填充 SystemScanLog
  const analyzer = await db.pipelineConfig.findFirst({ where: { role: { in: ['ANALYZER', 'ANALYZER_BACKUP'] }, enabled: true }, orderBy: { priority: 'asc' } });
  const searcher = enableSearch ? await db.pipelineConfig.findFirst({ where: { role: 'SEARCHER', enabled: true } }) : null;

  await db.scanRecord.create({
    data: {
      userId,
      briefingId,
      tokenCost,
      status: 'PENDING',
      isCached: false,
      enableSearch,
      startedAt: new Date(),
    },
  });

  // 为用户扫描也创建 SystemScanLog，这样 scanWorker 完成时能写入 token 统计
  await db.systemScanLog.create({
    data: {
      briefingId,
      status: 'PENDING',
      enableSearch,
      searcherProvider: searcher?.provider || null,
      searcherModel: searcher?.model || null,
      analyzerProvider: analyzer?.provider || null,
      analyzerModel: analyzer?.model || null,
    },
  });

  // 将扫描任务推入 BullMQ 队列 (传递 billingMode 以便 worker 知道是否需要后扣费)
  await scanQueue.add('scan', { briefingId, enableSearch, userId, billingMode: isActualBilling ? 'actual' : 'fixed' });

  return c.json<ApiResponse<ScanResponse>>({
    success: true,
    data: {
      briefingId,
      estimatedSeconds: enableSearch ? 30 : 15,
      tokenCost,
      cached: false,
    },
  });
});

// ── GET /briefings — 获取简报列表 ──
scanRoutes.get('/briefings', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(20, Math.max(1, Number(c.req.query('limit')) || 10));
  const after = c.req.query('after'); // briefingId, 用于增量拉取

  const where: any = { userId, status: 'COMPLETED' };
  if (after) {
    const ref = await db.scanRecord.findFirst({ where: { briefingId: after } });
    if (ref) {
      where.completedAt = { gt: ref.completedAt };
    }
  }

  const records = await db.scanRecord.findMany({
    where,
    orderBy: { completedAt: 'desc' },
    take: limit,
  });

  // Token 统计: 优先从 SystemScanLog 读取，回退到 briefingData._tokenUsage
  // 对缓存记录，追溯原始扫描的 SystemScanLog
  const directBriefingIds = records.filter(r => !r.isCached).map(r => r.briefingId);
  const cachedRecordsWithCache = records.filter(r => r.isCached && r.cacheId);
  const cacheIds = cachedRecordsWithCache.map(r => r.cacheId!);
  // 查找产生缓存的原始扫描记录的 briefingId
  const originalRecords = cacheIds.length > 0
    ? await db.scanRecord.findMany({
        where: { cacheId: { in: cacheIds }, isCached: false },
        select: { cacheId: true, briefingId: true },
      })
    : [];
  const cacheToOrigBriefing = new Map(originalRecords.map(r => [r.cacheId!, r.briefingId]));
  const allSysLogIds = [...new Set([...directBriefingIds, ...originalRecords.map(r => r.briefingId)])];
  const sysLogs = allSysLogIds.length > 0
    ? await db.systemScanLog.findMany({ where: { briefingId: { in: allSysLogIds } } })
    : [];
  const sysLogMap = new Map(sysLogs.map(l => [l.briefingId, l]));

  const briefings: BriefingResponse[] = records
    .filter((r) => r.briefingData)
    .map((r) => {
      const d = r.briefingData as any;
      // 对缓存记录，用原始扫描的 briefingId 查 SystemScanLog
      const lookupId = r.isCached && r.cacheId
        ? cacheToOrigBriefing.get(r.cacheId) || r.briefingId
        : r.briefingId;
      const sl = sysLogMap.get(lookupId);
      // 优先 SystemScanLog，回退到 briefingData._tokenUsage
      const tu = d._tokenUsage;
      const searchTok = sl?.tokenCostSearch || tu?.searchTokens || 0;
      const analyzeTok = sl?.tokenCostAnalyze || tu?.analyzeTokens || 0;
      const totalTok = sl?.tokenCostTotal || tu?.totalTokens || 0;
      return {
        briefingId: r.briefingId,
        timestamp: r.completedAt?.getTime() ?? r.startedAt.getTime(),
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
        enableSearch: r.enableSearch,
        tokenCost: r.tokenCost,
        marketSummary: d.marketSummary || '',
        marketSummaryEn: d.marketSummaryEn || '',
        triggeredSignals: d.triggeredSignals || [],
        alerts: d.alerts || [],
        pipelineInfo: d.pipelineInfo || {
          hasSearcher: r.enableSearch,
          hasMarketData: false,
          analyzerProvider: 'unknown',
        },
        serverTokenUsage: {
          searchTokens: searchTok,
          analyzeTokens: analyzeTok,
          totalTokens: totalTok,
        },
      };
    });

  return c.json<ApiResponse<BriefingResponse[]>>({ success: true, data: briefings });
});

// ── GET /stream — SSE 实时推送 ──
scanRoutes.get('/stream', (c) => {
  const userId = c.get('userId');

  return streamSSE(c, async (stream) => {
    // 心跳
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: 'heartbeat', data: JSON.stringify({ t: Date.now() }) });
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    // 初始事件
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ userId, version: SERVICE_VERSION }),
    });

    // 轮询检查新完成的简报 (生产环境应使用 Redis Pub/Sub)
    let lastCheck = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        const newRecords = await db.scanRecord.findMany({
          where: {
            userId,
            status: 'COMPLETED',
            completedAt: { gt: new Date(lastCheck) },
          },
          orderBy: { completedAt: 'asc' },
        });

        for (const record of newRecords) {
          if (record.briefingData) {
            const d = record.briefingData as any;
            await stream.writeSSE({
              event: 'briefing',
              data: JSON.stringify({
                briefingId: record.briefingId,
                timestamp: record.completedAt?.getTime() ?? Date.now(),
                marketSummary: d.marketSummary || '',
                marketSummaryEn: d.marketSummaryEn || '',
                triggeredSignals: d.triggeredSignals || [],
                alerts: d.alerts || [],
                pipelineInfo: d.pipelineInfo || {
                  hasSearcher: record.enableSearch,
                  hasMarketData: false,
                  analyzerProvider: 'unknown',
                },
              }),
            });
          }
        }
        lastCheck = Date.now();
      } catch {
        // 忽略轮询错误
      }
    }, 3000);

    // 连接断开清理
    stream.onAbort(() => {
      clearInterval(heartbeat);
      clearInterval(pollInterval);
    });

    // 保持连接
    while (true) {
      await new Promise((r) => setTimeout(r, 30000));
    }
  });
});

// ── GET /status — 服务状态 ──
scanRoutes.get('/status', async (c) => {
  const userId = c.get('userId');
  const user = await db.user.findUnique({ where: { id: userId } });
  const maintenance = await getSetting('maintenance_mode', false);

  return c.json<ApiResponse<ScanStatusResponse>>({
    success: true,
    data: {
      ok: !maintenance,
      version: SERVICE_VERSION,
      tokenBalance: Number(user?.tokenBalance ?? 0),
      message: maintenance ? '服务正在维护中' : undefined,
    },
  });
});
