import type { Strategy } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

const LAYER_COLORS: Record<string, string> = {
  trend: '#3b82f6',
  swing: '#10b981',
  spike: '#f97316',
};

const LAYER_NAMES: Record<string, string> = {
  trend: '趋势核心层',
  swing: '震荡波动层',
  spike: '插针收割层',
};

export default function StrategyDetail({ strategy }: { strategy: Strategy }) {
  const isMobile = useIsMobile();
  const rangeModeNames: Record<string, string> = {
    fixed: '固定数值',
    percentage: '百分比',
    volatility: '波动率自适应',
  };

  const profitAllocationNames: Record<string, string> = {
    all_usdt: '全部转USDT',
    all_coin: '全部转币',
    ratio: '按比例分配',
    reinvest: '自动滚动投入',
    threshold_switch: '阈值切换',
  };

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
      {/* Config Overview */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3'} ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <div className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl`} style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid rgba(51,65,85,0.25)' }}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>区间模式</p>
          <p className={`font-bold mt-1 tracking-tight ${isMobile ? 'text-sm' : ''}`}>{rangeModeNames[strategy.rangeMode]}</p>
        </div>
        <div className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl`} style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid rgba(51,65,85,0.25)' }}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>利润分配</p>
          <p className={`font-bold mt-1 tracking-tight ${isMobile ? 'text-sm' : ''}`}>{profitAllocationNames[strategy.profitAllocation]}</p>
        </div>
        <div className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl`} style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid rgba(51,65,85,0.25)' }}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>总交易笔数</p>
          <p className={`font-bold mt-1 tracking-tight ${isMobile ? 'text-sm' : ''}`}>{strategy.totalTrades}</p>
        </div>
        <div className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl`} style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid rgba(51,65,85,0.25)' }}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>胜率</p>
          <p className={`font-bold mt-1 tracking-tight ${isMobile ? 'text-sm' : ''}`}>
            {strategy.totalTrades > 0 ? (strategy.winTrades / strategy.totalTrades * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      </div>

      {/* Grid Layers */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-3 gap-3'}`}>
        {strategy.layers.filter((l) => l.enabled).map((layer) => (
          <div key={layer.layer} className={`${isMobile ? 'p-3' : 'p-3.5'} rounded-xl border-l-4 transition-all duration-200 hover:translate-y-[-1px]`} style={{ borderLeftColor: LAYER_COLORS[layer.layer], background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,41,59,0.3) 100%)', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.15)', border: `1px solid rgba(51,65,85,0.25)`, borderLeft: `4px solid ${LAYER_COLORS[layer.layer]}` }}>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>{LAYER_NAMES[layer.layer]}</p>
            <div className={`mt-1.5 space-y-0.5 ${isMobile ? 'text-xs' : 'text-sm'} text-slate-400`}>
              <p>网格数: <span className="text-slate-200 font-medium">{layer.gridCount}</span></p>
              <p>利润率: <span className="text-slate-200 font-medium">{layer.profitRate}%</span></p>
              <p>资金占比: <span className="text-slate-200 font-medium">{(layer.fundRatio * 100).toFixed(0)}%</span></p>
              <p>区间: <span className="text-slate-200 font-medium">{layer.lowerPrice.toFixed(2)} - {layer.upperPrice.toFixed(2)}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Config */}
      <div>
        <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400 mb-2`}>风控配置</h4>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 md:grid-cols-4 gap-2'} ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <div className={`p-2.5 rounded-xl font-medium ${strategy.risk.circuitBreakEnabled ? 'text-emerald-400' : 'text-slate-500'}`} style={strategy.risk.circuitBreakEnabled ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)', border: '1px solid rgba(16,185,129,0.15)' } : { background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.2)' }}>
            极端熔断 {strategy.risk.circuitBreakEnabled ? `≤-${strategy.risk.circuitBreakDropPercent}%` : '关闭'}
          </div>
          <div className={`p-2.5 rounded-xl font-medium ${strategy.risk.dailyDrawdownEnabled ? 'text-emerald-400' : 'text-slate-500'}`} style={strategy.risk.dailyDrawdownEnabled ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)', border: '1px solid rgba(16,185,129,0.15)' } : { background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.2)' }}>
            日回撤 {strategy.risk.dailyDrawdownEnabled ? `≤${strategy.risk.dailyDrawdownPercent}%` : '关闭'}
          </div>
          <div className={`p-2.5 rounded-xl font-medium ${strategy.risk.maxPositionEnabled ? 'text-emerald-400' : 'text-slate-500'}`} style={strategy.risk.maxPositionEnabled ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)', border: '1px solid rgba(16,185,129,0.15)' } : { background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.2)' }}>
            仓位限制 {strategy.risk.maxPositionEnabled ? `≤${strategy.risk.maxPositionPercent}%` : '关闭'}
          </div>
          <div className={`p-2.5 rounded-xl font-medium ${strategy.risk.trendDefenseEnabled ? 'text-emerald-400' : 'text-slate-500'}`} style={strategy.risk.trendDefenseEnabled ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)', border: '1px solid rgba(16,185,129,0.15)' } : { background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.2)' }}>
            趋势防御 {strategy.risk.trendDefenseEnabled ? '开启' : '关闭'}
          </div>
        </div>
      </div>
    </div>
  );
}
