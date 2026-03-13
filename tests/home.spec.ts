import { test, expect } from '@playwright/test';

test.describe('首页 /', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar: Logo 可见且链接到首页', async ({ page }) => {
    const logo = page.locator('nav a[href="/"]').first();
    await expect(logo).toBeVisible();
  });

  test('Navbar: 4个导航链接全部可见', async ({ page }) => {
    await expect(page.locator('nav a:has-text("首页")')).toBeVisible();
    await expect(page.locator('nav a:has-text("网格量化")')).toBeVisible();
    await expect(page.locator('nav a:has-text("AI 扫描")')).toBeVisible();
    await expect(page.locator('nav a:has-text("API 文档")')).toBeVisible();
  });

  test('Navbar: 登录/注册按钮可见', async ({ page }) => {
    await expect(page.locator('nav a[href="/login"]')).toBeVisible();
    await expect(page.locator('nav a[href="/register"]')).toBeVisible();
  });

  test('Navbar: 点击"网格量化"跳转到 /grid', async ({ page }) => {
    await page.locator('nav a:has-text("网格量化")').click();
    await expect(page).toHaveURL('/grid');
  });

  test('Navbar: 点击"AI 扫描"跳转到 /pricing', async ({ page }) => {
    await page.locator('nav a:has-text("AI 扫描")').click();
    await expect(page).toHaveURL('/pricing');
  });

  test('Navbar: 点击"API 文档"跳转到 /docs', async ({ page }) => {
    await page.locator('nav a:has-text("API 文档")').click();
    await expect(page).toHaveURL('/docs');
  });

  test('Navbar: 点击"登录"跳转到 /login', async ({ page }) => {
    await page.locator('nav a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('Navbar: 点击"免费注册"跳转到 /register', async ({ page }) => {
    await page.locator('nav a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  // ── Hero 区 ──
  test('Hero: 大标题可见', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Hero: 副标题描述可见', async ({ page }) => {
    await expect(page.getByText(/顶级 AI 模型帮你检索/)).toBeVisible();
  });

  test('Hero: CTA 按钮可见', async ({ page }) => {
    const ctaRegister = page.locator('a[href="/register"]').first();
    await expect(ctaRegister).toBeVisible();
  });

  test('Hero: CTA 点击跳转到注册页', async ({ page }) => {
    await page.locator('a[href="/register"]').first().click();
    await expect(page).toHaveURL('/register');
  });

  // ── "为什么你需要" 板块 ──
  test('"为什么你需要 AlphaSentinel" 标题可见', async ({ page }) => {
    await expect(page.locator('text=为什么你需要 AlphaSentinel')).toBeVisible();
  });

  // ── 核心产品卡片 ──
  test('核心产品: 3张卡片标题全部可见', async ({ page }) => {
    await expect(page.locator('h3:has-text("AI 全链路扫描")')).toBeVisible();
    await expect(page.locator('h3:has-text("网格量化交易")')).toBeVisible();
    await expect(page.locator('h3:has-text("API 开发接口")')).toBeVisible();
  });

  test('核心产品: AI扫描卡片点击跳转 /pricing', async ({ page }) => {
    await page.locator('a[href="/pricing"]').first().click();
    await expect(page).toHaveURL('/pricing');
  });

  test('核心产品: 网格量化卡片点击跳转 /grid', async ({ page }) => {
    await page.locator('a[href="/grid"]').first().click();
    await expect(page).toHaveURL('/grid');
  });

  test('核心产品: API接口卡片点击跳转 /docs', async ({ page }) => {
    await page.locator('a[href="/docs"]').first().click();
    await expect(page).toHaveURL('/docs');
  });

  // ── 底部 CTA ──
  test('底部 CTA: "让信息差成为你的优势" 可见', async ({ page }) => {
    await expect(page.locator('text=让信息差成为你的优势')).toBeVisible();
  });

  // ── Footer ──
  test('Footer: 存在且包含版权信息', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=© 2026')).toBeVisible();
  });

  test('Footer: 产品链接可见且可点击', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/pricing"]')).toBeVisible();
    await expect(footer.locator('a[href="/grid"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/docs"]').first()).toBeVisible();
  });

  test('Footer: 账户链接可见', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/register"]')).toBeVisible();
    await expect(footer.locator('a[href="/login"]')).toBeVisible();
    await expect(footer.locator('a[href="/dashboard"]')).toBeVisible();
  });

  test('Footer: 点击"注册账户"跳转 /register', async ({ page }) => {
    await page.locator('footer a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
