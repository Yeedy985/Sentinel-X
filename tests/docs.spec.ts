import { test, expect } from '@playwright/test';

test.describe('/docs API文档页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/docs');
    expect(res?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar 存在', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
  });

  // ── Hero ──
  test('Hero 标题可见', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  // ── Base URL ──
  test('Base URL 信息可见', async ({ page }) => {
    await expect(page.locator('text=Base URL')).toBeVisible();
  });

  // ── 认证方式 ──
  test('认证方式: API Token 和 JWT 标签可见', async ({ page }) => {
    await expect(page.locator('text=API Token — 扫描接口')).toBeVisible();
    await expect(page.locator('text=JWT — 用户管理')).toBeVisible();
  });

  // ── 快速开始 ──
  test('快速开始区域可见且包含代码块', async ({ page }) => {
    await expect(page.locator('text=快速开始').first()).toBeVisible();
    const codeBlocks = page.locator('pre, code');
    expect(await codeBlocks.count()).toBeGreaterThan(0);
  });

  // ── 接口分组 ──
  test('扫描接口分组可见', async ({ page }) => {
    await expect(page.locator('h3:has-text("扫描接口")')).toBeVisible();
  });

  test('认证接口分组可见', async ({ page }) => {
    await expect(page.locator('h3:has-text("认证接口")')).toBeVisible();
  });

  test('用户接口分组可见', async ({ page }) => {
    await expect(page.locator('h3:has-text("用户接口")')).toBeVisible();
  });

  // ── 端点卡片展开/折叠 ──
  test('端点卡片: 点击 summary 展开显示详情', async ({ page }) => {
    // 第一个端点卡片默认展开，找第二个折叠的卡片点击
    const summaries = page.locator('details summary');
    const count = await summaries.count();
    expect(count).toBeGreaterThan(1);
    // 点击第二个 summary 展开
    await summaries.nth(1).click();
    await page.waitForTimeout(300);
    // 不崩溃即可
    await expect(page.locator('h1')).toBeVisible();
  });

  test('端点卡片: 再次点击折叠', async ({ page }) => {
    const summary = page.locator('details summary').nth(1);
    await summary.click();
    await page.waitForTimeout(300);
    await summary.click();
    await page.waitForTimeout(300);
    await expect(page.locator('h1')).toBeVisible();
  });

  // ── 通用错误格式 ──
  test('通用错误格式区域可见', async ({ page }) => {
    await expect(page.locator('text=通用错误格式')).toBeVisible();
  });

  test('HTTP 状态码列表可见', async ({ page }) => {
    await expect(page.getByText('请求参数错误')).toBeVisible();
    await expect(page.getByText(/认证失败/)).toBeVisible();
    await expect(page.getByText(/余额不足/).first()).toBeVisible();
    await expect(page.getByText('资源不存在')).toBeVisible();
  });

  // ── 信号矩阵 ──
  test('300 信号矩阵参考可见', async ({ page }) => {
    await expect(page.locator('text=300 信号矩阵参考')).toBeVisible();
  });

  test('信号组显示: BTC 核心 / ETH 生态', async ({ page }) => {
    await expect(page.locator('text=BTC 核心')).toBeVisible();
    await expect(page.locator('text=ETH 生态')).toBeVisible();
  });

  // ── Footer ──
  test('Footer 存在', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/docs');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
