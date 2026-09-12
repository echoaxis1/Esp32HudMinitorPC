import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry } from '~/server/system'
import { Sparkles, CheckCircle2, ShieldCheck, RefreshCw, Clock } from 'lucide-react'

export const Route = createFileRoute('/agy')({
  loader: async () => {
    return await getSystemTelemetry()
  },
  component: AgyAccountPoolPage,
})

/**
 * Helper format persis 100% dengan Cockpit Tools UI:
 * Contoh: "4h 22m (09/12 22:53)" atau "5d 11h 30m (09/18 06:01)"
 */
function formatCockpitReset(isoStr?: string) {
  if (!isoStr) return '--'
  try {
    const target = new Date(isoStr)
    const now = new Date()
    const diffMs = target.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Ready'

    const totalSec = Math.floor(diffMs / 1000)
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)

    const mm = String(target.getMonth() + 1).padStart(2, '0')
    const dd = String(target.getDate()).padStart(2, '0')
    const hh = String(target.getHours()).padStart(2, '0')
    const ii = String(target.getMinutes()).padStart(2, '0')
    const dateStr = `(${mm}/${dd} ${hh}:${ii})`

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m ${dateStr}`
    } else {
      return `${hours}h ${mins}m ${dateStr}`
    }
  } catch {
    return '--'
  }
}

function AgyAccountPoolPage() {
  const initialData = Route.useLoaderData() as SystemTelemetry

  const { data = initialData, refetch, isFetching } = useQuery<SystemTelemetry>({
    queryKey: ['system-telemetry'],
    queryFn: () => getSystemTelemetry(),
    refetchInterval: 3000,
    initialData,
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6 bg-[#07090e]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#0c101a] border border-[#172030] px-6 py-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Antigravity AI Account Pool</h1>
            <p className="text-xs text-slate-400 font-mono">
              Live Google Cloud Code Quota Engine & Accurate Reset Timers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors flex items-center gap-2 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-violet-400' : ''}`} />
            Refresh Quotas
          </button>
        </div>
      </div>

      {/* Account Grid Matching Cockpit Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.agy.accounts.map((acc) => (
          <div
            key={acc.id}
            className={`p-5 rounded-2xl border transition-all ${
              acc.isCurrent
                ? 'bg-[#0c1222] border-cyan-500/60 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                : 'bg-[#0c101a] border-[#172030] hover:border-slate-700 shadow-lg'
            } flex flex-col justify-between space-y-4`}
          >
            {/* Card Header: Email, Saat Ini badge, & PRO badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-md border border-slate-600 bg-slate-900" />
                <span className="text-sm font-bold text-slate-100 font-mono tracking-tight truncate max-w-[190px]">
                  {acc.email}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {acc.isCurrent && (
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500 text-black">
                    Saat Ini
                  </span>
                )}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0b4b8a] text-cyan-200 border border-cyan-400/30">
                  PRO
                </span>
              </div>
            </div>

            {/* Quota Columns: Claude di Kiri, Gemini di Kanan */}
            <div className="grid grid-cols-2 gap-4 pt-1 font-mono">
              {/* Kolom Kiri: Claude & GPT */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200">Claude</div>

                {/* Claude 5h */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">5h</span>
                    <span className="text-emerald-400 font-bold">{acc.claude5h}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.claude5h}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {formatCockpitReset(acc.claudeReset5h)}
                  </div>
                </div>

                {/* Claude Weekly */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Weekly</span>
                    <span className="text-emerald-400 font-bold">{acc.claudeWeekly}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.claudeWeekly}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {formatCockpitReset(acc.claudeResetWeekly)}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Gemini */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200">Gemini</div>

                {/* Gemini 5h */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">5h</span>
                    <span className="text-emerald-400 font-bold">{acc.gemini5h}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.gemini5h}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {formatCockpitReset(acc.geminiReset5h)}
                  </div>
                </div>

                {/* Gemini Weekly */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Weekly</span>
                    <span className="text-emerald-400 font-bold">{acc.geminiWeekly}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.geminiWeekly}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {formatCockpitReset(acc.geminiResetWeekly)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-[#162030] flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">One-Click Switch</span>
              <button
                disabled={acc.isCurrent}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  acc.isCurrent
                    ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    : 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 shadow-md'
                }`}
              >
                {acc.isCurrent ? 'Aktif' : 'Switch Account'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
