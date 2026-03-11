/**
 * 模拟币安交易所 - 完整模拟账户、订单撮合、余额管理
 * 用于本地全流程测试，无需连接真实币安API
 */

import type { SymbolInfo, GridOrder } from '../types';

// ==================== 模拟交易对配置 ====================
export const MOCK_SYMBOLS: Record<string, SymbolInfo> = {
  BTCUSDT: {
    symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT',
    pricePrecision: 2, quantityPrecision: 5, minNotional: 10,
    minQty: 0.00001, stepSize: '0.00001', tickSize: '0.01',
  },
  ETHUSDT: {
    symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT',
    pricePrecision: 2, quantityPrecision: 4, minNotional: 10,
    minQty: 0.0001, stepSize: '0.0001', tickSize: '0.01',
  },
  SOLUSDT: {
    symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT',
    pricePrecision: 2, quantityPrecision: 2, minNotional: 5,
    minQty: 0.01, stepSize: '0.01', tickSize: '0.01',
  },
};

// ==================== 模拟订单 ====================
export interface MockOrder {
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: number;
  origQty: number;
  executedQty: number;
  status: 'NEW' | 'FILLED' | 'CANCELED' | 'PARTIALLY_FILLED' | 'REJECTED';
  timeInForce: string;
  time: number;
}

// ==================== 模拟成交记录 ====================
export interface MockTrade {
  tradeId: number;
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  time: number;
}

// ==================== 模拟币安交易所 ====================
export class MockBinanceExchange {
  // 账户余额: { asset: { free, locked } }
  balances: Map<string, { free: number; locked: number }> = new Map();
  // 当前价格
  prices: Map<string, number> = new Map();
  // 挂单簿
  openOrders: MockOrder[] = [];
  // 历史成交
  trades: MockTrade[] = [];
  // 已取消订单
  cancelledOrders: MockOrder[] = [];
  // 自增ID
  private nextOrderId = 1;
  private nextTradeId = 1;
  // 手续费率
  feeRate = 0.001; // 0.1%
  // 日志
  logs: string[] = [];

  constructor() {
    this.reset();
  }

  // ==================== 初始化账户 ====================
  reset() {
    this.balances.clear();
    this.prices.clear();
    this.openOrders = [];
    this.trades = [];
    this.cancelledOrders = [];
    this.nextOrderId = 1;
    this.nextTradeId = 1;
    this.logs = [];
  }

  /** 设置初始余额 */
  setBalance(asset: string, free: number, locked: number = 0) {
    this.balances.set(asset, { free, locked });
    this.log(`💰 设置余额 ${asset}: free=${free}, locked=${locked}`);
  }

  /** 获取余额 */
  getBalance(asset: string): { free: number; locked: number } {
    return this.balances.get(asset) || { free: 0, locked: 0 };
  }

  /** 设置当前价格 */
  setPrice(symbol: string, price: number) {
    this.prices.set(symbol, price);
  }

  /** 获取当前价格 */
  getPrice(symbol: string): number {
    return this.prices.get(symbol) || 0;
  }

  private log(msg: string) {
    this.logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  }

  // ==================== 模拟币安 API ====================

  /** GET /api/v3/account */
  getAccountInfo(): { balances: Array<{ asset: string; free: string; locked: string }> } {
    const balances: Array<{ asset: string; free: string; locked: string }> = [];
    for (const [asset, bal] of this.balances) {
      if (bal.free > 0 || bal.locked > 0) {
        balances.push({ asset, free: String(bal.free), locked: String(bal.locked) });
      }
    }
    return { balances };
  }

  /** GET /api/v3/ticker/price */
  getTickerPrice(symbol: string): { symbol: string; price: string } {
    const price = this.prices.get(symbol) || 0;
    return { symbol, price: String(price) };
  }

  /** POST /api/v3/order - 下单 */
  placeOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    price?: number;
    quantity: number;
    timeInForce?: string;
  }): MockOrder | { error: string; code: number } {
    const symbolInfo = MOCK_SYMBOLS[params.symbol];
    if (!symbolInfo) return { error: `Invalid symbol: ${params.symbol}`, code: -1121 };

    // 验证数量精度
    if (params.quantity < symbolInfo.minQty) {
      return { error: `Quantity below minimum: ${params.quantity} < ${symbolInfo.minQty}`, code: -1013 };
    }

    // 验证最小名义价值
    const price = params.type === 'MARKET'
      ? this.getPrice(params.symbol)
      : (params.price || 0);

    if (price <= 0) return { error: 'Invalid price', code: -1013 };

    const notional = price * params.quantity;
    if (notional < symbolInfo.minNotional) {
      return { error: `Notional below minimum: ${notional.toFixed(2)} < ${symbolInfo.minNotional}`, code: -1013 };
    }

    // 检查余额
    if (params.side === 'BUY') {
      const usdtBal = this.getBalance('USDT');
      const cost = price * params.quantity;
      if (usdtBal.free < cost) {
        return { error: `Insufficient USDT: need ${cost.toFixed(2)}, have ${usdtBal.free.toFixed(2)}`, code: -2010 };
      }
      // 冻结资金
      usdtBal.free -= cost;
      usdtBal.locked += cost;
      this.balances.set('USDT', usdtBal);
    } else {
      const coinBal = this.getBalance(symbolInfo.baseAsset);
      if (coinBal.free < params.quantity) {
        return { error: `Insufficient ${symbolInfo.baseAsset}: need ${params.quantity}, have ${coinBal.free}`, code: -2010 };
      }
      // 冻结币
      coinBal.free -= params.quantity;
      coinBal.locked += params.quantity;
      this.balances.set(symbolInfo.baseAsset, coinBal);
    }

    const order: MockOrder = {
      orderId: this.nextOrderId++,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      price,
      origQty: params.quantity,
      executedQty: 0,
      status: 'NEW',
      timeInForce: params.timeInForce || 'GTC',
      time: Date.now(),
    };

    // MARKET 订单立即成交
    if (params.type === 'MARKET') {
      this.fillOrder(order, price);
    } else {
      this.openOrders.push(order);
    }

    this.log(`📋 下单 ${params.side} ${params.quantity} ${symbolInfo.baseAsset} @ ${price} (${params.type}) → ID:${order.orderId}`);
    return order;
  }

  /** DELETE /api/v3/order - 撤单 */
  cancelOrder(symbol: string, orderId: number): MockOrder | { error: string; code: number } {
    const idx = this.openOrders.findIndex(o => o.orderId === orderId && o.symbol === symbol);
    if (idx === -1) return { error: `Order not found: ${orderId}`, code: -2011 };

    const order = this.openOrders.splice(idx, 1)[0];
    order.status = 'CANCELED';

    // 解冻资金
    const symbolInfo = MOCK_SYMBOLS[symbol];
    if (order.side === 'BUY') {
      const cost = order.price * (order.origQty - order.executedQty);
      const usdtBal = this.getBalance('USDT');
      usdtBal.free += cost;
      usdtBal.locked -= cost;
      this.balances.set('USDT', usdtBal);
    } else {
      const qty = order.origQty - order.executedQty;
      const coinBal = this.getBalance(symbolInfo.baseAsset);
      coinBal.free += qty;
      coinBal.locked -= qty;
      this.balances.set(symbolInfo.baseAsset, coinBal);
    }

    this.cancelledOrders.push(order);
    this.log(`❌ 撤单 ID:${orderId} ${order.side} ${order.origQty} @ ${order.price}`);
    return order;
  }

  /** GET /api/v3/openOrders */
  getOpenOrders(symbol?: string): MockOrder[] {
    if (symbol) return this.openOrders.filter(o => o.symbol === symbol);
    return [...this.openOrders];
  }

  // ==================== 订单撮合引擎 ====================

  /** 成交一个订单 */
  private fillOrder(order: MockOrder, fillPrice: number) {
    const symbolInfo = MOCK_SYMBOLS[order.symbol];
    const fillQty = order.origQty - order.executedQty;
    const quoteQty = fillPrice * fillQty;
    const fee = quoteQty * this.feeRate;

    if (order.side === 'BUY') {
      // 买入: 解冻USDT, 增加币
      const usdtBal = this.getBalance('USDT');
      usdtBal.locked -= fillPrice * order.origQty; // 解冻原始冻结金额
      this.balances.set('USDT', usdtBal);

      const coinBal = this.getBalance(symbolInfo.baseAsset);
      coinBal.free += fillQty - (fee / fillPrice); // 扣手续费
      this.balances.set(symbolInfo.baseAsset, coinBal);
    } else {
      // 卖出: 解冻币, 增加USDT
      const coinBal = this.getBalance(symbolInfo.baseAsset);
      coinBal.locked -= order.origQty;
      this.balances.set(symbolInfo.baseAsset, coinBal);

      const usdtBal = this.getBalance('USDT');
      usdtBal.free += quoteQty - fee; // 扣手续费
      this.balances.set('USDT', usdtBal);
    }

    order.executedQty = order.origQty;
    order.status = 'FILLED';

    const trade: MockTrade = {
      tradeId: this.nextTradeId++,
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      price: fillPrice,
      qty: fillQty,
      quoteQty,
      commission: fee,
      commissionAsset: order.side === 'BUY' ? symbolInfo.baseAsset : 'USDT',
      time: Date.now(),
    };
    this.trades.push(trade);

    this.log(`✅ 成交 ID:${order.orderId} ${order.side} ${fillQty} @ ${fillPrice}, fee=${fee.toFixed(4)}`);
  }

  /** 模拟价格变动 → 触发挂单成交 */
  simulatePriceMove(symbol: string, newPrice: number): MockTrade[] {
    this.setPrice(symbol, newPrice);
    const filledTrades: MockTrade[] = [];
    const prevTradeCount = this.trades.length;

    // 遍历挂单，检查是否触发
    const remaining: MockOrder[] = [];
    for (const order of this.openOrders) {
      if (order.symbol !== symbol) {
        remaining.push(order);
        continue;
      }

      let triggered = false;
      if (order.side === 'BUY' && newPrice <= order.price) {
        triggered = true;
      } else if (order.side === 'SELL' && newPrice >= order.price) {
        triggered = true;
      }

      if (triggered) {
        this.fillOrder(order, order.price);
      } else {
        remaining.push(order);
      }
    }

    this.openOrders = remaining;

    // 收集新成交
    for (let i = prevTradeCount; i < this.trades.length; i++) {
      filledTrades.push(this.trades[i]);
    }

    if (filledTrades.length > 0) {
      this.log(`📈 价格变动 ${symbol} → ${newPrice}, 触发 ${filledTrades.length} 笔成交`);
    }

    return filledTrades;
  }

  // ==================== 辅助方法 ====================

  /** 获取账户总价值 (USDT计) */
  getTotalValue(): number {
    let total = 0;
    for (const [asset, bal] of this.balances) {
      const amount = bal.free + bal.locked;
      if (asset === 'USDT') {
        total += amount;
      } else {
        const price = this.getPrice(`${asset}USDT`);
        total += amount * price;
      }
    }
    return total;
  }

  /** 打印账户状态 */
  printStatus() {
    console.log('  ┌─ 账户状态 ────────────────────────────');
    for (const [asset, bal] of this.balances) {
      if (bal.free > 0 || bal.locked > 0) {
        console.log(`  │ ${asset.padEnd(6)} free=${bal.free.toFixed(6).padStart(14)} locked=${bal.locked.toFixed(6).padStart(14)}`);
      }
    }
    console.log(`  │ 总价值: ${this.getTotalValue().toFixed(2)} USDT`);
    console.log(`  │ 挂单: ${this.openOrders.length}, 成交: ${this.trades.length}`);
    console.log('  └──────────────────────────────────────');
  }

  /** 将内部GridOrder转为币安挂单 */
  placeGridOrder(gridOrder: Omit<GridOrder, 'id'>, symbolInfo: SymbolInfo): MockOrder | { error: string; code: number } {
    return this.placeOrder({
      symbol: symbolInfo.symbol,
      side: gridOrder.side === 'buy' ? 'BUY' : 'SELL',
      type: 'LIMIT',
      price: +gridOrder.price.toFixed(symbolInfo.pricePrecision),
      quantity: +gridOrder.quantity.toFixed(symbolInfo.quantityPrecision),
      timeInForce: 'GTC',
    });
  }
}
