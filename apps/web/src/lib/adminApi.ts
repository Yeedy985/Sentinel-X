const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const DEV_MODE = !API_BASE || API_BASE === 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sentinel_admin_token');
}

export function setToken(token: string) {
  localStorage.setItem('sentinel_admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('sentinel_admin_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/* ──────────── Dev Mock Data ──────────── */
const MOCK_ADMIN = { email: 'admin@sentinel.aags.app', password: 'admin' };

const mockDashboard = {
  today: {
    totalScans: 312,
    realScans: 68,
    cachedScans: 244,
    cacheHitRate: 0.782,
    revenue: 6.24,
    cost: 1.234,
    profit: 5.006,
    profitRate: 0.802,
    activeUsers: 47,
    newUsers: 3,
    rechargeTotal: 120,
  },
  thisMonth: {
    totalScans: 18420,
    revenue: 368.40,
    cost: 42.10,
    profit: 326.30,
    newUsers: 28,
    rechargeTotal: 2400,
  },
};

const mockUsers = {
  data: [
    { id: 1, email: 'alice@example.com', nickname: 'Alice', status: 'ACTIVE', tokenBalance: 520, scanCount: 89, tokenCount: 2, createdAt: '2025-12-01T08:00:00Z' },
    { id: 2, email: 'bob@test.com', nickname: 'Bob', status: 'ACTIVE', tokenBalance: 310, scanCount: 45, tokenCount: 1, createdAt: '2025-12-15T10:30:00Z' },
    { id: 3, email: 'carol@demo.io', nickname: 'Carol', status: 'SUSPENDED', tokenBalance: 0, scanCount: 12, tokenCount: 0, createdAt: '2026-01-03T14:00:00Z' },
    { id: 4, email: 'dave@corp.cn', nickname: 'Dave', status: 'ACTIVE', tokenBalance: 1200, scanCount: 230, tokenCount: 3, createdAt: '2025-11-20T06:00:00Z' },
    { id: 5, email: 'eve@mail.com', nickname: 'Eve', status: 'ACTIVE', tokenBalance: 80, scanCount: 15, tokenCount: 1, createdAt: '2026-02-10T12:00:00Z' },
  ],
  total: 128,
  page: 1,
  pageSize: 20,
  totalPages: 7,
};

let mockPipelineIdCounter = 4;
const mockPipelines: any[] = [
  { id: 1, role: 'SEARCHER', provider: 'perplexity', model: 'sonar-pro', apiUrl: 'https://api.perplexity.ai/chat/completions', apiKeyEnc: null, priority: 1, enabled: true, extraParams: null, updatedAt: '2026-03-01T10:00:00Z' },
  { id: 2, role: 'ANALYZER', provider: 'deepseek', model: 'deepseek-chat', apiUrl: 'https://api.deepseek.com/v1/chat/completions', apiKeyEnc: null, priority: 1, enabled: true, extraParams: null, updatedAt: '2026-03-01T10:00:00Z' },
  { id: 3, role: 'ANALYZER_BACKUP', provider: 'gemini', model: 'gemini-2.0-flash', apiUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeyEnc: null, priority: 2, enabled: true, extraParams: null, updatedAt: '2026-03-01T10:00:00Z' },
  { id: 4, role: 'ANALYZER_BACKUP', provider: 'openai', model: 'gpt-4o-mini', apiUrl: 'https://api.openai.com/v1/chat/completions', apiKeyEnc: null, priority: 3, enabled: false, extraParams: null, updatedAt: '2026-03-01T10:00:00Z' },
];

const mockSettings: Record<string, unknown> = {
  registration_enabled: true,
  new_user_bonus_tokens: 5,
  scan_price_basic: 1,
  scan_price_with_search: 2,
  cache_window_minutes: 5,
  max_scans_per_user_per_hour: 3,
  max_concurrent_scans: 10,
  token_to_cny_rate: 0.5,
  maintenance_mode: false,
  announcement: '',
};

const mockCosts = [
  { id: 1, provider: 'perplexity', role: 'SEARCHER', model: 'sonar-pro', costPerCall: 0.005 },
  { id: 2, provider: 'deepseek', role: 'ANALYZER', model: 'deepseek-chat', costPerCall: 0.0003 },
  { id: 3, provider: 'gemini', role: 'ANALYZER_BACKUP', model: 'gemini-2.0-flash', costPerCall: 0.0002 },
  { id: 4, provider: 'openai', role: 'ANALYZER_BACKUP', model: 'gpt-4o-mini', costPerCall: 0.0004 },
];

const mockSystemScans = {
  data: [
    { id: 1, briefingId: 'sys-20260311-0800', status: 'COMPLETED', enableSearch: true, signalCount: 12, alertCount: 2, tokenCostSearch: 850, tokenCostAnalyze: 2100, tokenCostTotal: 2950, realCostUsd: 0.0068, searcherProvider: 'perplexity', searcherModel: 'sonar-pro', analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat', errorMessage: null, startedAt: '2026-03-11T00:00:00Z', completedAt: '2026-03-11T00:00:38Z' },
    { id: 2, briefingId: 'sys-20260311-0400', status: 'COMPLETED', enableSearch: true, signalCount: 8, alertCount: 1, tokenCostSearch: 780, tokenCostAnalyze: 1950, tokenCostTotal: 2730, realCostUsd: 0.0061, searcherProvider: 'perplexity', searcherModel: 'sonar-pro', analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat', errorMessage: null, startedAt: '2026-03-10T20:00:00Z', completedAt: '2026-03-10T20:00:42Z' },
    { id: 3, briefingId: 'sys-20260310-2000', status: 'COMPLETED', enableSearch: true, signalCount: 15, alertCount: 3, tokenCostSearch: 920, tokenCostAnalyze: 2350, tokenCostTotal: 3270, realCostUsd: 0.0074, searcherProvider: 'perplexity', searcherModel: 'sonar-pro', analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat', errorMessage: null, startedAt: '2026-03-10T12:00:00Z', completedAt: '2026-03-10T12:00:45Z' },
    { id: 4, briefingId: 'sys-20260310-1200', status: 'FAILED', enableSearch: true, signalCount: 0, alertCount: 0, tokenCostSearch: 0, tokenCostAnalyze: 0, tokenCostTotal: 0, realCostUsd: 0, searcherProvider: 'perplexity', searcherModel: 'sonar-pro', analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat', errorMessage: 'DeepSeek API timeout after 30s', startedAt: '2026-03-10T04:00:00Z', completedAt: '2026-03-10T04:00:30Z' },
    { id: 5, briefingId: 'sys-20260310-0800', status: 'COMPLETED', enableSearch: false, signalCount: 6, alertCount: 0, tokenCostSearch: 0, tokenCostAnalyze: 1800, tokenCostTotal: 1800, realCostUsd: 0.0003, searcherProvider: null, searcherModel: null, analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat', errorMessage: null, startedAt: '2026-03-09T00:00:00Z', completedAt: '2026-03-09T00:00:28Z' },
  ],
  total: 42,
  page: 1,
  pageSize: 20,
  totalPages: 3,
};

const mockCallLogs = {
  data: [
    { id: 1, userId: 1, userEmail: 'alice@example.com', userNickname: 'Alice', briefingId: 'brf-a1b2c3', status: 'COMPLETED', isCached: false, enableSearch: true, tokenCost: 2, signalCount: 12, alertCount: 2, realCostUsd: 0.0068, revenueUsd: 1.0, profitUsd: 0.9932, errorMessage: null, startedAt: '2026-03-11T00:01:15Z', completedAt: '2026-03-11T00:01:53Z' },
    { id: 2, userId: 2, userEmail: 'bob@test.com', userNickname: 'Bob', briefingId: 'brf-d4e5f6', status: 'COMPLETED', isCached: true, enableSearch: true, tokenCost: 2, signalCount: 12, alertCount: 2, realCostUsd: 0.0068, revenueUsd: 1.0, profitUsd: 0.9932, errorMessage: null, startedAt: '2026-03-11T00:02:10Z', completedAt: '2026-03-11T00:02:10Z' },
    { id: 3, userId: 4, userEmail: 'dave@corp.cn', userNickname: 'Dave', briefingId: 'brf-g7h8i9', status: 'COMPLETED', isCached: true, enableSearch: true, tokenCost: 2, signalCount: 12, alertCount: 2, realCostUsd: 0.0068, revenueUsd: 1.0, profitUsd: 0.9932, errorMessage: null, startedAt: '2026-03-11T00:03:05Z', completedAt: '2026-03-11T00:03:05Z' },
    { id: 4, userId: 1, userEmail: 'alice@example.com', userNickname: 'Alice', briefingId: 'brf-j0k1l2', status: 'COMPLETED', isCached: false, enableSearch: false, tokenCost: 1, signalCount: 8, alertCount: 1, realCostUsd: 0.0003, revenueUsd: 0.5, profitUsd: 0.4997, errorMessage: null, startedAt: '2026-03-10T20:10:00Z', completedAt: '2026-03-10T20:10:35Z' },
    { id: 5, userId: 5, userEmail: 'eve@mail.com', userNickname: 'Eve', briefingId: 'brf-m3n4o5', status: 'COMPLETED', isCached: true, enableSearch: false, tokenCost: 1, signalCount: 8, alertCount: 1, realCostUsd: 0.0003, revenueUsd: 0.5, profitUsd: 0.4997, errorMessage: null, startedAt: '2026-03-10T20:11:30Z', completedAt: '2026-03-10T20:11:30Z' },
    { id: 6, userId: 2, userEmail: 'bob@test.com', userNickname: 'Bob', briefingId: 'brf-p6q7r8', status: 'FAILED', isCached: false, enableSearch: true, tokenCost: 2, signalCount: 0, alertCount: 0, realCostUsd: 0, revenueUsd: 0, profitUsd: 0, errorMessage: 'Pipeline timeout', startedAt: '2026-03-10T18:00:00Z', completedAt: '2026-03-10T18:00:30Z' },
    { id: 7, userId: 4, userEmail: 'dave@corp.cn', userNickname: 'Dave', briefingId: 'brf-s9t0u1', status: 'COMPLETED', isCached: true, enableSearch: true, tokenCost: 2, signalCount: 15, alertCount: 3, realCostUsd: 0.0074, revenueUsd: 1.0, profitUsd: 0.9926, errorMessage: null, startedAt: '2026-03-10T12:05:00Z', completedAt: '2026-03-10T12:05:00Z' },
  ],
  total: 312,
  page: 1,
  pageSize: 20,
  totalPages: 16,
};

const mockFinance = {
  summary: {
    totalScans: 1842,
    cachedScans: 1438,
    totalRevenue: 36840,
    totalCost: 4210.56,
    totalProfit: 32629.44,
  },
  daily: [
    { date: '2026-03-02', scans: 280, cached: 218, revenue: 580, cost: 68, profit: 512 },
    { date: '2026-03-03', scans: 295, cached: 230, revenue: 620, cost: 72, profit: 548 },
    { date: '2026-03-04', scans: 260, cached: 203, revenue: 540, cost: 61, profit: 479 },
    { date: '2026-03-05', scans: 340, cached: 265, revenue: 710, cost: 83, profit: 627 },
    { date: '2026-03-06', scans: 330, cached: 257, revenue: 690, cost: 79, profit: 611 },
    { date: '2026-03-07', scans: 310, cached: 242, revenue: 650, cost: 74, profit: 576 },
    { date: '2026-03-08', scans: 298, cached: 232, revenue: 624, cost: 71, profit: 553 },
  ],
};

function mockOk(data: any) { return Promise.resolve({ success: true, data }); }

function getMockResponse(path: string, options: RequestInit = {}): any {
  const method = options.method || 'GET';

  if (path === '/api/admin/login' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    const isMatch = (body.email === MOCK_ADMIN.email && body.password === MOCK_ADMIN.password)
      || (body.email === 'admin' && body.password === 'admin');
    if (isMatch) {
      return mockOk({ token: 'dev_mock_token_' + Date.now(), admin: { id: 1, email: MOCK_ADMIN.email, name: 'Sentinel Admin' } });
    }
    return Promise.resolve({ success: false, error: '邮箱或密码错误' });
  }
  if (path === '/api/admin/dashboard') return mockOk(mockDashboard);
  if (path.startsWith('/api/admin/users') && method === 'GET') return mockOk(mockUsers);
  if (path.includes('/status') && method === 'PATCH') return mockOk({ ok: true });
  if (path === '/api/admin/settings' && method === 'GET') return mockOk(mockSettings);
  if (path.startsWith('/api/admin/settings/') && method === 'PUT') return mockOk({ ok: true });
  if (path === '/api/admin/pipelines' && method === 'GET') return mockOk(mockPipelines);
  if (path.match(/\/api\/admin\/pipelines\/\d+/) && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const idx = mockPipelines.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const body = JSON.parse(options.body as string);
      if (body.apiKey) body.apiKeyEnc = '***encrypted***';
      delete body.apiKey;
      Object.assign(mockPipelines[idx], body, { updatedAt: new Date().toISOString() });
    }
    return mockOk({ ok: true });
  }
  if (path.match(/\/api\/admin\/pipelines\/\d+/) && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    const idx = mockPipelines.findIndex((p) => p.id === id);
    if (idx >= 0) mockPipelines.splice(idx, 1);
    return mockOk({ ok: true });
  }
  if (path === '/api/admin/pipelines' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    const newP = { id: ++mockPipelineIdCounter, ...body, apiKeyEnc: body.apiKey ? '***encrypted***' : null, updatedAt: new Date().toISOString() };
    delete newP.apiKey;
    mockPipelines.push(newP);
    return mockOk(newP);
  }
  if (path === '/api/admin/costs' && method === 'GET') return mockOk(mockCosts);
  if (path.startsWith('/api/admin/costs') && method === 'PUT') return mockOk({ ok: true });
  if (path.startsWith('/api/admin/finance')) return mockOk(mockFinance);
  if (path === '/api/admin/trigger-scan' && method === 'POST') {
    return mockOk({ briefingId: `admin-mock-${Date.now()}`, enableSearch: true, analyzerProvider: 'deepseek', analyzerModel: 'deepseek-chat' });
  }
  if (path.startsWith('/api/admin/trigger-scan/') && method === 'GET') {
    return mockOk({ briefingId: path.split('/').pop(), status: 'COMPLETED', signalCount: 8, alertCount: 1, tokenCostTotal: 2800, realCostUsd: 0.006, completedAt: new Date().toISOString() });
  }
  if (path.startsWith('/api/admin/system-scans')) return mockOk(mockSystemScans);
  if (path.startsWith('/api/admin/call-logs')) return mockOk(mockCallLogs);

  return mockOk(null);
}

/* ──────────── Real Request ──────────── */
async function request<T>(path: string, options: RequestInit = {}): Promise<any> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
    }
    return data;
  } catch {
    if (DEV_MODE) return getMockResponse(path, options);
    throw new Error('Backend unreachable');
  }
}

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    request('/api/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  getDashboard: () => request('/api/admin/dashboard'),
  getUsers: (page = 1, pageSize = 20) =>
    request(`/api/admin/users?page=${page}&pageSize=${pageSize}`),
  updateUserStatus: (id: number, status: string) =>
    request(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getSettings: () => request('/api/admin/settings'),
  updateSetting: (key: string, value: any) =>
    request(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getPipelines: () => request('/api/admin/pipelines'),
  updatePipeline: (id: number, data: any) =>
    request(`/api/admin/pipelines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createPipeline: (data: any) =>
    request('/api/admin/pipelines', { method: 'POST', body: JSON.stringify(data) }),
  getCosts: () => request('/api/admin/costs'),
  updateCost: (id: number, data: any) =>
    request(`/api/admin/costs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getFinance: (days?: number) =>
    request(`/api/admin/finance${days ? `?days=${days}` : ''}`),
  updateUserBalance: (id: number, amount: number, description?: string) =>
    request(`/api/admin/users/${id}/balance`, { method: 'PATCH', body: JSON.stringify({ amount, description }) }),
  deletePipeline: (id: number) =>
    request(`/api/admin/pipelines/${id}`, { method: 'DELETE' }),
  getSystemScans: (page = 1, pageSize = 20) =>
    request(`/api/admin/system-scans?page=${page}&pageSize=${pageSize}`),
  getCallLogs: (page = 1, pageSize = 20) =>
    request(`/api/admin/call-logs?page=${page}&pageSize=${pageSize}`),
  getSignals: (params?: { group?: string; enabled?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.group) qs.set('group', params.group);
    if (params?.enabled) qs.set('enabled', params.enabled);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return request(`/api/admin/signals${q ? `?${q}` : ''}`);
  },
  updateSignal: (id: number, data: any) =>
    request(`/api/admin/signals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleSignalGroup: (group: string, enabled: boolean) =>
    request('/api/admin/signals/toggle-group', { method: 'POST', body: JSON.stringify({ group, enabled }) }),
  resetSignals: () =>
    request('/api/admin/signals/reset', { method: 'POST' }),
  triggerScan: (enableSearch = true) =>
    request('/api/admin/trigger-scan', { method: 'POST', body: JSON.stringify({ enableSearch }) }),
  getScanStatus: (briefingId: string) =>
    request(`/api/admin/trigger-scan/${briefingId}`),
};
