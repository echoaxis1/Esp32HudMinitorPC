import { HardDrive, Database, Disc } from 'lucide-react'

export interface StorageDiskInfo {
  name: string
  pct: number
  usedGb: number
  totalGb: number
  freeGb: number
  isExternal: boolean
}

interface UnifiedStorageCardProps {
  disks: StorageDiskInfo[]
}

export function UnifiedStorageCard({ disks }: UnifiedStorageCardProps) {
  return (
    <div className="col-span-3 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyan-400" /> Storage Volumes
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {disks.length} Volumes
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">Internal APFS & External SSD</div>
      </div>

      {/* List of storage drives in 1 card */}
      <div className="my-auto space-y-4 py-1">
        {disks.map((d, idx) => {
          const isExt = d.isExternal
          const accentColor = isExt ? 'text-emerald-400' : 'text-cyan-400'
          const barColor = isExt ? 'bg-emerald-400' : 'bg-cyan-400'

          return (
            <div key={idx} className="space-y-1.5 p-2 rounded-xl bg-[#080c14] border border-[#141d2b]">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  {isExt ? (
                    <Disc className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Database className="h-3.5 w-3.5 text-cyan-400" />
                  )}
                  <span className="font-bold text-slate-200 truncate max-w-[130px]">{d.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {isExt ? 'EXTERNAL' : 'INTERNAL'}
                  </span>
                </div>
                <span className={`font-bold ${accentColor}`}>{d.pct}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${d.pct}%` }}
                />
              </div>

              {/* Details */}
              <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                <span>{d.usedGb} GB used</span>
                <span>{d.freeGb} GB free ({d.totalGb} GB)</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Card Footer */}
      <div className="pt-2 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Filesystem: APFS & ExFAT</span>
        <span className="text-cyan-400 font-semibold">Ready</span>
      </div>
    </div>
  )
}
