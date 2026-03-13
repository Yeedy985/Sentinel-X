import { test, expect } from '@playwright/test';

test.describe('跨页面导航测试', () => {
  // ── 所有公共页面可达 ──
  const publicPages = [
    { path: '/', name: '首页' },
    { path: '/pricing', name: 'AI扫描页' },
    { path: '/grid', name: '网格量化页' },
    { path: '/docs', name: 'API文档页' },
    { path: '/login', name: '登录页' },
    { path: '/register', name: '注册页' },
    { path: '/dashboard', name: '账户管理页' },
  ];

  for (const pg of publicPages) {
    test(`${pg.name} (${pg.path}) 可正常访问，状态码200`, async ({ page }) => {
      const response = await page.goto(pg.path);
      expect(response?.status()).toBe(200);
    });
  }

  // ── Navbar 导航一致性 ──
  const navbarPages = ['/', '/pricing', '/grid', '/docs'];

  for (const path of navbarPages) {
    test(`${path} 页面 Navbar 包含完整导航链接`, async ({ page }) => {
      await page.goto(path);
      const nav = page.locator('nav');
      await expect(nav.locator('a:has-text("首页")')).toBeVisible();
      await expect(nav.locator('a:has-text("网格量化")')).toBeVisible();
      await expect(nav.locator('a:has-text("AI 扫描")')).toBeVisible();
      await expect(nav.locator('a:has-text("API 文档")')).toBeVisible();
    });
  }

  // ── Footer 一致性 ──
  const footerPages = ['/', '/pricing', '/grid', '/docs'];

  for (const path of footerPages) {
    test(`${path} 页面 Footer 存在且链接完整`, async ({ page }) => {
      await page.goto(path);
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer.locator('a[href="/pricing"]')).toBeVisible();
      await expect(footer.locator('a[href="/grid"]').first()).toBeVisible();
      await expect(footer.locator('a[href="/docs"]').first()).toBeVisible();
      await expect(footer.locator('a[href="/register"]')).toBeVisible();
      await expect(footer.locator('a[href="/login"]')).toBeVisible();
      await expect(footer.locator('a[href="/dashboard"]')).toBeVisible();
    });
  }

  // ── 首页产品卡片导航 ──
  test('首页产品卡片跳转到 /pricing', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/pricing"]').first().click();
    await expect(page).toHaveURL('/pricing');
  });

  test('首页产品卡片跳转到 /grid', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/grid"]').first().click();
    await expect(page).toHaveURL('/grid');
  });

  test('首页产品卡片跳转到 /docs', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/docs"]').first().click();
    await expect(page).toHaveURL('/docs');
  });

  // ── 登录/注册互相跳转 ──
  test('登录页 → 注册页', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  test('注册页 → 登录页', async ({ page }) => {
    await page.goto('/register');
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
  });

  // ── CTA 按钮导航 ──
  test('/pricing CTA 注册按钮跳转', async ({ page }) => {
    await page.goto('/pricing');
    await page.locator('a[href="/register"]').last().click();
    await expect(page).toHaveURL('/register');
  });

  // ── 返回首页链接 ──
  test('/login 返回首页链接', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a:has-text("返回首页")').click();
    await expect(page).toHaveURL('/');
  });

  test('/register 返回首页链接', async ({ page }) => {
    await page.goto('/register');
    await page.locator('a:has-text("返回首页")').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('响应式布局测试', () => {
  // ── 移动端视口 ──
  test('移动端：首页正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // 移动端应有汉堡菜单按钮
    const menuBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(menuBtn).toBeVisible();
  });

  test('移动端：/pricing 正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pricing');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('移动端：/grid 正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/grid');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('移动端：/docs 正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/docs');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('移动端：/login 正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await expect(page.locator('button:has-text("登录")')).toBeVisible();
  });

  test('移动端：/register 正常渲染（375px）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/register');
    await expect(page.locator('button:has-text("注册")')).toBeVisible();
  });

  // ── 平板视口 ──
  test('平板端：首页正常渲染（768px）', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  // ── 桌面视口 ──
  test('桌面端：首页正常渲染（1440px）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // 桌面端应有完整导航而非汉堡菜单
    await expect(page.locator('nav a:has-text("首页")')).toBeVisible();
  });
});

test.describe('页面无崩溃全覆盖测试', () => {
  const allPages = ['/', '/pricing', '/grid', '/docs', '/login', '/register', '/dashboard'];

  for (const path of allPages) {
    test(`${path} 无未捕获的JS异常`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(path);
      await page.waitForTimeout(3000);
      // 过滤掉后端不可达相关的错误
      const critical = errors.filter(e =>
        !e.includes('Backend unreachable') &&
        !e.includes('Failed to fetch') &&
        !e.includes('NetworkError')
      );
      expect(critical).toEqual([]);
    });
  }
});
