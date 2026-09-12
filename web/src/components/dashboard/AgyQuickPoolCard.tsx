import { Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react'

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
  /** Sisa kuota Claude 5 jam (persentase 0-100%) */
  claude5h: number
  /** Sisa kuota Claude mingguan (persentase 0-100%) */
  claudeWeekly: number
  /** Jumlah akun pool yang siap digunakan (kuota aman) */
  readyAccounts: number
  /** Total keseluruhan akun di pool Cockpit */
  totalAccounts: number
}

/**
 * Properti untuk gauge melingkar HUD (Circular HUD Gauge).
 */
interface CircularHudGaugeProps {
  /** Label singkat model (misal: 'GEMINI', 'CLAUDE') */
  label: string
  /** Keterangan varian model (misal: 'Gemini 2.5 Pro / Flash') */
  modelTag: string
  /** Nilai persentase pemakaian/kuota 5 jam */
  fiveHourVal: number
  /** Nilai persentase kuota mingguan */
  weeklyVal: number
  /** Kode warna hex garis busur aktif (stroke) */
  strokeColor: string
  /** Warna pendaran bayangan neon (glow) */
  glowColor: string
  /** Warna teks persentase mingguan */
  subColor: string
}

/**
 * Komponen visual busur lingkaran (arc) 270 derajat yang identik
 * dengan widget visual gauge pada firmware ESP32-S3 Physical HUD.
 *
 * @param props Konfigurasi nilai kuota, label, dan palet warna neon
 * @returns Elemen visual gauge lingkaran SVG dengan label persentase
 */
function CircularHudGauge({
  label,
  modelTag,
  fiveHourVal,
  weeklyVal,
  strokeColor,
  glowColor,
  subColor,
}: CircularHudGaugeProps) {
  // Radius busur = 48, keliling = 2 * PI * 48 = ~301.6
  // Sudut busur 270 derajat (mirip LVGL lv_arc_set_bg_angles 0, 270)
  const radius = 48
  const circumference = 2 * Math.PI * radius // ~301.6
  const arcLength = (270 / 360) * circumference // ~226.2
  const clamped5h = Math.max(0, Math.min(100, fiveHourVal))
  const progressOffset = arcLength - (clamped5h / 100) * arcLength

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-[#080c14]/80 border border-[#172338] relative group">
      {/* Label Title */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-black tracking-wider font-mono" style={{ color: strokeColor }}>
          {label}
        </span>
      </div>

      {/* Circular HUD Gauge */}
      <div className="relative flex items-center justify-center w-[136px] h-[136px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg] overflow-visible">
          {/* Background Track Arc (270 degrees) */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#162032"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Active Value Arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={progressOffset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>

        {/* Center Label & Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            5H QUOTA
          </span>
          <span className="text-2xl font-black text-white font-mono tracking-tight leading-none mt-0.5">
            {fiveHourVal}%
          </span>
          <span className="text-[11px] font-mono font-semibold mt-1" style={{ color: subColor }}>
            Wk: {weeklyVal}%
          </span>
        </div>
      </div>

      {/* Model Subtitle Tag */}
      <div className="mt-1 text-[10px] font-mono text-slate-400 font-medium">
        {modelTag}
      </div>
    </div>
  )
}

/**
 * Kartu ringkasan kuota AI Antigravity pada dashboard utama.
 * Menampilkan status akun aktif, ketersediaan pool akun, serta
 * dua gauge melingkar HUD untuk kuota Gemini dan Claude.
 *
 * @param props Data status akun aktif dan persentase kuota model
 * @returns Elemen kartu Bento Grid untuk monitoring Antigravity AI
 */
export function AgyQuickPoolCard({
  activeAccount,
  gemini5h,
  geminiWeekly,
  claude5h,
  claudeWeekly,
  readyAccounts,
  totalAccounts,
}: AgyQuickPoolCardProps) {
  return (
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono font-bold">
                {activeAccount || 'None'}
              </span>
            </h2>
            <div className="text-[10px] text-slate-400 font-mono">
              HUD Circular Gauge &bull; Keychain Sync
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Pool: {readyAccounts}/{totalAccounts} Ready</span>
        </div>
      </div>

      {/* Main Body: Circular Dual-Gauges (GEMINI Cyan & CLAUDE Amber) */}
      <div className="flex items-center justify-center gap-4 my-auto py-2">
        {/* Gemini Gauge */}
        <CircularHudGauge
          label="GEMINI"
          modelTag="Gemini Pro / Flash"
          fiveHourVal={gemini5h}
          weeklyVal={geminiWeekly}
          strokeColor="#00F0FF"
          glowColor="rgba(0, 240, 255, 0.45)"
          subColor="#38bdf8"
        />

        {/* Claude Gauge */}
        <CircularHudGauge
          label="CLAUDE"
          modelTag="Claude 3.7 / Sonnet"
          fiveHourVal={claude5h}
          weeklyVal={claudeWeekly}
          strokeColor="#F59E0B"
          glowColor="rgba(245, 158, 11, 0.45)"
          subColor="#fbbf24"
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
  )
}
