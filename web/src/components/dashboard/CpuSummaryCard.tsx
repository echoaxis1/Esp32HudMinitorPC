import { Cpu } from 'lucide-react'
import { CoreUsage } from '~/server/system'

interface CpuSummaryCardProps {
  cpuTotal: number
  cores: CoreUsage[]
}

export function CpuSummaryCard({ cpuTotal, cores }: CpuSummaryCardProps) {
  const pCoresAvg = Math.round(cores.slice(0, 4).reduce((acc, c) => acc + c.pct, 0) / 4)
  const eCoresAvg = Math.round(cores.slice(4).reduce((acc, c) => acc + c.pct, 0) / 6)

  return (
    <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-3 flex flex-col justify-between shadow-xl flex-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-white tracking-tight">CPU Core Activity</h2>
          <div className="text-[10px] text-slate-400 font-mono">Load Distribution</div>
        </div>
        <Cpu className="h-3.5 w-3.5 text-cyan-400" />
      </div>

      <div className="flex items-center justify-between my-auto px-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono text-cyan-400 tracking-tight">{cpuTotal}%</span>
          <span className="text-[10px] text-slate-500 font-mono">Avg Load</span>
        </div>

        <div className="space-y-1 text-[10px] font-mono">
          <div className="flex items-center justify-between gap-3 text-slate-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" /> P-Cores:</span>
            <span className="text-cyan-400 font-bold">{pCoresAvg}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" /> E-Cores:</span>
            <span className="text-emerald-400 font-bold">{eCoresAvg}%</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${cpuTotal}%` }}
        />
      </div>
    </div>
  )
}
