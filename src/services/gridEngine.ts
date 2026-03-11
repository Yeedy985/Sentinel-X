import type { Strategy, GridOrder, GridLayerConfig, Kline } from '../types';

// ==================== ATR 计算 ====================
export function calculateATR(klines: Kline[], period: number = 14): number {
  if (klines.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

// ==================== EMA 计算 ====================
export function calculateEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  ema[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema[i] = (closes[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

// ==================== 波动率等级 ====================
export function getVolatilityLevel(atr: number, price: number): { level: string; percent: number } {
  const percent = (atr / price) * 100;
  if (percent < 1) return { level: '低', percent };
  if (percent < 3) return { level: '中', percent };
  if (percent < 5) return { level: '高', percent };
  return { level: '极高', percent };
}

// ==================== 自适应区间计算 ====================
export function calculateAdaptiveRange(
  currentPrice: number,
  atr: number,
  multiplier: number = 2
): { upper: number; lower: number } {
  const range = atr * multiplier;
  return {
    upper: currentPrice + range,
    lower: Math.max(currentPrice - range, currentPrice * 0.01),
  };
}

// ==================== 生成网格价格 ====================
export function generateGridPrices(
  upperPrice: number,
  lowerPrice: number,
  gridCount: number
): number[] {
  const prices: number[] = [];
  const step = (upperPrice - lowerPrice) / gridCount;
  for (let i = 0; i <= gridCount; i++) {
    prices.push(lowerPrice + step * i);
  }
  return prices;
}

// ==================== 计算每格利润率 ====================
export function calculateGridProfitRates(
  layerConfig: GridLayerConfig,
  gridCount: number,
  _currentPrice: number,
  trend: 'bull' | 'bear' | 'neutral' = 'neutral'
): number[] {
  const rates: number[] = [];

  switch (layerConfig.profitMode) {
    case 'fixed_rate': {
      // 固定利润率: 区间宽度 / 网格数 / 中间价 * 100
      const midPrice = (layerConfig.upperPrice + layerConfig.lowerPrice) / 2;
      const autoRate = midPrice > 0 && gridCount > 0
        ? (layerConfig.upperPrice - layerConfig.lowerPrice) / gridCount / midPrice * 100
        : layerConfig.fixedProfitRate;
      for (let i = 0; i < gridCount; i++) rates.push(autoRate);
      break;
    }
    case 'per_grid': {
      // 每格独立: 从 minRate 线性递增到 maxRate
      const { perGridMinRate, perGridMaxRate } = layerConfig;
      for (let i = 0; i < gridCount; i++) {
        const t = gridCount > 1 ? i / (gridCount - 1) : 0;
        rates.push(perGridMinRate + (perGridMaxRate - perGridMinRate) * t);
      }
      break;
    }
    case 'distance_increase': {
      // 距离递增: 基础 + 每格递增 * 距离, 不超过上限
      const { distBaseRate, distIncreaseStep, distMaxRate } = layerConfig;
      const center = gridCount / 2;
      for (let i = 0; i < gridCount; i++) {
        const dist = Math.abs(i - center);
        const rate = distBaseRate + distIncreaseStep * dist;
        rates.push(Math.min(rate, distMaxRate));
      }
      break;
    }
    case 'trend_increase': {
      // 趋势模式: 基础 * 乘数
      const { trendBaseRate, trendBullMultiplier, trendBearMultiplier } = layerConfig;
      const multiplier = trend === 'bull' ? trendBullMultiplier
        : trend === 'bear' ? trendBearMultiplier
        : 1;
      const effectiveRate = trendBaseRate * multiplier;
      for (let i = 0; i < gridCount; i++) rates.push(effectiveRate);
      break;
    }
  }

  return rates;
}

// ==================== 生成网格订单 ====================
export function generateGridOrders(
  strategy: Strategy,
  currentPrice: number,
  layerConfig: GridLayerConfig,
  trend: 'bull' | 'bear' | 'neutral' = 'neutral'
): Omit<GridOrder, 'id'>[] {
  const orders: Omit<GridOrder, 'id'>[] = [];
  const gridPrices = generateGridPrices(layerConfig.upperPrice, layerConfig.lowerPrice, layerConfig.gridCount);
  const profitRates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, currentPrice, trend);
  const now = Date.now();

  const fundForLayer = strategy.totalFund * layerConfig.fundRatio;
  const perGridFund = fundForLayer / layerConfig.gridCount;

  for (let i = 0; i < gridPrices.length - 1; i++) {
    const gridLow = gridPrices[i];
    const gridHigh = gridPrices[i + 1];
    const gridMid = (gridLow + gridHigh) / 2;
    const profitRate = profitRates[i] / 100; // convert % to decimal

    if (gridMid < currentPrice) {
      // 低于当前价 → 挂买单 (在网格下边界买入)
      const buyPrice = gridLow;
      // 对应卖出价 = 买入价 * (1 + profitRate)
      const targetSellPrice = buyPrice * (1 + profitRate);
      const quantity = perGridFund / buyPrice;
      orders.push({
        strategyId: strategy.id!,
        layer: layerConfig.layer,
        gridIndex: i,
        side: 'buy',
        price: buyPrice,
        quantity,
        filledQuantity: 0,
        status: 'pending',
        targetPrice: targetSellPrice,
        profitRate: profitRates[i],
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // 高于当前价 → 挂卖单 (在网格上边界卖出)
      const sellPrice = gridHigh;
      // 对应买回价 = 卖出价 * (1 - profitRate)
      const targetBuyPrice = sellPrice * (1 - profitRate);
      const quantity = perGridFund / sellPrice;
      orders.push({
        strategyId: strategy.id!,
        layer: layerConfig.layer,
        gridIndex: i,
        side: 'sell',
        price: sellPrice,
        quantity,
        filledQuantity: 0,
        status: 'pending',
        targetPrice: targetBuyPrice,
        profitRate: profitRates[i],
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return orders;
}

// ==================== 利润分配处理 ====================
export function processProfitAllocation(
  profit: number,
  strategy: Strategy,
  currentPrice: number,
  _gridIndex?: number
): { usdtAmount: number; coinAmount: number; reinvestTarget?: 'per_grid' | 'whole_strategy' } {
  switch (strategy.profitAllocation) {
    case 'all_usdt':
      return { usdtAmount: profit, coinAmount: 0 };

    case 'all_coin':
      return { usdtAmount: 0, coinAmount: profit / currentPrice };

    case 'ratio': {
      const usdtPart = profit * (strategy.profitRatio / 100);
      const coinPart = (profit - usdtPart) / currentPrice;
      return { usdtAmount: usdtPart, coinAmount: coinPart };
    }

    case 'reinvest':
      // reinvestMode stored in strategy — per_grid or whole_strategy
      return {
        usdtAmount: 0,
        coinAmount: 0,
        reinvestTarget: (strategy as any).reinvestMode || 'per_grid',
      };

    case 'threshold_switch': {
      const holdCoinPrice = (strategy as any).thresholdHoldCoinPrice || strategy.centerPrice * 0.75;
      const holdUsdtPrice = (strategy as any).thresholdHoldUsdtPrice || strategy.centerPrice * 1.25;
      if (currentPrice <= holdCoinPrice) {
        // 低于持币价 → 全部持币
        return { usdtAmount: 0, coinAmount: profit / currentPrice };
      } else if (currentPrice >= holdUsdtPrice) {
        // 高于持U价 → 利润全部持U
        return { usdtAmount: profit, coinAmount: 0 };
      } else {
        // 中间价位 → 按比例 50/50
        return { usdtAmount: profit / 2, coinAmount: (profit / 2) / currentPrice };
      }
    }

    default:
      return { usdtAmount: profit, coinAmount: 0 };
  }
}

// ==================== 结束模式处理 ====================
export function generateEndOrders(
  strategy: Strategy,
  currentPrice: number,
  coinBalance: number,
  usdtBalance: number
): { action: string; orders: Array<{ side: 'BUY' | 'SELL'; type: 'MARKET'; quantity: number }> } {
  switch (strategy.endMode) {
    case 'hold_coin': {
      // 全部持币: 用剩余USDT买入
      if (usdtBalance > 10) {
        return {
          action: 'hold_coin',
          orders: [{ side: 'BUY', type: 'MARKET', quantity: usdtBalance / currentPrice }],
        };
      }
      return { action: 'hold_coin', orders: [] };
    }
    case 'hold_usdt': {
      // 全部持U: 卖出所有币
      if (coinBalance > 0) {
        return {
          action: 'hold_usdt',
          orders: [{ side: 'SELL', type: 'MARKET', quantity: coinBalance }],
        };
      }
      return { action: 'hold_usdt', orders: [] };
    }
    case 'keep_position':
      // 保持仓位: 不做任何操作
      return { action: 'keep_position', orders: [] };

    case 'force_close': {
      // 强制清仓: 卖出所有币
      if (coinBalance > 0) {
        return {
          action: 'force_close',
          orders: [{ side: 'SELL', type: 'MARKET', quantity: coinBalance }],
        };
      }
      return { action: 'force_close', orders: [] };
    }
    default:
      return { action: 'unknown', orders: [] };
  }
}

// ==================== 趋势判断 ====================
export function detectTrend(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26
): 'bull' | 'bear' | 'neutral' {
  if (closes.length < slowPeriod) return 'neutral';

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const lastFast = emaFast[emaFast.length - 1];
  const lastSlow = emaSlow[emaSlow.length - 1];
  const diff = (lastFast - lastSlow) / lastSlow * 100;

  if (diff > 1) return 'bull';
  if (diff < -1) return 'bear';
  return 'neutral';
}

// ==================== 熔断检测 ====================
export function checkCircuitBreak(
  klines: Kline[],
  dropThreshold: number,
  volumeMultiple: number
): { triggered: boolean; reason: string } {
  if (klines.length < 6) return { triggered: false, reason: '' };

  // 5分钟跌幅检测（用最近5根1m K线）
  const recent = klines.slice(-6);
  const priceChange = (recent[recent.length - 1].close - recent[0].open) / recent[0].open * 100;

  if (priceChange < -dropThreshold) {
    return { triggered: true, reason: `5分钟跌幅 ${priceChange.toFixed(2)}% 超过阈值 -${dropThreshold}%` };
  }

  // 成交量异常检测
  const avgVolume = klines.slice(-20, -1).reduce((a, k) => a + k.volume, 0) / 19;
  const lastVolume = klines[klines.length - 1].volume;

  if (lastVolume > avgVolume * volumeMultiple) {
    return { triggered: true, reason: `成交量异常放大 ${(lastVolume / avgVolume).toFixed(1)}x` };
  }

  return { triggered: false, reason: '' };
}

// ==================== 回撤计算 ====================
export function calculateDrawdown(equityCurve: number[]): number {
  let maxEquity = 0;
  let maxDrawdown = 0;

  for (const equity of equityCurve) {
    if (equity > maxEquity) maxEquity = equity;
    const drawdown = (maxEquity - equity) / maxEquity * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

// ==================== 格式化精度 ====================
export function formatPrice(price: number, precision: number = 2): string {
  return price.toFixed(precision);
}

export function formatQuantity(qty: number, stepSize: string): string {
  const precision = stepSize.indexOf('1') - stepSize.indexOf('.');
  return qty.toFixed(Math.max(0, precision));
}
