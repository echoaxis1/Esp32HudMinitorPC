import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry, CoreUsage } from '~/server/system'
import { getDevToolsStatus } from '~/server/devtools'
import {
  Cpu,
  HardDrive,
  Activity,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Search,
  Zap,
  Flame,
  Clock,
  Sparkles,
  Terminal,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [telemetry, devtools] = await Promise.all([
      getSystemTelemetry(),
      getDevToolsStatus(),
    ])
    return { telemetry, devtools }
  },
  component: MacMiniStatusDashboard,
})

function MacMiniStatusDashboard() {
  const initialData = Route.useLoaderData()

  const { data = initialData } = useQuery({
    queryKey: ['dashboard-telemetry'],
    queryFn: async () => {
      const [telemetry, devtools] = await Promise.all([
        getSystemTelemetry(),
        getDevToolsStatus(),
      ])
      return { telemetry, devtools }
    },
    refetchInterval: 2000,
    initialData,
  })

  const { telemetry, devtools } = data
  const { cores, ram, disks } = telemetry

  // Memory gauge angle (-90deg to +90deg semicircular arc)
  const memAngle = -90 + (ram.pct / 100) * 180

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3 bg-[#07090e]">
      {/* Top Header Row matching mockup */}
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
              <span>Uptime: {telemetry.uptime}</span>
              <span className="text-slate-700">•</span>
              <span>Temp: {telemetry.cpuTemp}°C</span>
              <span className="text-slate-700">•</span>
              <span>Fans: 1200 RPM</span>
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

      {/* Main Grid: Left Bento (3 cols) + Right Dev Workspace (1 col) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column Area (9 cols out of 12) */}
        <div className="col-span-9 flex flex-col gap-3 min-h-0">
          {/* Row 1: Executive CPU (Large) + Memory Semi Gauge + Storage Bar */}
          <div className="grid grid-cols-12 gap-3 h-[270px] shrink-0">
            {/* Executive CPU Metrics (5 cols) */}
            <div className="col-span-6 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-white tracking-tight">Executive CPU Metrics</h2>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{telemetry.cpuTotal}%</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">M4 10-Core</div>
              </div>

              {/* 10 Equalizer Bars with Segmented Blocks */}
              <div className="flex items-end justify-between gap-1.5 my-auto px-1 py-1">
                {cores.map((core: CoreUsage) => {
                  const numBlocks = 10
                  const activeBlocks = Math.max(1, Math.round((core.pct / 100) * numBlocks))
                  return (
                    <div key={core.id} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex flex-col-reverse gap-0.5 h-28 justify-start">
                        {Array.from({ length: numBlocks }).map((_, bIdx) => {
                          const isLit = bIdx < activeBlocks
                          return (
                            <div
                              key={bIdx}
                              className={`h-2.5 w-full rounded-xs transition-all duration-300 ${
                                isLit
                                  ? core.isPcore
                                    ? 'bg-cyan-400 shadow-xs shadow-cyan-400/50'
                                    : 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                                  : 'bg-[#141b29]'
                              }`}
                            />
                          )
                        })}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 mt-1">{core.id}</span>
                    </div>
                  )
                })}
              </div>

              {/* Legend & Summary */}
              <div className="space-y-1.5 pt-1 border-t border-[#162030]">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-xs bg-cyan-400" /> 4 Performance Cores (Cyan)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-xs bg-emerald-400" /> 6 Efficiency Cores (Emera)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Total Usage: {telemetry.cpuTotal}%</span>
                  <div className="w-32 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                      style={{ width: `${telemetry.cpuTotal}%` }}
                    />
                  </div>
                  <span className="text-slate-500">Real-time activity</span>
                </div>
              </div>
            </div>

            {/* Memory Usage Semi-Gauge (3 cols) */}
            <div className="col-span-3 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Memory Usage</h2>
                <div className="text-[11px] text-slate-400 font-mono">{ram.totalGb}GB Unified Memory</div>
              </div>

              {/* Semi-circular Speedometer Arc */}
              <div className="relative flex flex-col items-center justify-center my-auto pt-2">
                <svg viewBox="0 0 160 90" className="w-36 h-20 overflow-visible">
                  <path
                    d="M 15 80 A 65 65 0 0 1 145 80"
                    fill="none"
                    stroke="#162032"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 15 80 A 65 65 0 0 1 145 80"
                    fill="none"
                    stroke="url(#gaugeGrad)"
                    strokeWidth="12"
                    strokeDasharray="204"
                    strokeDashoffset={`${204 - (ram.pct / 100) * 204}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  {/* Gauge Needle */}
                  <g
                    transform={`translate(80, 80) rotate(${memAngle})`}
                    className="transition-transform duration-500"
                  >
                    <line x1="0" y1="0" x2="0" y2="-55" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                  </g>
                </svg>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                  {ram.usedGb}GB / {ram.totalGb}GB | <span className="text-cyan-400">{ram.pct}%</span>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="space-y-1 text-[10px] font-mono border-t border-[#162030] pt-2">
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" /> App Memory</span>
                  <span className="text-slate-200">{(ram.usedGb * 0.6).toFixed(1)}GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" /> Wired</span>
                  <span className="text-slate-200">{(ram.usedGb * 0.25).toFixed(1)}GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-amber-400" /> Compressed</span>
                  <span className="text-slate-200">{(ram.usedGb * 0.15).toFixed(1)}GB</span>
                </div>
              </div>
            </div>

            {/* Storage Primary Bento (3 cols) */}
            <div className="col-span-3 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Storage</h2>
                <div className="text-[11px] text-slate-400 font-mono">Macintosh HD</div>
              </div>

              <div className="my-auto space-y-2">
                <div className="text-xs font-mono text-slate-200">
                  {disks[0]?.usedGb ?? 128}GB / {disks[0]?.freeGb ?? 320}GB free <span className="text-cyan-400">{disks[0]?.pct ?? 28}%</span>
                </div>
                <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${disks[0]?.pct ?? 28}%` }}
                  />
                </div>
              </div>

              {/* File types */}
              <div className="space-y-1 text-[10px] font-mono border-t border-[#162030] pt-2">
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" /> Developer</span>
                  <span className="text-slate-200">54.2GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" /> System APFS</span>
                  <span className="text-slate-200">38.1GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-amber-400" /> Applications</span>
                  <span className="text-slate-200">22.8GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Secondary Gauges & Metrics History Graph */}
          <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
            {/* CPU Architecture / Load Speedometer (4 cols) */}
            <div className="col-span-4 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">CPU Core Activity</h2>
                <div className="text-[11px] text-slate-400 font-mono">Real-time Load Distribution</div>
              </div>

              <div className="flex flex-col items-center justify-center my-auto">
                <div className="text-3xl font-black font-mono text-cyan-400 tracking-tight">
                  {telemetry.cpuTotal}%
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">Average Utilization</div>
              </div>

              <div className="space-y-1 text-[10px] font-mono border-t border-[#162030] pt-2">
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-cyan-400" /> Performance Cores</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.round(cores.slice(0, 4).reduce((acc, c) => acc + c.pct, 0) / 4)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-emerald-400" /> Efficiency Cores</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(cores.slice(4).reduce((acc, c) => acc + c.pct, 0) / 6)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Telemetry Pulse Graph (4 cols) */}
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
                <span>Temp: {telemetry.cpuTemp}°C</span>
                <span>Net: ↓{telemetry.network.downKb} KB/s ↑{telemetry.network.upKb} KB/s</span>
              </div>
            </div>

            {/* External Storage / Project Drive (4 cols) */}
            <div className="col-span-4 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Secondary Storage</h2>
                  <div className="text-[11px] text-slate-400 font-mono">{disks[1]?.name ?? 'MAC_EXTERNAL_SSD'}</div>
                </div>
                <HardDrive className="h-4 w-4 text-emerald-400" />
              </div>

              <div className="my-auto space-y-2">
                <div className="text-xs font-mono text-slate-200">
                  {disks[1]?.usedGb ?? 128}GB used / {disks[1]?.freeGb ?? 337}GB free <span className="text-emerald-400">{disks[1]?.pct ?? 28}%</span>
                </div>
                <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${disks[1]?.pct ?? 28}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-[10px] font-mono border-t border-[#162030] pt-2">
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" /> Workspace Code</span>
                  <span className="text-slate-200">13.5GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" /> PlatformIO Builds</span>
                  <span className="text-slate-200">4.2GB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Area: Developer Workstation Hub matching Mockup (3 cols out of 12) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {/* Active Dev Servers Card */}
          <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl flex-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white tracking-tight">Project Activity</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  3 Online
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-300 mb-3">Active Dev Servers</div>

              <div className="space-y-3">
                {devtools.servers.map((srv, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#080c14] border border-[#172030] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-[#111827] border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                        {srv.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{srv.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[110px]">
                          {srv.url}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {srv.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Port Watcher: Active</span>
              <span className="text-cyan-400 cursor-pointer hover:underline">+ Add Tool</span>
            </div>
          </div>

          {/* Git Repo Status & Branch Graph Card */}
          <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl flex-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-cyan-400" /> Git Repo Status
                </h2>
                <GitCommit className="h-4 w-4 text-slate-500" />
              </div>

              <div className="space-y-1 font-mono text-xs my-2">
                <div className="text-slate-400">
                  project: <span className="text-slate-200 font-bold">`{devtools.git.project}`</span>
                </div>
                <div className="text-slate-400">
                  branch: <span className="text-cyan-400 font-semibold">`{devtools.git.branch}`</span>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                  <GitPullRequest className="h-3 w-3" />
                  <span>Up to date with origin (Clean)</span>
                </div>
              </div>

              {/* Commit Timeline Graph from Mockup */}
              <div className="mt-4 pt-3 border-t border-[#162030]">
                <div className="text-[10px] font-mono text-slate-500 mb-2">Commit Branch Pipeline</div>
                <div className="flex items-center justify-between px-2 py-1 bg-[#080c14] rounded-xl border border-[#141c2b]">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-slate-700 mx-1" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="h-0.5 flex-1 bg-slate-700 mx-1" />
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  <div className="h-0.5 flex-1 bg-slate-700 mx-1" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Remote: origin/main</span>
              <span className="text-cyan-400">Synced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
