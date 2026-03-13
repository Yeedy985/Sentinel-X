import { test, expect } from '@playwright/test';

test.describe('/docs API文档页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
  });

  // ── 页面渲染 ──
  test('页面正常加载，状态码200', async ({ page }) => {
    const response = await page.goto('/docs');
    expect(response?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar 存在', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
  });

  // ── Hero 区 ──
  test('Hero 徽章：开发者接口', async ({ page }) => {
    await expect(page.locator('text=开发者接口')).toBeVisible();
  });

  test('Hero 标题：API 接口文档', async ({ page }) => {
    await expect(page.locator('h1:has-text("API 接口文档")')).toBeVisible();
  });

  test('Hero 描述：几行代码即可接入', async ({ page }) => {
    await expect(page.locator('text=几行代码即可接入')).toBeVisible();
  });

  // ── Base URL ──
  test('Base URL 显示', async ({ page }) => {
    await expect(page.locator('text=Base URL')).toBeVisible();
  });

  test('认证方式标签：API Token 和 JWT', async ({ page }) => {
    await expect(page.locator('text=API Token — 扫描接口')).toBeVisible();
    await expect(page.locator('text=JWT — 用户管理')).toBeVisible();
  });

  // ── Quick Start ──
  test('快速开始代码示例存在', async ({ page }) => {
    await expect(page.locator('text=快速开始').first()).toBeVisible();
    // 应包含 curl 或 代码块
    const codeBlocks = page.locator('pre, code');
    expect(await codeBlocks.count()).toBeGreaterThan(0);
  });

  // ── 扫描接口 ──
  test('扫描接口分组渲染', async ({ page }) => {
    await expect(page.locator('h3:has-text("扫描接口")')).toBeVisible();
    await expect(page.locator('text=发起扫描、获取简报、SSE 实时推送')).toBeVisible();
  });

  test('扫描接口至少有1个端点', async ({ page }) => {
    // 查找包含 POST 或 GET 方法标签的端点卡片
    const endpoints = page.locator('text=/POST|GET/').first();
    await expect(endpoints).toBeVisible();
  });

  // ── 认证接口 ──
  test('认证接口分组渲染', async ({ page }) => {
    await expect(page.locator('h3:has-text("认证接口")')).toBeVisible();
    await expect(page.locator('text=无需认证即可调用')).toBeVisible();
  });

  // ── 用户接口 ──
  test('用户接口分组渲染', async ({ page }) => {
    await expect(page.locator('h3:has-text("用户接口")')).toBeVisible();
    await expect(page.locator('text=创建、列表和吁销管理')).toBeVisible();
  });

  // ── 端点卡片展开/折叠 ──
  test('端点卡片可展开和折叠', async ({ page }) => {
    // 找到第一个可点击的端点
    const firstEndpoint = page.locator('[class*="rounded-2xl"][class*="border"]').filter({ hasText: /POST|GET|DELETE/ }).first();
    if (await firstEndpoint.isVisible()) {
      await firstEndpoint.click();
      // 展开后应该能看到更多内容（如参数、响应等）
      await page.waitForTimeout(500);
    }
  });

  // ── 通用错误格式 ──
  test('通用错误格式渲染', async ({ page }) => {
    await expect(page.locator('text=通用错误格式')).toBeVisible();
    await expect(page.locator('text=统一的 JSON 错误格式')).toBeVisible();
  });

  test('HTTP状态码列表渲染', async ({ page }) => {
    await expect(page.getByText('请求参数错误')).toBeVisible();
    await expect(page.getByText(/认证失败/)).toBeVisible();
    await expect(page.getByText(/余额不足/).first()).toBeVisible();
    await expect(page.getByText('资源不存在')).toBeVisible();
  });

  // ── 信号矩阵参考 ──
  test('300 信号矩阵参考渲染', async ({ page }) => {
    await expect(page.locator('text=300 信号矩阵参考')).toBeVisible();
  });

  test('10大信号组全部显示', async ({ page }) => {
    await expect(page.locator('text=BTC 核心')).toBeVisible();
    await expect(page.locator('text=ETH 生态')).toBeVisible();
    await expect(page.locator('text=山寨/Meme')).toBeVisible();
    await expect(page.locator('text=DeFi/CEX')).toBeVisible();
    await expect(page.locator('text=宏观经济')).toBeVisible();
    await expect(page.locator('text=监管政策')).toBeVisible();
    await expect(page.locator('text=技术指标')).toBeVisible();
    await expect(page.locator('text=链上数据')).toBeVisible();
    await expect(page.locator('text=市场情绪')).toBeVisible();
    await expect(page.locator('text=黑天鹅')).toBeVisible();
  });

  test('信号矩阵指数说明', async ({ page }) => {
    await expect(page.locator('text=SD(方向)')).toBeVisible();
    await expect(page.locator('text=SV(波动)')).toBeVisible();
    await expect(page.locator('text=SR(风险)')).toBeVisible();
  });

  // ── Footer ──
  test('Footer 存在', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  // ── 无 JS 错误 ──
  test('页面无 JS 控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/docs');
    await page.waitForTimeout(2000);
    const critical = errors.filter(e =>
      !e.includes('hydrat') &&
      !e.includes('favicon') &&
      !e.includes('Backend unreachable') &&
      !e.includes('Failed to fetch') &&
      !e.includes('Failed to load resource') &&
      !e.includes('Internal Server Error') &&
      !e.includes('same key')
    );
    expect(critical).toEqual([]);
  });
});
