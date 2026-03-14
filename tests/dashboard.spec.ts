import { test, expect, Page } from '@playwright/test';
import { registerUserViaApi, createApiTokenViaApi, loginViaUI } from './helpers';

/**
 * Dashboard E2E Tests — 全部通过真实 API 创建数据，不使用任何 mock
 */

// 测试用户（在所有测试前通过真实 API 注册）
let testUser: { email: string; password: string; token: string };
// 通过 API 预创建的令牌前缀（用于验证列表显示）
let preCreatedTokenPrefix: string;

test.beforeAll(async () => {
  // 1. 通过真实 API 注册测试用户
  testUser = await registerUserViaApi('dash');
  // 2. 通过真实 API 预创建一个 API 令牌（用于测试令牌列表）
  const tokenResult = await createApiTokenViaApi(testUser.token, 'E2E预创建令牌');
  preCreatedTokenPrefix = tokenResult.tokenPrefix;
});

async function loginAndGotoDashboard(page: Page) {
  await loginViaUI(page, testUser.email, testUser.password);
}

// ══════════════════════════════════════════════
//  未登录行为
// ══════════════════════════════════════════════
test.describe('/dashboard 未登录', () => {
  test('未登录访问 /dashboard: 重定向到 /login', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('sentinel_token'));
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ══════════════════════════════════════════════
//  登录后 Dashboard 核心渲染
// ══════════════════════════════════════════════
test.describe('/dashboard 登录后', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGotoDashboard(page);
  });

  test('页面加载成功: 不卡在"加载中"', async ({ page }) => {
    await expect(page.locator('text=加载中')).not.toBeVisible({ timeout: 15000 });
  });

  // ── Navbar ──
  test('Dashboard Navbar: Logo 可见', async ({ page }) => {
    await expect(page.locator('nav >> text=AlphaSentinel')).toBeVisible();
  });

  test('Dashboard Navbar: 导航链接 (首页/网格量化/AI扫描/API文档)', async ({ page }) => {
    await expect(page.locator('nav a:has-text("首页")')).toBeVisible();
    await expect(page.locator('nav a:has-text("网格量化")')).toBeVisible();
    await expect(page.locator('nav a:has-text("AI 扫描")')).toBeVisible();
    await expect(page.locator('nav a:has-text("API 文档")')).toBeVisible();
  });

  test('Dashboard Navbar: Token 余额显示', async ({ page }) => {
    await expect(page.locator('nav >> text=Token').first()).toBeVisible();
  });

  test('Dashboard Navbar: 用户邮箱显示', async ({ page }) => {
    await expect(page.getByText(testUser.email)).toBeVisible();
  });

  test('Dashboard Navbar: 退出按钮存在', async ({ page }) => {
    await expect(page.locator('button[title="退出登录"]')).toBeVisible();
  });

  // ── 统计卡片 ──
  test('统计卡片: Token 余额 卡片可见', async ({ page }) => {
    await expect(page.locator('text=Token 余额').first()).toBeVisible();
  });

  test('统计卡片: 兑换费率 卡片可见', async ({ page }) => {
    await expect(page.locator('text=兑换费率')).toBeVisible();
  });

  test('统计卡片: API 令牌 卡片可见', async ({ page }) => {
    await expect(page.locator('text=API 令牌').first()).toBeVisible();
  });

  test('统计卡片: 账号状态 卡片可见且显示"正常"', async ({ page }) => {
    await expect(page.locator('text=账号状态')).toBeVisible();
    await expect(page.locator('text=正常')).toBeVisible();
  });

  // ── Tab 标签 ──
  test('5个 Tab 标签全部可见', async ({ page }) => {
    await expect(page.locator('button:has-text("USDT 充值")')).toBeVisible();
    await expect(page.locator('button:has-text("充值记录")')).toBeVisible();
    await expect(page.locator('button:has-text("API 令牌")')).toBeVisible();
    await expect(page.locator('button:has-text("Token 流水")')).toBeVisible();
    await expect(page.locator('button:has-text("扫描记录")')).toBeVisible();
  });

  // ── Tab 切换 ──
  test('点击"充值记录" Tab: 切换到充值记录页', async ({ page }) => {
    await page.locator('button:has-text("充值记录")').click();
    // 新用户没有充值记录，应显示空态
    await expect(page.locator('text=暂无充值记录')).toBeVisible({ timeout: 5000 });
  });

  test('点击"API 令牌" Tab: 显示创建令牌按钮', async ({ page }) => {
    await page.locator('button:has-text("API 令牌")').click();
    await expect(page.locator('button:has-text("创建令牌")')).toBeVisible();
  });

  test('点击"Token 流水" Tab: 显示注册赠送记录', async ({ page }) => {
    await page.locator('button:has-text("Token 流水")').click();
    // 真实后端注册时会自动赠送 Token，会有"注册赠送"流水记录
    await expect(page.locator('text=注册赠送')).toBeVisible({ timeout: 5000 });
  });

  test('点击“扫描记录” Tab: 切换到扫描记录页', async ({ page }) => {
    await page.locator('button:has-text("扫描记录")').click();
    // 新用户没有扫描记录，Tab 切换本身不应报错
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("扫描记录")')).toBeVisible();
  });

  test('Tab 来回切换不崩溃', async ({ page }) => {
    await page.locator('button:has-text("API 令牌")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("USDT 充值")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("扫描记录")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("充值记录")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Token 流水")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('h1, nav')).toBeVisible();
  });
});

// ══════════════════════════════════════════════
//  USDT 充值 Tab 完整业务流程
// ══════════════════════════════════════════════
test.describe('/dashboard USDT充值业务', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGotoDashboard(page);
  });

  test('默认显示 USDT 充值 Tab', async ({ page }) => {
    await expect(page.locator('text=USDT 充值').first()).toBeVisible();
  });

  // ── 网络选择 ──
  test('网络选择: TRC20 和 ERC20 按钮可见', async ({ page }) => {
    await expect(page.locator('button:has-text("TRC20")')).toBeVisible();
    await expect(page.locator('button:has-text("ERC20")')).toBeVisible();
  });

  test('网络选择: 默认选中 TRC20', async ({ page }) => {
    const trc20 = page.locator('button:has-text("TRC20")');
    await expect(trc20).toHaveClass(/from-cyan/);
  });

  test('网络选择: 点击 ERC20 切换网络', async ({ page }) => {
    await page.locator('button:has-text("ERC20")').click();
    const erc20 = page.locator('button:has-text("ERC20")');
    await expect(erc20).toHaveClass(/from-cyan/);
  });

  test('网络选择: 点击 ERC20 后再点 TRC20 切换回来', async ({ page }) => {
    await page.locator('button:has-text("ERC20")').click();
    await page.locator('button:has-text("TRC20")').click();
    await expect(page.locator('button:has-text("TRC20")')).toHaveClass(/from-cyan/);
  });

  // ── 快捷金额 ──
  test('快捷金额按钮: 5/10/20/50/100 USDT 全部可见', async ({ page }) => {
    for (const amt of [5, 10, 20, 50, 100]) {
      await expect(page.locator(`button:has-text("${amt} USDT")`)).toBeVisible();
    }
  });

  test('快捷金额: 点击 10 USDT 自动填入输入框', async ({ page }) => {
    await page.locator('button:has-text("10 USDT")').click();
    const input = page.locator('input[type="number"]');
    await expect(input).toHaveValue('10');
  });

  test('快捷金额: 点击后预览区域显示', async ({ page }) => {
    await page.locator('button:has-text("20 USDT")').click();
    await expect(page.getByText('充值金额', { exact: true })).toBeVisible();
    await expect(page.getByText('可获得', { exact: true })).toBeVisible();
    // 预览区域中应显示具体的 Token 数量（加粗的金色数字）
    await expect(page.locator('span.text-amber-400, span.font-bold').filter({ hasText: /Token/ }).first()).toBeVisible();
  });

  test('快捷金额: 连续切换金额', async ({ page }) => {
    await page.locator('button:has-text("5 USDT")').click();
    await expect(page.locator('span.font-bold.text-amber-400').first()).toBeVisible();
    await page.locator('button:has-text("100 USDT")').click();
    await expect(page.locator('span.font-bold.text-amber-400').first()).toBeVisible();
  });

  // ── 自定义金额 ──
  test('自定义金额: 输入框存在', async ({ page }) => {
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });

  test('自定义金额: 输入 15 后预览更新', async ({ page }) => {
    await page.locator('input[type="number"]').fill('15');
    await expect(page.locator('span.font-bold.text-amber-400').first()).toBeVisible();
  });

  // ── 创建充值订单按钮 ──
  test('创建充值订单: 未填金额时按钮禁用', async ({ page }) => {
    const btn = page.locator('button:has-text("创建充值订单")');
    await expect(btn).toBeDisabled();
  });

  test('创建充值订单: 填入金额后按钮启用', async ({ page }) => {
    await page.locator('button:has-text("10 USDT")').click();
    const btn = page.locator('button:has-text("创建充值订单")');
    await expect(btn).toBeEnabled();
  });

  test('创建充值订单: 点击后显示支付信息或繁忙提示', async ({ page }) => {
    await page.locator('button:has-text("10 USDT")').click();
    await page.locator('button:has-text("创建充值订单")').click();
    // 如果管理后台配置了收款地址，显示支付信息；否则显示繁忙提示
    const paymentInfo = page.locator('text=支付信息');
    const busyMsg = page.locator('text=繁忙');
    await expect(paymentInfo.or(busyMsg)).toBeVisible({ timeout: 8000 });
  });

  test('创建充值订单: 无地址时显示友好提示而非报错', async ({ page }) => {
    await page.locator('button:has-text("10 USDT")').click();
    await page.locator('button:has-text("创建充值订单")').click();
    // 不应该出现"服务器错误"这种非友好提示
    await page.waitForTimeout(3000);
    await expect(page.locator('text=服务器错误')).not.toBeVisible();
  });

  // ── 创建新订单 ──
  test('创建后可以点"创建新的充值订单"重置', async ({ page }) => {
    await page.locator('button:has-text("10 USDT")').click();
    await page.locator('button:has-text("创建充值订单")').click();
    // 等待响应（成功或失败都行）
    await page.waitForTimeout(3000);
    const resetBtn = page.locator('button:has-text("创建新的充值订单")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await expect(page.locator('text=在左侧选择充值金额')).toBeVisible();
    }
  });

  // ── 充值流程说明 ──
  test('充值流程: 4步说明全部可见', async ({ page }) => {
    await expect(page.locator('text=充值流程')).toBeVisible();
    await expect(page.locator('text=选择充值金额，创建充值订单')).toBeVisible();
    await expect(page.locator('text=复制收款地址')).toBeVisible();
    await expect(page.locator('text=我已支付').first()).toBeVisible();
    await expect(page.locator('text=Token 自动到账')).toBeVisible();
  });
});

// ══════════════════════════════════════════════
//  API 令牌 Tab 完整业务流程
// ══════════════════════════════════════════════
test.describe('/dashboard API令牌业务', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button:has-text("API 令牌")').click();
  });

  test('创建令牌: 输入框和按钮可见', async ({ page }) => {
    await expect(page.locator('input[placeholder*="令牌名称"]')).toBeVisible();
    await expect(page.locator('button:has-text("创建令牌")')).toBeVisible();
  });

  test('创建令牌: 不填名称直接创建成功', async ({ page }) => {
    await page.locator('button:has-text("创建令牌")').click();
    await expect(page.locator('text=令牌已创建')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=此令牌仅显示一次')).toBeVisible();
  });

  test('创建令牌: 填写名称后创建成功', async ({ page }) => {
    await page.locator('input[placeholder*="令牌名称"]').fill('My Trading Bot');
    await page.locator('button:has-text("创建令牌")').click();
    await expect(page.locator('text=令牌已创建')).toBeVisible({ timeout: 5000 });
  });

  test('创建令牌: 令牌值以 stx_ 开头', async ({ page }) => {
    await page.locator('button:has-text("创建令牌")').click();
    await expect(page.locator('text=令牌已创建')).toBeVisible({ timeout: 5000 });
    const tokenCode = page.locator('code:has-text("stx_")');
    await expect(tokenCode.first()).toBeVisible();
  });

  test('已有令牌: 预创建的令牌显示在列表中', async ({ page }) => {
    // 通过真实 API 创建的令牌应该显示在列表中
    await expect(page.locator(`code:has-text("${preCreatedTokenPrefix}")`)).toBeVisible({ timeout: 5000 });
  });

  test('令牌列表: 有吊销按钮', async ({ page }) => {
    // 预创建的令牌未吊销，应有吊销按钮
    const revokeBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(revokeBtn).toBeVisible();
  });
});

// ══════════════════════════════════════════════
//  Token 流水 Tab
// ══════════════════════════════════════════════
test.describe('/dashboard Token流水', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button:has-text("Token 流水")').click();
  });

  test('交易记录: "注册赠送"记录可见', async ({ page }) => {
    // 真实后端注册时赠送 Token，会有流水记录
    await expect(page.locator('text=注册赠送')).toBeVisible({ timeout: 5000 });
  });

  test('交易记录: 显示金额和余额', async ({ page }) => {
    // 注册赠送金额为正数
    await expect(page.locator('text=/\\+\\d+/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=余额').first()).toBeVisible();
  });
});

// ══════════════════════════════════════════════
//  扫描记录 Tab
// ══════════════════════════════════════════════
test.describe('/dashboard 扫描记录', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button:has-text("扫描记录")').click();
  });

  test('扫描记录: Tab 切换成功', async ({ page }) => {
    // 新注册用户可能没有扫描记录，验证 Tab 切换本身不报错
    await expect(page.locator('button:has-text("扫描记录")')).toBeVisible();
  });

  test('扫描记录: 显示暂无记录或有记录', async ({ page }) => {
    // 等待内容加载
    await page.waitForTimeout(2000);
    // 可能显示"暂无扫描记录"或显示实际记录
    const hasRecords = await page.locator('text=实时扫描').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=暂无扫描记录').isVisible().catch(() => false);
    expect(hasRecords || hasEmpty).toBeTruthy();
  });
});

// ══════════════════════════════════════════════
//  退出登录
// ══════════════════════════════════════════════
test.describe('/dashboard 退出登录', () => {
  test('退出按钮: 点击后跳转到 /login', async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button[title="退出登录"]').click();
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('退出后: localStorage token 被清除', async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button[title="退出登录"]').click();
    await page.waitForURL('**/login', { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('sentinel_token'));
    expect(token).toBeNull();
  });

  test('退出后: 再访问 /dashboard 被重定向到 /login', async ({ page }) => {
    await loginAndGotoDashboard(page);
    await page.locator('button[title="退出登录"]').click();
    await page.waitForURL('**/login', { timeout: 10000 });
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ══════════════════════════════════════════════
//  无 JS 崩溃
// ══════════════════════════════════════════════
test.describe('/dashboard 无 JS 崩溃', () => {
  test('Dashboard 页面无未捕获的 JS 异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await loginAndGotoDashboard(page);
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
