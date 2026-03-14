/**
 * API Client — 封装所有后端请求
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const DEV_MODE = false; // 始终走真实 API，不使用 mock 数据

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sentinel_token');
}

export function setToken(token: string) {
  localStorage.setItem('sentinel_token', token);
}

export function clearToken() {
  localStorage.removeItem('sentinel_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/* ──────────── Dev Mock Data ──────────── */
const MOCK_USER = { email: 'demo@alphinel.com', password: 'demo123' };
let mockBalance = 20000;
let mockTokenIdCounter = 2;
const mockTokens = [
  { id: 1, tokenPrefix: 'stx_abcd1234', name: 'Default Token', lastUsedAt: null, isRevoked: false, createdAt: '2026-03-01T10:00:00Z' },
];
const mockTransactions: { id: number; type: string; amount: number; balanceAfter: number; refId: string | null; description: string; createdAt: string }[] = [
  { id: 1, type: 'RECHARGE', amount: 20000, balanceAfter: 20000, refId: null, description: '注册赠送', createdAt: '2026-03-01T10:00:00Z' },
];
const mockScans: any[] = [
  { id: 1, briefingId: 'brf-a1b2c3', status: 'COMPLETED', isCached: false, enableSearch: true, tokenCost: 2, signalCount: 12, alertCount: 2, realCostUsd: 0.0068, startedAt: '2026-03-11T00:01:15Z', completedAt: '2026-03-11T00:01:53Z' },
  { id: 2, briefingId: 'brf-d4e5f6', status: 'COMPLETED', isCached: true, enableSearch: true, tokenCost: 2, signalCount: 12, alertCount: 2, realCostUsd: 0.0068, startedAt: '2026-03-11T00:02:10Z', completedAt: '2026-03-11T00:02:10Z' },
  { id: 3, briefingId: 'brf-j0k1l2', status: 'COMPLETED', isCached: false, enableSearch: false, tokenCost: 1, signalCount: 8, alertCount: 1, realCostUsd: 0.0003, startedAt: '2026-03-10T20:10:00Z', completedAt: '2026-03-10T20:10:35Z' },
  { id: 4, briefingId: 'brf-m3n4o5', status: 'COMPLETED', isCached: true, enableSearch: false, tokenCost: 1, signalCount: 8, alertCount: 1, realCostUsd: 0.0003, startedAt: '2026-03-10T20:11:30Z', completedAt: '2026-03-10T20:11:30Z' },
  { id: 5, briefingId: 'brf-p6q7r8', status: 'FAILED', isCached: false, enableSearch: true, tokenCost: 2, signalCount: 0, alertCount: 0, realCostUsd: 0, errorMessage: 'Pipeline timeout', startedAt: '2026-03-10T18:00:00Z', completedAt: '2026-03-10T18:00:30Z' },
];

function mockOk(data: any): any { return { success: true, data }; }
function mockErr(error: string): any { return { success: false, error }; }

function getMockResponse(path: string, options: RequestInit = {}): any {
  const method = options.method || 'GET';

  if (path === '/api/auth/site-config' && method === 'GET') {
    return mockOk({ registrationEnabled: true, newUserBonusTokens: 20000, announcement: null });
  }
  if (path === '/api/auth/register' && method === 'POST') {
    return mockOk({
      token: 'dev_mock_jwt_' + Date.now(),
      user: { id: 1, email: MOCK_USER.email, nickname: 'Demo User', tokenBalance: mockBalance, status: 'ACTIVE', createdAt: new Date().toISOString() },
    });
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    if (body.email === MOCK_USER.email && body.password === MOCK_USER.password) {
      return mockOk({
        token: 'dev_mock_jwt_' + Date.now(),
        user: { id: 1, email: MOCK_USER.email, nickname: 'Demo User', tokenBalance: mockBalance, status: 'ACTIVE', createdAt: '2026-03-01T10:00:00Z' },
      });
    }
    return mockErr('邮箱或密码错误 (Dev模式: demo@alphinel.com / demo123)');
  }
  if (path === '/api/user/config') {
    return mockOk({ usdtToTokenRate: 200000 });
  }
  if (path === '/api/user/profile') {
    return mockOk({ id: 1, email: MOCK_USER.email, nickname: 'Demo User', tokenBalance: mockBalance, status: 'ACTIVE', createdAt: '2026-03-01T10:00:00Z' });
  }
  if (path === '/api/user/tokens' && method === 'GET') {
    return mockOk(mockTokens);
  }
  if (path === '/api/user/tokens' && method === 'POST') {
    const body = JSON.parse(options.body as string || '{}');
    const newId = ++mockTokenIdCounter;
    const raw = `stx_mock_${Date.now().toString(36)}`;
    const t = { id: newId, tokenPrefix: raw.slice(0, 12), name: body.name || null, lastUsedAt: null, isRevoked: false, createdAt: new Date().toISOString() };
    mockTokens.push(t);
    return mockOk({ id: newId, token: raw, tokenPrefix: t.tokenPrefix, name: t.name });
  }
  if (path.startsWith('/api/user/tokens/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    const t = mockTokens.find(t => t.id === id);
    if (t) t.isRevoked = true;
    return mockOk(null);
  }
  if (path.startsWith('/api/user/transactions')) {
    return mockOk({ data: mockTransactions, total: mockTransactions.length, page: 1, pageSize: 20, totalPages: 1 });
  }
  if (path.startsWith('/api/user/scans')) {
    return mockOk({ data: mockScans, total: mockScans.length, page: 1, pageSize: 20, totalPages: 1 });
  }
  if (path === '/api/user/recharge' && method === 'POST') {
    const body = JSON.parse(options.body as string || '{}');
    const id = Date.now();
    const network = body.network === 'ERC20' ? 'ERC20' : 'TRC20';
    const walletAddress = network === 'ERC20'
      ? '0xYourERC20WalletAddressHere'
      : 'TYourTRC20WalletAddressHere';
    mockRecharges.unshift({
      id, amount: body.amount, method: 'USDT', txRef: null,
      status: 'PENDING', note: `${body.amount} USDT via ${network}`,
      createdAt: new Date().toISOString(),
    });
    return mockOk({
      id, usdtAmount: body.amount,
      walletAddress, network,
      status: 'PENDING', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  }
  if (path.startsWith('/api/user/recharges')) {
    return mockOk({ data: mockRecharges, total: mockRecharges.length, page: 1, pageSize: 20, totalPages: 1 });
  }
  if (path.match(/\/api\/user\/recharge\/\d+\/confirm/) && method === 'POST') {
    const id = Number(path.split('/')[4]);
    const r = mockRecharges.find(r => r.id === id);
    if (r) { r.status = 'COMPLETED'; r.txRef = `mock_tx_${Date.now()}`; }
    return mockOk(null);
  }
  if (path === '/api/user/exchange' && method === 'POST') {
    const body = JSON.parse(options.body as string || '{}');
    const r = mockRecharges.find(r => r.id === body.rechargeId);
    if (r && r.status === 'COMPLETED' && !r.note?.includes('已兑换')) {
      const tokens = Math.floor(r.amount * 10);
      mockBalance += tokens;
      r.note = (r.note || '') + ` | 已兑换 ${tokens} Token`;
      mockTransactions.unshift({
        id: Date.now(), type: 'RECHARGE', amount: tokens, balanceAfter: mockBalance,
        refId: `recharge_${r.id}`, description: `USDT充值兑换 ${r.amount} USDT → ${tokens} Token`,
        createdAt: new Date().toISOString(),
      });
      return mockOk({ tokensGranted: tokens, newBalance: mockBalance, rate: 10 });
    }
    return mockErr('充值订单不存在、未完成或已兑换');
  }
  return mockOk(null);
}

const mockRecharges: any[] = [];

/* ──────────── Real Request ──────────── */
async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  // Dev mode on localhost without backend → use mock
  if (DEV_MODE) {
    return getMockResponse(path, options);
  }

  // Use API_BASE if set, otherwise use relative path (Next.js rewrites will proxy /api/* to backend)
  const url = API_BASE ? `${API_BASE}${path}` : path;

  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // 登录/注册接口的 401 是"凭据错误"，不应触发重定向
      const isAuthEndpoint = path.startsWith('/api/auth/');
      if (isAuthEndpoint) {
        // 直接解析后端返回的错误信息
        try {
          const data = await res.json();
          return data;
        } catch {
          return { success: false, error: '邮箱或密码错误' };
        }
      }
      // 其它接口的 401 是"token 过期"，清除并跳转登录
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return { success: false, error: '登录已过期，请重新登录' };
    }

    // 尝试解析 JSON，不管 content-type 是什么
    let data: any;
    try {
      data = await res.json();
    } catch {
      // JSON 解析失败 — 后端返回了非 JSON（如 502/500 纯文本）
      console.error(`[API] ${path} → ${res.status} non-JSON response`);
      const friendly = res.status >= 500
        ? '服务器繁忙，请稍后再试'
        : `请求失败 (${res.status})`;
      return { success: false, error: friendly };
    }

    return data;
  } catch (err: any) {
    return { success: false, error: err?.message === 'Failed to fetch' ? '无法连接服务器，请检查网络' : (err?.message || '请求失败') };
  }
}

export const api = {
  // Auth
  getSiteConfig: () => request<{ registrationEnabled: boolean; newUserBonusTokens: number; announcement: string | null }>('/api/auth/site-config'),
  register: (body: { email: string; password: string; nickname?: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Config (public, no auth required)
  getConfig: () => request('/api/user/config'),

  // User
  getProfile: () => request('/api/user/profile'),
  getTokens: () => request('/api/user/tokens'),
  createToken: (name?: string) =>
    request('/api/user/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
  revokeToken: (id: number) =>
    request(`/api/user/tokens/${id}`, { method: 'DELETE' }),
  getTransactions: (page = 1, pageSize = 20) =>
    request(`/api/user/transactions?page=${page}&pageSize=${pageSize}`),
  getScans: (page = 1, pageSize = 20) =>
    request(`/api/user/scans?page=${page}&pageSize=${pageSize}`),

  // Recharge
  createRecharge: (amount: number, network: string = 'TRC20') =>
    request('/api/user/recharge', { method: 'POST', body: JSON.stringify({ amount, network }) }),
  getRecharges: (page = 1, pageSize = 20) =>
    request(`/api/user/recharges?page=${page}&pageSize=${pageSize}`),
  confirmRecharge: (id: number, txRef?: string) =>
    request(`/api/user/recharge/${id}/confirm`, { method: 'POST', body: JSON.stringify({ txRef }) }),
  exchange: (rechargeId: number) =>
    request('/api/user/exchange', { method: 'POST', body: JSON.stringify({ rechargeId }) }),
};
