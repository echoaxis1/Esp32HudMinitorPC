import { Sparkles, ShieldCheck } from 'lucide-react'

interface AgyQuickPoolCardProps {
  activeAccount: string
  gemini5h: number
  geminiWeekly: number
  claude5h: number
  claudeWeekly: number
  readyAccounts: number
  totalAccounts: number
}

export function AgyQuickPoolCard({
  activeAccount,
  gemini5h,
  geminiWeekly,
  claude5h,
  claudeWeekly,
  readyAccounts,
  totalAccounts,
}: AgyQuickPoolCardProps) {
  // Circular gauge calculations (270 degree arc matching LVGL HUD: start 135deg)
  const radius = 42
  const circumference = 2 * Math.PI * radius // ~263.89
  const arcLength = circumference * (270 / 360) // ~197.92

  const geminiOffset = arcLength - (gemini5h / 100) * arcLength
  const claudeOffset = arcLength - (claude5h / 100) * arcLength

  return (
    <div className="col-span-5 bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group">
      {/* Top Header matching HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-bold font-mono text-white tracking-wide uppercase">
            {activeAccount}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400">
          Pool: {readyAccounts}/{totalAccounts}
        </span>
      </div>

      {/* Dual Circular Gauge Arcs (Identik 100% dengan ESP32 HUD) */}
      <div className="grid grid-cols-2 gap-4 my-auto py-2">
        {/* Left Circle: GEMINI (Neon Cyan) */}
        <div className="flex flex-col items-center justify-center relative">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-[225deg]" viewBox="0 0 100 100">
              {/* Background Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#172132"
                strokeWidth="8"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Value Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="8"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={geminiOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider">GEMINI</span>
              <span className="text-xl font-black text-white leading-tight">{gemini5h}%</span>
              <span className="text-[10px] text-slate-400">Wk: {geminiWeekly}%</span>
            </div>
          </div>
        </div>

        {/* Right Circle: CLAUDE (Sun Amber) */}
        <div className="flex flex-col items-center justify-center relative">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-[225deg]" viewBox="0 0 100 100">
              {/* Background Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#172132"
                strokeWidth="8"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Value Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="8"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={claudeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
              <span className="text-[10px] font-bold text-amber-400 tracking-wider">CLAUDE</span>
              <span className="text-xl font-black text-white leading-tight">{claude5h}%</span>
              <span className="text-[10px] text-slate-400">Wk: {claudeWeekly}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer link to full pool page */}
      <div className="pt-2 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Antigravity Quota HUD</span>
        <a href="/agy" className="text-violet-400 hover:underline">
          Pool Switch &gt;
        </a>
      </div>
    </div>
  )
}
