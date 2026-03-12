/**
 * Sentinel-X API Server
 * Hono + Node.js HTTP server
 */
// 加载 .env 环境变量 (Node 20.6+)
import { resolve } from 'node:path';
try { process.loadEnvFile(resolve(import.meta.dirname, '..', '..', '..', '.env')); } catch {}

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { scanRoutes } from './routes/scan';
import { adminRoutes } from './routes/admin';
import { SERVICE_VERSION } from '@sentinel/shared';
import { startScanWorker } from './worker/scanWorker';
import { startRechargeScanner } from './worker/rechargeScanner';

const app = new Hono();

// ── 全局中间件 ──
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      process.env.WEB_URL || 'http://localhost:3003',
      process.env.ADMIN_URL || 'http://localhost:3002',
      process.env.AAGS_URL || 'http://localhost:5173',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── 健康检查 ──
app.get('/', (c) => c.json({
  service: 'Sentinel-X Public Scan Service',
  version: SERVICE_VERSION,
  status: 'ok',
}));

// ── 路由挂载 ──
app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/scan', scanRoutes);
app.route('/api/admin', adminRoutes);

// ── 启动 Worker ──
startScanWorker();
startRechargeScanner();

// ── 启动 HTTP ──
const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Sentinel-X API running at http://localhost:${port}`);
});

export default app;
