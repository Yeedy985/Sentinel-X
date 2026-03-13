/**
 * AlphaSentinel Scoring Engine (Server-side)
 * 与 AAGS 客户端 sentinelEngine.ts 保持完全一致的评分算法 v2
 * 
 * 三维评分均使用 tanh 压缩:
 * - SD (方向 [-100, +100]): 缩放因子 80
 * - SV (波动 [0, 100]):     缩放因子 30
 * - SR (风险 [0, 100]):     缩放因子 50
 */
import type { TriggeredSignal } from './types';

// 信号分类
export type SignalCategory = 'D' | 'V' | 'R';

// 信号定义（服务端 DB 中的 signalDefinition）
export interface ServerSignalDef {
  signalId: number;
  group: string;
  category: string;  // 'D' | 'V' | 'R'
  impact: number;
  halfLife: number;   // 分钟
  confidence: number;
}

// 评分结果
export interface ScoringResult {
  scoreDirection: number;   // SD [-100, +100]
  scoreVolatility: number;  // SV [0, 100]
  scoreRisk: number;        // SR [0, 100]
  activeSignals: number;
}

const SCALE_D = 80;   // 方向缩放因子
const SCALE_V = 30;   // 波动缩放因子
const SCALE_R = 50;   // 风险缩放因子

/**
 * 计算 SD/SV/SR 评分
 * 
 * @param triggeredSignals - LLM 返回的触发信号列表
 * @param signalDefs - 数据库中的信号定义 Map (signalId → def)
 * @returns ScoringResult
 */
export function calculateScores(
  triggeredSignals: TriggeredSignal[],
  signalDefs: Map<number, ServerSignalDef>,
): ScoringResult {
  let sD = 0, sV = 0, sR = 0;
  let activeCount = 0;

  for (const t of triggeredSignals) {
    const def = signalDefs.get(t.signalId);
    if (!def) continue;

    const impact = t.impact || def.impact;
    const confidence = Math.max(0, Math.min(1, t.confidence ?? def.confidence));
    const category = def.category as SignalCategory;

    // 服务端评分在扫描完成时立刻计算，无时间衰减 (decayFactor = 1.0)
    const currentScore = impact * confidence;
    activeCount++;

    switch (category) {
      case 'D': sD += currentScore; break;
      case 'V': sV += Math.abs(currentScore); break;
      case 'R': sR += Math.abs(currentScore); break;
    }
  }

  // 全维度 tanh 压缩
  const scoreDirection = Math.tanh(sD / SCALE_D) * 100;
  const scoreVolatility = Math.tanh(sV / SCALE_V) * 100;
  const scoreRisk = Math.tanh(sR / SCALE_R) * 100;

  return {
    scoreDirection: Math.round(scoreDirection * 100) / 100,
    scoreVolatility: Math.round(scoreVolatility * 100) / 100,
    scoreRisk: Math.round(scoreRisk * 100) / 100,
    activeSignals: activeCount,
  };
}
