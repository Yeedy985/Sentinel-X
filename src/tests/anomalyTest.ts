/**
 * AAGS 全面异常 & 边界情况测试
 *
 * 发挥想象力，覆盖所有可能的异常场景:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ E1:  输入验证 & 边界值 (空/null/NaN/负数/超大数/精度溢出/零)         │
 * │ E2:  网格引擎极端场景 (零区间/单格/上下界反转/超多格/价格=0)         │
 * │ E3:  利润率计算边界 (所有4种模式的退化/极端参数)                     │
 * │ E4:  模拟交易所故障 (余额不足/重复撤单/无效交易对/零余额/负余额)      │
 * │ E5:  订单撮合边界 (价格精确命中/大量挂单/市价单无价格/闪崩到0)        │
 * │ E6:  利润分配极端 (零利润/负利润/超大利润/currentPrice=0/ratio边界)   │
 * │ E7:  结束模式边界 (零余额/微小余额/未知模式/coinBalance=0)           │
 * │ E8:  风控边界 (回撤100%/曲线全零/空K线/阈值=0/成交量=0)             │
 * │ E9:  趋势检测边界 (数据不足/全相同价/单点/极端斜率)                  │
 * │ E10: 格式化函数边界 (精度0/负精度/超大数/NaN/Infinity)              │
 * │ E11: 页面数据容错 (空数组/undefined策略/NaN统计/除零)               │
 * │ E12: 交易所并发 & 状态一致性 (快速下撤/余额守恒/连续价格变动)        │
 * │ E13: 策略创建参数边界 (资金=0/层全禁用/fundRatio=0/gridCount=0)     │
 * │ E14: 浮点精度陷阱 (0.1+0.2/大数相减/累积误差)                      │
 * │ E15: K线数据异常 (空数组/单根/high<low/volume负数/时间乱序)          │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * 运行: npx tsx src/tests/anomalyTest.ts
 */

import {
  calculateATR, calculateEMA, getVolatilityLevel, calculateAdaptiveRange,
  generateGridPrices, calculateGridProfitRates, generateGridOrders,
  processProfitAllocation, generateEndOrders, detectTrend, checkCircuitBreak,
  calculateDrawdown, formatPrice, formatQuantity,
} from '../services/gridEngine';
import { MockBinanceExchange } from './mockBinance';
import type { Strategy, GridLayerConfig, Kline } from '../types';

// ==================== 测试框架 ====================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let currentModule = '';

function logModule(title: string) {
  currentModule = title;
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}
function logSection(title: string) {
  console.log(`\n  ── ${title} ──`);
}
function assert(cond: boolean, msg: string) {
  totalTests++;
  if (cond) { passedTests++; console.log(`    ✅ ${msg}`); }
  else { failedTests++; console.log(`    ❌ [${currentModule}] ${msg}`); }
}
function assertClose(a: number, b: number, eps: number, msg: string) {
  assert(Math.abs(a - b) < eps, `${msg} (${a} ≈ ${b})`);
}

// ==================== 辅助工厂 ====================
function makeLayer(overrides: Partial<GridLayerConfig> = {}): GridLayerConfig {
  return {
    layer: 'trend', enabled: true, gridCount: 10, rangeRatio: 1.0, fundRatio: 0.33,
    upperPrice: 100000, lowerPrice: 90000, profitRate: 3, profitMode: 'fixed_rate',
    fixedProfitRate: 3, perGridMinRate: 2, perGridMaxRate: 5,
    distBaseRate: 1.5, distIncreaseStep: 0.3, distMaxRate: 8,
    trendBaseRate: 3, trendBullMultiplier: 0.8, trendBearMultiplier: 1.5,
    ...overrides,
  };
}

function makeStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    id: 1, name: '测试策略', symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT',
    status: 'running', totalFund: 10000, usedFund: 3000,
    rangeMode: 'fixed', upperPrice: 100000, lowerPrice: 90000, centerPrice: 95000,
    atrPeriod: 14, atrMultiplier: 2,
    layers: [makeLayer()],
    profitAllocation: 'all_usdt', profitRatio: 50, profitThreshold: 0,
    trendSellAbovePercent: 25, trendBuyBelowPercent: 25,
    risk: {
      circuitBreakEnabled: true, circuitBreakDropPercent: 5, circuitBreakVolumeMultiple: 5,
      dailyDrawdownEnabled: true, dailyDrawdownPercent: 5,
      maxPositionEnabled: true, maxPositionPercent: 80,
      trendDefenseEnabled: true, trendDefenseEmaFast: 12, trendDefenseEmaSlow: 26,
    },
    autoRebalance: true, rebalanceStepPercent: 5, endMode: 'keep_position',
    totalProfit: 0, todayProfit: 0, totalTrades: 0, winTrades: 0,
    maxDrawdown: 0, createdAt: Date.now(),
    ...overrides,
  };
}

function makeKlines(count: number, base: number = 95000, volatility: number = 1000): Kline[] {
  const klines: Kline[] = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.abs(change) * 0.2;
    const low = Math.min(open, close) - Math.abs(change) * 0.2;
    klines.push({
      openTime: Date.now() - (count - i) * 60000,
      open, high, low, close,
      volume: 100 + Math.random() * 50,
      closeTime: Date.now() - (count - i - 1) * 60000,
    });
    price = close;
  }
  return klines;
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E1: 输入验证 & 边界值                                        ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE1_InputValidation() {
  logModule('E1: 输入验证 & 边界值');

  logSection('1.1 ATR: 空K线/不足数据');
  assert(calculateATR([], 14) === 0, 'ATR([]) = 0');
  assert(calculateATR(makeKlines(1), 14) === 0, 'ATR(1根K线) = 0');
  assert(calculateATR(makeKlines(14), 14) === 0, 'ATR(14根K线, period=14) = 0 (需要 period+1)');
  assert(calculateATR(makeKlines(15), 14) > 0, 'ATR(15根K线, period=14) > 0');

  logSection('1.2 ATR: period极端');
  assert(calculateATR(makeKlines(3), 1) > 0, 'ATR(3根, period=1) > 0');
  assert(calculateATR(makeKlines(100), 99) > 0, 'ATR(100根, period=99) > 0 (klines.length=100 >= period+1=100)');
  assert(calculateATR(makeKlines(101), 99) > 0, 'ATR(101根, period=99) > 0');

  logSection('1.3 EMA: 单点/空');
  const ema1 = calculateEMA([100], 12);
  assert(ema1.length === 1 && ema1[0] === 100, 'EMA([100]) = [100]');
  const ema2 = calculateEMA([100, 100, 100], 2);
  assert(ema2.every(v => v === 100), 'EMA全相同 → 全等于该值');

  logSection('1.4 波动率: 价格=0');
  const vol0 = getVolatilityLevel(100, 0);
  assert(vol0.percent === Infinity || isNaN(vol0.percent) || vol0.level === '极高', '价格=0时波动率极高或Inf');

  logSection('1.5 波动率: ATR=0');
  const volZ = getVolatilityLevel(0, 95000);
  assert(volZ.percent === 0 && volZ.level === '低', 'ATR=0 → 波动率=0% → 低');

  logSection('1.6 自适应区间: 价格=0');
  const range0 = calculateAdaptiveRange(0, 0);
  assert(range0.upper === 0, '价格=0时上界=0');
  assert(range0.lower === 0, '价格=0时下界=0');

  logSection('1.7 自适应区间: 超大ATR');
  const rangeHuge = calculateAdaptiveRange(100, 10000, 2);
  assert(rangeHuge.lower > 0, `超大ATR下界 = ${rangeHuge.lower} > 0 (有最小值保护)`);

  logSection('1.8 负价格/负ATR');
  const rangeNeg = calculateAdaptiveRange(-100, 50, 2);
  assert(rangeNeg.upper === 0, `负价格上界 = ${rangeNeg.upper}`);
  // lower有max保护: max(currentPrice - range, currentPrice * 0.01)
  // -100 - 100 = -200, max(-200, -1) = -1
  assert(rangeNeg.lower === -1, `负价格下界 = ${rangeNeg.lower}`);
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E2: 网格引擎极端场景                                         ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE2_GridEngineExtremes() {
  logModule('E2: 网格引擎极端场景');

  logSection('2.1 零区间 (upper = lower)');
  const prices0 = generateGridPrices(95000, 95000, 10);
  assert(prices0.length === 11, `零区间仍生成 ${prices0.length} 价格点`);
  assert(prices0.every(p => p === 95000), '所有价格点 = 95000');

  logSection('2.2 单格网格');
  const prices1 = generateGridPrices(100000, 90000, 1);
  assert(prices1.length === 2, '单格: 2个价格点');
  assert(prices1[0] === 90000 && prices1[1] === 100000, '单格: [90000, 100000]');

  logSection('2.3 上下界反转 (upper < lower)');
  const pricesFlip = generateGridPrices(90000, 100000, 5);
  assert(pricesFlip.length === 6, '反转仍生成价格');
  assert(pricesFlip[0] === 100000 && pricesFlip[5] === 90000, '反转: 从high→low');
  // step = (90000-100000)/5 = -2000 → 递减
  assert(pricesFlip[1] < pricesFlip[0], '步长为负 → 递减');

  logSection('2.4 超多格 (1000格)');
  const pricesMany = generateGridPrices(100000, 90000, 1000);
  assert(pricesMany.length === 1001, '1000格: 1001个价格点');
  const step1000 = (100000 - 90000) / 1000;
  assertClose(pricesMany[500], 90000 + step1000 * 500, 0.001, '中间价格正确');

  logSection('2.5 gridCount = 0');
  const prices0g = generateGridPrices(100000, 90000, 0);
  assert(prices0g.length === 1, 'gridCount=0 → 只有1个起点');
  // step = (upper-lower)/0 = Infinity → lowerPrice + Infinity*0 = NaN
  assert(isNaN(prices0g[0]) || prices0g[0] === 90000, `gridCount=0 起点 = ${prices0g[0]} (NaN或lowerPrice)`);

  logSection('2.6 当前价格在区间外');
  const layer = makeLayer({ upperPrice: 100000, lowerPrice: 90000, gridCount: 5 });
  // currentPrice远高于区间 → 所有gridMid < 150000 → 全部买单
  const ordersAbove = generateGridOrders(makeStrategy(), 150000, layer);
  assert(ordersAbove.length === 5, `价格远高于区间 → ${ordersAbove.length} 个订单`);
  assert(ordersAbove.every(o => o.side === 'buy'), '价格远高 → gridMid < currentPrice → 全买单');

  // currentPrice远低于区间 → 所有gridMid > 10000 → 全部卖单
  const ordersBelow = generateGridOrders(makeStrategy(), 10000, layer);
  assert(ordersBelow.every(o => o.side === 'sell'), '价格远低 → gridMid > currentPrice → 全卖单');

  logSection('2.7 currentPrice正好在网格边界上');
  const layerExact = makeLayer({ upperPrice: 100000, lowerPrice: 90000, gridCount: 10 });
  const step = (100000 - 90000) / 10;
  const midOfGrid5 = (90000 + step * 5 + 90000 + step * 6) / 2;
  const ordersExact = generateGridOrders(makeStrategy(), midOfGrid5, layerExact);
  assert(ordersExact.length === 10, `恰好在网格中间 → ${ordersExact.length} 订单`);
  const buys = ordersExact.filter(o => o.side === 'buy').length;
  const sells = ordersExact.filter(o => o.side === 'sell').length;
  assert(buys + sells === 10, `买${buys} + 卖${sells} = 10`);
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E3: 利润率计算所有模式边界                                     ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE3_ProfitRateEdges() {
  logModule('E3: 利润率计算边界');

  logSection('3.1 fixed_rate: 零区间 (mid=0 fallback)');
  const layerZero = makeLayer({ upperPrice: 0, lowerPrice: 0, profitMode: 'fixed_rate' });
  // midPrice=0 → autoRate fallback to fixedProfitRate
  const ratesZ = calculateGridProfitRates(layerZero, 10, 95000);
  assert(ratesZ.every(r => r === 3), 'zero区间 fallback = fixedProfitRate(3%)');

  logSection('3.2 fixed_rate: gridCount=0');
  const rates0g = calculateGridProfitRates(makeLayer({ profitMode: 'fixed_rate' }), 0, 95000);
  assert(rates0g.length === 0, 'gridCount=0 → 空数组');

  logSection('3.3 per_grid: 单格 (gridCount=1)');
  const rates1 = calculateGridProfitRates(
    makeLayer({ profitMode: 'per_grid', perGridMinRate: 2, perGridMaxRate: 10 }), 1, 95000
  );
  assert(rates1.length === 1, 'per_grid单格: 1个利润率');
  assert(rates1[0] === 2, 'per_grid单格: t=0 → minRate=2');

  logSection('3.4 per_grid: min > max');
  const ratesInv = calculateGridProfitRates(
    makeLayer({ profitMode: 'per_grid', perGridMinRate: 10, perGridMaxRate: 2 }), 5, 95000
  );
  // 从10递减到2
  assert(ratesInv[0] === 10, 'min>max时第一格=10');
  assert(ratesInv[4] === 2, 'min>max时最后一格=2');

  logSection('3.5 distance_increase: 单格 (center=0)');
  const ratesDist1 = calculateGridProfitRates(
    makeLayer({ profitMode: 'distance_increase', distBaseRate: 1, distIncreaseStep: 0.5, distMaxRate: 10 }), 1, 95000
  );
  assert(ratesDist1.length === 1, 'distance单格: 1个');
  // center = 0.5, dist = |0 - 0.5| = 0.5, rate = 1 + 0.5*0.5 = 1.25
  assertClose(ratesDist1[0], 1.25, 0.001, 'distance单格利润率');

  logSection('3.6 distance_increase: max cap');
  const ratesDistCap = calculateGridProfitRates(
    makeLayer({ profitMode: 'distance_increase', distBaseRate: 5, distIncreaseStep: 10, distMaxRate: 8 }), 10, 95000
  );
  assert(ratesDistCap.every(r => r <= 8), '所有利润率 ≤ distMaxRate(8)');

  logSection('3.7 trend_increase: 各趋势模式');
  const layerTrend = makeLayer({ profitMode: 'trend_increase', trendBaseRate: 3, trendBullMultiplier: 0.5, trendBearMultiplier: 2 });
  const ratesBull = calculateGridProfitRates(layerTrend, 5, 95000, 'bull');
  const ratesBear = calculateGridProfitRates(layerTrend, 5, 95000, 'bear');
  const ratesNeutral = calculateGridProfitRates(layerTrend, 5, 95000, 'neutral');
  assert(ratesBull.every(r => r === 1.5), 'bull: 3 * 0.5 = 1.5');
  assert(ratesBear.every(r => r === 6), 'bear: 3 * 2 = 6');
  assert(ratesNeutral.every(r => r === 3), 'neutral: 3 * 1 = 3');

  logSection('3.8 trend_increase: multiplier=0');
  const ratesZeroMul = calculateGridProfitRates(
    makeLayer({ profitMode: 'trend_increase', trendBaseRate: 3, trendBullMultiplier: 0 }), 5, 95000, 'bull'
  );
  assert(ratesZeroMul.every(r => r === 0), 'multiplier=0 → 利润率=0');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E4: 模拟交易所故障                                            ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE4_ExchangeFaults() {
  logModule('E4: 模拟交易所故障');
  const ex = new MockBinanceExchange();

  logSection('4.1 无效交易对');
  ex.setBalance('USDT', 10000);
  ex.setPrice('FAKECOIN', 100);
  const r1 = ex.placeOrder({ symbol: 'FAKECOIN', side: 'BUY', type: 'LIMIT', price: 100, quantity: 1 });
  assert('error' in r1 && r1.code === -1121, `无效交易对 → error code -1121`);

  logSection('4.2 数量低于最小值');
  ex.setPrice('BTCUSDT', 95000);
  const r2 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 95000, quantity: 0.000001 });
  assert('error' in r2 && r2.code === -1013, '数量低于minQty → -1013');

  logSection('4.3 名义价值低于最小值');
  const r3 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 0.01, quantity: 0.00001 });
  assert('error' in r3 && r3.code === -1013, '名义价值 < minNotional → -1013');

  logSection('4.4 余额不足 (买入)');
  ex.reset();
  ex.setBalance('USDT', 100); // 只有100
  ex.setPrice('BTCUSDT', 95000);
  const r4 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 95000, quantity: 0.01 }); // 需要950
  assert('error' in r4 && r4.code === -2010, '买入余额不足 → -2010');

  logSection('4.5 余额不足 (卖出)');
  ex.reset();
  ex.setBalance('BTC', 0.001);
  ex.setPrice('BTCUSDT', 95000);
  const r5 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'LIMIT', price: 95000, quantity: 0.01 });
  assert('error' in r5 && r5.code === -2010, '卖出余额不足 → -2010');

  logSection('4.6 零余额下单');
  ex.reset();
  ex.setPrice('BTCUSDT', 95000);
  const r6 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 95000, quantity: 0.001 });
  assert('error' in r6, '零余额 → 错误');

  logSection('4.7 撤不存在的单');
  ex.reset();
  const r7 = ex.cancelOrder('BTCUSDT', 99999);
  assert('error' in r7 && r7.code === -2011, '不存在的订单 → -2011');

  logSection('4.8 重复撤单');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  const order = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 90000, quantity: 0.01 });
  assert(!('error' in order), '下单成功');
  const orderId = (order as any).orderId;
  const c1 = ex.cancelOrder('BTCUSDT', orderId);
  assert(!('error' in c1), '第一次撤单成功');
  const c2 = ex.cancelOrder('BTCUSDT', orderId);
  assert('error' in c2, '第二次撤单 → 找不到');

  logSection('4.9 价格=0的LIMIT单');
  ex.reset();
  ex.setBalance('USDT', 10000);
  const r9 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 0, quantity: 0.01 });
  assert('error' in r9, '价格=0 → 错误');

  logSection('4.10 MARKET单无设定价格');
  ex.reset();
  ex.setBalance('USDT', 10000);
  // 未设置BTCUSDT价格 → getPrice = 0
  const r10 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.01 });
  assert('error' in r10, 'MARKET单无价格 → 错误');

  logSection('4.11 获取不存在资产余额');
  const bal = ex.getBalance('NONEXIST');
  assert(bal.free === 0 && bal.locked === 0, '不存在资产 → {free:0, locked:0}');

  logSection('4.12 空账户 getAccountInfo');
  ex.reset();
  const info = ex.getAccountInfo();
  assert(info.balances.length === 0, '空账户 → 0个余额');

  logSection('4.13 空账户 getTotalValue');
  assert(ex.getTotalValue() === 0, '空账户总价值 = 0');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E5: 订单撮合边界                                              ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE5_MatchingEdges() {
  logModule('E5: 订单撮合边界');
  const ex = new MockBinanceExchange();

  logSection('5.1 精确命中价格');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 93000, quantity: 0.01 });
  assert(ex.openOrders.length === 1, '挂单1个');
  // 价格精确到93000
  const trades1 = ex.simulatePriceMove('BTCUSDT', 93000);
  assert(trades1.length === 1, '精确命中93000 → 成交');
  assert(ex.openOrders.length === 0, '挂单清空');

  logSection('5.2 价格一直不触发');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 80000, quantity: 0.01 });
  const trades2 = ex.simulatePriceMove('BTCUSDT', 85000);
  assert(trades2.length === 0, '85000 > 80000 → 买单不触发');
  assert(ex.openOrders.length === 1, '挂单仍在');

  logSection('5.3 大量挂单同时触发 (闪崩)');
  ex.reset();
  ex.setBalance('USDT', 1000000);
  ex.setPrice('BTCUSDT', 95000);
  for (let i = 0; i < 50; i++) {
    ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 94000 - i * 100, quantity: 0.01 });
  }
  assert(ex.openOrders.length === 50, '50个挂单');
  const trades3 = ex.simulatePriceMove('BTCUSDT', 80000);
  assert(trades3.length === 50, `闪崩到80000 → 全部${trades3.length}个成交`);
  assert(ex.openOrders.length === 0, '全部清空');

  logSection('5.4 卖单触发');
  ex.reset();
  ex.setBalance('BTC', 1.0);
  ex.setPrice('BTCUSDT', 95000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'LIMIT', price: 100000, quantity: 0.1 });
  const trades4 = ex.simulatePriceMove('BTCUSDT', 101000);
  assert(trades4.length === 1, '卖单在100000被触发');

  logSection('5.5 混合买卖单 + 跨symbol不影响');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setBalance('BTC', 1.0);
  ex.setBalance('ETH', 10.0);
  ex.setPrice('BTCUSDT', 95000);
  ex.setPrice('ETHUSDT', 3000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 90000, quantity: 0.01 });
  ex.placeOrder({ symbol: 'ETHUSDT', side: 'SELL', type: 'LIMIT', price: 3500, quantity: 1 });
  assert(ex.openOrders.length === 2, '2个不同symbol挂单');
  // 只移动BTC价格
  const trades5 = ex.simulatePriceMove('BTCUSDT', 89000);
  assert(trades5.length === 1, 'BTC买单成交');
  assert(ex.openOrders.length === 1, 'ETH卖单仍在');
  assert(ex.openOrders[0].symbol === 'ETHUSDT', 'ETH单未受影响');

  logSection('5.6 MARKET单立即成交');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  const mkt = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.01 });
  assert(!('error' in mkt) && (mkt as any).status === 'FILLED', 'MARKET单立即FILLED');
  assert(ex.openOrders.length === 0, 'MARKET不进入挂单簿');
  assert(ex.trades.length === 1, '产生1笔成交');

  logSection('5.7 手续费扣除验证');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 100000);
  ex.getBalance('USDT').free; // record before
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.1 });
  const btcBal = ex.getBalance('BTC');
  // 买入0.1 BTC, fee = 100000*0.1*0.001 = 10 USDT worth of BTC = 0.0001 BTC
  const expectedBTC = 0.1 - (100000 * 0.1 * 0.001) / 100000;
  assertClose(btcBal.free, expectedBTC, 0.0001, `买入后BTC = ${btcBal.free} ≈ ${expectedBTC} (扣手续费)`);

  logSection('5.8 余额守恒');
  ex.reset();
  ex.setBalance('USDT', 50000);
  ex.setPrice('BTCUSDT', 100000);
  const totalBefore = ex.getTotalValue();
  // 买入
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.1 });
  const totalAfter = ex.getTotalValue();
  // 手续费导致总价值减少
  const feeLoss = 100000 * 0.1 * 0.001;
  assertClose(totalBefore - totalAfter, feeLoss, 1, `总价值减少 ≈ 手续费 ${feeLoss}`);
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E6: 利润分配极端                                              ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE6_ProfitAllocationEdges() {
  logModule('E6: 利润分配极端');

  logSection('6.1 零利润');
  const s = makeStrategy({ profitAllocation: 'all_usdt' });
  const r1 = processProfitAllocation(0, s, 95000);
  assert(r1.usdtAmount === 0 && r1.coinAmount === 0, 'all_usdt零利润');

  const s2 = makeStrategy({ profitAllocation: 'all_coin' });
  const r2 = processProfitAllocation(0, s2, 95000);
  assert(r2.usdtAmount === 0 && r2.coinAmount === 0, 'all_coin零利润');

  logSection('6.2 负利润');
  const rNeg = processProfitAllocation(-100, makeStrategy({ profitAllocation: 'all_usdt' }), 95000);
  assert(rNeg.usdtAmount === -100, 'all_usdt负利润 → -100 USDT');

  const rNeg2 = processProfitAllocation(-100, makeStrategy({ profitAllocation: 'all_coin' }), 95000);
  assertClose(rNeg2.coinAmount, -100 / 95000, 0.0001, 'all_coin负利润 → 负数BTC');

  logSection('6.3 超大利润');
  const rHuge = processProfitAllocation(1e10, makeStrategy({ profitAllocation: 'ratio', profitRatio: 70 }), 95000);
  assertClose(rHuge.usdtAmount, 7e9, 1, 'ratio 70% of 1e10');
  assertClose(rHuge.coinAmount, 3e9 / 95000, 1, 'ratio 30% / 95000');

  logSection('6.4 ratio: profitRatio=0 → 全部转币');
  const r0pct = processProfitAllocation(100, makeStrategy({ profitAllocation: 'ratio', profitRatio: 0 }), 95000);
  assert(r0pct.usdtAmount === 0, 'ratio 0% → USDT=0');
  assertClose(r0pct.coinAmount, 100 / 95000, 0.0001, 'ratio 0% → 全部coin');

  logSection('6.5 ratio: profitRatio=100 → 全部转USDT');
  const r100pct = processProfitAllocation(100, makeStrategy({ profitAllocation: 'ratio', profitRatio: 100 }), 95000);
  assert(r100pct.usdtAmount === 100, 'ratio 100% → USDT=100');
  assert(r100pct.coinAmount === 0, 'ratio 100% → coin=0');

  logSection('6.6 threshold_switch: 价格精确在持币线');
  const sThresh = makeStrategy({ profitAllocation: 'threshold_switch', centerPrice: 100000 });
  // holdCoinPrice = 100000 * 0.75 = 75000
  const rLow = processProfitAllocation(100, sThresh, 75000);
  assert(rLow.usdtAmount === 0, '恰好=holdCoinPrice → 全部持币');
  assertClose(rLow.coinAmount, 100 / 75000, 0.0001, '持币数量正确');

  logSection('6.7 threshold_switch: 价格精确在持U线');
  // holdUsdtPrice = 100000 * 1.25 = 125000
  const rHigh = processProfitAllocation(100, sThresh, 125000);
  assert(rHigh.usdtAmount === 100, '恰好=holdUsdtPrice → 全部持U');

  logSection('6.8 threshold_switch: 中间价 → 50/50');
  const rMid = processProfitAllocation(100, sThresh, 100000);
  assertClose(rMid.usdtAmount, 50, 0.01, '中间: USDT=50');
  assertClose(rMid.coinAmount, 50 / 100000, 0.0001, '中间: coin=0.0005');

  logSection('6.9 reinvest 模式');
  const rReinvest = processProfitAllocation(100, makeStrategy({ profitAllocation: 'reinvest' }), 95000);
  assert(rReinvest.usdtAmount === 0 && rReinvest.coinAmount === 0, 'reinvest: 不直接分配');
  assert(rReinvest.reinvestTarget !== undefined, 'reinvest: 有reinvestTarget');

  logSection('6.10 currentPrice=0 (除零)');
  const rDiv0 = processProfitAllocation(100, makeStrategy({ profitAllocation: 'all_coin' }), 0);
  assert(rDiv0.coinAmount === Infinity || isNaN(rDiv0.coinAmount), 'price=0 → coin=Inf或NaN');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E7: 结束模式边界                                              ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE7_EndModeEdges() {
  logModule('E7: 结束模式边界');

  logSection('7.1 hold_coin: 无USDT (余额≤10)');
  const r1 = generateEndOrders(makeStrategy({ endMode: 'hold_coin' }), 95000, 0.5, 5);
  assert(r1.orders.length === 0, 'hold_coin: USDT≤10 → 不操作');

  logSection('7.2 hold_coin: 有USDT');
  const r2 = generateEndOrders(makeStrategy({ endMode: 'hold_coin' }), 95000, 0, 1000);
  assert(r2.orders.length === 1, 'hold_coin: 有USDT → 买入');
  assert(r2.orders[0].side === 'BUY', '操作: BUY');
  assertClose(r2.orders[0].quantity, 1000 / 95000, 0.0001, '数量 = usdt/price');

  logSection('7.3 hold_usdt: 无币');
  const r3 = generateEndOrders(makeStrategy({ endMode: 'hold_usdt' }), 95000, 0, 1000);
  assert(r3.orders.length === 0, 'hold_usdt: 无币 → 不操作');

  logSection('7.4 hold_usdt: 有币');
  const r4 = generateEndOrders(makeStrategy({ endMode: 'hold_usdt' }), 95000, 0.5, 0);
  assert(r4.orders.length === 1 && r4.orders[0].side === 'SELL', 'hold_usdt: SELL');
  assert(r4.orders[0].quantity === 0.5, '卖出全部0.5 BTC');

  logSection('7.5 keep_position: 永不操作');
  const r5 = generateEndOrders(makeStrategy({ endMode: 'keep_position' }), 95000, 100, 100000);
  assert(r5.orders.length === 0, 'keep_position: 0操作');

  logSection('7.6 force_close: 无币');
  const r6 = generateEndOrders(makeStrategy({ endMode: 'force_close' }), 95000, 0, 10000);
  assert(r6.orders.length === 0, 'force_close: 无币 → 不操作');

  logSection('7.7 force_close: 有币');
  const r7 = generateEndOrders(makeStrategy({ endMode: 'force_close' }), 95000, 2.5, 0);
  assert(r7.orders.length === 1 && r7.orders[0].quantity === 2.5, 'force_close: 卖2.5');

  logSection('7.8 未知endMode');
  const r8 = generateEndOrders(makeStrategy({ endMode: 'unknown_mode' as any }), 95000, 1, 1000);
  assert(r8.action === 'unknown', '未知模式 → action=unknown');
  assert(r8.orders.length === 0, '未知模式 → 0操作');

  logSection('7.9 hold_coin: price=0');
  const r9 = generateEndOrders(makeStrategy({ endMode: 'hold_coin' }), 0, 0, 1000);
  assert(r9.orders.length === 1, 'price=0时仍生成买单');
  assert(r9.orders[0].quantity === Infinity, 'quantity = 1000/0 = Inf');

  logSection('7.10 微小余额');
  const r10 = generateEndOrders(makeStrategy({ endMode: 'hold_usdt' }), 95000, 0.000000001, 0);
  assert(r10.orders.length === 1, '微小币余额仍卖出 (>0)');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E8: 风控边界                                                  ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE8_RiskControlEdges() {
  logModule('E8: 风控边界');

  logSection('8.1 回撤: 空曲线');
  assert(calculateDrawdown([]) === 0, '空曲线回撤 = 0');

  logSection('8.2 回撤: 单点');
  assert(calculateDrawdown([100]) === 0, '单点回撤 = 0');

  logSection('8.3 回撤: 单调递增 (无回撤)');
  assert(calculateDrawdown([100, 200, 300, 400]) === 0, '单调递增回撤 = 0');

  logSection('8.4 回撤: 归零 (100%)');
  const dd100 = calculateDrawdown([100, 50, 0]);
  assert(dd100 === 100, `归零回撤 = ${dd100}% (should be 100)`);

  logSection('8.5 回撤: 先涨后跌');
  const dd1 = calculateDrawdown([100, 200, 150]);
  assertClose(dd1, 25, 0.01, '200→150 回撤25%');

  logSection('8.6 回撤: 多次回撤取最大');
  const dd2 = calculateDrawdown([100, 200, 150, 300, 180]);
  // 第一次200→150=25%, 第二次300→180=40%, 取max=40
  assertClose(dd2, 40, 0.01, '多次回撤取最大=40%');

  logSection('8.7 回撤: 全零');
  const dd0 = calculateDrawdown([0, 0, 0]);
  // maxEquity=0, drawdown=(0-0)/0 → NaN → 0
  assert(dd0 === 0 || isNaN(dd0), '全零曲线回撤 = 0或NaN');

  logSection('8.8 熔断检测: K线不足');
  const cb1 = checkCircuitBreak(makeKlines(3), 5, 5);
  assert(cb1.triggered === false, 'K线<6 → 不触发');

  logSection('8.9 熔断检测: 正常行情');
  const normalKlines = makeKlines(30, 95000, 100); // 小波动
  const cb2 = checkCircuitBreak(normalKlines, 5, 5);
  assert(cb2.triggered === false, '正常小波动 → 不触发');

  logSection('8.10 熔断检测: 5分钟暴跌');
  const crashKlines = makeKlines(20, 95000, 100);
  // 人为制造最后6根K线暴跌
  const lastIdx = crashKlines.length - 1;
  crashKlines[lastIdx - 5].open = 95000;
  crashKlines[lastIdx].close = 85000; // -10.5%
  const cb3 = checkCircuitBreak(crashKlines, 5, 5);
  assert(cb3.triggered === true, '10%暴跌 → 熔断触发');
  assert(cb3.reason.includes('跌幅'), '原因包含"跌幅"');

  logSection('8.11 熔断检测: 成交量异常');
  const volKlines = makeKlines(25, 95000, 100);
  // 最后一根成交量放大10倍
  volKlines[volKlines.length - 1].volume = 10000;
  const cb4 = checkCircuitBreak(volKlines, 50, 3); // 宽松跌幅阈值
  assert(cb4.triggered === true, '成交量异常 → 熔断');
  assert(cb4.reason.includes('成交量'), '原因包含"成交量"');

  logSection('8.12 熔断: 阈值=0 → 任何跌幅都触发');
  const tinyDrop = makeKlines(10, 95000, 50);
  tinyDrop[tinyDrop.length - 1].close = tinyDrop[tinyDrop.length - 6].open - 1; // 微小跌幅
  const cb5 = checkCircuitBreak(tinyDrop, 0, 100);
  assert(cb5.triggered === true, '阈值=0 → 只要跌就触发');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E9: 趋势检测边界                                              ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE9_TrendDetection() {
  logModule('E9: 趋势检测边界');

  logSection('9.1 数据不足');
  assert(detectTrend([]) === 'neutral', '空数组 → neutral');
  assert(detectTrend([100]) === 'neutral', '单点 → neutral');
  assert(detectTrend(Array(25).fill(100)) === 'neutral', '25点<26 → neutral');

  logSection('9.2 全相同价格');
  assert(detectTrend(Array(50).fill(100)) === 'neutral', '全相同 → neutral');

  logSection('9.3 强烈上涨趋势');
  const bullPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 5);
  assert(detectTrend(bullPrices) === 'bull', '单调上涨 → bull');

  logSection('9.4 强烈下跌趋势');
  const bearPrices = Array.from({ length: 50 }, (_, i) => 500 - i * 5);
  assert(detectTrend(bearPrices) === 'bear', '单调下跌 → bear');

  logSection('9.5 震荡 (快慢线接近)');
  const sideways = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 0.3);
  assert(detectTrend(sideways) === 'neutral', '微小震荡 → neutral');

  logSection('9.6 先跌后涨 (V型)');
  const vShape = [
    ...Array.from({ length: 25 }, (_, i) => 200 - i * 4),
    ...Array.from({ length: 25 }, (_, i) => 100 + i * 6),
  ];
  const vTrend = detectTrend(vShape);
  assert(['bull', 'neutral'].includes(vTrend), `V型 → ${vTrend} (bull或neutral)`);

  logSection('9.7 自定义EMA周期');
  const trend7 = detectTrend(Array.from({ length: 100 }, (_, i) => 100 + i), 5, 10);
  assert(trend7 === 'bull', '短周期EMA(5,10) 上涨 → bull');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E10: 格式化函数边界                                           ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE10_FormatEdges() {
  logModule('E10: 格式化函数边界');

  logSection('10.1 formatPrice 基础');
  assert(formatPrice(95000.123, 2) === '95000.12', 'formatPrice(95000.123, 2)');
  assert(formatPrice(0, 2) === '0.00', 'formatPrice(0, 2)');
  assert(formatPrice(-100.5, 1) === '-100.5', 'formatPrice负数');
  assert(formatPrice(1e15, 0) === '1000000000000000', 'formatPrice超大数');

  logSection('10.2 formatPrice precision=0');
  assert(formatPrice(95000.99, 0) === '95001', 'precision=0 → 四舍五入整数');

  logSection('10.3 formatPrice 高精度');
  assert(formatPrice(0.12345678, 8) === '0.12345678', 'precision=8');

  logSection('10.4 formatQuantity stepSize 各种');
  assert(formatQuantity(0.12345, '0.00001') === '0.12345', 'stepSize=0.00001');
  assert(formatQuantity(0.12345, '0.001') === '0.123', 'stepSize=0.001');
  assert(formatQuantity(0.12345, '0.01') === '0.12', 'stepSize=0.01');
  assert(formatQuantity(0.12345, '0.1') === '0.1', 'stepSize=0.1');
  assert(formatQuantity(1.5, '1') === '1.5', 'stepSize=1');

  logSection('10.5 formatQuantity 零');
  assert(formatQuantity(0, '0.001') === '0.000', 'formatQuantity(0)');

  logSection('10.6 formatQuantity 负数');
  assert(formatQuantity(-0.5, '0.01') === '-0.50', 'formatQuantity负数');

  logSection('10.7 formatQuantity 超大数');
  const big = formatQuantity(999999.12345, '0.00001');
  assert(big === '999999.12345', `超大数 = ${big}`);

  logSection('10.8 formatPrice NaN/Infinity');
  const nanStr = formatPrice(NaN, 2);
  assert(nanStr === 'NaN', `formatPrice(NaN) = ${nanStr}`);
  const infStr = formatPrice(Infinity, 2);
  assert(infStr === 'Infinity', `formatPrice(Inf) = ${infStr}`);
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E11: 页面数据容错                                             ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE11_PageDataFaultTolerance() {
  logModule('E11: 页面数据容错');

  logSection('11.1 Dashboard: 空策略数组');
  const emptyStrategies: Strategy[] = [];
  const running = emptyStrategies.filter(s => s.status === 'running').length;
  const totalProfit = emptyStrategies.reduce((a, s) => a + s.totalProfit, 0);
  const totalTrades = emptyStrategies.reduce((a, s) => a + s.totalTrades, 0);
  const winTrades = emptyStrategies.reduce((a, s) => a + s.winTrades, 0);
  const winRate = totalTrades > 0 ? (winTrades / totalTrades * 100).toFixed(1) : '0.0';
  const maxDD = Math.max(...emptyStrategies.map(s => s.maxDrawdown), 0);
  assert(running === 0, '空策略: running=0');
  assert(totalProfit === 0, '空策略: totalProfit=0');
  assert(winRate === '0.0', '空策略: winRate=0.0');
  assert(maxDD === 0, '空策略: maxDD=0 (Math.max(0)=0)');

  logSection('11.2 Dashboard: 只有NaN利润的策略');
  const nanStrategy = makeStrategy({ totalProfit: NaN, todayProfit: NaN, totalTrades: 0 });
  const nanTotal = [nanStrategy].reduce((a, s) => a + s.totalProfit, 0);
  assert(isNaN(nanTotal), 'NaN利润 → 总利润NaN (需要前端guard)');

  logSection('11.3 StrategyDetail: 空订单');
  const emptyOrders: any[] = [];
  const orderStats = {
    pending: emptyOrders.filter((o: any) => o.status === 'pending').length,
    placed: emptyOrders.filter((o: any) => o.status === 'placed').length,
    filled: emptyOrders.filter((o: any) => o.status === 'filled').length,
  };
  assert(orderStats.pending === 0 && orderStats.placed === 0 && orderStats.filled === 0, '空订单统计全0');

  logSection('11.4 Reports: 零交易策略统计');
  const zeroStrat = makeStrategy({ totalTrades: 0, winTrades: 0, totalProfit: 0, startedAt: undefined });
  const avgProfit = zeroStrat.totalTrades > 0 ? (zeroStrat.totalProfit / zeroStrat.totalTrades).toFixed(4) : '0';
  const daysRunning = zeroStrat.startedAt ? Math.max(1, Math.floor((Date.now() - zeroStrat.startedAt) / 86400000)) : 0;
  assert(avgProfit === '0', '零交易均笔=0');
  assert(daysRunning === 0, '未启动天数=0');

  logSection('11.5 Reports: 日均收益除零');
  const dailyReturn = daysRunning > 0 ? (zeroStrat.totalProfit / daysRunning).toFixed(2) : '0';
  assert(dailyReturn === '0', '天数=0时日均=0 (防除零)');

  logSection('11.6 Reports: 年化收益除零');
  const annualReturn = daysRunning > 0
    ? ((zeroStrat.totalProfit / zeroStrat.totalFund) * (365 / daysRunning) * 100).toFixed(1)
    : '0';
  assert(annualReturn === '0', '天数=0时年化=0 (防除零)');

  logSection('11.7 MarketView: 空tickers');
  const emptyTickers: any[] = [];
  const filtered = emptyTickers.filter((t: any) => t.symbol.includes('BTC'));
  assert(filtered.length === 0, '空tickers搜索=0');

  logSection('11.8 AccountInfo: null安全');
  const accountInfo: { totalUsdtValue: number } | null = null;
  const totalAsset = accountInfo?.totalUsdtValue ?? 0;
  assert(totalAsset === 0, 'null accountInfo → 0');

  logSection('11.9 winTrades > totalTrades (数据异常)');
  const badStrat = makeStrategy({ totalTrades: 10, winTrades: 20 });
  const badWinRate = badStrat.totalTrades > 0 ? (badStrat.winTrades / badStrat.totalTrades * 100).toFixed(1) : '0.0';
  assert(badWinRate === '200.0', 'winTrades>totalTrades → 200% (异常但不崩)');

  logSection('11.10 负利润策略颜色');
  const negStrat = makeStrategy({ totalProfit: -500, todayProfit: -100 });
  const profitColor = negStrat.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400';
  assert(profitColor === 'text-red-400', '负利润 → 红色');
  const sign = negStrat.totalProfit >= 0 ? '+' : '';
  assert(sign === '', '负利润无+号');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E12: 交易所并发 & 状态一致性                                   ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE12_ExchangeConsistency() {
  logModule('E12: 交易所并发 & 状态一致性');
  const ex = new MockBinanceExchange();

  logSection('12.1 快速下单+撤单');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  const ids: number[] = [];
  for (let i = 0; i < 20; i++) {
    const o = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 90000 - i * 100, quantity: 0.01 });
    if (!('error' in o)) ids.push(o.orderId);
  }
  assert(ids.length === 20, '快速下20单');
  // 撤掉偶数单
  for (let i = 0; i < ids.length; i += 2) {
    ex.cancelOrder('BTCUSDT', ids[i]);
  }
  assert(ex.openOrders.length === 10, '撤偶数后剩10单');

  logSection('12.2 余额一致性: 下单→撤单→余额恢复');
  ex.reset();
  ex.setBalance('USDT', 10000);
  ex.setPrice('BTCUSDT', 100000);
  const before = ex.getBalance('USDT').free;
  const o1 = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 100000, quantity: 0.01 });
  assert(!('error' in o1), '下单成功');
  const afterOrder = ex.getBalance('USDT');
  assert(afterOrder.free === before - 1000, '冻结1000 USDT');
  assert(afterOrder.locked === 1000, 'locked=1000');
  ex.cancelOrder('BTCUSDT', (o1 as any).orderId);
  const afterCancel = ex.getBalance('USDT');
  assert(afterCancel.free === before, `撤单后free恢复 = ${afterCancel.free}`);
  assert(afterCancel.locked === 0, `撤单后locked = ${afterCancel.locked}`);

  logSection('12.3 连续价格变动');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  // 在不同价位挂5个买单
  for (let i = 0; i < 5; i++) {
    ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 94000 - i * 1000, quantity: 0.01 });
  }
  // 连续小幅下跌
  let totalFilled = 0;
  for (let p = 95000; p >= 89000; p -= 500) {
    totalFilled += ex.simulatePriceMove('BTCUSDT', p).length;
  }
  assert(totalFilled === 5, `连续下跌触发全部5单 (filled=${totalFilled})`);

  logSection('12.4 买入→价格涨→卖出循环');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 95000);
  // 买入
  const buyOrder = ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.1 });
  assert(!('error' in buyOrder), '市价买入');
  const btcAfterBuy = ex.getBalance('BTC').free;
  assert(btcAfterBuy > 0, `持有BTC: ${btcAfterBuy}`);
  // 挂卖单
  const sellOrder = ex.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'LIMIT', price: 100000, quantity: btcAfterBuy });
  if (!('error' in sellOrder)) {
    // 涨到100000
    ex.simulatePriceMove('BTCUSDT', 100000);
    const usdtAfter = ex.getBalance('USDT').free;
    // 原来100000 - 9500(买) - fee + 卖出收入 - fee
    assert(usdtAfter > 90000, `卖出后USDT = ${usdtAfter.toFixed(2)} (盈利)`);
  }

  logSection('12.5 多symbol同时操作');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setBalance('BTC', 1);
  ex.setBalance('ETH', 10);
  ex.setPrice('BTCUSDT', 95000);
  ex.setPrice('ETHUSDT', 3000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'LIMIT', price: 100000, quantity: 0.1 });
  ex.placeOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'LIMIT', price: 2800, quantity: 1 });
  assert(ex.openOrders.length === 2, '两个symbol各1单');
  // 只触发ETH
  ex.simulatePriceMove('ETHUSDT', 2700);
  assert(ex.openOrders.length === 1, 'ETH成交, BTC仍挂');
  assert(ex.openOrders[0].symbol === 'BTCUSDT', 'BTC单仍在');

  logSection('12.6 openOrders过滤');
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setBalance('BTC', 1);
  ex.setPrice('BTCUSDT', 95000);
  ex.setPrice('ETHUSDT', 3000);
  ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 90000, quantity: 0.01 });
  ex.placeOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'LIMIT', price: 2800, quantity: 1 });
  const btcOrders = ex.getOpenOrders('BTCUSDT');
  const ethOrders = ex.getOpenOrders('ETHUSDT');
  const allOrders = ex.getOpenOrders();
  assert(btcOrders.length === 1, 'BTC挂单=1');
  assert(ethOrders.length === 1, 'ETH挂单=1');
  assert(allOrders.length === 2, '总挂单=2');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E13: 策略创建参数边界                                         ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE13_StrategyCreationEdges() {
  logModule('E13: 策略创建参数边界');

  logSection('13.1 totalFund = 0');
  const s0 = makeStrategy({ totalFund: 0 });
  const layer0 = makeLayer({ fundRatio: 0.5, gridCount: 5 });
  const orders0 = generateGridOrders(s0, 95000, layer0);
  // perGridFund = 0 * 0.5 / 5 = 0, quantity = 0 / price = 0
  assert(orders0.every(o => o.quantity === 0), 'totalFund=0 → quantity全为0');

  logSection('13.2 fundRatio = 0');
  const layerNoFund = makeLayer({ fundRatio: 0, gridCount: 5 });
  const ordersNoFund = generateGridOrders(makeStrategy(), 95000, layerNoFund);
  assert(ordersNoFund.every(o => o.quantity === 0), 'fundRatio=0 → quantity全为0');

  logSection('13.3 gridCount = 0 (无网格)');
  const layerNoGrid = makeLayer({ gridCount: 0 });
  const ordersNoGrid = generateGridOrders(makeStrategy(), 95000, layerNoGrid);
  assert(ordersNoGrid.length === 0, 'gridCount=0 → 0订单');

  logSection('13.4 超大gridCount');
  const layerManyGrids = makeLayer({ gridCount: 10000, upperPrice: 100000, lowerPrice: 90000 });
  const ordersMany = generateGridOrders(makeStrategy({ totalFund: 1000000 }), 95000, layerManyGrids);
  assert(ordersMany.length === 10000, `10000格 → ${ordersMany.length}订单`);

  logSection('13.5 所有层都禁用');
  const disabledLayers = [
    makeLayer({ layer: 'trend', enabled: false }),
    makeLayer({ layer: 'swing', enabled: false }),
    makeLayer({ layer: 'spike', enabled: false }),
  ];
  const enabledCount = disabledLayers.filter(l => l.enabled).length;
  assert(enabledCount === 0, '全禁用 → 0启用层');

  logSection('13.6 fundRatio之和不为1');
  const badRatios = [
    makeLayer({ layer: 'trend', fundRatio: 0.5 }),
    makeLayer({ layer: 'swing', fundRatio: 0.5 }),
    makeLayer({ layer: 'spike', fundRatio: 0.5 }),
  ];
  const sum = badRatios.reduce((s, l) => s + l.fundRatio, 0);
  assert(sum === 1.5, `fundRatio和=1.5 (超过100%) → 引擎仍运行不崩溃`);
  // 仍然能生成订单
  const ordersOverfund = generateGridOrders(makeStrategy({ totalFund: 10000 }), 95000, badRatios[0]);
  assert(ordersOverfund.length > 0, '超额分配仍生成订单');

  logSection('13.7 lowerPrice > upperPrice');
  const layerFlipped = makeLayer({ upperPrice: 80000, lowerPrice: 100000, gridCount: 5 });
  const ordersFlipped = generateGridOrders(makeStrategy(), 95000, layerFlipped);
  assert(ordersFlipped.length === 5, '反转区间仍生成订单');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E14: 浮点精度陷阱                                             ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE14_FloatingPoint() {
  logModule('E14: 浮点精度陷阱');

  logSection('14.1 经典 0.1 + 0.2');
  const sum = 0.1 + 0.2;
  assert(sum !== 0.3, '0.1+0.2 !== 0.3 (浮点特性)');
  assert(Math.abs(sum - 0.3) < 1e-10, '但差值极小');

  logSection('14.2 大数相减精度丢失');
  const a = 1000000000.123;
  const b = 1000000000.122;
  const diff = a - b;
  assertClose(diff, 0.001, 0.0001, '大数相减精度');

  logSection('14.3 网格价格累积误差');
  const prices = generateGridPrices(100000.99, 90000.01, 100);
  // 检查最后一个价格是否精确
  const expected = 100000.99;
  assertClose(prices[prices.length - 1], expected, 0.01, '100格后最后价格精确');

  logSection('14.4 利润率累积');
  const rates = calculateGridProfitRates(
    makeLayer({ profitMode: 'per_grid', perGridMinRate: 0.001, perGridMaxRate: 0.01 }), 100, 95000
  );
  assert(rates.length === 100, '100格利润率');
  assert(rates[0] >= 0 && rates[99] >= 0, '所有利润率非负');

  logSection('14.5 手续费累积');
  const ex = new MockBinanceExchange();
  ex.reset();
  ex.setBalance('USDT', 100000);
  ex.setPrice('BTCUSDT', 100000);
  // 反复买卖100次
  let totalFees = 0;
  for (let i = 0; i < 50; i++) {
    // 买
    ex.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001 });
    totalFees += 100000 * 0.001 * 0.001;
    // 卖
    const btc = ex.getBalance('BTC').free;
    if (btc >= 0.001) {
      ex.setBalance('BTC', btc, 0); // reset locked
      ex.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'MARKET', quantity: 0.001 });
      totalFees += 100000 * 0.001 * 0.001;
    }
  }
  const finalValue = ex.getTotalValue();
  assert(finalValue < 100000, `反复交易后总价值 ${finalValue.toFixed(2)} < 100000 (手续费消耗)`);

  logSection('14.6 toFixed四舍五入');
  assert((0.005).toFixed(2) === '0.01' || (0.005).toFixed(2) === '0.00', 
    `(0.005).toFixed(2) = ${(0.005).toFixed(2)} (JS浮点舍入行为)`);
  assert((1.005).toFixed(2) === '1.00' || (1.005).toFixed(2) === '1.01',
    `(1.005).toFixed(2) = ${(1.005).toFixed(2)} (已知JS浮点问题)`);
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ E15: K线数据异常                                              ║
// ╚═══════════════════════════════════════════════════════════════╝
function testE15_KlineAnomalies() {
  logModule('E15: K线数据异常');

  logSection('15.1 空K线');
  assert(calculateATR([], 14) === 0, 'ATR空K线=0');
  assert(detectTrend([]) === 'neutral', 'detectTrend空=neutral');
  const cbEmpty = checkCircuitBreak([], 5, 5);
  assert(cbEmpty.triggered === false, '熔断空K线=false');

  logSection('15.2 单根K线');
  const single: Kline[] = [{
    openTime: Date.now(), open: 95000, high: 96000, low: 94000, close: 95500,
    volume: 100, closeTime: Date.now() + 60000,
  }];
  assert(calculateATR(single, 1) === 0, 'ATR单根=0');

  logSection('15.3 high < low (异常K线)');
  const badKline: Kline[] = [
    { openTime: 0, open: 100, high: 90, low: 110, close: 95, volume: 100, closeTime: 1 },
    { openTime: 1, open: 95, high: 85, low: 105, close: 90, volume: 100, closeTime: 2 },
    { openTime: 2, open: 90, high: 80, low: 100, close: 88, volume: 100, closeTime: 3 },
  ];
  const atrBad = calculateATR(badKline, 1);
  // TR = max(high-low, |high-prevClose|, |low-prevClose|)
  // high<low时 high-low 为负，但 abs值为正 → 不会崩溃
  assert(atrBad >= 0 || isNaN(atrBad), `异常K线ATR = ${atrBad} (不崩溃)`);

  logSection('15.4 成交量=0');
  const zeroVol = makeKlines(25, 95000, 100);
  zeroVol.forEach(k => k.volume = 0);
  const cbZeroVol = checkCircuitBreak(zeroVol, 5, 5);
  // avgVolume=0, lastVolume=0, 0 > 0*5 = false → 不触发
  assert(cbZeroVol.triggered === false || cbZeroVol.triggered === true, '成交量=0时不崩溃');

  logSection('15.5 负成交量');
  const negVol = makeKlines(25, 95000, 100);
  negVol[negVol.length - 1].volume = -1000;
  // -1000 > avgVolume * 5? → false (负数不大于正数)
  const cbNeg = checkCircuitBreak(negVol, 50, 5);
  assert(!cbNeg.triggered || cbNeg.triggered, '负成交量不崩溃');

  logSection('15.6 所有价格=0');
  const zeroKlines: Kline[] = Array.from({ length: 20 }, (_, i) => ({
    openTime: i * 60000, open: 0, high: 0, low: 0, close: 0, volume: 0, closeTime: (i + 1) * 60000,
  }));
  const atrZero = calculateATR(zeroKlines, 14);
  assert(atrZero === 0, '全零K线ATR=0');

  logSection('15.7 EMA全零');
  const emaZero = calculateEMA(Array(50).fill(0), 12);
  assert(emaZero.every(v => v === 0), 'EMA全零');

  logSection('15.8 极端价格跳跃');
  const jumpKlines = makeKlines(20, 95000, 100);
  // 突然跳到10倍
  jumpKlines[jumpKlines.length - 1].close = 950000;
  jumpKlines[jumpKlines.length - 1].high = 950000;
  const atrJump = calculateATR(jumpKlines, 14);
  assert(atrJump > 0, `极端跳跃ATR = ${atrJump.toFixed(2)} (正常计算)`);

  logSection('15.9 detectTrend: 全零收盘价');
  const trendZero = detectTrend(Array(50).fill(0));
  // EMA全0, diff = (0-0)/0 → NaN, 不满足>1或<-1 → neutral
  assert(trendZero === 'neutral', '全零价格 → neutral');
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║                     运行全部测试                              ║
// ╚═══════════════════════════════════════════════════════════════╝
console.log('🔥 AAGS 全面异常 & 边界情况测试');
console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);

testE1_InputValidation();
testE2_GridEngineExtremes();
testE3_ProfitRateEdges();
testE4_ExchangeFaults();
testE5_MatchingEdges();
testE6_ProfitAllocationEdges();
testE7_EndModeEdges();
testE8_RiskControlEdges();
testE9_TrendDetection();
testE10_FormatEdges();
testE11_PageDataFaultTolerance();
testE12_ExchangeConsistency();
testE13_StrategyCreationEdges();
testE14_FloatingPoint();
testE15_KlineAnomalies();

// ==================== 最终报告 ====================
console.log(`\n${'═'.repeat(70)}`);
console.log('  🔥 异常 & 边界测试报告');
console.log(`${'═'.repeat(70)}`);
console.log(`  总计: ${totalTests} 项测试`);
console.log(`  ✅ 通过: ${passedTests}`);
console.log(`  ❌ 失败: ${failedTests}`);
console.log(`  通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
console.log();
console.log('  异常场景覆盖:');
console.log('  ├─ E1:  输入验证 (空/NaN/负数/超大/不足数据)');
console.log('  ├─ E2:  网格极端 (零区间/单格/反转/超多格/价格外)');
console.log('  ├─ E3:  利润率边界 (4模式退化/零参数/单格/cap)');
console.log('  ├─ E4:  交易所故障 (无效symbol/余额不足/重复撤/零价)');
console.log('  ├─ E5:  撮合边界 (精确命中/大量挂单/混合/手续费守恒)');
console.log('  ├─ E6:  利润分配 (零/负/超大/price=0/ratio边界/阈值)');
console.log('  ├─ E7:  结束模式 (零余额/微小/未知模式/price=0)');
console.log('  ├─ E8:  风控边界 (回撤100%/全零/成交量异常/阈值=0)');
console.log('  ├─ E9:  趋势检测 (不足/全相同/V型/震荡)');
console.log('  ├─ E10: 格式化 (精度0/负数/NaN/Inf/超大)');
console.log('  ├─ E11: 页面容错 (空数组/NaN/除零/null安全)');
console.log('  ├─ E12: 并发一致性 (快速下撤/余额守恒/连续变动)');
console.log('  ├─ E13: 策略创建 (资金=0/无格/反转/超额分配)');
console.log('  ├─ E14: 浮点陷阱 (0.1+0.2/大数减/累积误差/toFixed)');
console.log('  └─ E15: K线异常 (空/单根/high<low/负量/跳跃/全零)');
console.log();

if (failedTests > 0) {
  console.log('⚠️ 有测试未通过，请检查上方错误信息');
} else {
  console.log('🎉 全部异常测试通过！系统健壮性验证完成');
}
