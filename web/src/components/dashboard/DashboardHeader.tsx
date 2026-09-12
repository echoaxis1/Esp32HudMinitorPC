import { Clock, Search } from 'lucide-react'

interface DashboardHeaderProps {
  uptime: string
  cpuTemp: number
  rpm?: number
}

export function DashboardHeader({ uptime, cpuTemp, rpm = 1200 }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-2 shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#111724] border border-[#1d2738] flex items-center justify-center text-white text-xs font-bold shadow-md">
          M4
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">Mac mini M4 Status</h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
              PRO
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>Uptime: {uptime}</span>
            <span className="text-slate-700">•</span>
            <span>Temp: {cpuTemp}°C</span>
            <span className="text-slate-700">•</span>
            <span>Fans: {rpm} RPM</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search Projects..."
            className="bg-[#0e1422] border border-[#1c2637] rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 w-56 font-sans"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1422] border border-[#1c2637]">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>Clock: 09:42 AM</span>
        </div>
      </div>
    </header>
  )
}
