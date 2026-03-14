/**
 * Test Helpers — 通过真实 API 创建测试数据，不使用任何 mock
 */
import { Page } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

// 生成唯一邮箱避免冲突
export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@e2e.test`;
}

const TEST_PASSWORD = 'TestPass123!';

/**
 * 通过 API 注册一个新用户，返回 { email, password, token }
 */
export async function registerUserViaApi(emailPrefix = 'test'): Promise<{ email: string; password: string; token: string }> {
  const email = uniqueEmail(emailPrefix);
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Register failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.success || !data.data?.token) {
    throw new Error(`Register response invalid: ${JSON.stringify(data)}`);
  }
  return { email, password: TEST_PASSWORD, token: data.data.token };
}

/**
 * 通过 API 创建 API 令牌
 */
export async function createApiTokenViaApi(jwtToken: string, name = ''): Promise<{ tokenPrefix: string; rawToken: string }> {
  const res = await fetch(`${API_BASE}/api/user/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Create token failed: ${JSON.stringify(data)}`);
  return { tokenPrefix: data.data.tokenPrefix, rawToken: data.data.rawToken };
}

/**
 * 在浏览器中登录（填写表单提交）
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * 在浏览器中注册（填写表单提交），返回注册用的邮箱
 */
export async function registerViaUI(page: Page, emailPrefix = 'uitest'): Promise<string> {
  const email = uniqueEmail(emailPrefix);
  await page.goto('/register');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  return email;
}

export { TEST_PASSWORD };
