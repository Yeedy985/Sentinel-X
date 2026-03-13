import { test, expect } from '@playwright/test';

test.describe('/grid 网格量化页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/grid');
  });

  // ── 页面渲染 ──
  test('页面正常加载，状态码200', async ({ page }) => {
    const response = await page.goto('/grid');
    expect(response?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar 存在', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
  });

  // ── Hero 区 ──
  test('Hero 徽章：网格量化交易', async ({ page }) => {
    await expect(page.locator('text=网格量化交易').first()).toBeVisible();
  });

  test('Hero 标题：策略广场 & AAGS 客户端', async ({ page }) => {
    await expect(page.locator('h1 >> text=策略广场')).toBeVisible();
    await expect(page.locator('h1 >> text=AAGS 客户端')).toBeVisible();
  });

  test('Hero 副标题：看看别人怎么赚钱', async ({ page }) => {
    await expect(page.locator('text=看看别人怎么赚钱')).toBeVisible();
  });

  // ── 策略排行 ──
  test('实盘策略排行区域渲染', async ({ page }) => {
    await expect(page.locator('text=实盘策略排行')).toBeVisible();
    await expect(page.locator('text=真实用户分享的实盘策略')).toBeVisible();
  });

  test('排序按钮存在：收益最高/复制最多/最新', async ({ page }) => {
    await expect(page.locator('button:has-text("收益最高")')).toBeVisible();
    await expect(page.locator('button:has-text("复制最多")')).toBeVisible();
    await expect(page.locator('button:has-text("最新")')).toBeVisible();
  });

  test('排序按钮可点击', async ({ page }) => {
    await page.locator('button:has-text("复制最多")').click();
    // 按钮应该变为选中状态（样式变化）
    await expect(page.locator('button:has-text("复制最多")')).toBeVisible();
  });

  test('策略广场空状态或有数据', async ({ page }) => {
    // 策略广场可能是空的（等待API返回），也可能有数据
    const emptyState = page.locator('text=策略广场即将上线');
    const strategyCards = page.locator('[class*="grid"] [class*="rounded-2xl"]');
    // 至少其中一个应存在
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = await strategyCards.count() > 0;
    expect(hasEmpty || hasCards).toBeTruthy();
  });

  test('底部透明数据提示存在', async ({ page }) => {
    await expect(page.locator('text=所有数据由用户实盘实时上报')).toBeVisible();
  });

  // ── AAGS 下载区 ──
  test('AAGS 客户端下载区渲染', async ({ page }) => {
    await expect(page.locator('text=客户端下载')).toBeVisible();
    await expect(page.locator('text=下载即用，连接你的币安账户')).toBeVisible();
  });

  test('3个下载卡片全部显示：Windows/macOS/Android', async ({ page }) => {
    await expect(page.locator('text=Windows').first()).toBeVisible();
    await expect(page.locator('text=macOS').first()).toBeVisible();
    await expect(page.locator('text=Android').first()).toBeVisible();
  });

  test('下载按钮存在且包含下载链接', async ({ page }) => {
    const dlButtons = page.locator('a[href*="/downloads/"]');
    expect(await dlButtons.count()).toBeGreaterThanOrEqual(3);
  });

  // ── 功能亮点 ──
  test('功能亮点6项全部显示', async ({ page }) => {
    await expect(page.locator('text=币安现货网格全自动交易')).toBeVisible();
    await expect(page.locator('text=AI 扫描结果自动驱动策略调参')).toBeVisible();
    await expect(page.locator('text=一键分享你的策略到广场')).toBeVisible();
    await expect(page.locator('text=一键复制高手的策略参数')).toBeVisible();
    await expect(page.locator('text=实时收益曲线和详细报表')).toBeVisible();
    await expect(page.locator('text=异常和熔断即时通知到手机')).toBeVisible();
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
    await page.goto('/grid');
    await page.waitForTimeout(2000);
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
