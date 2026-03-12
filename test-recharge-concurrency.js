/**
 * 并发充值压测脚本
 * 测试多个用户同时创建充值订单时，收款地址是否正确分配、不冲突
 *
 * 用法: node test-recharge-concurrency.js [API_URL] [CONCURRENCY]
 * 示例: node test-recharge-concurrency.js http://43.156.216.141:3001 20
 */

const API_URL = process.argv[2] || 'http://43.156.216.141:3001';
const CONCURRENCY = Number(process.argv[3]) || 20;

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  return res.json();
}

// 注册一个测试用户并返回 JWT token
async function createTestUser(index) {
  const email = `test_recharge_${Date.now()}_${index}@test.com`;
  const password = 'test123456';
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname: `Tester${index}` }),
  });
  if (res.success) {
    return { email, token: res.data.token };
  }
  // 如果注册关闭，尝试登录已有用户
  throw new Error(`注册失败: ${res.error || JSON.stringify(res)}`);
}

// 创建充值订单
async function createRecharge(token, amount, network) {
  return request('/api/user/recharge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, network }),
  });
}

async function main() {
  console.log(`\n🔧 并发充值压测`);
  console.log(`   API: ${API_URL}`);
  console.log(`   并发数: ${CONCURRENCY}\n`);

  // Step 1: 注册测试用户
  console.log(`📝 注册 ${CONCURRENCY} 个测试用户...`);
  const users = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    try {
      const user = await createTestUser(i);
      users.push(user);
    } catch (e) {
      console.error(`   ✗ 用户 ${i} 注册失败: ${e.message}`);
    }
  }
  console.log(`   ✓ 成功注册 ${users.length} 个用户\n`);

  if (users.length === 0) {
    console.log('❌ 没有可用的测试用户，退出');
    return;
  }

  // Step 2: 并发创建充值订单（一半 TRC20，一半 ERC20）
  console.log(`🚀 ${users.length} 个用户同时创建充值订单...`);
  const amounts = [5, 10, 20, 50, 100];

  const startTime = Date.now();
  const results = await Promise.all(
    users.map((user, i) => {
      const amount = amounts[i % amounts.length];
      const network = i % 2 === 0 ? 'TRC20' : 'ERC20';
      return createRecharge(user.token, amount, network).then(res => ({
        index: i,
        email: user.email,
        amount,
        network,
        success: res.success,
        data: res.data,
        error: res.error,
      }));
    })
  );
  const elapsed = Date.now() - startTime;

  // Step 3: 分析结果
  console.log(`\n⏱  总耗时: ${elapsed}ms\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`📊 结果统计:`);
  console.log(`   ✓ 成功: ${successful.length}`);
  console.log(`   ✗ 失败: ${failed.length}\n`);

  if (failed.length > 0) {
    console.log(`❌ 失败详情:`);
    failed.forEach(r => {
      console.log(`   用户 ${r.index}: ${r.error}`);
    });
    console.log('');
  }

  // Step 4: 检查地址冲突
  const addressMap = new Map(); // address -> [orderIds]
  const allAddresses = [];

  successful.forEach(r => {
    const addr = r.data.walletAddress;
    const orderId = r.data.id;
    allAddresses.push(addr);

    if (!addressMap.has(addr)) {
      addressMap.set(addr, []);
    }
    addressMap.get(addr).push({ orderId, email: r.email, amount: r.amount, network: r.network });
  });

  const uniqueAddresses = new Set(allAddresses);
  console.log(`🏠 地址分配:`);
  console.log(`   分配地址总数: ${allAddresses.length}`);
  console.log(`   不重复地址数: ${uniqueAddresses.size}`);

  // 检查是否有地址被多个订单使用
  let conflicts = 0;
  addressMap.forEach((orders, addr) => {
    if (orders.length > 1) {
      conflicts++;
      console.log(`\n   ⚠️  地址冲突: ${addr.slice(0, 20)}...`);
      orders.forEach(o => {
        console.log(`      订单 #${o.orderId} (${o.email}, ${o.amount} USDT, ${o.network})`);
      });
    }
  });

  if (conflicts === 0) {
    console.log(`\n   ✅ 无地址冲突！每个订单分配了不同的地址\n`);
  } else {
    console.log(`\n   ❌ 发现 ${conflicts} 个地址冲突！需要修复并发控制\n`);
  }

  // Step 5: 按网络统计
  const trc20Orders = successful.filter(r => r.network === 'TRC20');
  const erc20Orders = successful.filter(r => r.network === 'ERC20');
  console.log(`📡 网络分布:`);
  console.log(`   TRC20: ${trc20Orders.length} 单`);
  console.log(`   ERC20: ${erc20Orders.length} 单`);

  // 统计使用了默认地址 vs DB地址
  const defaultAddrOrders = successful.filter(r => {
    // 默认地址通常很长且固定，DB地址是变化的
    // 如果所有地址相同，说明都用了默认地址（DB里没有导入地址）
    return false; // 无法在此判断，跳过
  });

  console.log(`\n📋 订单详情（前10条）:`);
  successful.slice(0, 10).forEach(r => {
    const d = r.data;
    console.log(`   #${d.id} | ${r.email.split('@')[0]} | ${r.amount} USDT | ${r.network} | 地址: ${d.walletAddress.slice(0, 16)}... | 锁定到: ${d.lockExpiresAt || 'N/A'}`);
  });

  // 最终判定
  console.log(`\n${'='.repeat(60)}`);
  if (conflicts === 0 && failed.length === 0) {
    console.log('🎉 测试通过！并发充值地址分配正常，无冲突');
  } else if (conflicts === 0) {
    console.log(`⚠️  测试部分通过：无地址冲突，但有 ${failed.length} 个请求失败`);
  } else {
    console.log(`❌ 测试失败：发现 ${conflicts} 个地址冲突`);
  }
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
