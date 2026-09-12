import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry } from '~/server/system'
import { getDevToolsStatus } from '~/server/devtools'
import { DashboardHeader } from '~/components/dashboard/DashboardHeader'
import { CpuEqualizerCard } from '~/components/dashboard/CpuEqualizerCard'
import { MemoryGaugeCard } from '~/components/dashboard/MemoryGaugeCard'
import { StorageBentoCard } from '~/components/dashboard/StorageBentoCard'
import { WorkloadTimelineCard } from '~/components/dashboard/WorkloadTimelineCard'
import { DevServersPanel } from '~/components/dashboard/DevServersPanel'
import { GitStatusCard } from '~/components/dashboard/GitStatusCard'

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3 bg-[#07090e]">
      {/* 1. Header (SRP: Isolated Header Telemetry & Search) */}
      <DashboardHeader
        uptime={telemetry.uptime}
        cpuTemp={telemetry.cpuTemp}
        rpm={1200}
      />

      {/* 2. Main Grid: Left Bento (3 cols) + Right Dev Workspace (1 col) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column Area (9 cols) */}
        <div className="col-span-9 flex flex-col gap-3 min-h-0">
          {/* Row 1: Executive CPU + Memory Semi Gauge + Primary Storage */}
          <div className="grid grid-cols-12 gap-3 h-[270px] shrink-0">
            {/* CPU Equalizer (SRP) */}
            <CpuEqualizerCard cpuTotal={telemetry.cpuTotal} cores={cores} />

            {/* Memory Speedometer Arc (SRP) */}
            <MemoryGaugeCard ram={ram} />

            {/* Primary Storage (SRP) */}
            <StorageBentoCard
              title="Storage"
              subtitle="Macintosh HD"
              usedGb={disks[0]?.usedGb ?? 128}
              freeGb={disks[0]?.freeGb ?? 320}
              pct={disks[0]?.pct ?? 28}
              color="cyan"
              breakdown={[
                { label: 'Developer', size: '54.2GB', color: 'bg-cyan-400' },
                { label: 'System APFS', size: '38.1GB', color: 'bg-emerald-400' },
                { label: 'Applications', size: '22.8GB', color: 'bg-amber-400' },
              ]}
            />
          </div>

          {/* Row 2: Secondary Gauges & Timeline Oscilloscope */}
          <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
            {/* CPU Distribution Summary Card */}
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

            {/* Timeline Oscilloscope Waveform (SRP) */}
            <WorkloadTimelineCard
              cpuTemp={telemetry.cpuTemp}
              downKb={telemetry.network.downKb}
              upKb={telemetry.network.upKb}
            />

            {/* Secondary External Storage (SRP) */}
            <StorageBentoCard
              title="Secondary Storage"
              subtitle={disks[1]?.name ?? 'MAC_EXTERNAL_SSD'}
              usedGb={disks[1]?.usedGb ?? 128}
              freeGb={disks[1]?.freeGb ?? 337}
              pct={disks[1]?.pct ?? 28}
              color="emerald"
              breakdown={[
                { label: 'Workspace Code', size: '13.5GB', color: 'bg-cyan-400' },
                { label: 'PlatformIO Builds', size: '4.2GB', color: 'bg-emerald-400' },
                { label: 'Backups', size: '1.8GB', color: 'bg-amber-400' },
              ]}
            />
          </div>
        </div>

        {/* Right Column Area: Developer Workstation Hub (3 cols) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {/* Active Dev Servers (SRP) */}
          <DevServersPanel servers={devtools.servers} />

          {/* Git Repo Status & Pipeline (SRP) */}
          <GitStatusCard git={devtools.git} />
        </div>
      </div>
    </div>
  )
}
