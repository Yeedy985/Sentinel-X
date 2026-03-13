import { test, expect } from '@playwright/test';

test.describe('/grid 网格量化页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/grid');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/grid');
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

  test('Hero: "策略广场" 在标题中', async ({ page }) => {
    await expect(page.locator('h1 >> text=策略广场')).toBeVisible();
  });

  test('Hero: "AAGS 客户端" 在标题中', async ({ page }) => {
    await expect(page.locator('h1 >> text=AAGS 客户端')).toBeVisible();
  });

  test('Hero 副标题可见', async ({ page }) => {
    await expect(page.locator('text=看看别人怎么赚钱')).toBeVisible();
  });

  // ── 策略排行 ──
  test('实盘策略排行区域可见', async ({ page }) => {
    await expect(page.locator('text=实盘策略排行')).toBeVisible();
  });

  test('排序按钮: 收益最高/复制最多/最新 全部可见', async ({ page }) => {
    await expect(page.locator('button:has-text("收益最高")')).toBeVisible();
    await expect(page.locator('button:has-text("复制最多")')).toBeVisible();
    await expect(page.locator('button:has-text("最新")')).toBeVisible();
  });

  test('排序按钮: 点击"复制最多"按钮', async ({ page }) => {
    const btn = page.locator('button:has-text("复制最多")');
    await btn.click();
    await expect(btn).toBeVisible();
  });

  test('排序按钮: 点击"最新"按钮', async ({ page }) => {
    const btn = page.locator('button:has-text("最新")');
    await btn.click();
    await expect(btn).toBeVisible();
  });

  test('排序按钮: 点击"收益最高"按钮', async ({ page }) => {
    const btn = page.locator('button:has-text("收益最高")');
    await btn.click();
    await expect(btn).toBeVisible();
  });

  test('"所有数据由用户实盘实时上报" 可见', async ({ page }) => {
    await expect(page.locator('text=所有数据由用户实盘实时上报')).toBeVisible();
  });

  // ── AAGS 下载区 ──
  test('客户端下载区可见', async ({ page }) => {
    await expect(page.locator('text=客户端下载')).toBeVisible();
  });

  test('3个下载卡片: Windows/macOS/Android', async ({ page }) => {
    await expect(page.locator('text=Windows').first()).toBeVisible();
    await expect(page.locator('text=macOS').first()).toBeVisible();
    await expect(page.locator('text=Android').first()).toBeVisible();
  });

  test('下载按钮链接存在 (>=3个)', async ({ page }) => {
    const dlLinks = page.locator('a[href*="/downloads/"]');
    expect(await dlLinks.count()).toBeGreaterThanOrEqual(3);
  });

  // ── 功能亮点 ──
  test('功能亮点区域可见', async ({ page }) => {
    await expect(page.locator('text=币安现货网格全自动交易')).toBeVisible();
  });

  // ── Footer ──
  test('Footer 存在', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/grid');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
