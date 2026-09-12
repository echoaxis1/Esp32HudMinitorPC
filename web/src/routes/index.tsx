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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto xl:overflow-hidden p-3 sm:p-4 space-y-3 bg-[#07090e]">
      {/* 1. Header (SRP) */}
      <DashboardHeader
        uptime={telemetry.uptime}
        cpuTemp={telemetry.cpuTemp}
        rpm={1200}
      />

      {/* 2. Main Grid: Mobile single-column / Tablet 2-col / Desktop 12 cols */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-0">
        {/* Left Column Area (9 cols on xl) */}
        <div className="xl:col-span-9 flex flex-col gap-3 min-h-0">
          {/* Row 1: Executive CPU (6 cols) + Memory Gauge (3 cols) + Unified Storage (3 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 xl:h-[270px] shrink-0">
            {/* CPU Equalizer (SRP) */}
            <div className="md:col-span-2 xl:col-span-6 flex flex-col">
              <CpuEqualizerCard cpuTotal={telemetry.cpuTotal} cores={cores} />
            </div>

            {/* Memory Speedometer Arc (SRP) */}
            <div className="md:col-span-1 xl:col-span-3 flex flex-col">
              <MemoryGaugeCard ram={ram} />
            </div>

            {/* Unified Storage (Internal Macintosh HD + External SSD) */}
            <div className="md:col-span-1 xl:col-span-3 flex flex-col">
              <UnifiedStorageCard disks={disks} />
            </div>
          </div>

          {/* Row 2: Vitals Berbaris ke Bawah (6 cols) + Antigravity AI Monitor (6 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-3 flex-1 min-h-0">
            {/* System Hardware & Network Vitals (CPU Load Atas, Network I/O Bawah) */}
            <div className="xl:col-span-6 flex flex-col">
              <SystemVitalsCard
                cpuTotal={telemetry.cpuTotal}
                cpuTemp={telemetry.cpuTemp}
                gpuTemp={telemetry.gpuTemp}
                cores={cores}
                network={network}
              />
            </div>

            {/* Antigravity AI Monitor (Dual Concentric HUD Rings + Reset Timestamps) */}
            <div className="xl:col-span-6 flex flex-col">
              <AgyQuickPoolCard
                activeAccount={agy.activeAccount}
                gemini5h={agy.gemini5h}
                geminiWeekly={agy.geminiWeekly}
                geminiReset5h={agy.geminiReset5h}
                geminiResetWeekly={agy.geminiResetWeekly}
                claude5h={agy.claude5h}
                claudeWeekly={agy.claudeWeekly}
                claudeReset5h={agy.claudeReset5h}
                claudeResetWeekly={agy.claudeResetWeekly}
                readyAccounts={agy.readyAccounts}
                totalAccounts={agy.totalAccounts}
                accounts={agy.accounts}
              />
            </div>
          </div>
        </div>

        {/* Right Column Area: Developer Workstation Hub (3 cols on xl) */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:flex xl:flex-col gap-3 min-h-0">
          {/* Active Dev Servers (SRP) */}
          <DevServersPanel servers={devtools.servers} />

          {/* Git Repo Status & Pipeline (SRP) */}
          <GitStatusCard git={devtools.git} />
        </div>
      </div>
    </div>
  )
}
