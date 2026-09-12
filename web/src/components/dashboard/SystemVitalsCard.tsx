import { Cpu, Wifi, ArrowDown, ArrowUp, Activity, Flame } from 'lucide-react'
import { CoreUsage } from '~/server/system'

interface SystemVitalsCardProps {
  cpuTotal: number
  cpuTemp: number
  gpuTemp: number
  cores: CoreUsage[]
  network: {
    ip: string
    iface: string
    downKb: number
    upKb: number
  }
}

export function SystemVitalsCard({
  cpuTotal,
  cpuTemp,
  gpuTemp,
  cores,
  network,
}: SystemVitalsCardProps) {
  const pCoresAvg = Math.round(cores.slice(0, 4).reduce((acc, c) => acc + c.pct, 0) / 4)
  const eCoresAvg = Math.round(cores.slice(4).reduce((acc, c) => acc + c.pct, 0) / 6)

  const formatSpeed = (speedKb: number) => {
    if (speedKb >= 1024) {
      return { val: (speedKb / 1024).toFixed(1), unit: 'MB/s' }
    }
    return { val: speedKb.toFixed(1), unit: 'KB/s' }
  }

  const downFormatted = formatSpeed(network.downKb)
  const upFormatted = formatSpeed(network.upKb)

  return (
    <div className="col-span-6 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
      {/* Header Vitals */}
      <div className="flex items-center justify-between border-b border-[#162030] pb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">System & Network Vitals</h2>
            <div className="text-[10px] text-slate-400 font-mono">
              Live Hardware Sensors & Bandwidth
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <Flame className="h-3 w-3 text-rose-400" />
            CPU: <span className="text-rose-400 font-bold">{cpuTemp}°C</span>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <Flame className="h-3 w-3 text-amber-400" />
            GPU: <span className="text-amber-400 font-bold">{gpuTemp}°C</span>
          </span>
        </div>
      </div>

      {/* Main Content: Bertumpuk ke Bawah (Atas: CPU Load | Bawah: Network I/O) */}
      <div className="flex flex-col gap-2.5 my-auto py-1">
        {/* Section 1 (Atas): CPU Core Load */}
        <div className="p-2.5 rounded-xl bg-[#080c14] border border-[#141d2b] flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>CPU Core Load</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-slate-400">
                P-Cores: <span className="font-bold text-cyan-400">{pCoresAvg}%</span>
              </span>
              <span className="text-slate-400">
                E-Cores: <span className="font-bold text-emerald-400">{eCoresAvg}%</span>
              </span>
              <span className="text-xs font-mono font-black text-cyan-400">{cpuTotal}%</span>
            </div>
          </div>

          <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${cpuTotal}%` }}
            />
          </div>
        </div>

        {/* Section 2 (Bawah): Network I/O Bandwidth */}
        <div className="p-2.5 rounded-xl bg-[#080c14] border border-[#141d2b] flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span>Network I/O</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>{network.iface} • {network.ip}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Download & Upload Speed Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 rounded-lg bg-[#0e1422] border border-[#1c2738] flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-3.5 w-3.5 text-cyan-400 animate-bounce" />
                <span className="text-[10px] font-mono text-slate-400">DOWNLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-black text-cyan-400">{downFormatted.val}</span>
                <span className="text-[9px] text-slate-500">{downFormatted.unit}</span>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-[#0e1422] border border-[#1c2738] flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono text-slate-400">UPLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-black text-emerald-400">{upFormatted.val}</span>
                <span className="text-[9px] text-slate-500">{upFormatted.unit}</span>
              </div>
            </div>
          </div>

          {/* Progress rate bars */}
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(6, (network.downKb / 2048) * 100))}%` }}
              />
            </div>
            <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(6, (network.upKb / 1024) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Hardware Engine: Darwin macOS Kernel</span>
        <span className="text-cyan-400 font-semibold">+ Expand Modules</span>
      </div>
    </div>
  )
}
