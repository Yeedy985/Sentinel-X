/**
 * 网格策略挂单测试 - 模拟币安接口验证所有挂单逻辑
 * 
 * 测试覆盖:
 * 1. 四种利润模式: 固定利润率 / 每格独立 / 距离递增 / 趋势模式
 * 2. 五种利润分配: 全部USDT / 全部币 / 按比例 / 滚动投入 / 阈值切换
 * 3. 四种结束模式: 全部持币 / 全部持U / 保持仓位 / 强制清仓
 * 4. 币安接口约束验证: 价格精度 / 最小下单量 / 最小名义价值
 * 
 * 运行: npx tsx src/tests/gridOrderTest.ts
 */

import type { Strategy, GridLayerConfig, GridOrder, SymbolInfo } from '../types';
import {
  calculateGridProfitRates,
  generateGridOrders,
  processProfitAllocation,
  generateEndOrders,
  formatPrice,
  formatQuantity,
} from '../services/gridEngine';

// ==================== 模拟币安交易对信息 ====================
const MOCK_SYMBOL_INFO: SymbolInfo = {
  symbol: 'BTCUSDT',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  pricePrecision: 2,
  quantityPrecision: 5,
  minNotional: 10,
  minQty: 0.00001,
  stepSize: '0.00001',
  tickSize: '0.01',
};

const CURRENT_PRICE = 95000;
const ENTRY_PRICE = 95000;

// ==================== 模拟币安挂单验证 ====================
interface BinanceMockOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: string;
  quantity: string;
  timeInForce: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateBinanceOrder(order: Omit<GridOrder, 'id'>, symbolInfo: SymbolInfo): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 价格精度检查
  const priceStr = formatPrice(order.price, symbolInfo.pricePrecision);
  const priceParsed = parseFloat(priceStr);
  if (Math.abs(priceParsed - order.price) > parseFloat(symbolInfo.tickSize)) {
    errors.push(`价格精度不符: ${order.price} -> tickSize=${symbolInfo.tickSize}`);
  }

  // 2. 数量精度检查
  const qtyStr = formatQuantity(order.quantity, symbolInfo.stepSize);
  const qtyParsed = parseFloat(qtyStr);
  if (qtyParsed < symbolInfo.minQty) {
    errors.push(`数量低于最小下单量: ${qtyParsed} < ${symbolInfo.minQty}`);
  }

  // 3. 最小名义价值检查 (price * quantity >= minNotional)
  const notional = order.price * order.quantity;
  if (notional < symbolInfo.minNotional) {
    errors.push(`名义价值不足: ${notional.toFixed(2)} < ${symbolInfo.minNotional} USDT`);
  }

  // 4. 价格合理性检查
  if (order.price <= 0) {
    errors.push(`价格为零或负数: ${order.price}`);
  }
  if (order.quantity <= 0) {
    errors.push(`数量为零或负数: ${order.quantity}`);
  }

  // 5. 买卖方向合理性
  if (order.side === 'buy' && order.price > CURRENT_PRICE * 1.01) {
    warnings.push(`买单价格高于市价: ${order.price.toFixed(2)} > ${CURRENT_PRICE}`);
  }
  if (order.side === 'sell' && order.price < CURRENT_PRICE * 0.99) {
    warnings.push(`卖单价格低于市价: ${order.price.toFixed(2)} < ${CURRENT_PRICE}`);
  }

  // 6. targetPrice 检查
  if (order.targetPrice !== undefined) {
    if (order.side === 'buy' && order.targetPrice <= order.price) {
      errors.push(`买单目标卖价应高于买入价: target=${order.targetPrice.toFixed(2)} <= buy=${order.price.toFixed(2)}`);
    }
    if (order.side === 'sell' && order.targetPrice >= order.price) {
      errors.push(`卖单目标买价应低于卖出价: target=${order.targetPrice.toFixed(2)} >= sell=${order.price.toFixed(2)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function toBinanceMockOrder(order: Omit<GridOrder, 'id'>, symbolInfo: SymbolInfo): BinanceMockOrder {
  return {
    symbol: symbolInfo.symbol,
    side: order.side === 'buy' ? 'BUY' : 'SELL',
    type: 'LIMIT',
    price: formatPrice(order.price, symbolInfo.pricePrecision),
    quantity: formatQuantity(order.quantity, symbolInfo.stepSize),
    timeInForce: 'GTC',
  };
}

// ==================== 构建测试策略 ====================
function createTestStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    name: '测试策略',
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    status: 'idle',
    totalFund: 10000,
    usedFund: 0,
    rangeMode: 'fixed',
    upperPrice: ENTRY_PRICE * 1.3,
    lowerPrice: ENTRY_PRICE * 0.7,
    centerPrice: ENTRY_PRICE,
    atrPeriod: 14,
    atrMultiplier: 2,
    layers: [],
    profitAllocation: 'all_usdt',
    profitRatio: 50,
    profitThreshold: 0,
    trendSellAbovePercent: 25,
    trendBuyBelowPercent: 25,
    risk: {
      circuitBreakEnabled: true,
      circuitBreakDropPercent: 5,
      circuitBreakVolumeMultiple: 5,
      dailyDrawdownEnabled: true,
      dailyDrawdownPercent: 5,
      maxPositionEnabled: true,
      maxPositionPercent: 80,
      trendDefenseEnabled: true,
      trendDefenseEmaFast: 12,
      trendDefenseEmaSlow: 26,
    },
    autoRebalance: true,
    rebalanceStepPercent: 5,
    endMode: 'keep_position',
    totalProfit: 0,
    todayProfit: 0,
    totalTrades: 0,
    winTrades: 0,
    maxDrawdown: 0,
    createdAt: Date.now(),
    id: 1,
    ...overrides,
  };
}

function createLayerConfig(layer: 'trend' | 'swing' | 'spike', overrides: Partial<GridLayerConfig> = {}): GridLayerConfig {
  const defaults: Record<string, GridLayerConfig> = {
    trend: {
      layer: 'trend', enabled: true, gridCount: 10, rangeRatio: 1.0, fundRatio: 0.3,
      upperPrice: ENTRY_PRICE * 1.3, lowerPrice: ENTRY_PRICE * 0.7,
      profitRate: 3, profitMode: 'distance_increase',
      fixedProfitRate: 3, perGridMinRate: 2, perGridMaxRate: 5,
      distBaseRate: 1.5, distIncreaseStep: 0.3, distMaxRate: 8,
      trendBaseRate: 3, trendBullMultiplier: 0.8, trendBearMultiplier: 1.5,
    },
    swing: {
      layer: 'swing', enabled: true, gridCount: 30, rangeRatio: 0.6, fundRatio: 0.5,
      upperPrice: ENTRY_PRICE * 1.18, lowerPrice: ENTRY_PRICE * 0.82,
      profitRate: 1.5, profitMode: 'fixed_rate',
      fixedProfitRate: 1.5, perGridMinRate: 0.8, perGridMaxRate: 3,
      distBaseRate: 1, distIncreaseStep: 0.2, distMaxRate: 4,
      trendBaseRate: 1.5, trendBullMultiplier: 0.8, trendBearMultiplier: 1.3,
    },
    spike: {
      layer: 'spike', enabled: true, gridCount: 4, rangeRatio: 1.5, fundRatio: 0.2,
      upperPrice: ENTRY_PRICE * 1.45, lowerPrice: ENTRY_PRICE * 0.55,
      profitRate: 10, profitMode: 'fixed_rate',
      fixedProfitRate: 10, perGridMinRate: 10, perGridMaxRate: 30,
      distBaseRate: 5, distIncreaseStep: 2, distMaxRate: 30,
      trendBaseRate: 10, trendBullMultiplier: 0.7, trendBearMultiplier: 2,
    },
  };
  return { ...defaults[layer], ...overrides };
}

// ==================== 测试报告 ====================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logSection(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function logSubSection(title: string) {
  console.log(`\n  ── ${title} ──`);
}

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`    ✅ ${message}`);
  } else {
    failedTests++;
    console.log(`    ❌ ${message}`);
  }
}

// ==================== 测试1: 利润模式 - 固定利润率 ====================
function testFixedRate() {
  logSection('测试1: 固定利润率模式 (fixed_rate)');

  const strategy = createTestStrategy();
  const layerConfig = createLayerConfig('swing', { profitMode: 'fixed_rate' });
  const orders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig);

  logSubSection('基本验证');
  assert(orders.length === layerConfig.gridCount, `订单数量 = ${orders.length}, 期望 ${layerConfig.gridCount}`);

  const buyOrders = orders.filter(o => o.side === 'buy');
  const sellOrders = orders.filter(o => o.side === 'sell');
  assert(buyOrders.length > 0, `买单数量 = ${buyOrders.length}`);
  assert(sellOrders.length > 0, `卖单数量 = ${sellOrders.length}`);

  logSubSection('利润率验证 (固定利润率 = 区间宽度/网格数/中间价)');
  const rates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE);
  const expectedRate = (layerConfig.upperPrice - layerConfig.lowerPrice) / layerConfig.gridCount
    / ((layerConfig.upperPrice + layerConfig.lowerPrice) / 2) * 100;
  assert(
    Math.abs(rates[0] - expectedRate) < 0.01,
    `自动计算利润率 = ${rates[0].toFixed(4)}%, 期望 ≈ ${expectedRate.toFixed(4)}%`
  );
  assert(
    rates.every(r => Math.abs(r - rates[0]) < 0.001),
    `所有格利润率一致: ${rates[0].toFixed(4)}%`
  );

  logSubSection('币安接口验证');
  let allValid = true;
  for (const order of orders) {
    const result = validateBinanceOrder(order, MOCK_SYMBOL_INFO);
    if (!result.valid) {
      allValid = false;
      console.log(`      Grid[${order.gridIndex}] ${order.side}: ${result.errors.join(', ')}`);
    }
  }
  assert(allValid, '所有订单通过币安接口验证');

  logSubSection('目标价格验证');
  for (const order of buyOrders.slice(0, 3)) {
    assert(
      order.targetPrice! > order.price,
      `买单[${order.gridIndex}] 目标卖价 ${order.targetPrice!.toFixed(2)} > 买价 ${order.price.toFixed(2)}`
    );
  }
  for (const order of sellOrders.slice(0, 3)) {
    assert(
      order.targetPrice! < order.price,
      `卖单[${order.gridIndex}] 目标买价 ${order.targetPrice!.toFixed(2)} < 卖价 ${order.price.toFixed(2)}`
    );
  }
}

// ==================== 测试2: 利润模式 - 每格独立 ====================
function testPerGrid() {
  logSection('测试2: 每格独立模式 (per_grid)');

  const layerConfig = createLayerConfig('spike', {
    profitMode: 'per_grid',
    perGridMinRate: 10,
    perGridMaxRate: 30,
  });
  const strategy = createTestStrategy();
  const orders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig);

  logSubSection('利润率线性分配验证');
  const rates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE);
  assert(
    Math.abs(rates[0] - 10) < 0.01,
    `第一格利润率 = ${rates[0].toFixed(2)}%, 期望 10%`
  );
  assert(
    Math.abs(rates[rates.length - 1] - 30) < 0.01,
    `最后格利润率 = ${rates[rates.length - 1].toFixed(2)}%, 期望 30%`
  );

  // 验证线性递增
  let isLinear = true;
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] < rates[i - 1] - 0.01) {
      isLinear = false;
      break;
    }
  }
  assert(isLinear, `利润率线性递增: [${rates.map(r => r.toFixed(1)).join(', ')}]`);

  logSubSection('币安接口验证');
  let allValid = true;
  for (const order of orders) {
    const result = validateBinanceOrder(order, MOCK_SYMBOL_INFO);
    if (!result.valid) {
      allValid = false;
      console.log(`      Grid[${order.gridIndex}] ${order.side}: ${result.errors.join(', ')}`);
    }
  }
  assert(allValid, '所有订单通过币安接口验证');
}

// ==================== 测试3: 利润模式 - 距离递增 ====================
function testDistanceIncrease() {
  logSection('测试3: 距离递增模式 (distance_increase)');

  const layerConfig = createLayerConfig('trend', {
    profitMode: 'distance_increase',
    distBaseRate: 1.5,
    distIncreaseStep: 0.3,
    distMaxRate: 8,
  });
  const strategy = createTestStrategy();
  const orders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig);

  logSubSection('利润率距离递增验证');
  const rates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE);
  const center = layerConfig.gridCount / 2;

  // 中间的格利润率最低
  const centerRate = rates[Math.floor(center)];
  assert(
    Math.abs(centerRate - 1.5) < 0.01,
    `中心格利润率 = ${centerRate.toFixed(2)}%, 期望 ≈ 1.5%`
  );

  // 边缘的格利润率更高
  const edgeRate0 = rates[0];
  const edgeRateLast = rates[rates.length - 1];
  assert(edgeRate0 > centerRate, `边缘格[0] 利润率 ${edgeRate0.toFixed(2)}% > 中心 ${centerRate.toFixed(2)}%`);
  assert(edgeRateLast > centerRate, `边缘格[${rates.length - 1}] 利润率 ${edgeRateLast.toFixed(2)}% > 中心 ${centerRate.toFixed(2)}%`);

  // 不超过上限
  assert(rates.every(r => r <= 8), `所有利润率 <= 最大上限 8%`);

  console.log(`    利润率分布: [${rates.map(r => r.toFixed(2)).join(', ')}]`);

  logSubSection('币安接口验证');
  let allValid = true;
  for (const order of orders) {
    const result = validateBinanceOrder(order, MOCK_SYMBOL_INFO);
    if (!result.valid) {
      allValid = false;
      console.log(`      Grid[${order.gridIndex}] ${order.side}: ${result.errors.join(', ')}`);
    }
  }
  assert(allValid, '所有订单通过币安接口验证');
}

// ==================== 测试4: 利润模式 - 趋势模式 ====================
function testTrendIncrease() {
  logSection('测试4: 趋势模式 (trend_increase)');

  const layerConfig = createLayerConfig('trend', {
    profitMode: 'trend_increase',
    trendBaseRate: 3,
    trendBullMultiplier: 0.8,
    trendBearMultiplier: 1.5,
  });
  const strategy = createTestStrategy();

  logSubSection('多头趋势');
  const bullRates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE, 'bull');
  const expectedBull = 3 * 0.8;
  assert(
    Math.abs(bullRates[0] - expectedBull) < 0.01,
    `多头利润率 = ${bullRates[0].toFixed(2)}%, 期望 ${expectedBull}% (3% × 80%)`
  );

  const bullOrders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig, 'bull');
  assert(bullOrders.length === layerConfig.gridCount, `多头订单数 = ${bullOrders.length}`);

  logSubSection('空头趋势');
  const bearRates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE, 'bear');
  const expectedBear = 3 * 1.5;
  assert(
    Math.abs(bearRates[0] - expectedBear) < 0.01,
    `空头利润率 = ${bearRates[0].toFixed(2)}%, 期望 ${expectedBear}% (3% × 150%)`
  );

  const bearOrders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig, 'bear');
  assert(bearOrders.length === layerConfig.gridCount, `空头订单数 = ${bearOrders.length}`);

  logSubSection('中性趋势');
  const neutralRates = calculateGridProfitRates(layerConfig, layerConfig.gridCount, CURRENT_PRICE, 'neutral');
  assert(
    Math.abs(neutralRates[0] - 3) < 0.01,
    `中性利润率 = ${neutralRates[0].toFixed(2)}%, 期望 3% (3% × 100%)`
  );

  logSubSection('多头 vs 空头: 买卖价差对比');
  const bullBuy = bullOrders.filter(o => o.side === 'buy')[0];
  const bearBuy = bearOrders.filter(o => o.side === 'buy')[0];
  if (bullBuy && bearBuy) {
    const bullSpread = (bullBuy.targetPrice! - bullBuy.price) / bullBuy.price * 100;
    const bearSpread = (bearBuy.targetPrice! - bearBuy.price) / bearBuy.price * 100;
    assert(
      bearSpread > bullSpread,
      `空头价差 ${bearSpread.toFixed(2)}% > 多头价差 ${bullSpread.toFixed(2)}%`
    );
  }

  logSubSection('币安接口验证');
  let allValid = true;
  for (const order of [...bullOrders, ...bearOrders]) {
    const result = validateBinanceOrder(order, MOCK_SYMBOL_INFO);
    if (!result.valid) {
      allValid = false;
      console.log(`      Grid[${order.gridIndex}] ${order.side}: ${result.errors.join(', ')}`);
    }
  }
  assert(allValid, '所有趋势订单通过币安接口验证');
}

// ==================== 测试5: 利润分配模式 ====================
function testProfitAllocation() {
  logSection('测试5: 利润分配模式 (5种)');
  const profit = 100; // 100 USDT profit

  logSubSection('全部转为 USDT (all_usdt)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'all_usdt' });
    const result = processProfitAllocation(profit, strategy, CURRENT_PRICE);
    assert(result.usdtAmount === 100, `USDT = ${result.usdtAmount}`);
    assert(result.coinAmount === 0, `Coin = ${result.coinAmount}`);
  }

  logSubSection('全部转为币 (all_coin)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'all_coin' });
    const result = processProfitAllocation(profit, strategy, CURRENT_PRICE);
    assert(result.usdtAmount === 0, `USDT = ${result.usdtAmount}`);
    assert(
      Math.abs(result.coinAmount - profit / CURRENT_PRICE) < 0.000001,
      `Coin = ${result.coinAmount.toFixed(8)} BTC (≈ ${(result.coinAmount * CURRENT_PRICE).toFixed(2)} USDT)`
    );
  }

  logSubSection('按比例分配 (ratio 60% USDT)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'ratio', profitRatio: 60 });
    const result = processProfitAllocation(profit, strategy, CURRENT_PRICE);
    assert(
      Math.abs(result.usdtAmount - 60) < 0.01,
      `USDT = ${result.usdtAmount.toFixed(2)}, 期望 60`
    );
    assert(
      Math.abs(result.coinAmount - 40 / CURRENT_PRICE) < 0.000001,
      `Coin = ${result.coinAmount.toFixed(8)} BTC (≈ 40 USDT)`
    );
  }

  logSubSection('自动滚动投入 - 投入当前网格 (reinvest per_grid)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'reinvest' });
    (strategy as any).reinvestMode = 'per_grid';
    const result = processProfitAllocation(profit, strategy, CURRENT_PRICE, 5);
    assert(result.usdtAmount === 0, `USDT = 0 (全部复投)`);
    assert(result.coinAmount === 0, `Coin = 0 (全部复投)`);
    assert(result.reinvestTarget === 'per_grid', `复投目标 = per_grid`);
  }

  logSubSection('自动滚动投入 - 投入整个策略 (reinvest whole_strategy)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'reinvest' });
    (strategy as any).reinvestMode = 'whole_strategy';
    const result = processProfitAllocation(profit, strategy, CURRENT_PRICE);
    assert(result.reinvestTarget === 'whole_strategy', `复投目标 = whole_strategy`);
  }

  logSubSection('阈值切换 - 低于持币价 (threshold_switch)');
  {
    const strategy = createTestStrategy({ profitAllocation: 'threshold_switch', centerPrice: ENTRY_PRICE });
    (strategy as any).thresholdHoldCoinPrice = ENTRY_PRICE * 0.75;
    (strategy as any).thresholdHoldUsdtPrice = ENTRY_PRICE * 1.25;
    const lowPrice = ENTRY_PRICE * 0.7; // 低于持币价
    const result = processProfitAllocation(profit, strategy, lowPrice);
    assert(result.usdtAmount === 0, `低价时 USDT = 0 (全部持币)`);
    assert(result.coinAmount > 0, `低价时 Coin = ${result.coinAmount.toFixed(8)} BTC`);
  }

  logSubSection('阈值切换 - 高于持U价');
  {
    const strategy = createTestStrategy({ profitAllocation: 'threshold_switch', centerPrice: ENTRY_PRICE });
    (strategy as any).thresholdHoldCoinPrice = ENTRY_PRICE * 0.75;
    (strategy as any).thresholdHoldUsdtPrice = ENTRY_PRICE * 1.25;
    const highPrice = ENTRY_PRICE * 1.3; // 高于持U价
    const result = processProfitAllocation(profit, strategy, highPrice);
    assert(result.usdtAmount === 100, `高价时 USDT = 100 (全部持U)`);
    assert(result.coinAmount === 0, `高价时 Coin = 0`);
  }

  logSubSection('阈值切换 - 中间价位');
  {
    const strategy = createTestStrategy({ profitAllocation: 'threshold_switch', centerPrice: ENTRY_PRICE });
    (strategy as any).thresholdHoldCoinPrice = ENTRY_PRICE * 0.75;
    (strategy as any).thresholdHoldUsdtPrice = ENTRY_PRICE * 1.25;
    const midPrice = ENTRY_PRICE; // 在中间
    const result = processProfitAllocation(profit, strategy, midPrice);
    assert(
      Math.abs(result.usdtAmount - 50) < 0.01,
      `中间价 USDT = ${result.usdtAmount.toFixed(2)}, 期望 50 (50/50分配)`
    );
    assert(result.coinAmount > 0, `中间价 Coin = ${result.coinAmount.toFixed(8)} BTC`);
  }
}

// ==================== 测试6: 结束模式 ====================
function testEndModes() {
  logSection('测试6: 结束模式 (4种)');
  const coinBalance = 0.5; // 0.5 BTC
  const usdtBalance = 5000; // 5000 USDT

  logSubSection('全部持币 (hold_coin)');
  {
    const strategy = createTestStrategy({ endMode: 'hold_coin' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, coinBalance, usdtBalance);
    assert(result.action === 'hold_coin', `动作 = hold_coin`);
    assert(result.orders.length === 1, `订单数 = 1 (用USDT买入)`);
    assert(result.orders[0].side === 'BUY', `方向 = BUY`);
    assert(result.orders[0].type === 'MARKET', `类型 = MARKET`);
    const expectedQty = usdtBalance / CURRENT_PRICE;
    assert(
      Math.abs(result.orders[0].quantity - expectedQty) < 0.0001,
      `买入数量 = ${result.orders[0].quantity.toFixed(5)} BTC (≈ ${usdtBalance} USDT)`
    );
  }

  logSubSection('全部持币 - USDT不足 (hold_coin, low balance)');
  {
    const strategy = createTestStrategy({ endMode: 'hold_coin' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, coinBalance, 5); // only 5 USDT
    assert(result.orders.length === 0, `USDT <= 10 时不下单`);
  }

  logSubSection('全部持U (hold_usdt)');
  {
    const strategy = createTestStrategy({ endMode: 'hold_usdt' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, coinBalance, usdtBalance);
    assert(result.action === 'hold_usdt', `动作 = hold_usdt`);
    assert(result.orders.length === 1, `订单数 = 1 (卖出所有币)`);
    assert(result.orders[0].side === 'SELL', `方向 = SELL`);
    assert(result.orders[0].quantity === coinBalance, `卖出数量 = ${coinBalance} BTC`);
  }

  logSubSection('全部持U - 无币 (hold_usdt, no coin)');
  {
    const strategy = createTestStrategy({ endMode: 'hold_usdt' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, 0, usdtBalance);
    assert(result.orders.length === 0, `无币时不下单`);
  }

  logSubSection('保持仓位 (keep_position)');
  {
    const strategy = createTestStrategy({ endMode: 'keep_position' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, coinBalance, usdtBalance);
    assert(result.action === 'keep_position', `动作 = keep_position`);
    assert(result.orders.length === 0, `不下任何单`);
  }

  logSubSection('强制清仓 (force_close)');
  {
    const strategy = createTestStrategy({ endMode: 'force_close' });
    const result = generateEndOrders(strategy, CURRENT_PRICE, coinBalance, usdtBalance);
    assert(result.action === 'force_close', `动作 = force_close`);
    assert(result.orders.length === 1, `订单数 = 1 (市价卖出所有币)`);
    assert(result.orders[0].side === 'SELL', `方向 = SELL`);
    assert(result.orders[0].quantity === coinBalance, `卖出数量 = ${coinBalance} BTC`);
  }
}

// ==================== 测试7: 三层综合挂单 ====================
function testThreeLayerOrders() {
  logSection('测试7: 三层综合挂单验证');

  const strategy = createTestStrategy();
  const layers = [
    createLayerConfig('trend', { profitMode: 'distance_increase' }),
    createLayerConfig('swing', { profitMode: 'fixed_rate' }),
    createLayerConfig('spike', { profitMode: 'per_grid', perGridMinRate: 10, perGridMaxRate: 30 }),
  ];

  let totalOrders = 0;
  let totalFundUsed = 0;

  for (const layer of layers) {
    logSubSection(`${layer.layer} 层 (${layer.profitMode})`);

    const orders = generateGridOrders(strategy, CURRENT_PRICE, layer);
    totalOrders += orders.length;

    const layerFund = strategy.totalFund * layer.fundRatio;
    totalFundUsed += layerFund;

    assert(orders.length === layer.gridCount, `订单数 = ${orders.length} (期望 ${layer.gridCount})`);

    // 验证所有价格在层区间内
    const pricesInRange = orders.every(o =>
      o.price >= layer.lowerPrice * 0.999 && o.price <= layer.upperPrice * 1.001
    );
    assert(pricesInRange, `所有价格在 ${layer.lowerPrice.toFixed(2)} - ${layer.upperPrice.toFixed(2)} 区间内`);

    // 验证买卖单分布
    const buys = orders.filter(o => o.side === 'buy');
    const sells = orders.filter(o => o.side === 'sell');
    console.log(`    📊 买单 ${buys.length} / 卖单 ${sells.length} / 资金 ${layerFund.toFixed(0)} USDT`);

    // 币安接口验证
    let validCount = 0;
    for (const order of orders) {
      const result = validateBinanceOrder(order, MOCK_SYMBOL_INFO);
      if (result.valid) validCount++;
      else {
        console.log(`      ⚠️ Grid[${order.gridIndex}]: ${result.errors.join(', ')}`);
      }
    }
    assert(validCount === orders.length, `${validCount}/${orders.length} 订单通过币安接口验证`);
  }

  console.log(`\n    📈 总订单数: ${totalOrders}, 总资金: ${totalFundUsed.toFixed(0)} USDT`);

  // 资金比例合计验证
  const fundRatioSum = layers.reduce((s, l) => s + l.fundRatio, 0);
  assert(
    Math.abs(fundRatioSum - 1.0) < 0.01,
    `资金比例合计 = ${(fundRatioSum * 100).toFixed(0)}% (期望 100%)`
  );
}

// ==================== 测试8: 模拟币安挂单输出 ====================
function testBinanceMockOrders() {
  logSection('测试8: 模拟币安 LIMIT 挂单输出');

  const strategy = createTestStrategy();
  const layerConfig = createLayerConfig('swing', { profitMode: 'fixed_rate', gridCount: 6 });
  const orders = generateGridOrders(strategy, CURRENT_PRICE, layerConfig);

  console.log('\n    模拟币安 API 请求:');
  console.log('    ─'.repeat(30));

  for (const order of orders) {
    const mock = toBinanceMockOrder(order, MOCK_SYMBOL_INFO);
    const profitRateStr = order.profitRate ? `${order.profitRate.toFixed(2)}%` : '-';
    const targetStr = order.targetPrice ? formatPrice(order.targetPrice, MOCK_SYMBOL_INFO.pricePrecision) : '-';

    console.log(
      `    ${mock.side.padEnd(4)} | price=${mock.price.padStart(10)} | qty=${mock.quantity.padStart(10)} ` +
      `| profit=${profitRateStr.padStart(6)} | target=${targetStr.padStart(10)} | ${mock.timeInForce}`
    );
  }

  // 验证买卖单价格排序
  const buys = orders.filter(o => o.side === 'buy').sort((a, b) => b.price - a.price);
  const sells = orders.filter(o => o.side === 'sell').sort((a, b) => a.price - b.price);

  if (buys.length > 0 && sells.length > 0) {
    assert(
      buys[0].price < sells[0].price,
      `最高买价 ${buys[0].price.toFixed(2)} < 最低卖价 ${sells[0].price.toFixed(2)}`
    );
  }
}

// ==================== 运行所有测试 ====================
console.log('🔧 网格策略挂单综合测试');
console.log(`模拟交易对: ${MOCK_SYMBOL_INFO.symbol}, 当前价: ${CURRENT_PRICE}`);
console.log(`开仓价: ${ENTRY_PRICE}, 资金: 10000 USDT`);

testFixedRate();
testPerGrid();
testDistanceIncrease();
testTrendIncrease();
testProfitAllocation();
testEndModes();
testThreeLayerOrders();
testBinanceMockOrders();

// ==================== 测试总结 ====================
logSection('测试总结');
console.log(`  总计: ${totalTests} 项测试`);
console.log(`  ✅ 通过: ${passedTests}`);
console.log(`  ❌ 失败: ${failedTests}`);
console.log(`  通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
console.log();

if (failedTests > 0) {
  console.log('⚠️ 有测试未通过，请检查上方错误信息');
} else {
  console.log('🎉 所有测试通过！网格挂单逻辑正确');
}
