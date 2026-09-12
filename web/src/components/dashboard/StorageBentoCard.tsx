import { HardDrive } from 'lucide-react'

interface StorageBentoCardProps {
  title: string
  subtitle: string
  usedGb: number
  freeGb: number
  pct: number
  color?: 'cyan' | 'emerald'
  breakdown: Array<{
    label: string
    size: string
    color: string
  }>
}

export function StorageBentoCard({
  title,
  subtitle,
  usedGb,
  freeGb,
  pct,
  color = 'cyan',
  breakdown,
}: StorageBentoCardProps) {
  const barBg = color === 'emerald' ? 'bg-emerald-400' : 'bg-cyan-400'

  return (
    <div className="col-span-3 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          <div className="text-[11px] text-slate-400 font-mono">{subtitle}</div>
        </div>
        {color === 'emerald' && <HardDrive className="h-4 w-4 text-emerald-400" />}
      </div>

      <div className="my-auto space-y-2">
        <div className="text-xs font-mono text-slate-200">
          {usedGb}GB / {freeGb}GB free <span className={color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}>{pct}%</span>
        </div>
        <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barBg}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-1 text-[10px] font-mono border-t border-[#162030] pt-2">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-xs ${item.color}`} /> {item.label}
            </span>
            <span className="text-slate-200">{item.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
