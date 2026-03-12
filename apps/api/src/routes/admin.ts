/**
 * Admin Routes — 管理后台 API
 * POST   /api/admin/login              — 管理员登录
 * GET    /api/admin/dashboard           — 运营仪表盘
 * GET    /api/admin/users               — 用户列表
 * PATCH  /api/admin/users/:id/status    — 修改用户状态
 * PATCH  /api/admin/users/:id/balance   — 调整用户余额
 * GET    /api/admin/settings            — 获取所有配置
 * PUT    /api/admin/settings/:key       — 更新配置
 * GET    /api/admin/pipelines           — LLM 管线列表
 * POST   /api/admin/pipelines           — 创建管线配置
 * PUT    /api/admin/pipelines/:id       — 更新管线配置
 * DELETE /api/admin/pipelines/:id       — 删除管线配置
 * GET    /api/admin/costs               — LLM 成本配置
 * PUT    /api/admin/costs/:id           — 更新成本配置
 * GET    /api/admin/finance             — 财务报表
 */
import { Hono } from 'hono';
import { db } from '@sentinel/db';
import { requireAdmin, signJwt } from '../middleware/auth';
import { hashPassword, verifyPassword, encryptValue } from '../lib/crypto';
import { scanQueue } from '../worker/scanWorker';
import type { ApiResponse, AdminDashboardStats } from '@sentinel/shared';

export const adminRoutes = new Hono();

// ── 管理员登录 (无需 requireAdmin) ──
adminRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email?.trim() || !password?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '邮箱和密码为必填项' }, 400);
  }

  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return c.json<ApiResponse>({ success: false, error: '邮箱或密码错误' }, 401);
  }

  const token = signJwt({ userId: admin.id, email: admin.email, isAdmin: true });
  return c.json<ApiResponse<{ token: string; admin: { id: number; email: string; name: string | null } }>>({
    success: true,
    data: { token, admin: { id: admin.id, email: admin.email, name: admin.name } },
  });
});

// ── 以下路由需管理员权限 ──
adminRoutes.use('/*', requireAdmin);

// ── 运营仪表盘 ──
adminRoutes.get('/dashboard', async (c) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  // 读取汇率: 1 USDT = N Token
  const rateSetting = await db.adminSetting.findUnique({ where: { key: 'token_to_cny_rate' } });
  const tokenRate = Number(rateSetting?.value ?? 10); // 默认 10

  // 今日统计
  const todayScans = await db.scanRecord.findMany({
    where: { startedAt: { gte: todayStart }, status: 'COMPLETED' },
  });
  const todayRealScans = todayScans.filter(s => !s.isCached).length;
  const todayCachedScans = todayScans.filter(s => s.isCached).length;
  const todayTokenRevenue = todayScans.reduce((s, r) => s + r.tokenCost, 0);
  const todayRevenueUsd = tokenRate > 0 ? todayTokenRevenue / tokenRate : 0;
  const todayCost = todayScans.filter(s => !s.isCached).reduce((s, r) => s + Number(r.realCostUsd), 0);
  const todayProfit = todayRevenueUsd - todayCost;

  const todayActiveUsers = await db.scanRecord.groupBy({
    by: ['userId'],
    where: { startedAt: { gte: todayStart } },
  });
  const todayNewUsers = await db.user.count({
    where: { createdAt: { gte: todayStart } },
  });
  const todayRecharge = await db.rechargeRecord.aggregate({
    where: { createdAt: { gte: todayStart }, status: 'COMPLETED' },
    _sum: { amount: true },
  });

  // 本月统计
  const monthScans = await db.scanRecord.findMany({
    where: { startedAt: { gte: monthStart }, status: 'COMPLETED' },
  });
  const monthTokenRevenue = monthScans.reduce((s, r) => s + r.tokenCost, 0);
  const monthRevenueUsd = tokenRate > 0 ? monthTokenRevenue / tokenRate : 0;
  const monthCost = monthScans.filter(s => !s.isCached).reduce((s, r) => s + Number(r.realCostUsd), 0);
  const monthProfit = monthRevenueUsd - monthCost;

  const monthNewUsers = await db.user.count({
    where: { createdAt: { gte: monthStart } },
  });
  const monthRecharge = await db.rechargeRecord.aggregate({
    where: { createdAt: { gte: monthStart }, status: 'COMPLETED' },
    _sum: { amount: true },
  });

  return c.json<ApiResponse>({
    success: true,
    data: {
      tokenRate,
      today: {
        totalScans: todayScans.length,
        realScans: todayRealScans,
        cachedScans: todayCachedScans,
        cacheHitRate: todayScans.length > 0 ? todayCachedScans / todayScans.length : 0,
        tokenRevenue: todayTokenRevenue,
        revenueUsd: todayRevenueUsd,
        cost: todayCost,
        profit: todayProfit,
        profitRate: todayRevenueUsd > 0 ? todayProfit / todayRevenueUsd : 0,
        activeUsers: todayActiveUsers.length,
        newUsers: todayNewUsers,
        rechargeTotal: Number(todayRecharge._sum.amount ?? 0),
      },
      thisMonth: {
        totalScans: monthScans.length,
        tokenRevenue: monthTokenRevenue,
        revenueUsd: monthRevenueUsd,
        cost: monthCost,
        profit: monthProfit,
        newUsers: monthNewUsers,
        rechargeTotal: Number(monthRecharge._sum.amount ?? 0),
      },
    },
  });
});

// ── 用户列表 ──
adminRoutes.get('/users', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));
  const search = c.req.query('search')?.trim();

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { nickname: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { scanRecords: true, apiTokens: true } } },
    }),
  ]);

  return c.json<ApiResponse>({
    success: true,
    data: {
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        tokenBalance: Number(u.tokenBalance),
        status: u.status,
        scanCount: u._count.scanRecords,
        tokenCount: u._count.apiTokens,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ── 修改用户状态 ──
adminRoutes.patch('/users/:id/status', async (c) => {
  const userId = Number(c.req.param('id'));
  const body = await c.req.json<{ status: string }>();
  const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED'];
  if (!validStatuses.includes(body.status)) {
    return c.json<ApiResponse>({ success: false, error: '无效的状态值' }, 400);
  }
  await db.user.update({ where: { id: userId }, data: { status: body.status as any } });
  return c.json<ApiResponse>({ success: true, message: '用户状态已更新' });
});

// ── 调整用户余额 ──
adminRoutes.patch('/users/:id/balance', async (c) => {
  const userId = Number(c.req.param('id'));
  const body = await c.req.json<{ amount: number; description?: string }>();
  const { amount, description } = body;

  if (!amount || amount === 0) {
    return c.json<ApiResponse>({ success: false, error: '金额不能为零' }, 400);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);

  const newBalance = Number(user.tokenBalance) + amount;
  if (newBalance < 0) {
    return c.json<ApiResponse>({ success: false, error: '调整后余额不能为负' }, 400);
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { tokenBalance: BigInt(newBalance) } }),
    db.tokenTransaction.create({
      data: {
        userId,
        type: 'ADMIN_ADJUST',
        amount: BigInt(amount),
        balanceAfter: BigInt(newBalance),
        description: description || `管理员调整 ${amount > 0 ? '+' : ''}${amount}`,
      },
    }),
  ]);

  return c.json<ApiResponse>({ success: true, message: `余额已调整为 ${newBalance}` });
});

// ── 用户详情 + 调用统计 ──
adminRoutes.get('/users/:id', async (c) => {
  const userId = Number(c.req.param('id'));
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      apiTokens: { select: { id: true, tokenPrefix: true, name: true, lastUsedAt: true, isRevoked: true, createdAt: true } },
      _count: { select: { scanRecords: true, rechargeRecords: true, tokenTransactions: true } },
    },
  });
  if (!user) return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);

  // 调用统计
  const totalScans = await db.scanRecord.count({ where: { userId } });
  const completedScans = await db.scanRecord.count({ where: { userId, status: 'COMPLETED' } });
  const failedScans = await db.scanRecord.count({ where: { userId, status: 'FAILED' } });
  const cachedScans = await db.scanRecord.count({ where: { userId, isCached: true } });
  const searchScans = await db.scanRecord.count({ where: { userId, enableSearch: true } });
  const totalTokenSpent = await db.scanRecord.aggregate({ where: { userId }, _sum: { tokenCost: true } });
  const totalRevenue = await db.scanRecord.aggregate({ where: { userId }, _sum: { revenueUsd: true } });

  // 最近30天每日扫描
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recentScans = await db.scanRecord.findMany({
    where: { userId, startedAt: { gte: thirtyDaysAgo } },
    select: { status: true, isCached: true, startedAt: true },
    orderBy: { startedAt: 'desc' },
  });

  // 最近10条扫描记录
  const recentRecords = await db.scanRecord.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: {
      id: true, briefingId: true, status: true, isCached: true, enableSearch: true,
      tokenCost: true, signalCount: true, alertCount: true, errorMessage: true,
      startedAt: true, completedAt: true,
    },
  });

  return c.json<ApiResponse>({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        nickname: user.nickname,
        tokenBalance: Number(user.tokenBalance),
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        apiTokens: user.apiTokens.map(t => ({
          id: t.id, tokenPrefix: t.tokenPrefix, name: t.name,
          lastUsedAt: t.lastUsedAt?.toISOString() || null,
          isRevoked: t.isRevoked, createdAt: t.createdAt.toISOString(),
        })),
      },
      stats: {
        totalScans, completedScans, failedScans, cachedScans, searchScans,
        cacheHitRate: totalScans > 0 ? cachedScans / totalScans : 0,
        totalTokenSpent: totalTokenSpent._sum.tokenCost || 0,
        totalRevenueUsd: Number(totalRevenue._sum.revenueUsd ?? 0),
        rechargeCount: user._count.rechargeRecords,
        transactionCount: user._count.tokenTransactions,
      },
      recentScans: recentScans.map(r => ({
        status: r.status, isCached: r.isCached, startedAt: r.startedAt.toISOString(),
      })),
      recentRecords: recentRecords.map(r => ({
        id: r.id, briefingId: r.briefingId, status: r.status, isCached: r.isCached,
        enableSearch: r.enableSearch, tokenCost: r.tokenCost, signalCount: r.signalCount,
        alertCount: r.alertCount, errorMessage: r.errorMessage,
        startedAt: r.startedAt.toISOString(), completedAt: r.completedAt?.toISOString() || null,
      })),
    },
  });
});

// ── 编辑用户 ──
adminRoutes.put('/users/:id', async (c) => {
  const userId = Number(c.req.param('id'));
  const body = await c.req.json<{ email?: string; nickname?: string; password?: string; tokenBalance?: number; status?: string }>();
  const data: any = {};
  if (body.email !== undefined) data.email = body.email.toLowerCase().trim();
  if (body.nickname !== undefined) data.nickname = body.nickname;
  if (body.password) data.passwordHash = hashPassword(body.password);
  if (body.tokenBalance !== undefined) data.tokenBalance = BigInt(body.tokenBalance);
  if (body.status !== undefined) data.status = body.status;

  await db.user.update({ where: { id: userId }, data });
  return c.json<ApiResponse>({ success: true, message: '用户信息已更新' });
});

// ── 管理员列表 ──
adminRoutes.get('/admins', async (c) => {
  const admins = await db.admin.findMany({ orderBy: { id: 'asc' } });
  return c.json<ApiResponse>({
    success: true,
    data: admins.map(a => ({
      id: a.id, email: a.email, name: a.name, createdAt: a.createdAt.toISOString(),
    })),
  });
});

// ── 创建管理员 ──
adminRoutes.post('/admins', async (c) => {
  const body = await c.req.json<{ email: string; password: string; name?: string }>();
  if (!body.email?.trim() || !body.password?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '邮箱和密码为必填项' }, 400);
  }
  const exists = await db.admin.findUnique({ where: { email: body.email.toLowerCase().trim() } });
  if (exists) return c.json<ApiResponse>({ success: false, error: '该邮箱已存在' }, 409);

  const admin = await db.admin.create({
    data: {
      email: body.email.toLowerCase().trim(),
      passwordHash: hashPassword(body.password),
      name: body.name || null,
    },
  });
  return c.json<ApiResponse>({ success: true, data: { id: admin.id }, message: '管理员已创建' }, 201);
});

// ── 更新管理员 ──
adminRoutes.put('/admins/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
  const data: any = {};
  if (body.email !== undefined) data.email = body.email.toLowerCase().trim();
  if (body.password) data.passwordHash = hashPassword(body.password);
  if (body.name !== undefined) data.name = body.name;

  await db.admin.update({ where: { id }, data });
  return c.json<ApiResponse>({ success: true, message: '管理员信息已更新' });
});

// ── 删除管理员 ──
adminRoutes.delete('/admins/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const count = await db.admin.count();
  if (count <= 1) return c.json<ApiResponse>({ success: false, error: '至少保留一个管理员账号' }, 400);
  await db.admin.delete({ where: { id } });
  return c.json<ApiResponse>({ success: true, message: '管理员已删除' });
});

// ── 获取所有配置 ──
adminRoutes.get('/settings', async (c) => {
  const settings = await db.adminSetting.findMany();
  const result: Record<string, unknown> = {};
  for (const s of settings) result[s.key] = s.value;
  return c.json<ApiResponse>({ success: true, data: result });
});

// ── 更新配置 ──
adminRoutes.put('/settings/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json<{ value: unknown }>();
  await db.adminSetting.upsert({
    where: { key },
    update: { value: body.value as any },
    create: { key, value: body.value as any },
  });
  return c.json<ApiResponse>({ success: true, message: `配置 ${key} 已更新` });
});

// ── LLM 管线列表 ──
adminRoutes.get('/pipelines', async (c) => {
  const pipelines = await db.pipelineConfig.findMany({ orderBy: { priority: 'asc' } });
  return c.json<ApiResponse>({
    success: true,
    data: pipelines.map(p => ({
      id: p.id,
      role: p.role,
      provider: p.provider,
      model: p.model,
      apiUrl: p.apiUrl,
      apiKeyEnc: p.apiKeyEnc ? '***' : null,
      enabled: p.enabled,
      priority: p.priority,
      extraParams: p.extraParams,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

// ── 创建管线配置 ──
adminRoutes.post('/pipelines', async (c) => {
  const body = await c.req.json<{
    role: string; provider: string; model: string;
    apiUrl: string; apiKey: string; enabled?: boolean; priority?: number;
    extraParams?: Record<string, unknown>;
  }>();

  const pipeline = await db.pipelineConfig.create({
    data: {
      role: body.role as any,
      provider: body.provider,
      model: body.model,
      apiUrl: body.apiUrl,
      apiKeyEnc: encryptValue(body.apiKey),
      enabled: body.enabled ?? true,
      priority: body.priority ?? 0,
      extraParams: body.extraParams as any ?? undefined,
    },
  });

  return c.json<ApiResponse>({ success: true, data: { id: pipeline.id } }, 201);
});

// ── 更新管线配置 ──
adminRoutes.put('/pipelines/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{
    provider?: string; model?: string; apiUrl?: string; apiKey?: string;
    enabled?: boolean; priority?: number; extraParams?: Record<string, unknown>;
  }>();

  const data: any = {};
  if (body.provider !== undefined) data.provider = body.provider;
  if (body.model !== undefined) data.model = body.model;
  if (body.apiUrl !== undefined) data.apiUrl = body.apiUrl;
  if (body.apiKey !== undefined) data.apiKeyEnc = encryptValue(body.apiKey);
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.extraParams !== undefined) data.extraParams = body.extraParams;

  await db.pipelineConfig.update({ where: { id }, data });
  return c.json<ApiResponse>({ success: true, message: '管线配置已更新' });
});

// ── 删除管线配置 ──
adminRoutes.delete('/pipelines/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.pipelineConfig.delete({ where: { id } });
  return c.json<ApiResponse>({ success: true, message: '管线配置已删除' });
});

// ── LLM 成本配置列表 ──
adminRoutes.get('/costs', async (c) => {
  const costs = await db.llmCostConfig.findMany();
  return c.json<ApiResponse>({ success: true, data: costs });
});

// ── 更新成本配置 ──
adminRoutes.put('/costs/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{ costPerCall: number }>();
  await db.llmCostConfig.update({ where: { id }, data: { costPerCall: body.costPerCall } });
  return c.json<ApiResponse>({ success: true, message: '成本配置已更新' });
});

// ── 财务报表 ──
adminRoutes.get('/finance', async (c) => {
  const days = Math.min(90, Math.max(1, Number(c.req.query('days')) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const records = await db.scanRecord.findMany({
    where: { startedAt: { gte: since }, status: 'COMPLETED' },
    select: {
      startedAt: true,
      tokenCost: true,
      isCached: true,
      realCostUsd: true,
      revenueUsd: true,
      profitUsd: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  // 按天聚合
  const dailyMap = new Map<string, {
    date: string; scans: number; cached: number;
    revenue: number; cost: number; profit: number;
  }>();

  for (const r of records) {
    const dateKey = r.startedAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(dateKey) || { date: dateKey, scans: 0, cached: 0, revenue: 0, cost: 0, profit: 0 };
    existing.scans += 1;
    if (r.isCached) existing.cached += 1;
    existing.revenue += Number(r.revenueUsd);
    existing.cost += Number(r.realCostUsd);
    existing.profit += Number(r.profitUsd);
    dailyMap.set(dateKey, existing);
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      daily: Array.from(dailyMap.values()),
      summary: {
        totalScans: records.length,
        cachedScans: records.filter(r => r.isCached).length,
        totalRevenue: records.reduce((s, r) => s + Number(r.revenueUsd), 0),
        totalCost: records.reduce((s, r) => s + Number(r.realCostUsd), 0),
        totalProfit: records.reduce((s, r) => s + Number(r.profitUsd), 0),
      },
    },
  });
});

// ── 扫描记录 (真实 LLM 扫描: 系统自动 + 用户触发, 不含缓存命中) ──
adminRoutes.get('/system-scans', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const [total, records] = await Promise.all([
    db.systemScanLog.count(),
    db.systemScanLog.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return c.json<ApiResponse>({
    success: true,
    data: {
      data: records.map((s: any) => ({
        id: s.id,
        briefingId: s.briefingId,
        status: s.status,
        enableSearch: s.enableSearch,
        signalCount: s.signalCount,
        alertCount: s.alertCount,
        tokenCostSearch: s.tokenCostSearch,
        tokenCostAnalyze: s.tokenCostAnalyze,
        tokenCostTotal: s.tokenCostTotal,
        realCostUsd: Number(s.realCostUsd),
        searcherProvider: s.searcherProvider,
        searcherModel: s.searcherModel,
        analyzerProvider: s.analyzerProvider,
        analyzerModel: s.analyzerModel,
        errorMessage: s.errorMessage,
        briefingData: s.briefingData || null,
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

// ── 调用记录 (用户调用的扫描, 含缓存命中) ──
adminRoutes.get('/call-logs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const where = { userId: { not: undefined as any } }; // 只查有 userId 的记录（用户调用）
  const [total, records] = await Promise.all([
    db.scanRecord.count({ where }),
    db.scanRecord.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { email: true, nickname: true } },
      },
    }),
  ]);

  return c.json<ApiResponse>({
    success: true,
    data: {
      data: records.map(r => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user.email,
        userNickname: r.user.nickname,
        briefingId: r.briefingId,
        status: r.status,
        isCached: r.isCached,
        enableSearch: r.enableSearch,
        tokenCost: r.tokenCost,
        signalCount: r.signalCount,
        alertCount: r.alertCount,
        realCostUsd: Number(r.realCostUsd),
        revenueUsd: Number(r.revenueUsd),
        profitUsd: Number(r.profitUsd),
        errorMessage: r.errorMessage,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ==================== 信号矩阵管理 ====================

// GET /signals — 获取300条信号列表 (支持 group 过滤)
adminRoutes.get('/signals', async (c) => {
  const group = c.req.query('group');
  const enabledOnly = c.req.query('enabled') === 'true';
  const search = c.req.query('search');

  const where: any = {};
  if (group) where.group = group;
  if (enabledOnly) where.enabled = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { triggerCondition: { contains: search, mode: 'insensitive' } },
    ];
  }

  const signals = await db.signalDefinition.findMany({
    where,
    orderBy: { signalId: 'asc' },
  });

  // 按组汇总统计
  const groupStats = await db.signalDefinition.groupBy({
    by: ['group'],
    _count: { _all: true },
    where: { enabled: true },
  });
  const groupEnabledMap: Record<string, number> = {};
  for (const g of groupStats) {
    groupEnabledMap[g.group] = g._count._all;
  }

  const totalStats = await db.signalDefinition.groupBy({
    by: ['group'],
    _count: { _all: true },
  });
  const groupTotalMap: Record<string, number> = {};
  for (const g of totalStats) {
    groupTotalMap[g.group] = g._count._all;
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      signals,
      stats: {
        total: signals.length,
        enabled: signals.filter(s => s.enabled).length,
        groups: Object.keys(groupTotalMap).sort().map(gid => ({
          id: gid,
          total: groupTotalMap[gid] || 0,
          enabled: groupEnabledMap[gid] || 0,
        })),
      },
    },
  });
});

// PUT /signals/:id — 更新单条信号 (启用/禁用/修改参数)
adminRoutes.put('/signals/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{
    enabled?: boolean;
    impact?: number;
    halfLife?: number;
    confidence?: number;
    category?: string;
    name?: string;
    triggerCondition?: string;
    positiveDesc?: string;
    negativeDesc?: string;
  }>();

  const allowed: any = {};
  if (body.enabled !== undefined) allowed.enabled = body.enabled;
  if (body.impact !== undefined) allowed.impact = body.impact;
  if (body.halfLife !== undefined) allowed.halfLife = body.halfLife;
  if (body.confidence !== undefined) allowed.confidence = body.confidence;
  if (body.category !== undefined) allowed.category = body.category;
  if (body.name !== undefined) allowed.name = body.name;
  if (body.triggerCondition !== undefined) allowed.triggerCondition = body.triggerCondition;
  if (body.positiveDesc !== undefined) allowed.positiveDesc = body.positiveDesc;
  if (body.negativeDesc !== undefined) allowed.negativeDesc = body.negativeDesc;

  if (Object.keys(allowed).length === 0) {
    return c.json<ApiResponse>({ success: false, error: '没有要更新的字段' }, 400);
  }

  await db.signalDefinition.update({ where: { id }, data: allowed });
  return c.json<ApiResponse>({ success: true, message: '信号已更新' });
});

// POST /signals/toggle-group — 批量启用/禁用某组信号
adminRoutes.post('/signals/toggle-group', async (c) => {
  const body = await c.req.json<{ group: string; enabled: boolean }>();
  const result = await db.signalDefinition.updateMany({
    where: { group: body.group },
    data: { enabled: body.enabled },
  });
  return c.json<ApiResponse>({
    success: true,
    message: `${body.group} 组 ${result.count} 条信号已${body.enabled ? '启用' : '禁用'}`,
  });
});

// POST /signals/reset — 恢复所有信号为默认值 (重新种子)
adminRoutes.post('/signals/reset', async (c) => {
  const { SIGNAL_MATRIX } = await import('@sentinel/db');
  let count = 0;
  for (const sig of SIGNAL_MATRIX) {
    await db.signalDefinition.upsert({
      where: { signalId: sig.signalId },
      update: {
        group: sig.group, name: sig.name, impact: sig.impact,
        halfLife: sig.halfLife, confidence: sig.confidence, category: sig.category,
        triggerCondition: sig.triggerCondition, positiveDesc: sig.positiveDesc,
        negativeDesc: sig.negativeDesc, enabled: true,
      },
      create: {
        signalId: sig.signalId, group: sig.group, name: sig.name, impact: sig.impact,
        halfLife: sig.halfLife, confidence: sig.confidence, category: sig.category,
        triggerCondition: sig.triggerCondition, positiveDesc: sig.positiveDesc,
        negativeDesc: sig.negativeDesc, enabled: true,
      },
    });
    count++;
  }
  return c.json<ApiResponse>({ success: true, message: `已恢复 ${count} 条信号为默认值` });
});

// ── 管理员手动触发扫描 ──
adminRoutes.post('/trigger-scan', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const enableSearch = body.enableSearch !== false;

  // 检查是否有活跃的分析器
  const analyzer = await db.pipelineConfig.findFirst({
    where: { role: { in: ['ANALYZER', 'ANALYZER_BACKUP'] }, enabled: true },
    orderBy: { priority: 'asc' },
  });
  if (!analyzer) {
    return c.json<ApiResponse>({ success: false, error: '没有可用的分析器管线，请先配置并启用至少一个 ANALYZER' }, 400);
  }

  const searcher = enableSearch
    ? await db.pipelineConfig.findFirst({ where: { role: 'SEARCHER', enabled: true } })
    : null;

  const briefingId = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 创建 SystemScanLog 记录
  await db.systemScanLog.create({
    data: {
      briefingId,
      status: 'PENDING',
      enableSearch,
      searcherProvider: searcher?.provider || null,
      searcherModel: searcher?.model || null,
      analyzerProvider: analyzer.provider,
      analyzerModel: analyzer.model,
    },
  });

  // 同时创建一个 scanRecord 以便 Worker 能正常处理
  // 使用 userId=0 或者系统管理员ID，这里用第一个管理员做关联
  const admin = await db.admin.findFirst();
  // 找一个系统用户或第一个用户
  let systemUser = await db.user.findFirst({ orderBy: { id: 'asc' } });
  if (!systemUser) {
    return c.json<ApiResponse>({ success: false, error: '系统中没有用户，无法创建扫描记录' }, 400);
  }

  await db.scanRecord.create({
    data: {
      briefingId,
      userId: systemUser.id,
      status: 'PENDING',
      enableSearch,
      tokenCost: 0, // 管理员扫描不消耗用户 Token
      isCached: false,
    },
  });

  // 入队
  await scanQueue.add('scan', { briefingId, enableSearch, userId: systemUser.id });

  return c.json<ApiResponse>({
    success: true,
    data: { briefingId, enableSearch, analyzerProvider: analyzer.provider, analyzerModel: analyzer.model },
    message: '扫描任务已提交',
  });
});

// ── 查询单个系统扫描状态 (优先从 scanRecord 读取，Worker 会更新它) ──
adminRoutes.get('/trigger-scan/:briefingId', async (c) => {
  const briefingId = c.req.param('briefingId');

  const record = await db.scanRecord.findFirst({ where: { briefingId } });
  if (!record) return c.json<ApiResponse>({ success: false, error: '未找到该扫描记录' }, 404);

  // 如果已完成/失败，同步更新 SystemScanLog
  const log = await db.systemScanLog.findUnique({ where: { briefingId } });
  if (log && record.status !== 'PENDING' && record.status !== 'PROCESSING' && log.status !== record.status) {
    await db.systemScanLog.update({
      where: { briefingId },
      data: {
        status: record.status as any,
        signalCount: record.signalCount,
        alertCount: record.alertCount,
        realCostUsd: record.realCostUsd,
        completedAt: record.completedAt,
        briefingData: record.briefingData as any,
        errorMessage: record.status === 'FAILED' ? 'Scan failed' : null,
      },
    });
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      briefingId: record.briefingId,
      status: record.status,
      signalCount: record.signalCount,
      alertCount: record.alertCount,
      tokenCostSearch: log?.tokenCostSearch ?? 0,
      tokenCostAnalyze: log?.tokenCostAnalyze ?? 0,
      tokenCostTotal: log?.tokenCostTotal ?? 0,
      realCostUsd: Number(record.realCostUsd),
      searcherProvider: log?.searcherProvider || null,
      searcherModel: log?.searcherModel || null,
      analyzerProvider: log?.analyzerProvider || null,
      analyzerModel: log?.analyzerModel || null,
      errorMessage: null,
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt?.toISOString() || null,
      briefingData: record.briefingData,
    },
  });
});

// ══════════════════════════════════════════════════════════════
// ── 充值订单管理 (管理员审核) ──
// ══════════════════════════════════════════════════════════════

// ── 获取充值订单列表 ──
adminRoutes.get('/recharges', async (c) => {
  const status = c.req.query('status') || undefined; // PENDING / COMPLETED / FAILED
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 50));
  const where: any = {};
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    db.rechargeRecord.count({ where }),
    db.rechargeRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, email: true, nickname: true } } },
    }),
  ]);

  return c.json<ApiResponse>({
    success: true,
    data: {
      data: records.map(r => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user.email,
        userNickname: r.user.nickname,
        amount: Number(r.amount) / 100,
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

// ── 管理员确认充值到账 + 自动兑换Token ──
adminRoutes.post('/recharges/:id/approve', async (c) => {
  const rechargeId = Number(c.req.param('id'));
  const body = await c.req.json<{ txRef?: string }>().catch(() => ({}));

  const record = await db.rechargeRecord.findFirst({
    where: { id: rechargeId, status: 'PENDING' },
  });
  if (!record) {
    return c.json<ApiResponse>({ success: false, error: '订单不存在或已处理' }, 404);
  }

  const usdtAmount = Number(record.amount) / 100;

  // 读取动态汇率
  const rateSetting = await db.adminSetting.findUnique({ where: { key: 'token_to_cny_rate' } });
  const dynamicRate = Number(rateSetting?.value ?? 10);
  const tokensToGrant = Math.floor(usdtAmount * dynamicRate);

  if (tokensToGrant <= 0) {
    return c.json<ApiResponse>({ success: false, error: '充值金额过小，无法兑换' }, 400);
  }

  // 事务: 确认到账 + 标记已兑换 + 增加余额 + 写流水
  const result = await db.$transaction(async (tx) => {
    await tx.rechargeRecord.update({
      where: { id: rechargeId },
      data: {
        status: 'COMPLETED',
        txRef: (body as any)?.txRef || `admin_approve_${Date.now()}`,
        note: `${record.note || ''} | 管理员已审核 | 已兑换 ${tokensToGrant} Token`,
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
        description: `管理员审核通过: ${usdtAmount} USDT → ${tokensToGrant} Token (费率: 1:${dynamicRate})`,
      },
    });

    return { tokensGranted: tokensToGrant, newBalance: Number(user.tokenBalance) };
  });

  return c.json<ApiResponse>({
    success: true,
    data: result,
    message: `已确认并兑换 ${result.tokensGranted} Token 给用户`,
  });
});

// ── 管理员拒绝充值订单 ──
adminRoutes.post('/recharges/:id/reject', async (c) => {
  const rechargeId = Number(c.req.param('id'));
  const body = await c.req.json<{ reason?: string }>().catch(() => ({}));

  const record = await db.rechargeRecord.findFirst({
    where: { id: rechargeId, status: 'PENDING' },
  });
  if (!record) {
    return c.json<ApiResponse>({ success: false, error: '订单不存在或已处理' }, 404);
  }

  await db.rechargeRecord.update({
    where: { id: rechargeId },
    data: {
      status: 'FAILED',
      note: `${record.note || ''} | 管理员拒绝: ${(body as any)?.reason || '未通过审核'}`,
    },
  });

  // 解锁关联的收款地址
  try {
    await db.paymentAddress.updateMany({
      where: { lockedOrderId: rechargeId },
      data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
    });
  } catch {}

  return c.json<ApiResponse>({ success: true, message: '已拒绝该充值订单' });
});

// ══════════════════════════════════════════════════════════════
// ── 收款地址管理 ──
// ══════════════════════════════════════════════════════════════

// 自动解锁过期地址的辅助函数
async function unlockExpiredAddresses() {
  await db.paymentAddress.updateMany({
    where: { status: 'LOCKED', lockExpiresAt: { lt: new Date() } },
    data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
  });
}

// ── 获取收款地址列表 ──
adminRoutes.get('/payment-addresses', async (c) => {
  try {
    await unlockExpiredAddresses();
    const network = c.req.query('network') as 'TRC20' | 'ERC20' | undefined;
    const where = network ? { network } : {};
    const addresses = await db.paymentAddress.findMany({
      where,
      orderBy: [{ network: 'asc' }, { id: 'asc' }],
    });
    const stats = {
      trc20Total: await db.paymentAddress.count({ where: { network: 'TRC20' } }),
      trc20Idle: await db.paymentAddress.count({ where: { network: 'TRC20', status: 'IDLE' } }),
      trc20Locked: await db.paymentAddress.count({ where: { network: 'TRC20', status: 'LOCKED' } }),
      erc20Total: await db.paymentAddress.count({ where: { network: 'ERC20' } }),
      erc20Idle: await db.paymentAddress.count({ where: { network: 'ERC20', status: 'IDLE' } }),
      erc20Locked: await db.paymentAddress.count({ where: { network: 'ERC20', status: 'LOCKED' } }),
    };
    return c.json<ApiResponse>({ success: true, data: { addresses, stats } });
  } catch (e: any) {
    console.error('payment-addresses error:', e.message);
    return c.json<ApiResponse>({ success: true, data: { addresses: [], stats: { trc20Total: 0, trc20Idle: 0, trc20Locked: 0, erc20Total: 0, erc20Idle: 0, erc20Locked: 0 } } });
  }
});

// ── 批量导入地址 ──
adminRoutes.post('/payment-addresses/import', async (c) => {
  const body = await c.req.json<{ network: 'TRC20' | 'ERC20'; addresses: string[] }>();
  const { network, addresses } = body;
  if (!network || !addresses?.length) {
    return c.json<ApiResponse>({ success: false, error: '缺少 network 或 addresses' }, 400);
  }
  const cleaned = [...new Set(addresses.map(a => a.trim()).filter(a => a.length > 10))];
  if (cleaned.length === 0) {
    return c.json<ApiResponse>({ success: false, error: '没有有效地址' }, 400);
  }
  let imported = 0;
  let skipped = 0;
  for (const addr of cleaned) {
    try {
      await db.paymentAddress.create({ data: { address: addr, network } });
      imported++;
    } catch {
      skipped++; // unique constraint violation → already exists
    }
  }
  return c.json<ApiResponse>({ success: true, data: { imported, skipped, total: cleaned.length } });
});

// ── 更新单个地址 ──
adminRoutes.put('/payment-addresses/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{ address?: string; network?: 'TRC20' | 'ERC20' }>();
  const data: any = {};
  if (body.address) data.address = body.address.trim();
  if (body.network) data.network = body.network;
  try {
    const updated = await db.paymentAddress.update({ where: { id }, data });
    return c.json<ApiResponse>({ success: true, data: updated });
  } catch (e: any) {
    return c.json<ApiResponse>({ success: false, error: e.message?.includes('Unique') ? '地址已存在' : '更新失败' }, 400);
  }
});

// ── 删除地址 ──
adminRoutes.delete('/payment-addresses/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.paymentAddress.delete({ where: { id } }).catch(() => {});
  return c.json<ApiResponse>({ success: true });
});

// ── 批量删除 ──
adminRoutes.post('/payment-addresses/delete-batch', async (c) => {
  const body = await c.req.json<{ ids: number[] }>();
  if (!body.ids?.length) return c.json<ApiResponse>({ success: false, error: '缺少 ids' }, 400);
  await db.paymentAddress.deleteMany({ where: { id: { in: body.ids } } });
  return c.json<ApiResponse>({ success: true });
});

// ── 手动解锁地址 ──
adminRoutes.post('/payment-addresses/:id/unlock', async (c) => {
  const id = Number(c.req.param('id'));
  await db.paymentAddress.update({
    where: { id },
    data: { status: 'IDLE', lockedByUser: null, lockedOrderId: null, lockExpiresAt: null },
  });
  return c.json<ApiResponse>({ success: true });
});
