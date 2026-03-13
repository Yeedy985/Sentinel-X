import { test, expect } from '@playwright/test';

test.describe('/pricing AI扫描页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar 存在且导航链接完整', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav a:has-text("首页")')).toBeVisible();
    await expect(page.locator('nav a:has-text("AI 扫描")')).toBeVisible();
  });

  // ── Hero ──
  test('Hero 标题可见', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Hero 徽章: "AI 全链路扫描" 可见', async ({ page }) => {
    await expect(page.locator('text=AI 全链路扫描').first()).toBeVisible();
  });

  // ── 扫描特性 ──
  test('扫描特性: "300+ 信号维度全景扫描" 可见', async ({ page }) => {
    await expect(page.locator('text=300+ 信号维度全景扫描')).toBeVisible();
  });

  test('扫描特性: "扫描失败自动退费" 可见', async ({ page }) => {
    await expect(page.locator('text=扫描失败自动退费').first()).toBeVisible();
  });

  // ── 计费流程 ──
  test('计费流程: 4步全部可见', async ({ page }) => {
    await expect(page.locator('text=发起扫描').first()).toBeVisible();
    await expect(page.locator('text=AI 深度分析').first()).toBeVisible();
    await expect(page.locator('text=按量扣费')).toBeVisible();
    await expect(page.locator('text=收到简报')).toBeVisible();
  });

  // ── 核心能力 ──
  test('"为什么选择我们" 板块可见', async ({ page }) => {
    await expect(page.locator('text=为什么选择我们')).toBeVisible();
  });

  test('核心能力 6 项全部可见', async ({ page }) => {
    await expect(page.locator('text=300+ 信号维度').first()).toBeVisible();
    await expect(page.locator('text=顶级 AI 深度分析')).toBeVisible();
    await expect(page.locator('text=三大核心指数')).toBeVisible();
    await expect(page.locator('text=睡觉也不错过重大事件')).toBeVisible();
    await expect(page.locator('text=开放 API 接入')).toBeVisible();
    await expect(page.locator('text=成本极低，绝不多扣')).toBeVisible();
  });

  // ── 计费说明 ──
  test('计费说明板块可见', async ({ page }) => {
    await expect(page.locator('text=计费说明')).toBeVisible();
    await expect(page.locator('text=用多少付多少').first()).toBeVisible();
  });

  // ── CTA ──
  test('底部 CTA: 注册按钮可见', async ({ page }) => {
    const btn = page.locator('a[href="/register"]').last();
    await expect(btn).toBeVisible();
  });

  test('底部 CTA: 点击注册按钮跳转 /register', async ({ page }) => {
    await page.locator('a[href="/register"]').last().click();
    await expect(page).toHaveURL('/register');
  });

  // ── Footer ──
  test('Footer 存在', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/pricing');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
