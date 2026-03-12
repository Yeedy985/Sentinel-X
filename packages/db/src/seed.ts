/**
 * Sentinel-X 数据库种子数据
 * 初始化管理员账号、默认配置、LLM成本配置、信号矩阵
 */
import { PrismaClient } from '@prisma/client';
import * as crypto from 'node:crypto';
import { SIGNAL_MATRIX } from './signalMatrix';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. 创建管理员 ──
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hashPassword(adminPassword) },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      name: 'Sentinel Admin',
    },
  });
  console.log(`  ✅ Admin: ${adminEmail}`);

  // ── 2. 默认管理配置 ──
  const defaults: Record<string, unknown> = {
    cache_window_minutes: 5,
    scan_price_basic: 1,
    scan_price_with_search: 2,
    token_to_cny_rate: 0.5,
    max_scans_per_user_per_hour: 3,
    max_concurrent_scans: 10,
    maintenance_mode: false,
    announcement: '',
    registration_enabled: true,
    new_user_bonus_tokens: 5,
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.adminSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as any },
    });
  }
  console.log('  ✅ Admin settings: 10 defaults');

  // ── 3. LLM 成本配置 ──
  const costs = [
    { provider: 'perplexity', role: 'SEARCHER' as const, model: 'sonar-pro', costPerCall: 0.005 },
    { provider: 'deepseek', role: 'ANALYZER' as const, model: 'deepseek-chat', costPerCall: 0.003 },
    { provider: 'gemini', role: 'ANALYZER_BACKUP' as const, model: 'gemini-2.0-flash', costPerCall: 0.002 },
  ];

  for (const c of costs) {
    await prisma.llmCostConfig.upsert({
      where: {
        provider_role_model: {
          provider: c.provider,
          role: c.role,
          model: c.model,
        },
      },
      update: { costPerCall: c.costPerCall },
      create: c,
    });
  }
  console.log('  ✅ LLM cost configs: 3 providers');

  // ── 4. 默认 Prompt 模板 ──
  await prisma.promptTemplate.upsert({
    where: { name: 'searcher_prompt' },
    update: {},
    create: {
      name: 'searcher_prompt',
      content: `你是 Sentinel-X 实时市场情报搜索引擎。请搜索过去24小时内加密货币市场的最新重大事件、监管政策变化、大型交易所动态、DeFi和NFT板块变化、宏观经济影响因素。

返回格式:
1. 每条情报包含: 标题、摘要、来源、时间、影响评估
2. 按重要性排序
3. 至少覆盖: BTC/ETH价格走势、监管动态、交易所消息、DeFi/NFT、宏观经济
4. 使用中文回复`,
      version: 1,
      isActive: true,
    },
  });

  await prisma.promptTemplate.upsert({
    where: { name: 'analyzer_prompt' },
    update: {},
    create: {
      name: 'analyzer_prompt',
      content: `你是 Sentinel-X AI 加密市场信号分析引擎。请基于提供的市场数据和搜索情报，分析以下300条信号矩阵中哪些被触发。

规则:
1. 只报告有真实事件支撑的信号触发，不要编造
2. 每个触发信号需要给出 impact (影响分值)、confidence (0-1置信度)、title、summary、source
3. 同时输出 alerts 数组(紧急预警)和 marketSummary (市场概述)
4. 严格按 JSON 格式输出
5. 使用中文回复`,
      version: 1,
      isActive: true,
    },
  });
  // signal_matrix: 300条信号字典 (给分析器LLM参考)
  await prisma.promptTemplate.upsert({
    where: { name: 'signal_matrix' },
    update: {},
    create: {
      name: 'signal_matrix',
      content: `Sentinel-X 300信号矩阵 (每条格式: #ID | 组别 | 名称 | impact | 分类D/V/R | 触发条件)

[G1] 宏观流动性 (1-30):
#1 CPI同比 |-15|D| #2 核心CPI |-15|D| #3 PCE |-12|D| #4 核心PCE |-12|D| #5 PPI |-10|D|
#6 NFP |-12|D| #7 失业率 |+12|D| #8 ADP |-10|D| #9 初请失业金 |+8|D| #10 平均时薪 |-10|D|
#11 DXY美元指数 |-10|D| #12 10Y美债 |-10|D| #13 2Y美债 |-10|D| #14 2Y-10Y倒挂 |-8|R| #15 30Y美债 |-8|D|
#16 M2美国 |+18|D| #17 M2中国 |+15|D| #18 M2欧元区 |+12|D| #19 M2日本 |+10|D| #20 全球M2 |+18|D|
#21 黄金 |+8|D| #22 原油 |-5|D| #23 铜价 |+6|D| #24 CRB指数 |+5|D| #25 Bloomberg商品 |+5|D|
#26 VIX |-10|V| #27 金融压力指数 |-10|R| #28 PMI |+8|D| #29 消费者信心 |+6|D| #30 密歇根通胀预期 |-8|D|

[G2] 央行与利率 (31-65):
#31 FOMC加息25bp |-25|D| #32 加息50bp |-40|D| #33 降息25bp |+25|D| #34 降息50bp |+40|D|
#35 维持利率 |+5|D| #36 点阵图上移 |-15|D| #37 会议纪要鹰派 |-12|D| #38 鲍威尔讲话 |-15|D|
#39 FedWatch降息概率 |+10|D| #40 紧急加/降息 |-50|R| #41 RRP余额 |+15|D| #42 BTFP |+12|R|
#43 贴现窗口 |-15|R| #44 QT缩表 |-10|D| #45 TGA余额 |-8|D| #46 ECB利率 |-15|D|
#47 拉加德讲话 |-10|D| #48 BOJ/YCC |-12|D| #49 日元套利平仓 |-20|R| #50 BOE |-10|D|
#51 PBOC降准 |+12|D| #52 LPR调降 |+10|D| #53 MLF利率 |+8|D| #54 RBA |-8|D| #55 BOC |-8|D|
#56 SNB |-6|D| #57 Riksbank |-5|D| #58 RBNZ |-5|D| #59 全球协同宽松 |+20|D| #60 全球协同紧缩 |-20|D|
#61 联储官员讲话 |-8|D| #62 褐皮书 |-5|D| #63 Jackson Hole |-15|D| #64 G7/G20 |+8|D| #65 IMF展望 |+6|D|

[G3] 监管与合规 (66-95):
#66 SEC批准BTC ETF |+30|D| #67 SEC拒绝BTC ETF |-30|D| #68 SEC批准ETH ETF |+25|D|
#69 ETF推迟 |-5|D| #70 新ETF受理 |+12|D| #71 证券认定 |-40|D| #72 SEC起诉交易所 |-35|R|
#73 诉讼和解 |+20|D| #74 XRP裁决 |+25|D| #75 高管调查 |-30|R| #76 香港政策 |+12|D|
#77 新加坡MAS |+10|D| #78 迪拜VARA |+8|D| #79 MiCA |+12|D| #80 日本法规 |+10|D|
#81 韩国监管 |+8|D| #82 稳定币立法 |+15|D| #83 FIT21 |+15|D| #84 美国税收 |-10|D|
#85 全球税收 |-8|D| #86 CFTC执法 |-15|R| #87 AML/KYC |-10|R| #88 USDT监管 |-20|R|
#89 USDC动态 |-8|D| #90 中国执法 |-12|R| #91 印度政策 |+8|D| #92 非洲政策 |+5|D|
#93 俄罗斯政策 |+6|D| #94 拉美法规 |+6|D| #95 FATF旅行规则 |-8|R|

[G4] 机构资金流 (96-130):
#96 IBIT净流入 |+20|D| #97 FBTC净流入 |+18|D| #98 GBTC变动 |-15|D| #99 ARKB |+12|D|
#100 BTC ETF总净流 |+20|D| #101 ETH ETF总净流 |+15|D| #102 其他BTC ETF |+8|D|
#103 MicroStrategy增持 |+15|D| #104 Tesla持仓 |+12|D| #105 上市公司持仓 |+10|D|
#106 交易所BTC库存 |+15|D| #107 交易所ETH库存 |+12|D| #108 交易所USDT |+10|D| #109 USDC库存 |+8|D|
#110 Binance BTC流量 |+12|D| #111 Coinbase BTC流量 |+12|D| #112 USDT大额铸造 |+18|D|
#113 USDT销毁 |-15|D| #114 USDC铸销 |+12|D| #115 DAI供应 |+8|D| #116 稳定币总市值 |+15|D|
#117 CME BTC OI |+10|D| #118 CME溢价 |+8|D| #119 Grayscale持仓 |+10|D| #120 主权基金 |+15|D|
#121 13F持仓 |+12|D| #122 VC融资>$100M |+10|D| #123 VC月度趋势 |+8|D| #124 灰度折溢价 |+10|D|
#125 现货期货基差 |+8|D| #126 OTC交易量 |+10|D| #127 交易所BTC 7日MA |+12|D|
#128 稳定币7日流入 |+10|D| #129 传统金融入场 |+12|D| #130 加密友好银行 |+8|D|

[G5] 链上物理流 (131-160):
#131 巨鲸充值>1000BTC |-18|D| #132 巨鲸提现冷钱包 |+12|D| #133 ETH巨鲸充值 |-15|D|
#134 ETH巨鲸提现 |+10|D| #135 >1000BTC地址数 |+10|D| #136 矿工储备 |-15|D| #137 矿工转交易所 |-12|D|
#138 全网算力 |+8|D| #139 Hash Ribbon |-15|D| #140 挖矿难度 |+5|D| #141 LTH净仓位 |+8|D|
#142 STH成本基础 |+6|D| #143 LTH/STH占比 |+8|D| #144 MVRV Z-Score |+10|D| #145 NUPL |+8|D|
#146 Puell Multiple |+8|D| #147 SOPR |+6|D| #148 aSOPR |+6|D| #149 实现市值 |+8|D|
#150 Smart Money |+12|D| #151 BTC活跃地址 |+6|D| #152 ETH活跃地址 |+6|D| #153 Gas Fee |+5|V|
#154 ETH销毁 |+6|D| #155 质押率 |+5|D| #156 DeFi TVL |+8|D| #157 DEX交易量 |+6|D|
#158 NFT交易量 |+4|D| #159 Ordinals活跃度 |+5|D| #160 跨链桥TVL |+5|R|

[G6] 市场结构 (161-190):
#161 BTC资金费率 |-15|V| #162 ETH资金费率 |-12|V| #163 多头爆仓1h |-20|V| #164 空头爆仓1h |+20|V|
#165 24h总爆仓>$500M |-15|R| #166 BTC OI |+10|V| #167 ETH OI |+8|V| #168 OI价格背离 |-12|R|
#169 多空比 |-10|D| #170 Put/Call比 |-10|D| #171 Max Pain |+8|D| #172 25Delta Skew |-8|D|
#173 IV |+10|V| #174 BTC买盘深度 |+15|D| #175 卖盘深度 |-12|D| #176 大单>$1M |+10|D|
#177 异常放量 |+8|V| #178 Binance深度 |+10|D| #179 Coinbase Premium |+12|D| #180 韩国溢价 |+8|D|
#181 PoR审计异常 |-50|R| #182 提币延迟 |-30|R| #183 API异常 |-15|R| #184 基差异常 |-10|V|
#185 成交/OI比 |+6|V| #186 杠杆代币 |+5|D| #187 全网杠杆率 |-10|R| #188 Taker Buy/Sell |+8|D|
#189 期货成交量急增 |+8|V| #190 现货/衍生品比 |+5|D|

[G7] 情绪指标 (191-220):
#191 恐贪指数 |-10|D| #192 Google BTC |-6|D| #193 Google Crypto |+5|D| #194 Twitter BTC |+6|D|
#195 Twitter情绪 |-8|D| #196 Reddit活跃度 |+5|D| #197 TG消息量 |+5|V| #198 YouTube热度 |-4|D|
#199 Discord活跃 |+4|D| #200 中文社区情绪 |+5|D| #201 Santiment |+6|D| #202 LunarCrush |+5|D|
#203 山寨币季节 |+8|D| #204 BTC Dominance |-6|D| #205 App下载排名 |+5|D| #206 新钱包BTC |+5|D|
#207 新钱包ETH |+5|D| #208 新闻AI情绪 |+8|D| #209 恐慌报道 |-8|D| #210 主流媒体 |+6|D|
#211 Bitfinex多空保证金 |+6|D| #212 Binance账户比 |+5|D| #213 期货溢价指数 |+6|D|
#214 IV期限结构 |+5|V| #215 周末波动率 |+5|V| #216 时段资金分布 |+5|D| #217 空投热度 |+4|D|
#218 Meme集体暴涨 |-5|R| #219 散户FOMO |-6|D| #220 投降指标 |+10|D|

[G8] 叙事与赛道 (221-255):
#221 AI+Crypto |+10|D| #222 RWA |+10|D| #223 L2 TVL |+8|D| #224 DePIN |+8|D|
#225 GameFi |+6|D| #226 SocialFi |+5|D| #227 DeFi新叙事 |+8|D| #228 BTC减半 |+12|D|
#229 ETH升级 |+10|D| #230 SOL Firedancer |+8|D| #231 Ordinals叙事 |+6|D|
#232 ARB解锁 |-10|D| #233 OP解锁 |-10|D| #234 APT/SUI解锁 |-8|D| #235 其他大额解锁 |-8|D|
#236 Binance上币 |+8|D| #237 Coinbase上币 |+6|D| #238 交易所下币 |-5|D| #239 Meme爆发 |-5|V|
#240 跨链更新 |+6|D| #241 模块化叙事 |+6|D| #242 ZK赛道 |+5|D| #243 BTC生态 |+6|D|
#244 Restaking |+6|D| #245 收益型稳定币 |+5|D| #246 Cosmos |+4|D| #247 Polkadot |+4|D|
#248 Avalanche |+4|D| #249 BNB Chain |+6|D| #250 Base链 |+6|D| #251 zkSync/StarkNet |+6|D|
#252 Arbitrum生态 |+6|D| #253 OP超级链 |+5|D| #254 国债代币化 |+8|D| #255 AI Agent |+8|D|

[G9] 黑天鹅与安全 (256-285):
#256 T1交易所被黑 |-50|R| #257 T2交易所被黑 |-35|R| #258 交易所倒闭 |-80|R| #259 暂停提币 |-40|R|
#260 DeFi被黑>$50M |-25|R| #261 DeFi被黑<$50M |-15|R| #262 跨链桥被黑 |-30|R| #263 合约漏洞 |-20|R|
#264 Rug Pull |-15|R| #265 闪电贷攻击 |-12|R| #266 预言机攻击 |-15|R| #267 USDT脱锚>0.5% |-60|R|
#268 USDT脱锚>1% |-100|R| #269 USDC脱锚 |-50|R| #270 DAI脱锚 |-30|R| #271 算稳崩盘 |-70|R|
#272 51%攻击 |-40|R| #273 网络拥堵 |-10|R| #274 ETH Bug |-25|R| #275 加密银行暴雷 |-40|R|
#276 借贷暴雷 |-35|R| #277 基金清算 |-25|R| #278 矿场关停 |-15|R| #279 量子威胁 |-10|R|
#280 互联网中断 |-20|R| #281 关键人物逮捕 |-25|R| #282 DDoS攻击 |-10|R| #283 Tether审计危机 |-40|R|
#284 做市商破产 |-20|R| #285 级联清算 |-25|R|

[G10] 关键人物与地缘 (286-300):
#286 Musk正面推文 |+15|D| #287 Musk负面推文 |-12|D| #288 Saylor增持 |+10|D| #289 Vitalik表态 |+8|D|
#290 CZ发言 |+8|D| #291 Trump加密政策 |+15|D| #292 总统候选人表态 |+12|D| #293 Larry Fink言论 |+12|D|
#294 Cathie Wood |+8|D| #295 Jamie Dimon |+8|D| #296 萨尔瓦多 |+6|D| #297 中东/俄乌 |-20|R|
#298 台海/朝鲜 |-25|R| #299 流行病/灾害 |-15|R| #300 美国大选 |-10|D|

分类说明: D=方向(影响SD分)，V=波动(影响SV分)，R=风险(影响SR分)
impact值为默认方向，正=利多，负=利空，LLM需根据实际事件判断方向`,
      version: 1,
      isActive: true,
    },
  });

  console.log('  ✅ Prompt templates: searcher + analyzer + signal_matrix');

  // ── 5. 种子300条信号矩阵 ──
  let signalCount = 0;
  for (const sig of SIGNAL_MATRIX) {
    await prisma.signalDefinition.upsert({
      where: { signalId: sig.signalId },
      update: {
        group: sig.group,
        name: sig.name,
        impact: sig.impact,
        halfLife: sig.halfLife,
        confidence: sig.confidence,
        category: sig.category,
        triggerCondition: sig.triggerCondition,
        positiveDesc: sig.positiveDesc,
        negativeDesc: sig.negativeDesc,
      },
      create: {
        signalId: sig.signalId,
        group: sig.group,
        name: sig.name,
        impact: sig.impact,
        halfLife: sig.halfLife,
        confidence: sig.confidence,
        category: sig.category,
        triggerCondition: sig.triggerCondition,
        positiveDesc: sig.positiveDesc,
        negativeDesc: sig.negativeDesc,
        enabled: true,
      },
    });
    signalCount++;
  }
  console.log(`  ✅ Signal definitions: ${signalCount} signals (G1-G10)`);

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
