import { Activity } from 'lucide-react'

interface WorkloadTimelineCardProps {
  cpuTemp: number
  downKb: number
  upKb: number
}

export function WorkloadTimelineCard({ cpuTemp, downKb, upKb }: WorkloadTimelineCardProps) {
  return (
    <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-3 flex flex-col justify-between shadow-xl flex-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-white tracking-tight">Workload Timeline</h2>
          <div className="text-[10px] text-slate-400 font-mono">CPU & Network Oscilloscope</div>
        </div>
        <Activity className="h-3.5 w-3.5 text-cyan-400" />
      </div>

      {/* Simulated Oscilloscope Waveform */}
      <div className="my-auto h-12 w-full bg-[#080c14] rounded-lg border border-[#141c2b] px-2 py-1 flex items-end justify-between gap-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
        {Array.from({ length: 28 }).map((_, i) => {
          const h = 20 + Math.sin(i * 0.5) * 35 + (i % 3) * 15
          return (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-t-xs transition-all duration-500"
              style={{ height: `${Math.min(95, Math.max(12, h))}%` }}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-400 border-t border-[#162030] pt-1">
        <span>Temp: {cpuTemp}°C</span>
        <span>Net: ↓{downKb} KB/s ↑{upKb} KB/s</span>
      </div>
    </div>
  )
}
