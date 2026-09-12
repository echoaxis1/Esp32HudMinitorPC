import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry } from '~/server/system'
import { Sparkles, CheckCircle2, ShieldCheck, RefreshCw, Clock, Calendar } from 'lucide-react'

export const Route = createFileRoute('/agy')({
  loader: async () => {
    return await getSystemTelemetry()
  },
  component: AgyAccountPoolPage,
})

// Helper untuk format sisa waktu reset atau jam reset lokal
function formatResetTime(isoStr?: string) {
  if (!isoStr) return null
  try {
    const target = new Date(isoStr)
    const now = new Date()
    const diffMs = target.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Resetting soon'

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours < 24) {
      const timeString = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `Reset ${timeString} (~${diffHours}h ${diffMins}m)`
    } else {
      const days = Math.floor(diffHours / 24)
      const dayName = target.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      return `Reset ${dayName} (~${days}d)`
    }
  } catch {
    return null
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

      {/* Active Account Overview Card */}
      <div className="bg-gradient-to-r from-violet-950/40 via-[#0c101a] to-indigo-950/40 border border-violet-800/40 p-6 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
              Currently Active Workstation Account
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {data.agy.activeAccount}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Synchronized with macOS Keychain (`gemini/antigravity`) & Cockpit cache
          </div>
        </div>

        <div className="flex items-center gap-8 font-mono">
          <div className="text-right">
            <div className="text-xs text-slate-500">Gemini 5h / Weekly</div>
            <div className="text-xl font-black text-cyan-400">{data.agy.gemini5h}% / {data.agy.geminiWeekly}%</div>
            {data.agy.geminiReset5h && (
              <div className="text-[10px] text-cyan-400/80 flex items-center justify-end gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{formatResetTime(data.agy.geminiReset5h)}</span>
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <div className="text-xs text-slate-500">Claude 5h / Weekly</div>
            <div className="text-xl font-black text-amber-400">{data.agy.claude5h}% / {data.agy.claudeWeekly}%</div>
            {data.agy.claudeReset5h && (
              <div className="text-[10px] text-amber-400/80 flex items-center justify-end gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{formatResetTime(data.agy.claudeReset5h)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Grid with Accurate Reset Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.agy.accounts.map((acc) => {
          const gResetText = formatResetTime(acc.geminiReset5h)
          const gResetWkText = formatResetTime(acc.geminiResetWeekly)
          const cResetText = formatResetTime(acc.claudeReset5h)
          const cResetWkText = formatResetTime(acc.claudeResetWeekly)

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition-all ${
                acc.isCurrent
                  ? 'bg-violet-950/25 border-violet-500/60 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/40'
                  : 'bg-[#0c101a] border-[#172030] hover:border-slate-700 shadow-lg'
              } flex flex-col justify-between space-y-4`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#141c2c] border border-slate-700/60 flex items-center justify-center font-bold text-xs text-cyan-400">
                    {acc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200">{acc.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{acc.email}</div>
                  </div>
                </div>

                {acc.isCurrent ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                    STANDBY
                  </span>
                )}
              </div>

              {/* Quota Progress & Reset Timers */}
              <div className="space-y-4 pt-1">
                {/* Gemini Model Quota */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-[#080c14] border border-[#141d2b]">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-cyan-400" />
                      Gemini 2.5 Pro
                    </span>
                    <span className="text-cyan-400 font-bold">{acc.gemini5h}% (Wk: {acc.geminiWeekly}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.gemini5h}%` }}
                    />
                  </div>
                  {/* Reset Time Info */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-0.5 text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3 text-cyan-400" />
                      {gResetText || '5h Window'}
                    </span>
                    <span className="text-[9px] text-slate-600">
                      {gResetWkText ? `Wk: ${gResetWkText}` : ''}
                    </span>
                  </div>
                </div>

                {/* Claude Model Quota */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-[#080c14] border border-[#141d2b]">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-amber-400" />
                      Claude 3.7 / GPT-4o
                    </span>
                    <span className="text-amber-400 font-bold">{acc.claude5h}% (Wk: {acc.claudeWeekly}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${acc.claude5h}%` }}
                    />
                  </div>
                  {/* Reset Time Info */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-0.5 text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3 text-amber-400" />
                      {cResetText || '5h Window'}
                    </span>
                    <span className="text-[9px] text-slate-600">
                      {cResetWkText ? `Wk: ${cResetWkText}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-[#162030] flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">One-Click Switch</span>
                <button
                  disabled={acc.isCurrent}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    acc.isCurrent
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                      : 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 shadow-md'
                  }`}
                >
                  {acc.isCurrent ? 'Active Now' : 'Switch Account'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
