import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSystemTelemetry, SystemTelemetry } from '~/server/system'
import { switchAgyAccount } from '~/server/agy'
import { Sparkles, RefreshCw, ArrowUpDown, Filter, Loader2, CheckCircle2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'

export const Route = createFileRoute('/agy')({
  loader: async () => {
    return await getSystemTelemetry()
  },
  component: AgyAccountPoolPage,
})

type SortTarget = 'gemini_5h' | 'gemini_weekly' | 'claude_5h' | 'claude_weekly'
type SortOrder = 'desc' | 'asc'

const STORAGE_KEY_SORT = 'agy_pool_sort_target'
const STORAGE_KEY_ORDER = 'agy_pool_sort_order'

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
  const queryClient = useQueryClient()
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null)

  // Inisialisasi state filter & sorting dengan persistensi localStorage
  const [sortTarget, setSortTarget] = useState<SortTarget>('gemini_5h')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const switchMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setSwitchingId(accountId)
      return await switchAgyAccount({ data: accountId })
    },
    onSuccess: (res) => {
      setFeedbackMsg({ text: res.message, isError: false })
      queryClient.invalidateQueries({ queryKey: ['system-telemetry'] })
      setTimeout(() => setFeedbackMsg(null), 5000)
    },
    onError: (err: any) => {
      setFeedbackMsg({ text: err?.message || 'Gagal mengganti akun', isError: true })
      setTimeout(() => setFeedbackMsg(null), 6000)
    },
    onSettled: () => {
      setSwitchingId(null)
    },
  })

  useEffect(() => {
    try {
      const savedSort = localStorage.getItem(STORAGE_KEY_SORT) as SortTarget | null
      const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER) as SortOrder | null
      if (savedSort) setSortTarget(savedSort)
      if (savedOrder) setSortOrder(savedOrder)
    } catch {}
  }, [])

  const handleSortChange = (newTarget: SortTarget) => {
    setSortTarget(newTarget)
    try {
      localStorage.setItem(STORAGE_KEY_SORT, newTarget)
    } catch {}
  }

  const handleOrderToggle = () => {
    const nextOrder: SortOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    setSortOrder(nextOrder)
    try {
      localStorage.setItem(STORAGE_KEY_ORDER, nextOrder)
    } catch {}
  }

  const { data = initialData, refetch, isFetching } = useQuery<SystemTelemetry>({
    queryKey: ['system-telemetry'],
    queryFn: () => getSystemTelemetry(),
    refetchInterval: 3000,
    initialData,
  })

  // Urutkan akun: Sesi aktif 'Saat Ini' selalu nomor 1 paling utama, lalu diikuti sorting terpilih
  const sortedAccounts = useMemo(() => {
    const list = [...data.agy.accounts]

    return list.sort((a, b) => {
      // 1. Akun aktif 'Saat Ini' mutlak paling atas
      if (a.isCurrent && !b.isCurrent) return -1
      if (!a.isCurrent && b.isCurrent) return 1

      // 2. Kriteria sorting dinamis
      let valA = 0
      let valB = 0

      switch (sortTarget) {
        case 'gemini_5h':
          valA = a.gemini5h
          valB = b.gemini5h
          break
        case 'gemini_weekly':
          valA = a.geminiWeekly
          valB = b.geminiWeekly
          break
        case 'claude_5h':
          valA = a.claude5h
          valB = b.claude5h
          break
        case 'claude_weekly':
          valA = a.claudeWeekly
          valB = b.claudeWeekly
          break
      }

      if (valA !== valB) {
        return sortOrder === 'desc' ? valB - valA : valA - valB
      }

      // Tie-breaker default: kuota 5h tertinggi
      return b.gemini5h - a.gemini5h
    })
  }, [data.agy.accounts, sortTarget, sortOrder])

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6 bg-[#07090e]">
      {/* Header Bar dengan Filter & Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0c101a] border border-[#172030] px-6 py-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Antigravity AI Account Pool
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">
                {data.agy.totalAccounts} Akun
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Akun aktif selalu diprioritaskan di paling utama • Filter tersimpan otomatis di browser
            </p>
          </div>
        </div>

        {/* Dynamic Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080c14] border border-[#182232] text-xs font-mono text-slate-300">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-500">Urutkan:</span>
            <select
              value={sortTarget}
              onChange={(e) => handleSortChange(e.target.value as SortTarget)}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="gemini_5h" className="bg-[#0c101a] text-slate-200">Gemini (Limit 5 Jam)</option>
              <option value="gemini_weekly" className="bg-[#0c101a] text-slate-200">Gemini (Limit Mingguan)</option>
              <option value="claude_5h" className="bg-[#0c101a] text-slate-200">Claude (Limit 5 Jam)</option>
              <option value="claude_weekly" className="bg-[#0c101a] text-slate-200">Claude (Limit Mingguan)</option>
            </select>
          </div>

          <button
            onClick={handleOrderToggle}
            className="px-3 py-1.5 rounded-xl bg-[#080c14] hover:bg-slate-800/80 border border-[#182232] text-xs font-mono text-slate-300 transition-colors flex items-center gap-1.5"
            title="Ubah Arah Pengurutan"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-emerald-400" />
            <span>{sortOrder === 'desc' ? 'Terbanyak ↓' : 'Tersedikit ↑'}</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Perbarui Quota Sekarang"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-violet-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Notification Banner */}
      {feedbackMsg && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all animate-in fade-in slide-in-from-top duration-300 ${
            feedbackMsg.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${feedbackMsg.isError ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAccounts.map((acc, index) => (
          <div
            key={acc.id}
            className={`p-5 rounded-2xl border transition-all ${
              acc.isCurrent
                ? 'bg-[#0c1426] border-cyan-500/70 shadow-2xl shadow-cyan-500/15 ring-2 ring-cyan-500/40 relative'
                : 'bg-[#0c101a] border-[#172030] hover:border-slate-700 shadow-lg'
            } flex flex-col justify-between space-y-4`}
          >
            {/* Card Header: Checkbox icon, Email, Saat Ini badge, & PRO badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-4 w-4 rounded-md border flex items-center justify-center text-[9px] font-mono font-bold ${
                  acc.isCurrent ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm font-bold text-slate-100 font-mono tracking-tight truncate max-w-[180px]">
                  {acc.email}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {acc.isCurrent && (
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-400 text-black shadow-sm shadow-emerald-400/30">
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
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>Claude</span>
                  {(sortTarget === 'claude_5h' || sortTarget === 'claude_weekly') && (
                    <span className="text-[9px] text-amber-400 uppercase font-semibold">Sorted</span>
                  )}
                </div>

                {/* Claude 5h */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">5h</span>
                    <span className={`font-bold ${sortTarget === 'claude_5h' ? 'text-amber-400 text-sm' : 'text-emerald-400'}`}>
                      {acc.claude5h}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sortTarget === 'claude_5h' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
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
                    <span className={`font-bold ${sortTarget === 'claude_weekly' ? 'text-amber-400 text-sm' : 'text-emerald-400'}`}>
                      {acc.claudeWeekly}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sortTarget === 'claude_weekly' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
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
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>Gemini</span>
                  {(sortTarget === 'gemini_5h' || sortTarget === 'gemini_weekly') && (
                    <span className="text-[9px] text-cyan-400 uppercase font-semibold">Sorted</span>
                  )}
                </div>

                {/* Gemini 5h */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">5h</span>
                    <span className={`font-bold ${sortTarget === 'gemini_5h' ? 'text-cyan-400 text-sm' : 'text-emerald-400'}`}>
                      {acc.gemini5h}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sortTarget === 'gemini_5h' ? 'bg-cyan-400' : 'bg-emerald-400'
                      }`}
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
                    <span className={`font-bold ${sortTarget === 'gemini_weekly' ? 'text-cyan-400 text-sm' : 'text-emerald-400'}`}>
                      {acc.geminiWeekly}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#162032] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sortTarget === 'gemini_weekly' ? 'bg-cyan-400' : 'bg-emerald-400'
                      }`}
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
                onClick={() => switchMutation.mutate(acc.id)}
                disabled={acc.isCurrent || switchMutation.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  acc.isCurrent
                    ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-transparent'
                    : switchingId === acc.id
                    ? 'bg-violet-600/30 text-violet-200 border border-violet-500 cursor-wait shadow-lg'
                    : switchMutation.isPending
                    ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-transparent'
                    : 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 shadow-md active:scale-95'
                }`}
              >
                {switchingId === acc.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                    <span>Switching...</span>
                  </>
                ) : acc.isCurrent ? (
                  'Aktif'
                ) : (
                  'Switch Account'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
