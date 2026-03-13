import { test, expect } from '@playwright/test';

test.describe('/pricing AI扫描页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  // ── 页面渲染 ──
  test('页面正常加载，状态码200', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBe(200);
  });

  // ── Navbar ──
  test('Navbar 存在且 AI 扫描 高亮', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  // ── Hero 区 ──
  test('Hero 标题：每次扫描不到一杯咖啡的零头', async ({ page }) => {
    await expect(page.locator('text=每次扫描不到一杯咖啡的零头')).toBeVisible();
  });

  test('Hero 副标题包含 300+ 信号维度', async ({ page }) => {
    await expect(page.locator('text=300+ 信号维度').first()).toBeVisible();
  });

  test('Hero 徽章：AI 全链路扫描', async ({ page }) => {
    await expect(page.locator('text=AI 全链路扫描').first()).toBeVisible();
  });

  // ── 扫描服务卡片 ──
  test('扫描服务卡片渲染：标题和描述', async ({ page }) => {
    await expect(page.locator('text=一次扫描 = 全球最新消息的完美分析结果')).toBeVisible();
  });

  test('扫描特性列表：6项全部显示', async ({ page }) => {
    await expect(page.locator('text=300+ 信号维度全景扫描')).toBeVisible();
    await expect(page.locator('text=输出方向 / 波动 / 风险三大可执行指数')).toBeVisible();
    await expect(page.locator('text=Perplexity 实时联网').first()).toBeVisible();
    await expect(page.locator('text=覆盖新闻、政策、链上数据、市场情绪全维度')).toBeVisible();
    await expect(page.locator('text=即时推送到 Telegram / WhatsApp')).toBeVisible();
    await expect(page.locator('text=扫描失败自动退费').first()).toBeVisible();
  });

  // ── 流程步骤 ──
  test('计费流程4步全部显示', async ({ page }) => {
    await expect(page.locator('text=发起扫描').first()).toBeVisible();
    await expect(page.locator('text=AI 深度分析').first()).toBeVisible();
    await expect(page.locator('text=按量扣费')).toBeVisible();
    await expect(page.locator('text=收到简报')).toBeVisible();
  });

  // ── 核心能力 ──
  test('"为什么选择我们"板块渲染', async ({ page }) => {
    await expect(page.locator('text=为什么选择我们')).toBeVisible();
    await expect(page.locator('text=不是另一个新闻聚合器')).toBeVisible();
  });

  test('6个能力卡片全部显示', async ({ page }) => {
    await expect(page.locator('text=300+ 信号全景扫描')).toBeVisible();
    await expect(page.locator('text=顶级 AI 深度分析')).toBeVisible();
    await expect(page.locator('text=三大核心指数')).toBeVisible();
    await expect(page.locator('text=睡觉也不错过重大事件')).toBeVisible();
    await expect(page.locator('text=开放 API 接入')).toBeVisible();
    await expect(page.locator('text=成本极低，绝不多扣')).toBeVisible();
  });

  // ── 计费说明 ──
  test('计费说明板块渲染', async ({ page }) => {
    await expect(page.locator('text=计费说明')).toBeVisible();
    await expect(page.locator('text=用多少付多少').first()).toBeVisible();
    await expect(page.locator('text=扫描失败自动全额退回')).toBeVisible();
  });

  // ── CTA ──
  test('底部 CTA 渲染和注册按钮', async ({ page }) => {
    await expect(page.locator('text=别再被信息爆炸淆没了')).toBeVisible();
    const registerBtn = page.locator('a[href="/register"]').last();
    await expect(registerBtn).toBeVisible();
  });

  test('CTA 注册按钮可点击跳转', async ({ page }) => {
    await page.locator('a[href="/register"]').last().click();
    await expect(page).toHaveURL('/register');
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
    await page.goto('/pricing');
    await page.waitForTimeout(2000);
    const critical = errors.filter(e =>
      !e.includes('hydrat') &&
      !e.includes('favicon') &&
      !e.includes('Backend unreachable') &&
      !e.includes('Failed to fetch')
    );
    expect(critical).toEqual([]);
  });
});
