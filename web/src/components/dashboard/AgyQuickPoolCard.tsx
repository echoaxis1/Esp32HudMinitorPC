import { Sparkles, ShieldCheck, ArrowUpRight, Clock, ChevronDown } from 'lucide-react'
import * as React from 'react'
import { AgyAccountSwitchDialog, type AgyAccountItem } from './AgyAccountSwitchDialog'

/**
 * Properti untuk komponen AgyQuickPoolCard.
 */
interface AgyQuickPoolCardProps {
  /** Nama akun Antigravity yang sedang aktif tersinkronisasi di Keychain */
  activeAccount: string
  /** Sisa kuota Gemini 5 jam (persentase 0-100%) */
  gemini5h: number
  /** Sisa kuota Gemini mingguan (persentase 0-100%) */
  geminiWeekly: number
  /** Waktu ISO reset kuota Gemini 5 jam */
  geminiReset5h?: string
  /** Waktu ISO reset kuota Gemini mingguan */
  geminiResetWeekly?: string
  /** Sisa kuota Claude 5 jam (persentase 0-100%) */
  claude5h: number
  /** Sisa kuota Claude mingguan (persentase 0-100%) */
  claudeWeekly: number
  /** Waktu ISO reset kuota Claude 5 jam */
  claudeReset5h?: string
  /** Waktu ISO reset kuota Claude mingguan */
  claudeResetWeekly?: string
  /** Jumlah akun pool yang siap digunakan (kuota aman) */
  readyAccounts: number
  /** Total keseluruhan akun di pool Cockpit */
  totalAccounts: number
  /** Daftar akun lengkap untuk dialog pemilihan cepat */
  accounts?: AgyAccountItem[]
}

/**
 * Helper pemformat waktu reset ke format jam dan tanggal yang mudah dibaca.
 * Contoh: "22:53 (4h 20m lagi)" atau "18 Sep 06:01 (5d lagi)"
 *
 * @param isoStr String tanggal ISO
 * @returns Teks waktu reset yang informatif
 */
function formatResetTimeDetail(isoStr?: string): { time: string; countdown: string } {
  if (!isoStr) return { time: '--:--', countdown: 'Ready' }
  try {
    const target = new Date(isoStr)
    const now = new Date()
    const diffMs = target.getTime() - now.getTime()

    const hh = String(target.getHours()).padStart(2, '0')
    const ii = String(target.getMinutes()).padStart(2, '0')
    const dd = String(target.getDate()).padStart(2, '0')
    const mm = String(target.getMonth() + 1).padStart(2, '0')

    if (diffMs <= 0) {
      return { time: `${hh}:${ii}`, countdown: 'Reset selesai (Ready)' }
    }

    const totalSec = Math.floor(diffMs / 1000)
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)

    if (days > 0) {
      return {
        time: `${dd}/${mm} ${hh}:${ii}`,
        countdown: `${days}h ${hours}j lagi`,
      }
    } else if (hours > 0) {
      return {
        time: `Jam ${hh}:${ii}`,
        countdown: `${hours}j ${mins}m lagi`,
      }
    } else {
      return {
        time: `Jam ${hh}:${ii}`,
        countdown: `${mins}m lagi`,
      }
    }
  } catch {
    return { time: '--:--', countdown: '--' }
  }
}

/**
 * Properti untuk gauge melingkar HUD ganda (Dual Concentric Rings).
 */
interface DualConcentricHudGaugeProps {
  /** Label model AI (misal: 'GEMINI', 'CLAUDE') */
  label: string
  /** Varian nama model */
  modelTag: string
  /** Nilai persentase kuota 5 jam (lingkaran luar) */
  fiveHourVal: number
  /** Nilai persentase kuota mingguan (lingkaran dalam) */
  weeklyVal: number
  /** Waktu ISO reset 5 jam */
  reset5h?: string
  /** Waktu ISO reset mingguan */
  resetWeekly?: string
  /** Warna stroke lingkaran luar (5h) */
  outerColor: string
  /** Warna pendaran lingkaran luar */
  outerGlow: string
  /** Warna stroke lingkaran dalam (Weekly) */
  innerColor: string
  /** Warna pendaran lingkaran dalam */
  innerGlow: string
}

/**
 * Komponen HUD dua lingkaran konsentris (Dual Concentric Arcs 270°).
 * - Lingkaran Luar: Kuota 5 Jam (5H Quota)
 * - Lingkaran Dalam: Kuota Mingguan (Weekly Quota)
 * - Area Bawah: Penjelasan jam berapa reset terjadi secara presisi
 *
 * @param props Konfigurasi nilai kuota 5h, mingguan, warna neon, dan waktu reset
 * @returns Elemen visual gauge lingkaran ganda
 */
function DualConcentricHudGauge({
  label,
  modelTag,
  fiveHourVal,
  weeklyVal,
  reset5h,
  resetWeekly,
  outerColor,
  outerGlow,
  innerColor,
  innerGlow,
}: DualConcentricHudGaugeProps) {
  // Sudut busur 270 derajat
  // Lingkaran Luar (5-Hour Quota)
  const outerRadius = 52
  const outerCircumference = 2 * Math.PI * outerRadius // ~326.7
  const outerArcLength = (270 / 360) * outerCircumference // ~245.0
  const clamped5h = Math.max(0, Math.min(100, fiveHourVal))
  const outerOffset = outerArcLength - (clamped5h / 100) * outerArcLength

  // Lingkaran Dalam (Weekly Quota)
  const innerRadius = 39
  const innerCircumference = 2 * Math.PI * innerRadius // ~245.0
  const innerArcLength = (270 / 360) * innerCircumference // ~183.8
  const clampedWeekly = Math.max(0, Math.min(100, weeklyVal))
  const innerOffset = innerArcLength - (clampedWeekly / 100) * innerArcLength

  const reset5hInfo = formatResetTimeDetail(reset5h)
  const resetWkInfo = formatResetTimeDetail(resetWeekly)

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-3 rounded-xl bg-[#080c14]/90 border border-[#172338] relative group">
      {/* Label Title Model */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-black tracking-wider font-mono" style={{ color: outerColor }}>
          {label}
        </span>
      </div>

      {/* Visual Dual Concentric Circular Gauge */}
      <div className="relative flex items-center justify-center w-[148px] h-[148px]">
        <svg viewBox="0 0 130 130" className="w-full h-full -rotate-[135deg] overflow-visible">
          {/* Outer Track: 5H Quota */}
          <circle
            cx="65"
            cy="65"
            r={outerRadius}
            fill="none"
            stroke="#141c2a"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${outerArcLength} ${outerCircumference}`}
          />
          {/* Outer Active Value: 5H Quota */}
          <circle
            cx="65"
            cy="65"
            r={outerRadius}
            fill="none"
            stroke={outerColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${outerArcLength} ${outerCircumference}`}
            strokeDashoffset={outerOffset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${outerGlow})` }}
          />

          {/* Inner Track: Weekly Quota */}
          <circle
            cx="65"
            cy="65"
            r={innerRadius}
            fill="none"
            stroke="#101724"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${innerArcLength} ${innerCircumference}`}
          />
          {/* Inner Active Value: Weekly Quota */}
          <circle
            cx="65"
            cy="65"
            r={innerRadius}
            fill="none"
            stroke={innerColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${innerArcLength} ${innerCircumference}`}
            strokeDashoffset={innerOffset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 5px ${innerGlow})` }}
          />
        </svg>

        {/* Center Percentage Display: 5H (Besar) & Weekly (Kecil) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            5H QUOTA
          </span>
          <span className="text-2xl font-black text-white font-mono tracking-tight leading-none mt-0.5">
            {fiveHourVal}%
          </span>
          <div className="flex items-center gap-1 mt-1 font-mono text-[10px] font-bold" style={{ color: innerColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: innerColor }} />
            <span>Wk: {weeklyVal}%</span>
          </div>
        </div>
      </div>

      {/* Model Subtitle Tag */}
      <div className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
        {modelTag}
      </div>

      {/* Keterangan Waktu Reset (Jam Berapa ke-Reset) */}
      <div className="w-full mt-2 pt-2 border-t border-[#141d2d] flex flex-col gap-1 text-[10px] font-mono">
        {/* Reset 5 Jam */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-cyan-400" />
            <span>Reset 5h:</span>
          </span>
          <span className="text-cyan-300 font-semibold text-right">
            {reset5hInfo.time} <span className="text-slate-500">({reset5hInfo.countdown})</span>
          </span>
        </div>

        {/* Reset Mingguan */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-emerald-400" />
            <span>Reset Wk:</span>
          </span>
          <span className="text-emerald-300 font-semibold text-right">
            {resetWkInfo.time} <span className="text-slate-500">({resetWkInfo.countdown})</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Kartu ringkasan kuota AI Antigravity pada dashboard utama.
 * Menampilkan status akun aktif, ketersediaan pool akun, dua gauge
 * melingkar HUD konsentris untuk kuota 5-jam & mingguan secara bersamaan,
 * serta keterangan jam berapa reset akan terjadi.
 *
 * @param props Data status akun aktif, kuota model, dan waktu reset
 * @returns Elemen kartu Bento Grid untuk monitoring Antigravity AI
 */
export function AgyQuickPoolCard({
  activeAccount,
  gemini5h,
  geminiWeekly,
  geminiReset5h,
  geminiResetWeekly,
  claude5h,
  claudeWeekly,
  claudeReset5h,
  claudeResetWeekly,
  readyAccounts,
  totalAccounts,
  accounts = [],
}: AgyQuickPoolCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  return (
    <>
      <div className="col-span-6 bg-[#0c101a] border border-violet-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group">
        {/* Subtle Glow Background */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header: Identity & Status */}
        <div className="flex items-center justify-between border-b border-[#162030] pb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Antigravity AI Monitor
                <button
                  onClick={() => setIsDialogOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 hover:border-violet-400 text-violet-200 font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs hover:shadow-violet-500/20"
                  title="Klik untuk memilih akun aktif lain secara cepat"
                >
                  <span>{activeAccount || 'None'}</span>
                  <ChevronDown className="h-3 w-3 text-violet-300" />
                </button>
              </h2>
              <div className="text-[10px] text-slate-400 font-mono">
                Dual Concentric HUD Gauges &bull; Click Account to Quick Switch
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Pool: {readyAccounts}/{totalAccounts} Ready</span>
          </div>
        </div>

      {/* Main Body: Dual Concentric HUD Gauges (GEMINI & CLAUDE) */}
      <div className="flex items-center justify-center gap-4 my-auto py-2">
        {/* Gemini Gauge: Lingkaran Luar Cyan (5h), Lingkaran Dalam Indigo/Purple (Weekly) */}
        <DualConcentricHudGauge
          label="GEMINI"
          modelTag="Gemini Pro / Flash"
          fiveHourVal={gemini5h}
          weeklyVal={geminiWeekly}
          reset5h={geminiReset5h}
          resetWeekly={geminiResetWeekly}
          outerColor="#00F0FF"
          outerGlow="rgba(0, 240, 255, 0.45)"
          innerColor="#a855f7"
          innerGlow="rgba(168, 85, 247, 0.45)"
        />

        {/* Claude Gauge: Lingkaran Luar Amber (5h), Lingkaran Dalam Emerald (Weekly) */}
        <DualConcentricHudGauge
          label="CLAUDE"
          modelTag="Claude 3.7 / Sonnet"
          fiveHourVal={claude5h}
          weeklyVal={claudeWeekly}
          reset5h={claudeReset5h}
          resetWeekly={claudeResetWeekly}
          outerColor="#F59E0B"
          outerGlow="rgba(245, 158, 11, 0.45)"
          innerColor="#10B981"
          innerGlow="rgba(16, 185, 129, 0.45)"
        />
      </div>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
          <span>Keychain Sync: Active (`gemini/antigravity`)</span>
          <a
            href="/agy"
            className="text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 transition-colors"
          >
            Switch Active Account
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Reusable Quick Switch Account Modal Dialog */}
      <AgyAccountSwitchDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        activeAccount={activeAccount}
        accounts={accounts}
        readyAccounts={readyAccounts}
        totalAccounts={totalAccounts}
      />
    </>
  )
}
