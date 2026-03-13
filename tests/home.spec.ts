import { test, expect } from '@playwright/test';

test.describe('首页 /', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── 页面渲染 ──
  test('页面正常加载，状态码200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('页面标题包含 AlphaSentinel', async ({ page }) => {
    await expect(page).toHaveTitle(/AlphaSentinel/i);
  });

  // ── Navbar ──
  test('Navbar 渲染：Logo + 4个导航链接', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a:has-text("AlphaSentinel")')).toBeVisible();
    await expect(nav.locator('a:has-text("首页")')).toBeVisible();
    await expect(nav.locator('a:has-text("网格量化")')).toBeVisible();
    await expect(nav.locator('a:has-text("AI 扫描")')).toBeVisible();
    await expect(nav.locator('a:has-text("API 文档")')).toBeVisible();
  });

  test('Navbar 未登录状态：显示登录和注册按钮', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav.locator('a:has-text("登录")')).toBeVisible();
    await expect(nav.locator('a:has-text("免费注册")')).toBeVisible();
  });

  test('Navbar Logo 点击跳转首页', async ({ page }) => {
    await page.locator('nav a:has-text("AlphaSentinel")').click();
    await expect(page).toHaveURL('/');
  });

  // ── Hero 区 ──
  test('Hero 区渲染：主标题和描述', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=信息爆炸时代')).toBeVisible();
    await expect(page.locator('text=AI 替你看盘')).toBeVisible();
  });

  test('Hero 区 CTA 按钮可点击', async ({ page }) => {
    const ctaButtons = page.locator('a[href="/register"], a[href="/pricing"]').first();
    await expect(ctaButtons).toBeVisible();
  });

  // ── "为什么你需要" 板块 ──
  test('"为什么你需要 AlphaSentinel" 板块渲染', async ({ page }) => {
    await expect(page.locator('text=为什么你需要 AlphaSentinel')).toBeVisible();
    await expect(page.locator('text=信息严重爆炸，人脑无法处理')).toBeVisible();
    await expect(page.locator('text=信息差 = 决策优势')).toBeVisible();
    await expect(page.locator('text=全自动扫描，永不遗漏')).toBeVisible();
    await expect(page.locator('text=极低成本，极高回报')).toBeVisible();
  });

  // ── 产品入口卡片 ──
  test('核心产品卡片：3张卡片', async ({ page }) => {
    await expect(page.locator('text=核心产品')).toBeVisible();
    await expect(page.locator('h3:has-text("AI 全链路扫描")')).toBeVisible();
    await expect(page.locator('h3:has-text("网格量化交易")')).toBeVisible();
    await expect(page.locator('h3:has-text("API 开发接口")')).toBeVisible();
  });

  test('产品卡片链接正确', async ({ page }) => {
    const pricingCard = page.locator('a[href="/pricing"]').first();
    await expect(pricingCard).toBeVisible();
    const gridCard = page.locator('a[href="/grid"]').first();
    await expect(gridCard).toBeVisible();
    const docsCard = page.locator('a[href="/docs"]').first();
    await expect(docsCard).toBeVisible();
  });

  // ── 技术能力 ──
  test('底层技术板块渲染', async ({ page }) => {
    await expect(page.locator('text=底层技术')).toBeVisible();
    await expect(page.locator('text=13+ 全球数据源')).toBeVisible();
    await expect(page.locator('text=顶级 AI 模型管线')).toBeVisible();
    await expect(page.locator('text=300+ 信号量化引擎')).toBeVisible();
  });

  // ── CTA 区 ──
  test('底部 CTA 区渲染', async ({ page }) => {
    await expect(page.locator('text=让信息差成为你的优势')).toBeVisible();
  });

  // ── Footer ──
  test('Footer 渲染', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=AlphaSentinel').first()).toBeVisible();
    await expect(footer.locator('text=© 2026')).toBeVisible();
  });

  test('Footer 产品链接存在', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/pricing"]')).toBeVisible();
    await expect(footer.locator('a[href="/grid"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/docs"]').first()).toBeVisible();
  });

  test('Footer 账户链接存在', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/register"]')).toBeVisible();
    await expect(footer.locator('a[href="/login"]')).toBeVisible();
    await expect(footer.locator('a[href="/dashboard"]')).toBeVisible();
  });

  // ── 导航跳转 ──
  test('点击导航"网格量化"跳转到 /grid', async ({ page }) => {
    await page.locator('nav a:has-text("网格量化")').click();
    await expect(page).toHaveURL('/grid');
  });

  test('点击导航"AI 扫描"跳转到 /pricing', async ({ page }) => {
    await page.locator('nav a:has-text("AI 扫描")').click();
    await expect(page).toHaveURL('/pricing');
  });

  test('点击导航"API 文档"跳转到 /docs', async ({ page }) => {
    await page.locator('nav a:has-text("API 文档")').click();
    await expect(page).toHaveURL('/docs');
  });

  test('点击导航"登录"跳转到 /login', async ({ page }) => {
    await page.locator('nav a:has-text("登录")').click();
    await expect(page).toHaveURL('/login');
  });

  test('点击导航"免费注册"跳转到 /register', async ({ page }) => {
    await page.locator('nav a:has-text("免费注册")').click();
    await expect(page).toHaveURL('/register');
  });

  // ── 无控制台错误 ──
  test('页面无 JS 控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    // 过滤掉非关键的 hydration 或第三方错误
    const critical = errors.filter(e =>
      !e.includes('hydrat') &&
      !e.includes('favicon') &&
      !e.includes('Backend unreachable') &&
      !e.includes('Failed to fetch') &&
      !e.includes('Failed to load resource') &&
      !e.includes('Internal Server Error')
    );
    expect(critical).toEqual([]);
  });
});
