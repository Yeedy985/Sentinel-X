import { create } from 'zustand';
import type { ApiConfig, Strategy, AccountInfo, SymbolInfo, TickerInfo } from '../types';

export interface RefreshIntervals {
  account: number;   // 账户数据刷新间隔 (ms)
  market: number;    // 行情数据刷新间隔 (ms)
  strategy: number;  // 策略监控刷新间隔 (ms)
}

interface AppState {
  // API Config
  apiConfig: ApiConfig | null;
  setApiConfig: (config: ApiConfig | null) => void;

  // Account
  accountInfo: AccountInfo | null;
  setAccountInfo: (info: AccountInfo | null) => void;

  // Symbols
  symbols: SymbolInfo[];
  setSymbols: (symbols: SymbolInfo[]) => void;

  // Tickers
  tickers: Map<string, TickerInfo>;
  setTickers: (tickers: TickerInfo[]) => void;
  updateTicker: (ticker: TickerInfo) => void;

  // Strategies
  strategies: Strategy[];
  setStrategies: (strategies: Strategy[]) => void;
  updateStrategy: (strategy: Strategy) => void;
  addStrategy: (strategy: Strategy) => void;
  removeStrategy: (id: number) => void;

  // UI State
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // Refresh Intervals
  refreshIntervals: RefreshIntervals;
  setRefreshIntervals: (intervals: Partial<RefreshIntervals>) => void;
}

export const useStore = create<AppState>((set) => ({
  apiConfig: null,
  setApiConfig: (config) => set({ apiConfig: config }),

  accountInfo: null,
  setAccountInfo: (info) => set({ accountInfo: info }),

  symbols: [],
  setSymbols: (symbols) => set({ symbols }),

  tickers: new Map(),
  setTickers: (tickerArr) =>
    set(() => {
      const map = new Map<string, TickerInfo>();
      tickerArr.forEach((t) => map.set(t.symbol, t));
      return { tickers: map };
    }),
  updateTicker: (ticker) =>
    set((state) => {
      const newMap = new Map(state.tickers);
      newMap.set(ticker.symbol, ticker);
      return { tickers: newMap };
    }),

  strategies: [],
  setStrategies: (strategies) => set({ strategies }),
  updateStrategy: (strategy) =>
    set((state) => ({
      strategies: state.strategies.map((s) => (s.id === strategy.id ? strategy : s)),
    })),
  addStrategy: (strategy) =>
    set((state) => ({ strategies: [...state.strategies, strategy] })),
  removeStrategy: (id) =>
    set((state) => ({ strategies: state.strategies.filter((s) => s.id !== id) })),

  selectedSymbol: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  activeTab: (typeof window !== 'undefined' && localStorage.getItem('aags_active_tab')) || 'dashboard',
  setActiveTab: (tab) => {
    if (typeof window !== 'undefined') localStorage.setItem('aags_active_tab', tab);
    set({ activeTab: tab });
  },
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  refreshIntervals: {
    account: 60000,    // 1分钟
    market: 10000,     // 10秒
    strategy: 5000,    // 5秒
  },
  setRefreshIntervals: (intervals) =>
    set((state) => ({
      refreshIntervals: { ...state.refreshIntervals, ...intervals },
    })),
}));
