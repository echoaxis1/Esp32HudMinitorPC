import { Wifi, ArrowDown, ArrowUp, Globe, Activity } from 'lucide-react'

interface NetworkBandwidthCardProps {
  downKb: number
  upKb: number
  ip: string
  iface: string
}

export function NetworkBandwidthCard({ downKb, upKb, ip, iface }: NetworkBandwidthCardProps) {
  // Format speed gracefully (KB/s or MB/s)
  const formatSpeed = (speedKb: number) => {
    if (speedKb >= 1024) {
      return { val: (speedKb / 1024).toFixed(1), unit: 'MB/s' }
    }
    return { val: speedKb.toFixed(1), unit: 'KB/s' }
  }

  const downFormatted = formatSpeed(downKb)
  const upFormatted = formatSpeed(upKb)

  return (
    <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-3 flex flex-col justify-between shadow-xl flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-tight">Network Bandwidth</h2>
            <div className="text-[10px] text-slate-400 font-mono">
              {iface} • <span className="text-slate-300">{ip}</span>
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ONLINE
        </span>
      </div>

      {/* Speed Metrics (Download & Upload) */}
      <div className="grid grid-cols-2 gap-2 my-auto py-1">
        {/* Download Box */}
        <div className="p-2 rounded-xl bg-[#080c14] border border-[#141d2b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">DOWNLOAD</div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black text-cyan-400">{downFormatted.val}</span>
                <span className="text-[10px] text-slate-500">{downFormatted.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Box */}
        <div className="p-2 rounded-xl bg-[#080c14] border border-[#141d2b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowUp className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">UPLOAD</div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black text-emerald-400">{upFormatted.val}</span>
                <span className="text-[10px] text-slate-500">{upFormatted.unit}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Bars */}
      <div className="space-y-1 pt-1 border-t border-[#162030]">
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
          <span>Traffic Rate</span>
          <span className="text-cyan-400">Live 1.0s Sampling</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, (downKb / 2048) * 100))}%` }}
            />
          </div>
          <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, (upKb / 1024) * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
