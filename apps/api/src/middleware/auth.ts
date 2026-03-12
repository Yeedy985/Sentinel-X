/**
 * JWT 认证中间件 + API Token 认证中间件
 */
import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { db } from '@sentinel/db';
import { getJwtSecret, hashApiToken } from '../lib/crypto';

// JWT payload 类型
export interface JwtPayload {
  userId: number;
  email: string;
}

// 扩展 Hono Context 变量
declare module 'hono' {
  interface ContextVariableMap {
    userId: number;
    email: string;
    isAdmin: boolean;
  }
}

/**
 * 用户 JWT 认证中间件
 * Header: Authorization: Bearer <jwt>
 */
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未提供认证凭据' }, 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status !== 'ACTIVE') {
      return c.json({ success: false, error: '账号不存在或已被禁用' }, 403);
    }
    c.set('userId', payload.userId);
    c.set('email', payload.email);
    c.set('isAdmin', false);
    await next();
  } catch {
    return c.json({ success: false, error: '认证令牌无效或已过期' }, 401);
  }
}

/**
 * API Token 认证中间件 (客户端扫描请求用)
 * Header: Authorization: Bearer stx_xxxxx
 */
export async function requireApiToken(c: Context, next: Next) {
  // 支持 Authorization header 或 query param ?token= (SSE EventSource 不支持自定义 header)
  const header = c.req.header('Authorization');
  const queryToken = c.req.query('token');
  const rawToken = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;
  if (!rawToken) {
    return c.json({ success: false, error: '未提供认证凭据' }, 401);
  }

  // 判断是 API Token (stx_ 前缀) 还是 JWT
  if (rawToken.startsWith('stx_')) {
    const tokenHash = hashApiToken(rawToken);
    const apiToken = await db.apiToken.findFirst({
      where: { tokenHash, isRevoked: false },
      include: { user: true },
    });
    if (!apiToken || !apiToken.user || apiToken.user.status !== 'ACTIVE') {
      return c.json({ success: false, error: 'API 令牌无效或已吊销' }, 401);
    }
    // 更新最后使用时间
    await db.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });
    c.set('userId', apiToken.userId);
    c.set('email', apiToken.user.email);
    c.set('isAdmin', false);
    await next();
  } else {
    // 尝试 JWT 认证
    try {
      const payload = jwt.verify(rawToken, getJwtSecret()) as JwtPayload;
      const user = await db.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.status !== 'ACTIVE') {
        return c.json({ success: false, error: '账号不存在或已被禁用' }, 403);
      }
      c.set('userId', payload.userId);
      c.set('email', payload.email);
      c.set('isAdmin', false);
      await next();
    } catch {
      return c.json({ success: false, error: '认证令牌无效或已过期' }, 401);
    }
  }
}

/**
 * 管理员 JWT 认证中间件
 * Header: Authorization: Bearer <admin-jwt>
 */
export async function requireAdmin(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未提供认证凭据' }, 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload & { isAdmin?: boolean };
    if (!payload.isAdmin) {
      return c.json({ success: false, error: '需要管理员权限' }, 403);
    }
    c.set('userId', payload.userId);
    c.set('email', payload.email);
    c.set('isAdmin', true);
    await next();
  } catch {
    return c.json({ success: false, error: '管理员令牌无效或已过期' }, 401);
  }
}

/**
 * 生成 JWT Token
 */
export function signJwt(payload: JwtPayload & { isAdmin?: boolean }): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}
