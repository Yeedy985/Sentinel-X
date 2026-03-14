import { test, expect } from '@playwright/test';
import { registerUserViaApi, uniqueEmail, TEST_PASSWORD } from './helpers';

// 通过真实 API 注册测试用户
let testUser: { email: string; password: string; token: string };

test.beforeAll(async () => {
  testUser = await registerUserViaApi('nav');
});

// ══════════════════════════════════════════════
//  跨页面导航
// ══════════════════════════════════════════════
test.describe('跨页面导航', () => {
  test('所有公共页面返回 200', async ({ page }) => {
    for (const path of ['/', '/pricing', '/grid', '/docs', '/login', '/register']) {
      const res = await page.goto(path);
      expect(res?.status(), `${path} 应返回 200`).toBe(200);
    }
  });

  test('从首页依次导航到所有页面', async ({ page }) => {
    await page.goto('/');
    // 首页 → 网格量化
    await page.locator('nav a:has-text("网格量化")').click();
    await expect(page).toHaveURL('/grid');
    // 网格量化 → AI 扫描
    await page.locator('nav a:has-text("AI 扫描")').click();
    await expect(page).toHaveURL('/pricing');
    // AI 扫描 → API 文档
    await page.locator('nav a:has-text("API 文档")').click();
    await expect(page).toHaveURL('/docs');
    // API 文档 → 首页
    await page.locator('nav a:has-text("首页")').click();
    await expect(page).toHaveURL('/');
  });

  test('登录 → 注册 → 登录 互跳', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('完整用户流程: 首页 → 注册 → Dashboard → 退出 → 登录 → Dashboard', async ({ page }) => {
    // 1. 首页点击注册
    await page.goto('/');
    await page.locator('a[href="/register"]').first().click();
    await expect(page).toHaveURL('/register');

    // 2. 注册（通过 UI，每次用唯一邮箱）
    const newEmail = uniqueEmail('flow');
    await page.locator('input[type="email"]').fill(newEmail);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 3. 在 Dashboard
    await expect(page.locator('text=Token 余额').first()).toBeVisible({ timeout: 15000 });

    // 4. 退出
    await page.locator('button[title="退出登录"]').click();
    await page.waitForURL('**/login', { timeout: 10000 });

    // 5. 用预注册的用户登录
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 6. 回到 Dashboard
    await expect(page.locator('text=Token 余额').first()).toBeVisible({ timeout: 15000 });
  });
});

// ══════════════════════════════════════════════
//  Footer 导航
// ══════════════════════════════════════════════
test.describe('Footer 导航链接', () => {
  test('Footer 产品链接全部可点', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await footer.locator('a[href="/pricing"]').click();
    await expect(page).toHaveURL('/pricing');
  });

  test('Footer 注册链接跳转', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  test('Footer 登录链接跳转', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('Footer 控制台链接跳转', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer a[href="/dashboard"]').click();
    // 未登录会跳转到 login
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
  });
});

// ══════════════════════════════════════════════
//  响应式布局
// ══════════════════════════════════════════════
test.describe('响应式布局', () => {
  test('移动端 (375px): 首页正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('平板端 (768px): 首页正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('桌面端 (1440px): 首页正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav a:has-text("网格量化")')).toBeVisible();
  });

  test('移动端 (375px): Dashboard 登录后正常渲染', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Token 余额').first()).toBeVisible({ timeout: 15000 });
  });
});

// ══════════════════════════════════════════════
//  全站 JS 异常检测
// ══════════════════════════════════════════════
test.describe('全站无 JS 崩溃', () => {
  const pages = ['/', '/pricing', '/grid', '/docs', '/login', '/register'];

  for (const path of pages) {
    test(`${path} 无未捕获的 JS 异常`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(path);
      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });
  }
});
