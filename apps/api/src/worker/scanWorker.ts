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
import { calculateScores } from '@sentinel/shared';
import type { ServerSignalDef } from '@sentinel/shared';

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
      max_tokens: 8192,
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
    max_tokens: 8192,
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
      G1: '💰 Macro Liquidity / 宏观流动性', G2: '🏦 Central Bank & Rates / 央行与利率政策', G3: '⚖️ Regulation & Compliance / 监管与合规',
      G4: '🏛️ Institutional Flow / 机构资金流', G5: '⛓️ On-chain Flow / 链上物理流', G6: '📐 Market Structure / 市场结构',
      G7: '🧠 Sentiment / 情绪指标', G8: '🚀 Narratives & Sectors / 叙事与赛道', G9: '🦢 Black Swan & Security / 黑天鹅与安全',
      G10: '🎯 Key Figures & Geopolitics / 关键人物与地缘',
    };

    let signalListText = '';
    for (const [group, sigs] of [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      signalListText += `\n### ${GROUP_LABELS[group] || group}\n`;
      for (const sig of sigs) {
        signalListText += `  #${sig.signalId} | ${sig.name} | impact=${sig.impact} | halfLife=${sig.halfLife}min | category=${sig.category} | trigger: ${sig.triggerCondition}\n`;
      }
    }

    const analyzerPrompt = await getPromptTemplate('analyzer_prompt');

    const analysisInput = `You are the signal analysis engine of AlphaSentinel AI trading system. Your task is to evaluate which of the ${enabledSignals.length} signals in the matrix below are currently being triggered, based on the **search intelligence** provided.

${searchContext ? `## 🔍 Search Intelligence\n${searchContext}\n` : '(No search intelligence available. Analyze based on your most recent market knowledge.)'}

## Signal Matrix (${enabledSignals.length} signals)
${signalListText}

## Analysis Instructions
1. Evaluate each signal against the search intelligence above
2. Only return signals that have **actual data/news/events** supporting them — do NOT fabricate
3. For each triggered signal, provide the actual impact value (positive=bullish, negative=bearish), reference the original weight for range
4. Confidence must be based on data reliability: solid data=1.0, reliable news=0.8, reasonable inference=0.5, uncertain=0.3
5. If fatal risk signals are found (exchange collapse, stablecoin depeg, etc.), mark them as level:"critical" in alerts

## Return STRICTLY in the following JSON format:

\`\`\`json
{
  "triggeredSignals": [
    {
      "signalId": <signal number>,
      "impact": <actual weight value, positive or negative>,
      "confidence": <0-1 confidence>,
      "title": "<event title in Chinese, within 20 chars>",
      "titleEn": "<event title in English, within 40 chars>",
      "summary": "<event summary and market impact analysis in Chinese, 50-150 chars>",
      "summaryEn": "<event summary and market impact analysis in English, 50-200 chars>",
      "source": "<information source>"
    }
  ],
  "alerts": [
    {
      "title": "<alert title in Chinese>",
      "titleEn": "<alert title in English>",
      "description": "<detailed description in Chinese>",
      "descriptionEn": "<detailed description in English>",
      "level": "critical|warning|info",
      "group": "<group G1-G10>",
      "signalId": <related signal number>,
      "relatedCoins": ["BTC", ...],
      "source": "<source>"
    }
  ],
  "marketSummary": "<100-char overall market status summary in Chinese>",
  "marketSummaryEn": "<100-word overall market status summary in English>"
}
\`\`\`

## Important
- It is normal if no signals are triggered — return empty arrays
- impact sign represents direction impact on crypto market (positive=bullish, negative=bearish)

## ⚠️ CRITICAL: BILINGUAL OUTPUT REQUIRED
Every triggered signal MUST have BOTH:
- "title" (Chinese) AND "titleEn" (English)
- "summary" (Chinese) AND "summaryEn" (English)
Every alert MUST have BOTH:
- "title" (Chinese) AND "titleEn" (English)
- "description" (Chinese) AND "descriptionEn" (English)
The root object MUST have BOTH:
- "marketSummary" (Chinese) AND "marketSummaryEn" (English)
If you omit ANY *En field, the output is INVALID and will be rejected. Double-check before returning.`;

    const analysisResult = await callLLM(
      analyzerPipeline,
      analyzerPrompt || 'You are the AlphaSentinel AI crypto market signal analysis engine. Output strictly in the required JSON format. Only report signal triggers backed by real events. You MUST provide both Chinese and English text for all title/summary/marketSummary fields.',
      analysisInput,
    );
    const analyzerTokens = analysisResult.usage.totalTokens;

    const analyzerCostConfig = await db.llmCostConfig.findFirst({
      where: { provider: analyzerPipeline.provider, model: analyzerPipeline.model },
    });
    const analyzerCost = analyzerCostConfig ? Number(analyzerCostConfig.costPerCall) : 0.005;

    // Step 3: 解析结果
    const briefingData = parseLLMOutput(analysisResult.text);

    // 确保双语 En 字段存在 (LLM 可能遗漏)
    if (!briefingData.marketSummaryEn) briefingData.marketSummaryEn = '';
    if (briefingData.triggeredSignals) {
      for (const s of briefingData.triggeredSignals) {
        if (!s.titleEn) s.titleEn = '';
        if (!s.summaryEn) s.summaryEn = '';
      }
    }
    if (briefingData.alerts) {
      for (const a of briefingData.alerts) {
        if (!a.titleEn) a.titleEn = '';
        if (!a.descriptionEn) a.descriptionEn = '';
      }
    }
    const hasEn = !!briefingData.marketSummaryEn || briefingData.triggeredSignals?.some((s: any) => s.titleEn);
    console.log(`[Worker] Bilingual check: marketSummaryEn=${!!briefingData.marketSummaryEn}, signalEn=${hasEn}`);

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

    // Step 3b: 计算 SD/SV/SR 评分
    const signalDefsRaw = await db.signalDefinition.findMany({ where: { enabled: true } });
    const signalDefMap = new Map<number, ServerSignalDef>(
      signalDefsRaw.map(d => [d.signalId, { signalId: d.signalId, group: d.group, category: d.category, impact: d.impact, halfLife: d.halfLife, confidence: d.confidence }])
    );
    const scores = calculateScores(briefingData.triggeredSignals || [], signalDefMap);
    console.log(`[Worker] Scores for ${briefingId}: SD=${scores.scoreDirection} SV=${scores.scoreVolatility} SR=${scores.scoreRisk} (${scores.activeSignals} signals)`);

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
        scoreDirection: scores.scoreDirection,
        scoreVolatility: scores.scoreVolatility,
        scoreRisk: scores.scoreRisk,
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
        scoreDirection: scores.scoreDirection,
        scoreVolatility: scores.scoreVolatility,
        scoreRisk: scores.scoreRisk,
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
