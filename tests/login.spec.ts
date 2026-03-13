import { test, expect } from '@playwright/test';

test.describe('/login 登录页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
  });

  // ── 页面结构 ──
  test('Logo 可见且链接到首页', async ({ page }) => {
    const logo = page.locator('a[href="/"] >> text=AlphaSentinel');
    await expect(logo).toBeVisible();
  });

  test('返回首页链接可见', async ({ page }) => {
    await expect(page.locator('text=返回首页')).toBeVisible();
  });

  test('点击返回首页跳转 /', async ({ page }) => {
    await page.locator('text=返回首页').click();
    await expect(page).toHaveURL('/');
  });

  test('副标题描述可见', async ({ page }) => {
    await expect(page.locator('text=登录后即可使用')).toBeVisible();
  });

  // ── 无 Navbar（登录页不显示公共 Navbar） ──
  test('不显示公共导航栏', async ({ page }) => {
    const nav = page.locator('nav >> a:has-text("网格量化")');
    await expect(nav).not.toBeVisible();
  });

  // ── 表单元素 ──
  test('邮箱输入框存在且可输入', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('密码输入框存在且可输入', async ({ page }) => {
    const pwdInput = page.locator('input[type="password"]');
    await expect(pwdInput).toBeVisible();
    await pwdInput.fill('mypassword');
    await expect(pwdInput).toHaveValue('mypassword');
  });

  test('登录按钮存在', async ({ page }) => {
    await expect(page.locator('button[type="submit"]:has-text("登录")')).toBeVisible();
  });

  // ── 表单验证 ──
  test('空表单提交: 浏览器原生验证阻止提交', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // 仍然在登录页
    await expect(page).toHaveURL('/login');
  });

  test('只填邮箱不填密码: 不跳转', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
  });

  // ── 登录业务 ──
  test('正确凭据登录: 跳转到 /dashboard', async ({ page }) => {
    await page.locator('input[type="email"]').fill('demo@alphinel.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('正确凭据登录: localStorage 存储了 token', async ({ page }) => {
    await page.locator('input[type="email"]').fill('demo@alphinel.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('sentinel_token'));
    expect(token).toBeTruthy();
    expect(token).toContain('dev_mock_jwt_');
  });

  test('错误密码登录: 显示错误信息', async ({ page }) => {
    await page.locator('input[type="email"]').fill('demo@alphinel.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=邮箱或密码错误')).toBeVisible({ timeout: 5000 });
    // 仍然在登录页
    await expect(page).toHaveURL('/login');
  });

  test('错误邮箱登录: 显示错误信息', async ({ page }) => {
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=邮箱或密码错误')).toBeVisible({ timeout: 5000 });
  });

  // ── 注册引导 ──
  test('注册引导链接可见', async ({ page }) => {
    await expect(page.locator('text=还没有账号')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('点击注册引导跳转 /register', async ({ page }) => {
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL('/register');
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/login');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
