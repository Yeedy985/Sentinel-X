// ==================== API Token 前缀 ====================
export const API_TOKEN_PREFIX = 'stx_';

// ==================== 默认配置值 ====================
export const DEFAULT_CACHE_WINDOW_MINUTES = 5;
export const DEFAULT_SCAN_PRICE_BASIC = 1;
export const DEFAULT_SCAN_PRICE_WITH_SEARCH = 2;
export const DEFAULT_TOKEN_TO_CNY_RATE = 0.5;
export const DEFAULT_MAX_SCANS_PER_USER_PER_HOUR = 3;
export const DEFAULT_MAX_CONCURRENT_SCANS = 10;
export const DEFAULT_NEW_USER_BONUS_TOKENS = 5;

// ==================== LLM Providers ====================
export const LLM_PROVIDERS = {
  perplexity: {
    name: 'Perplexity',
    defaultUrl: 'https://api.perplexity.ai/chat/completions',
    defaultModel: 'sonar-pro',
  },
  deepseek: {
    name: 'DeepSeek',
    defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  gemini: {
    name: 'Gemini',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
  },
  openai: {
    name: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
} as const;

// ==================== USDT 充值配置 ====================
export const USDT_WALLET_ADDRESS = 'TYourTRC20WalletAddressHere';
export const USDT_NETWORK = 'TRC20';
export const USDT_TO_TOKEN_RATE = 10; // 1 USDT = 10 Token
export const MIN_USDT_RECHARGE = 1;   // 最低充值 1 USDT
export const RECHARGE_EXPIRY_MINUTES = 60; // 充值订单有效期60分钟

// ==================== 版本 ====================
export const SERVICE_VERSION = '1.0.0';
