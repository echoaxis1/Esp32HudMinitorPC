import { CoreUsage } from '~/server/system'

interface CpuEqualizerCardProps {
  cpuTotal: number
  cores: CoreUsage[]
}

export function CpuEqualizerCard({ cpuTotal, cores }: CpuEqualizerCardProps) {
  return (
    <div className="w-full h-full bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-white tracking-tight">Executive CPU Metrics</h2>
          <span className="text-xs font-mono text-cyan-400 font-bold">{cpuTotal}%</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">M4 10-Core</div>
      </div>

      {/* 10 Equalizer Bars with Segmented Blocks */}
      <div className="flex items-end justify-between gap-1.5 my-auto px-1 py-1">
        {cores.map((core: CoreUsage) => {
          const numBlocks = 10
          const activeBlocks = Math.max(1, Math.round((core.pct / 100) * numBlocks))
          return (
            <div key={core.id} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col-reverse gap-0.5 h-28 justify-start">
                {Array.from({ length: numBlocks }).map((_, bIdx) => {
                  const isLit = bIdx < activeBlocks
                  return (
                    <div
                      key={bIdx}
                      className={`h-2.5 w-full rounded-xs transition-all duration-300 ${
                        isLit
                          ? core.isPcore
                            ? 'bg-cyan-400 shadow-xs shadow-cyan-400/50'
                            : 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                          : 'bg-[#141b29]'
                      }`}
                    />
                  )
                })}
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1">{core.id}</span>
            </div>
          )
        })}
      </div>

      {/* Legend & Summary */}
      <div className="space-y-1.5 pt-1 border-t border-[#162030]">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-xs bg-cyan-400" /> 4 Performance Cores (Cyan)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-xs bg-emerald-400" /> 6 Efficiency Cores (Emera)
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Total Usage: {cpuTotal}%</span>
          <div className="w-32 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
              style={{ width: `${cpuTotal}%` }}
            />
          </div>
          <span className="text-slate-500">Real-time activity</span>
        </div>
      </div>
    </div>
  )
}
