/**
 * Auth Routes — 注册 / 登录
 * POST /api/auth/register
 * POST /api/auth/login
 */
import { Hono } from 'hono';
import { db } from '@sentinel/db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { signJwt } from '../middleware/auth';
import type { RegisterRequest, LoginRequest, AuthResponse, ApiResponse } from '@sentinel/shared';

export const authRoutes = new Hono();

// ── 注册 ──
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>();
  const { email, password, nickname } = body;

  if (!email?.trim() || !password?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '邮箱和密码为必填项' }, 400);
  }
  if (password.length < 6) {
    return c.json<ApiResponse>({ success: false, error: '密码长度至少6位' }, 400);
  }

  // 检查注册是否开启
  const regSetting = await db.adminSetting.findUnique({ where: { key: 'registration_enabled' } });
  if (regSetting && regSetting.value === false) {
    return c.json<ApiResponse>({ success: false, error: '注册已关闭' }, 403);
  }

  // 检查邮箱是否已注册
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return c.json<ApiResponse>({ success: false, error: '该邮箱已注册' }, 409);
  }

  // 获取新用户奖励 Token
  const bonusSetting = await db.adminSetting.findUnique({ where: { key: 'new_user_bonus_tokens' } });
  const bonusTokens = (bonusSetting?.value as number) ?? 5;

  // 创建用户
  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      nickname: nickname?.trim() || null,
      tokenBalance: BigInt(bonusTokens),
    },
  });

  // 记录注册赠送的 Token 流水
  if (bonusTokens > 0) {
    await db.tokenTransaction.create({
      data: {
        userId: user.id,
        type: 'RECHARGE',
        amount: BigInt(bonusTokens),
        balanceAfter: BigInt(bonusTokens),
        description: '注册赠送',
      },
    });
  }

  const token = signJwt({ userId: user.id, email: user.email });

  return c.json<ApiResponse<AuthResponse>>({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        tokenBalance: Number(user.tokenBalance),
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    },
  }, 201);
});

// ── 登录 ──
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>();
  const { email, password } = body;

  if (!email?.trim() || !password?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '邮箱和密码为必填项' }, 400);
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '邮箱或密码错误' }, 401);
  }
  if (user.status !== 'ACTIVE') {
    return c.json<ApiResponse>({ success: false, error: '账号已被禁用' }, 403);
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return c.json<ApiResponse>({ success: false, error: '邮箱或密码错误' }, 401);
  }

  const token = signJwt({ userId: user.id, email: user.email });

  return c.json<ApiResponse<AuthResponse>>({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        tokenBalance: Number(user.tokenBalance),
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    },
  });
});
