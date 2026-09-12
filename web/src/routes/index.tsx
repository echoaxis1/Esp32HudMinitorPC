import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry, CoreUsage } from '~/server/system'
import { Cpu, HardDrive, Wifi, Sparkles, RefreshCw, Zap, Flame } from 'lucide-react'
import { dashboardStore, setAutoRefresh } from '~/store/dashboard'
import { useStore } from '@tanstack/react-store'

export const Route = createFileRoute('/')({
  loader: async () => {
    return await getSystemTelemetry()
  },
  component: DashboardOverview,
})

function DashboardOverview() {
  const initialData = Route.useLoaderData() as SystemTelemetry
  const autoRefresh = useStore(dashboardStore, state => state.autoRefresh)

  const { data = initialData, refetch, isFetching } = useQuery<SystemTelemetry>({
    queryKey: ['system-telemetry'],
    queryFn: () => getSystemTelemetry(),
    refetchInterval: autoRefresh ? 2000 : false,
    initialData,
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between bg-[#0e1422]/70 backdrop-blur-md border border-slate-800/80 px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-semibold">
            {data.chip}
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="text-xs text-slate-400 font-mono">
            IP: <span className="text-slate-200">{data.network.ip}</span> ({data.network.iface})
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="text-xs text-slate-400 font-mono">
            Uptime: <span className="text-slate-200">{data.uptime}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            {autoRefresh ? 'Live Polling 2s' : 'Polling Paused'}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors"
            title="Manual Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero Equalizer: 10-Core Apple M4 CPU Utilization */}
      <div className="bg-[#0e1422]/90 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold tracking-tight text-white">Apple M4 10-Core Equalizer</h2>
            <div className="flex items-center gap-2 text-xs font-mono ml-4">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="h-2 w-2 rounded-sm bg-cyan-400" /> Cores 1-4 (Performance)
              </span>
              <span className="flex items-center gap-1 text-emerald-400 ml-2">
                <span className="h-2 w-2 rounded-sm bg-emerald-400" /> Cores 5-10 (Efficiency)
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-cyan-400">{data.cpuTotal}%</span>
            <span className="text-xs text-slate-400 uppercase font-mono">Total Load</span>
          </div>
        </div>

        {/* 10 Equalizer Bars */}
        <div className="grid grid-cols-10 gap-3 pt-2">
          {data.cores.map((core: CoreUsage) => (
            <div key={core.id} className="flex flex-col items-center space-y-2">
              <div className="h-32 w-full bg-slate-900/90 rounded-lg p-1.5 flex flex-col justify-end border border-slate-800">
                <div
                  className={`w-full rounded transition-all duration-500 ease-out ${
                    core.isPcore
                      ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/20'
                      : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20'
                  }`}
                  style={{ height: `${Math.max(6, core.pct)}%` }}
                />
              </div>
              <div className="text-center font-mono">
                <div className="text-xs font-bold text-slate-300">{core.pct}%</div>
                <div className="text-[10px] text-slate-500">Core {core.id}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bento Grid: RAM, Storage, Sensors, AGY Pool */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RAM Usage Bento Card */}
        <div className="bg-[#0e1422]/90 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Zap className="h-4 w-4 text-emerald-400" /> Unified Memory (RAM)
            </div>
            <span className="font-mono text-xs text-slate-400">{data.ram.pct}%</span>
          </div>

          <div className="space-y-3 my-auto">
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-3xl font-black text-emerald-400">{data.ram.usedGb}</span>
              <span className="text-xs text-slate-500">/ {data.ram.totalGb} GB</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${data.ram.pct}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex justify-between text-xs font-mono text-slate-400">
            <span>Free: {data.ram.freeGb} GB</span>
            <span>Bandwidth: High-Speed Unified</span>
          </div>
        </div>

        {/* Storage Multi-Drive Bento Card */}
        <div className="bg-[#0e1422]/90 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <HardDrive className="h-4 w-4 text-cyan-400" /> Volumes Storage
            </div>
            <span className="text-xs text-slate-500 font-mono">{data.disks.length} Drives</span>
          </div>

          <div className="space-y-4 my-auto">
            {data.disks.map((d, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-medium text-slate-300 truncate max-w-[140px]">{d.name}</span>
                  <span className="text-slate-400">{d.freeGb} GB Free ({d.pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.isExternal ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex justify-between text-xs font-mono text-slate-400">
            <span>Primary: APFS</span>
            <span>External: Ready</span>
          </div>
        </div>

        {/* Antigravity AI Cockpit Bento Card */}
        <div className="bg-[#0e1422]/90 backdrop-blur-md border border-violet-900/30 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm">
              <Sparkles className="h-4 w-4 text-violet-400" /> Antigravity AI Pool
            </div>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-mono">
              {data.agy.activeAccount}
            </span>
          </div>

          <div className="space-y-3 my-auto pt-2">
            {/* Gemini Quota */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Gemini (5h / Wk)</span>
                <span className="text-violet-400 font-bold">{data.agy.gemini5h}% / {data.agy.geminiWeekly}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full"
                  style={{ width: `${data.agy.gemini5h}%` }}
                />
              </div>
            </div>

            {/* Claude Quota */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Claude / GPT (5h / Wk)</span>
                <span className="text-amber-400 font-bold">{data.agy.claude5h}% / {data.agy.claudeWeekly}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                  style={{ width: `${data.agy.claude5h}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex justify-between text-xs font-mono text-slate-400">
            <span>Ready: {data.agy.readyAccounts} / {data.agy.totalAccounts} Accts</span>
            <span className="text-violet-400 hover:underline cursor-pointer">Switch &gt;</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Thermal SoC Sensors & Network I/O */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e1422]/90 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">SoC Thermal Sensors</div>
              <div className="text-sm font-bold text-white flex items-center gap-3 font-mono">
                <span>CPU: <span className="text-rose-400">{data.cpuTemp}°C</span></span>
                <span className="text-slate-700">|</span>
                <span>GPU: <span className="text-amber-400">{data.gpuTemp}°C</span></span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            Apple M4 Thermal Baseline: Normal
          </div>
        </div>

        <div className="bg-[#0e1422]/90 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Live Network Bandwidth</div>
              <div className="text-sm font-bold text-white flex items-center gap-4 font-mono">
                <span className="text-cyan-400">↓ {data.network.downKb} KB/s</span>
                <span className="text-emerald-400">↑ {data.network.upKb} KB/s</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            Interface: {data.network.iface}
          </div>
        </div>
      </div>
    </div>
  )
}
