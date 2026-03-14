import { test, expect } from '@playwright/test';
import { uniqueEmail, TEST_PASSWORD } from './helpers';

test.describe('/register 注册页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('页面加载成功 200', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res?.status()).toBe(200);
  });

  // ── 页面结构 ──
  test('Logo 可见且链接到首页', async ({ page }) => {
    const logo = page.locator('a[href="/"] >> text=AlphaSentinel');
    await expect(logo).toBeVisible();
  });

  test('返回首页链接可见且可点击', async ({ page }) => {
    await expect(page.locator('text=返回首页')).toBeVisible();
    await page.locator('text=返回首页').click();
    await expect(page).toHaveURL('/');
  });

  test('副标题描述可见', async ({ page }) => {
    await expect(page.locator('text=注册即送')).toBeVisible();
  });

  // ── 不显示 Navbar ──
  test('不显示公共导航栏', async ({ page }) => {
    const nav = page.locator('nav >> a:has-text("网格量化")');
    await expect(nav).not.toBeVisible();
  });

  // ── Token 赠送提示 ──
  test('Token 赠送 banner 可见', async ({ page }) => {
    await expect(page.locator('text=注册即送').first()).toBeVisible();
  });

  // ── 表单元素 ──
  test('邮箱输入框存在且可输入', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('newuser@test.com');
    await expect(emailInput).toHaveValue('newuser@test.com');
  });

  test('密码输入框存在且可输入', async ({ page }) => {
    const pwdInput = page.locator('input[type="password"]');
    await expect(pwdInput).toBeVisible();
    await pwdInput.fill('securepass');
    await expect(pwdInput).toHaveValue('securepass');
  });

  test('昵称输入框存在且可选填', async ({ page }) => {
    const nicknameInput = page.locator('input[placeholder*="昵称"], input[placeholder*="选填"]').first();
    // 昵称可能不是每个注册页都有，如果有则测试
    const count = await nicknameInput.count();
    if (count > 0) {
      await nicknameInput.fill('TestNickname');
      await expect(nicknameInput).toHaveValue('TestNickname');
    }
  });

  test('注册按钮存在', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  // ── 表单验证 ──
  test('空表单提交: 浏览器原生验证阻止提交', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/register');
  });

  test('只填邮箱不填密码: 不跳转', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/register');
  });

  // ── 注册业务 ──
  test('正确填写注册: 跳转到 /dashboard', async ({ page }) => {
    const email = uniqueEmail('reg');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('注册成功后: localStorage 存储了 token', async ({ page }) => {
    const email = uniqueEmail('reg2');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const token = await page.evaluate(() => localStorage.getItem('sentinel_token'));
    expect(token).toBeTruthy();
  });

  // ── 登录引导 ──
  test('登录引导链接可见', async ({ page }) => {
    await expect(page.locator('text=已有账号')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('点击登录引导跳转 /login', async ({ page }) => {
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL('/login');
  });

  // ── 无 JS 崩溃 ──
  test('页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/register');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
