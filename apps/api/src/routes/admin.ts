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

  // 今日统计
  const todayScans = await db.scanRecord.findMany({
    where: { startedAt: { gte: todayStart }, status: 'COMPLETED' },
  });
  const todayRealScans = todayScans.filter(s => !s.isCached).length;
  const todayCachedScans = todayScans.filter(s => s.isCached).length;
  const todayRevenue = todayScans.reduce((s, r) => s + Number(r.revenueUsd), 0);
  const todayCost = todayScans.reduce((s, r) => s + Number(r.realCostUsd), 0);
  const todayProfit = todayRevenue - todayCost;

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
  const monthScans = await db.scanRecord.count({
    where: { startedAt: { gte: monthStart }, status: 'COMPLETED' },
  });
  const monthFinance = await db.scanRecord.aggregate({
    where: { startedAt: { gte: monthStart }, status: 'COMPLETED' },
    _sum: { revenueUsd: true, realCostUsd: true, profitUsd: true },
  });
  const monthNewUsers = await db.user.count({
    where: { createdAt: { gte: monthStart } },
  });
  const monthRecharge = await db.rechargeRecord.aggregate({
    where: { createdAt: { gte: monthStart }, status: 'COMPLETED' },
    _sum: { amount: true },
  });

  return c.json<ApiResponse<AdminDashboardStats>>({
    success: true,
    data: {
      today: {
        totalScans: todayScans.length,
        realScans: todayRealScans,
        cachedScans: todayCachedScans,
        cacheHitRate: todayScans.length > 0 ? todayCachedScans / todayScans.length : 0,
        revenue: todayRevenue,
        cost: todayCost,
        profit: todayProfit,
        profitRate: todayRevenue > 0 ? todayProfit / todayRevenue : 0,
        activeUsers: todayActiveUsers.length,
        newUsers: todayNewUsers,
        rechargeTotal: Number(todayRecharge._sum.amount ?? 0),
      },
      thisMonth: {
        totalScans: monthScans,
        revenue: Number(monthFinance._sum.revenueUsd ?? 0),
        cost: Number(monthFinance._sum.realCostUsd ?? 0),
        profit: Number(monthFinance._sum.profitUsd ?? 0),
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

// ── 系统扫描记录 (所有扫描: 管理员触发 + 用户API调用) ──
adminRoutes.get('/system-scans', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const [total, records] = await Promise.all([
    db.scanRecord.count(),
    db.scanRecord.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { email: true, nickname: true } },
      },
    }),
  ]);

  // 批量查询关联的 SystemScanLog (管理员扫描 + 用户扫描都有)
  const allBriefingIds = records.map((r: any) => r.briefingId);
  const sysLogs = allBriefingIds.length > 0
    ? await db.systemScanLog.findMany({ where: { briefingId: { in: allBriefingIds } } })
    : [];
  const sysLogMap = new Map(sysLogs.map(l => [l.briefingId, l]));

  return c.json<ApiResponse>({
    success: true,
    data: {
      data: records.map((r: any) => {
        const sl = sysLogMap.get(r.briefingId);
        return {
          id: r.id,
          briefingId: r.briefingId,
          status: r.status,
          enableSearch: r.enableSearch,
          isCached: r.isCached,
          signalCount: r.signalCount,
          alertCount: r.alertCount,
          tokenCostSearch: sl?.tokenCostSearch ?? 0,
          tokenCostAnalyze: sl?.tokenCostAnalyze ?? 0,
          tokenCostTotal: sl?.tokenCostTotal ?? r.tokenCost,
          realCostUsd: sl ? Number(sl.realCostUsd) : Number(r.realCostUsd),
          searcherProvider: sl?.searcherProvider || null,
          searcherModel: sl?.searcherModel || null,
          analyzerProvider: sl?.analyzerProvider || null,
          analyzerModel: sl?.analyzerModel || null,
          errorMessage: r.errorMessage,
          briefingData: r.briefingData || null,
          userEmail: r.user?.email,
          userNickname: r.user?.nickname,
          startedAt: r.startedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() || null,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ── 用户调用记录 (用户通过公共服务调用的扫描) ──
adminRoutes.get('/call-logs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));

  const [total, records] = await Promise.all([
    db.scanRecord.count(),
    db.scanRecord.findMany({
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

