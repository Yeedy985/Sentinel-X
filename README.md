# AlphaSentinel 公共扫描服务

基于 300 信号矩阵的 AI 驱动加密市场舆情监控与预警系统。

## 架构

```
sentinel-service/
├── packages/
│   ├── db/          — Prisma ORM + PostgreSQL schema + seed
│   └── shared/      — 共享 TypeScript 类型 + 常量
├── apps/
│   ├── api/         — Hono 后端 API (端口 3001)
│   └── web/         — Next.js 公共服务主页 (端口 3000)
├── nginx/           — Nginx 反向代理配置
├── docker-compose.yml
├── turbo.json       — Turborepo 任务编排
└── pnpm-workspace.yaml
```

## 技术栈

- **Monorepo**: pnpm workspace + Turborepo
- **后端**: Hono (Node.js) + Prisma + PostgreSQL + Redis + BullMQ
- **前端**: Next.js 15 + React 19 + TailwindCSS v4 + Lucide Icons
- **部署**: Docker Compose + Nginx

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础设施

```bash
docker compose up -d postgres redis
```

### 3. 初始化数据库

```bash
cp .env.example .env
# 编辑 .env 填入你的配置
pnpm --filter @sentinel/db db:push
pnpm --filter @sentinel/db db:seed
```

### 4. 启动开发服务

```bash
pnpm dev
```

### 5. 生产部署

```bash
docker compose up -d
```

## API 端点

### 认证
- `POST /api/auth/register` — 注册 (赠送 5 Token)
- `POST /api/auth/login` — 登录

### 用户 (需 JWT)
- `GET /api/user/profile` — 用户信息
- `POST /api/user/tokens` — 创建 API 令牌
- `GET /api/user/tokens` — 令牌列表
- `DELETE /api/user/tokens/:id` — 吊销令牌
- `GET /api/user/transactions` — Token 流水
- `GET /api/user/scans` — 扫描记录

### 扫描 (需 API Token)
- `POST /api/scan/request` — 请求扫描
- `GET /api/scan/briefings` — 获取简报
- `GET /api/scan/stream` — SSE 实时推送
- `GET /api/scan/status` — 服务状态

### 管理 (需管理员 JWT)
- `POST /api/admin/login` — 管理员登录
- `GET /api/admin/dashboard` — 运营仪表盘
- `GET /api/admin/users` — 用户管理
- `GET /api/admin/settings` — 系统配置
- `GET /api/admin/pipelines` — LLM 管线配置
- `GET /api/admin/costs` — 成本配置
- `GET /api/admin/finance` — 财务报表

## 计费模式

| 类型 | 消耗 | 说明 |
|------|------|------|
| 基础扫描 | 1 Token | 300 信号矩阵分析 |
| 搜索增强扫描 | 2 Token | 含 Perplexity 实时搜索 |

- 5 分钟内重复请求命中缓存，不消耗额外 LLM 成本
- Token 预扣机制：请求时预扣，失败退回

## 环境变量

参考 `.env.example` 配置。
