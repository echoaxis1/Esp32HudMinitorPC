import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemTelemetry } from '~/server/system'
import { getDevToolsStatus } from '~/server/devtools'
import { DashboardHeader } from '~/components/dashboard/DashboardHeader'
import { CpuEqualizerCard } from '~/components/dashboard/CpuEqualizerCard'
import { MemoryGaugeCard } from '~/components/dashboard/MemoryGaugeCard'
import { UnifiedStorageCard } from '~/components/dashboard/UnifiedStorageCard'
import { SystemVitalsCard } from '~/components/dashboard/SystemVitalsCard'
import { AgyQuickPoolCard } from '~/components/dashboard/AgyQuickPoolCard'
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
  const { cores, ram, disks, agy, network } = telemetry

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3 bg-[#07090e]">
      {/* 1. Header (SRP) */}
      <DashboardHeader
        uptime={telemetry.uptime}
        cpuTemp={telemetry.cpuTemp}
        rpm={1200}
      />

      {/* 2. Main Grid: Left Bento (9 cols) + Right Dev Workspace (3 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column Area (9 cols) */}
        <div className="col-span-9 flex flex-col gap-3 min-h-0">
          {/* Row 1: Executive CPU (6 cols) + Memory Gauge (3 cols) + Unified Storage (3 cols) */}
          <div className="grid grid-cols-12 gap-3 h-[270px] shrink-0">
            {/* CPU Equalizer (SRP) */}
            <CpuEqualizerCard cpuTotal={telemetry.cpuTotal} cores={cores} />

            {/* Memory Speedometer Arc (SRP) */}
            <MemoryGaugeCard ram={ram} />

            {/* Unified Storage (Internal Macintosh HD + External SSD) */}
            <UnifiedStorageCard disks={disks} />
          </div>

          {/* Row 2: Unified System Vitals Card (7 cols) + Antigravity Cockpit (5 cols) */}
          <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
            {/* Unified System Hardware & Network Vitals (CPU Core Load + Network I/O + SoC Temp) */}
            <SystemVitalsCard
              cpuTotal={telemetry.cpuTotal}
              cpuTemp={telemetry.cpuTemp}
              gpuTemp={telemetry.gpuTemp}
              cores={cores}
              network={network}
            />

            {/* Antigravity AI Dual Circular Gauge (5 cols) */}
            <AgyQuickPoolCard
              activeAccount={agy.activeAccount}
              gemini5h={agy.gemini5h}
              geminiWeekly={agy.geminiWeekly}
              claude5h={agy.claude5h}
              claudeWeekly={agy.claudeWeekly}
              readyAccounts={agy.readyAccounts}
              totalAccounts={agy.totalAccounts}
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
