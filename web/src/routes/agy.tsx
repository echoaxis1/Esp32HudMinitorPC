import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry } from '~/server/system'
import { Sparkles, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'

export const Route = createFileRoute('/agy')({
  loader: async () => {
    return await getSystemTelemetry()
  },
  component: AgyAccountPoolPage,
})

function AgyAccountPoolPage() {
  const initialData = Route.useLoaderData() as SystemTelemetry

  const { data = initialData, refetch, isFetching } = useQuery<SystemTelemetry>({
    queryKey: ['system-telemetry'],
    queryFn: () => getSystemTelemetry(),
    refetchInterval: 3000,
    initialData,
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#0e1422]/70 backdrop-blur-md border border-slate-800/80 px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Antigravity AI Account Pool</h1>
            <p className="text-xs text-slate-400 font-mono">
              Direct Google Cloud Code Quota Inspection & Keychain Bridge
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
      <div className="bg-gradient-to-r from-violet-950/40 via-[#0e1422] to-indigo-950/40 border border-violet-800/40 p-6 rounded-2xl flex items-center justify-between shadow-xl">
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
            <div className="text-xl font-black text-violet-400">{data.agy.gemini5h}% / {data.agy.geminiWeekly}%</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <div className="text-xs text-slate-500">Claude 5h / Weekly</div>
            <div className="text-xl font-black text-amber-400">{data.agy.claude5h}% / {data.agy.claudeWeekly}%</div>
          </div>
        </div>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.agy.accounts.map((acc) => (
          <div
            key={acc.id}
            className={`p-5 rounded-2xl border transition-all ${
              acc.isCurrent
                ? 'bg-violet-950/20 border-violet-500/50 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                : 'bg-[#0e1422]/90 border-slate-800/80 hover:border-slate-700'
            } flex flex-col justify-between space-y-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                  {acc.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200">{acc.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">{acc.id}</div>
                </div>
              </div>

              {acc.isCurrent ? (
                <span className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  STANDBY
                </span>
              )}
            </div>

            {/* Quota Progress */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Gemini 2.5 Pro / Flash</span>
                  <span className="text-violet-400 font-bold">{acc.gemini5h}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full"
                    style={{ width: `${acc.gemini5h}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Claude 3.7 / GPT-4o</span>
                  <span className="text-amber-400 font-bold">{acc.claude5h}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                    style={{ width: `${acc.claude5h}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">Ready to Switch</span>
              <button
                disabled={acc.isCurrent}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  acc.isCurrent
                    ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    : 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30'
                }`}
              >
                {acc.isCurrent ? 'Current' : 'Select Account'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
