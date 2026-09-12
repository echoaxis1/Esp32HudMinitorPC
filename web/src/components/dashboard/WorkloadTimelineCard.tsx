import { Activity } from 'lucide-react'

interface WorkloadTimelineCardProps {
  cpuTemp: number
  downKb: number
  upKb: number
}

export function WorkloadTimelineCard({ cpuTemp, downKb, upKb }: WorkloadTimelineCardProps) {
  return (
    <div className="col-span-4 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Workload Timeline</h2>
          <div className="text-[11px] text-slate-400 font-mono">CPU & Network Waveform</div>
        </div>
        <Activity className="h-4 w-4 text-cyan-400" />
      </div>

      {/* Simulated Oscilloscope Waveform */}
      <div className="my-auto h-24 w-full bg-[#080c14] rounded-xl border border-[#141c2b] p-2 flex items-end justify-between gap-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
        {Array.from({ length: 24 }).map((_, i) => {
          const h = 20 + Math.sin(i * 0.6) * 35 + (i % 3) * 15
          return (
            <div
              key={i}
              className="w-1.5 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-t-xs transition-all duration-500"
              style={{ height: `${Math.min(95, Math.max(10, h))}%` }}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#162030] pt-2">
        <span>Temp: {cpuTemp}°C</span>
        <span>Net: ↓{downKb} KB/s ↑{upKb} KB/s</span>
      </div>
    </div>
  )
}
