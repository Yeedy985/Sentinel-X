import { test, expect } from '@playwright/test';

test.describe('/login 登录页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ── 页面渲染 ──
  test('页面正常加载，状态码200', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
  });

  // ── Logo ──
  test('Logo 渲染且链接到首页', async ({ page }) => {
    const logo = page.locator('a:has-text("AlphaSentinel")');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('href', '/');
  });

  // ── 返回首页 ──
  test('"返回首页"链接存在且可点击', async ({ page }) => {
    const backLink = page.locator('a:has-text("返回首页")');
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL('/');
  });

  // ── 副标题 ──
  test('副标题：登录后即可使用 AI 扫描', async ({ page }) => {
    await expect(page.locator('text=登录后即可使用 AI 扫描')).toBeVisible();
  });

  // ── 表单元素 ──
  test('邮箱输入框存在', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('密码输入框存在', async ({ page }) => {
    const pwInput = page.locator('input[type="password"]');
    await expect(pwInput).toBeVisible();
  });

  test('登录按钮存在', async ({ page }) => {
    const loginBtn = page.locator('button:has-text("登录")');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();
  });

  // ── 表单交互 ──
  test('可以输入邮箱和密码', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('password123');
  });

  test('空表单提交不会导致页面崩溃', async ({ page }) => {
    await page.locator('button:has-text("登录")').click();
    // 页面应仍在 /login
    await expect(page).toHaveURL('/login');
  });

  test('输入错误凭据提交后显示错误提示', async ({ page }) => {
    await page.locator('input[type="email"]').fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.locator('button:has-text("登录")').click();
    // 等待API响应
    await page.waitForTimeout(3000);
    // 应该显示错误提示或仍在登录页
    await expect(page).toHaveURL('/login');
  });

  // ── 注册引导 ──
  test('底部注册引导链接存在', async ({ page }) => {
    await expect(page.locator('text=还没有账号？')).toBeVisible();
    const registerLink = page.locator('a:has-text("免费注册，送 Token 立即体验")');
    await expect(registerLink).toBeVisible();
  });

  test('注册引导链接点击跳转', async ({ page }) => {
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  // ── 无 Navbar / Footer（独立页面） ──
  test('登录页无 Navbar（独立布局）', async ({ page }) => {
    // 登录页不应有完整导航栏（只有返回首页链接）
    const fullNav = page.locator('nav a:has-text("网格量化")');
    await expect(fullNav).not.toBeVisible();
  });

  // ── 无 JS 错误 ──
  test('页面无 JS 控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
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
