/**
 * Scan Worker — BullMQ 扫描任务处理器
 * 负责：
 * 1. 从队列取出扫描任务
 * 2. 获取活跃 LLM 管线配置
 * 3. 调用搜索器 (Perplexity) + 分析器 (DeepSeek/Gemini)
 * 4. 生成简报数据，写入缓存
 * 5. 更新扫描记录状态
 * 6. 失败时退回 Token
 */
import { Worker, Queue } from 'bullmq';
import { db } from '@sentinel/db';
import { decryptValue } from '../lib/crypto';

// ── Redis 连接配置 ──
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const connection = { host: REDIS_HOST, port: REDIS_PORT };

// ── 队列定义 ──
export const scanQueue = new Queue('scan', { connection });

// ── 获取管线配置 ──
async function getActivePipeline(role: string) {
  return db.pipelineConfig.findFirst({
    where: { role: role as any, enabled: true },
    orderBy: { priority: 'asc' },
  });
}

// ── 获取管理配置 ──
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.adminSetting.findUnique({ where: { key } });
  return s ? (s.value as T) : fallback;
}

// ── Token usage 类型 ──
interface LLMResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ── 调用 LLM API (支持 Gemini / Anthropic / OpenAI-compatible) ──
async function callLLM(config: {
  apiUrl: string;
  apiKeyEnc: string;
  model: string;
  provider: string;
  extraParams: any;
}, systemPrompt: string, userPrompt: string): Promise<LLMResult> {
  const apiKey = decryptValue(config.apiKeyEnc);
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const emptyUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // ── Gemini ──
  if (config.provider === 'gemini') {
    const baseUrl = config.apiUrl.includes('{model}')
      ? config.apiUrl.replace('{model}', config.model)
      : `${config.apiUrl.replace(/\/+$/, '')}/models/${config.model}:generateContent`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const fullUrl = `${baseUrl}${separator}key=${apiKey}`;

    const body: any = {
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      ...(config.extraParams || {}),
    };

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p.text || '').join('\n');
    const meta = data.usageMetadata;
    console.log('[callLLM][gemini] raw usageMetadata:', JSON.stringify(meta));
    const usage = meta
      ? { promptTokens: meta.promptTokenCount || 0, completionTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 }
      : emptyUsage;
    return { text, usage };
  }

  // ── Anthropic ──
  if (config.provider === 'anthropic') {
    const body: any = {
      model: config.model,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: combinedPrompt }],
      ...(config.extraParams || {}),
    };
    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const text = data.content?.[0]?.text || '';
    const u = data.usage;
    console.log('[callLLM][anthropic] raw usage:', JSON.stringify(u));
    const usage = u
      ? { promptTokens: u.input_tokens || 0, completionTokens: u.output_tokens || 0, totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0) }
      : emptyUsage;
    return { text, usage };
  }

  // ── OpenAI-compatible (OpenAI, DeepSeek, Perplexity, Custom) ──
  const body: any = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    ...(config.extraParams || {}),
  };

  if (config.provider === 'perplexity') {
    body.search_recency_filter = 'day';
  }

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`${config.provider} API error ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const u = data.usage;
  console.log(`[callLLM][${config.provider}] raw usage:`, JSON.stringify(u));
  const usage = u
    ? { promptTokens: u.prompt_tokens || 0, completionTokens: u.completion_tokens || 0, totalTokens: u.total_tokens || 0 }
    : emptyUsage;
  console.log(`[callLLM][${config.provider}] parsed usage:`, JSON.stringify(usage));
  return { text, usage };
}

// ── 获取提示词模板 ──
async function getPromptTemplate(name: string): Promise<string> {
  const tpl = await db.promptTemplate.findFirst({
    where: { name, isActive: true },
    orderBy: { version: 'desc' },
  });
  return tpl?.content || '';
}

// ── 解析 LLM JSON 输出 ──
function parseLLMOutput(raw: string): any {
  // 尝试提取 JSON 块
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      // fallback
    }
  }
  return { marketSummary: raw, triggeredSignals: [], alerts: [] };
}

// ── Worker 处理函数 ──
async function processScanJob(job: any) {
  const { briefingId, enableSearch, userId, billingMode } = job.data;
  console.log(`[Worker] Processing scan: ${briefingId}`);

  try {
    // 更新状态为处理中
    await db.scanRecord.updateMany({
      where: { briefingId },
      data: { status: 'PROCESSING' },
    });

    let searchContext = '';
    let searchCost = 0;
    let searchTokens = 0;

    // Step 1: 搜索增强 (可选)
    if (enableSearch) {
      const searcherPipeline = await getActivePipeline('SEARCHER');
      if (searcherPipeline) {
        const searchPrompt = await getPromptTemplate('searcher_prompt');
        const searchResult = await callLLM(
          searcherPipeline,
          searchPrompt || 'You are a crypto market research assistant. Search for the latest market news and events.',
          'Search for the latest cryptocurrency market news, regulatory changes, whale movements, and significant events in the last 24 hours. Output in JSON format with fields: news[], events[], regulatory[].',
        );
        searchContext = searchResult.text;
        searchTokens = searchResult.usage.totalTokens;

        // 记录搜索成本
        const costConfig = await db.llmCostConfig.findFirst({
          where: { provider: searcherPipeline.provider, model: searcherPipeline.model },
        });
        searchCost = costConfig ? Number(costConfig.costPerCall) : 0.01;
      }
    }

    // Step 2: 分析器 (先尝试 ANALYZER，再 fallback 到 ANALYZER_BACKUP)
    let analyzerPipeline = await getActivePipeline('ANALYZER');
    if (!analyzerPipeline) {
      analyzerPipeline = await getActivePipeline('ANALYZER_BACKUP');
    }
    if (!analyzerPipeline) {
      throw new Error('No active analyzer pipeline configured');
    }

    // 从DB读取启用的信号定义，构建结构化prompt (与AAGS本地模式完全一致)
    const enabledSignals = await db.signalDefinition.findMany({
      where: { enabled: true },
      orderBy: { signalId: 'asc' },
    });

    // 按组构建信号列表
    const groupMap = new Map<string, typeof enabledSignals>();
    for (const sig of enabledSignals) {
      const list = groupMap.get(sig.group) || [];
      list.push(sig);
      groupMap.set(sig.group, list);
    }

    const GROUP_LABELS: Record<string, string> = {
      G1: '💰 宏观流动性', G2: '🏦 央行与利率政策', G3: '⚖️ 监管与合规',
      G4: '🏛️ 机构资金流', G5: '⛓️ 链上物理流', G6: '📐 市场结构',
      G7: '🧠 情绪指标', G8: '🚀 叙事与赛道', G9: '🦢 黑天鹅与安全',
      G10: '🎯 关键人物与地缘',
    };

    let signalListText = '';
    for (const [group, sigs] of [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      signalListText += `\n### ${GROUP_LABELS[group] || group}\n`;
      for (const sig of sigs) {
        signalListText += `  #${sig.signalId} | ${sig.name} | 权重=${sig.impact} | 半衰期=${sig.halfLife}min | 归类=${sig.category} | 条件: ${sig.triggerCondition}\n`;
      }
    }

    const analyzerPrompt = await getPromptTemplate('analyzer_prompt');

    const analysisInput = `你是 Sentinel-X AI 交易系统的信号分析引擎。你的任务是基于下方提供的**搜索情报**，精确判断${enabledSignals.length}条信号矩阵中哪些正在被触发。

${searchContext ? `## 🔍 联网搜索情报\n${searchContext}\n` : '（无搜索情报，请基于你的训练数据中最近的市场知识进行分析）'}

## 信号矩阵 (共 ${enabledSignals.length} 条)
${signalListText}

## 分析指令
1. 结合上方搜索情报，逐条评估信号是否被触发
2. 只返回**有实际数据/新闻/事件支持**的信号，不要凭空编造
3. 对每个被触发的信号，给出实际的 impact 值（正数=利多, 负数=利空），取值范围参考原始权重
4. 置信度必须基于数据可靠性: 有确凿数据=1.0, 有可靠新闻=0.8, 合理推断=0.5, 不确定=0.3
5. 如发现致命风险信号（交易所暴雷、稳定币脱锚等），务必在 alerts 中标记 level:"critical"

## 严格按以下 JSON 格式返回：

\`\`\`json
{
  "triggeredSignals": [
    {
      "signalId": <信号编号>,
      "impact": <实际权重值，正或负>,
      "confidence": <0-1 置信度>,
      "title": "<事件标题，20字内>",
      "summary": "<事件摘要与市场影响分析，50-150字>",
      "source": "<信息来源>"
    }
  ],
  "alerts": [
    {
      "title": "<突发事件标题>",
      "description": "<详细描述>",
      "level": "critical|warning|info",
      "group": "<所属组 G1-G10>",
      "signalId": <关联信号编号>,
      "relatedCoins": ["BTC", ...],
      "source": "<来源>"
    }
  ],
  "marketSummary": "<100字整体市场状态概述>"
}
\`\`\`

## 重要
- 没有触发任何信号也是正常的，返回空数组
- impact 正负号代表对加密市场的方向影响（正=利多，负=利空）
- 使用中文回复`;

    const analysisResult = await callLLM(
      analyzerPipeline,
      analyzerPrompt || '你是 Sentinel-X AI 加密市场信号分析引擎。请始终用中文回复，严格按要求的 JSON 格式输出。只报告有真实事件支持的信号触发。',
      analysisInput,
    );
    const analyzerTokens = analysisResult.usage.totalTokens;

    const analyzerCostConfig = await db.llmCostConfig.findFirst({
      where: { provider: analyzerPipeline.provider, model: analyzerPipeline.model },
    });
    const analyzerCost = analyzerCostConfig ? Number(analyzerCostConfig.costPerCall) : 0.005;

    // Step 3: 解析结果
    const briefingData = parseLLMOutput(analysisResult.text);
    briefingData.pipelineInfo = {
      hasSearcher: enableSearch && !!searchContext,
      hasMarketData: false,
      analyzerProvider: analyzerPipeline.provider,
    };
    // 把 token 统计嵌入 briefingData，这样无论是 scanRecord 还是 scanCache 都能携带
    briefingData._tokenUsage = {
      searchTokens,
      analyzeTokens: analyzerTokens,
      totalTokens: searchTokens + analyzerTokens,
    };

    const totalCost = searchCost + analyzerCost;
    const totalTokens = searchTokens + analyzerTokens;

    // Step 4a: 按实际消耗模式后扣费
    let actualTokenCost = 0;
    if (billingMode === 'actual' && userId && totalTokens > 0) {
      actualTokenCost = totalTokens;
      const userRecord = await db.user.findUnique({ where: { id: userId } });
      if (userRecord) {
        const newBal = Math.max(0, Number(userRecord.tokenBalance) - actualTokenCost);
        await db.$transaction([
          db.user.update({ where: { id: userId }, data: { tokenBalance: BigInt(newBal) } }),
          db.tokenTransaction.create({
            data: {
              userId,
              type: 'SCAN_DEDUCT',
              amount: BigInt(-actualTokenCost),
              balanceAfter: BigInt(newBal),
              refId: briefingId,
              description: `扫描扣费 (按实际消耗 ${actualTokenCost} Token)${enableSearch ? ' 含搜索增强' : ''}`,
            },
          }),
        ]);
        console.log(`[Worker] Actual billing: deducted ${actualTokenCost} Token from user ${userId}, balance: ${newBal}`);
      }
    }

    const scanRecord = await db.scanRecord.findFirst({ where: { briefingId } });
    const tokenCost = billingMode === 'actual' ? actualTokenCost : (scanRecord?.tokenCost ?? 1);
    // 收入 = 用户消耗的 Token / tokenRate (1 USDT = tokenRate Token)
    const tokenRate = Number(await getSetting('token_to_cny_rate', 100000));
    const revenueUsd = tokenRate > 0 ? tokenCost / tokenRate : 0;
    const profitUsd = revenueUsd - totalCost;

    // Step 4b: 更新扫描记录
    await db.scanRecord.updateMany({
      where: { briefingId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        briefingData: briefingData,
        tokenCost,
        signalCount: briefingData.triggeredSignals?.length ?? 0,
        alertCount: briefingData.alerts?.length ?? 0,
        realCostUsd: totalCost,
        revenueUsd,
        profitUsd,
      },
    });

    // Step 5: 写入缓存
    const cacheWindow = await getSetting('cache_window_minutes', 5);
    const cacheKey = enableSearch ? 'scan_with_search' : 'scan_basic';
    await db.scanCache.create({
      data: {
        cacheKey,
        briefingData: briefingData,
        realCostUsd: totalCost,
        searcherUsed: enableSearch,
        expiresAt: new Date(Date.now() + cacheWindow * 60 * 1000),
      },
    });

    // Step 6: 更新 SystemScanLog token 统计
    console.log(`[Worker] Token stats for ${briefingId}: search=${searchTokens} analyze=${analyzerTokens} total=${totalTokens}`);
    const sysLogUpdate = await db.systemScanLog.updateMany({
      where: { briefingId },
      data: {
        status: 'COMPLETED',
        tokenCostSearch: searchTokens,
        tokenCostAnalyze: analyzerTokens,
        tokenCostTotal: totalTokens,
        signalCount: briefingData.triggeredSignals?.length ?? 0,
        alertCount: briefingData.alerts?.length ?? 0,
        realCostUsd: totalCost,
        briefingData: briefingData,
        completedAt: new Date(),
      },
    });

    console.log(`[Worker] SystemScanLog updated: ${sysLogUpdate.count} rows for ${briefingId}`);
    console.log(`[Worker] Scan completed: ${briefingId} (tokens: search=${searchTokens} analyze=${analyzerTokens} total=${totalTokens}, cost: $${totalCost.toFixed(4)}, profit: $${profitUsd.toFixed(4)})`);
  } catch (error: any) {
    console.error(`[Worker] Scan failed: ${briefingId}`, error.message);

    // 更新状态为失败
    await db.scanRecord.updateMany({
      where: { briefingId },
      data: { status: 'FAILED', completedAt: new Date() },
    });

    // 退回 Token
    const scanRecord = await db.scanRecord.findFirst({ where: { briefingId } });
    if (scanRecord) {
      const user = await db.user.findUnique({ where: { id: scanRecord.userId } });
      if (user) {
        const refundAmount = scanRecord.tokenCost;
        const newBalance = Number(user.tokenBalance) + refundAmount;
        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: { tokenBalance: BigInt(newBalance) },
          }),
          db.tokenTransaction.create({
            data: {
              userId: user.id,
              type: 'SCAN_REFUND',
              amount: BigInt(refundAmount),
              balanceAfter: BigInt(newBalance),
              refId: briefingId,
              description: `扫描失败退回: ${error.message?.substring(0, 50)}`,
            },
          }),
        ]);
        console.log(`[Worker] Refunded ${refundAmount} Token to user ${user.id}`);
      }
    }

    throw error; // 让 BullMQ 记录失败
  }
}

// ── 启动 Worker ──
export function startScanWorker() {
  const worker = new Worker('scan', processScanJob, {
    connection,
    concurrency: 2,
    limiter: { max: 5, duration: 60000 }, // 每分钟最多5个任务
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Worker] Scan worker started');
  return worker;
}
