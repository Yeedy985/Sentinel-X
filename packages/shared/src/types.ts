// ==================== API 请求/响应类型 ====================

// ── Auth ──
export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  email: string;
  nickname: string | null;
  tokenBalance: number;
  status: string;
  createdAt: string;
}

// ── API Token ──
export interface CreateApiTokenRequest {
  name?: string;
}

export interface ApiTokenInfo {
  id: number;
  tokenPrefix: string;
  name: string | null;
  lastUsedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface ApiTokenCreatedResponse {
  id: number;
  token: string; // 完整 token，仅创建时返回一次
  tokenPrefix: string;
  name: string | null;
}

// ── Scan ──
export interface ScanRequest {
  enableSearch?: boolean;
}

export interface ScanResponse {
  briefingId: string;
  estimatedSeconds: number;
  tokenCost: number;
  cached: boolean;
}

export interface ScanStatusResponse {
  ok: boolean;
  version: string;
  tokenBalance: number;
  nextScanAt?: number;
  message?: string;
}

export interface BriefingResponse {
  briefingId: string;
  timestamp: number;
  marketSummary: string;
  triggeredSignals: TriggeredSignal[];
  alerts: BriefingAlert[];
  pipelineInfo: PipelineInfo;
}

export interface TriggeredSignal {
  signalId: number;
  impact: number;
  confidence: number;
  title: string;
  summary: string;
  source: string;
}

export interface BriefingAlert {
  title: string;
  description: string;
  level: 'critical' | 'warning' | 'info';
  group: string;
  relatedCoins: string[];
  source: string;
}

export interface PipelineInfo {
  hasSearcher: boolean;
  hasMarketData: boolean;
  searcherProvider?: string;
  analyzerProvider: string;
  dataTimestamp?: number;
}

// ── Recharge ──
export interface RechargeRequest {
  amount: number;
  method: string;
  txRef?: string;
}

export interface RechargeRecordInfo {
  id: number;
  amount: number;
  method: string;
  txRef: string | null;
  status: string;
  note: string | null;
  createdAt: string;
}

export interface RechargeOrderResponse {
  id: number;
  usdtAmount: number;
  walletAddress: string;
  network: string;
  status: string;
  expiresAt: string;
}

export interface ExchangeRequest {
  rechargeId: number;
}

export interface ExchangeResponse {
  tokensGranted: number;
  newBalance: number;
  rate: number;
}

// ── Token Transaction ──
export interface TokenTransactionInfo {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  refId: string | null;
  description: string | null;
  createdAt: string;
}

// ── Scan History ──
export interface ScanRecordInfo {
  id: number;
  briefingId: string;
  tokenCost: number;
  status: string;
  isCached: boolean;
  signalCount: number;
  alertCount: number;
  enableSearch: boolean;
  startedAt: string;
  completedAt: string | null;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Admin ──
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminDashboardStats {
  today: {
    totalScans: number;
    realScans: number;
    cachedScans: number;
    cacheHitRate: number;
    revenue: number;
    cost: number;
    profit: number;
    profitRate: number;
    activeUsers: number;
    newUsers: number;
    rechargeTotal: number;
  };
  thisMonth: {
    totalScans: number;
    revenue: number;
    cost: number;
    profit: number;
    newUsers: number;
    rechargeTotal: number;
  };
}

export interface PipelineConfigInfo {
  id: number;
  role: string;
  provider: string;
  model: string;
  apiUrl: string;
  enabled: boolean;
  priority: number;
  extraParams: Record<string, unknown> | null;
}

export interface BillingConfig {
  cache_window_minutes: number;
  scan_price_basic: number;
  scan_price_with_search: number;
  token_to_cny_rate: number;
  max_scans_per_user_per_hour: number;
  max_concurrent_scans: number;
}

export interface SystemConfig {
  maintenance_mode: boolean;
  announcement: string;
  registration_enabled: boolean;
  new_user_bonus_tokens: number;
}

// ── SSE Event Types ──
export type SSEEventType = 'briefing' | 'progress' | 'error' | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

// ── Generic API Response ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
