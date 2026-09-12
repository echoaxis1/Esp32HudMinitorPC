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
  return (
    <div className="col-span-6 bg-[#0c101a] border border-violet-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group">
      {/* Subtle Glow Background */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Nama Monitor Antigravity yang Jelas & Terang */}
      <div className="flex items-center justify-between border-b border-[#162030] pb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Antigravity AI Monitor
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono">
                {activeAccount}
              </span>
            </h2>
            <div className="text-[10px] text-slate-400 font-mono">
              Google Cloud Code Quota Engine
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Pool: {readyAccounts}/{totalAccounts} Ready</span>
        </div>
      </div>

      {/* Main Body: Card Bar Gemini di Atas, Claude di Bawah (Lebih Besar & Jelas) */}
      <div className="flex flex-col gap-3 my-auto py-2">
        {/* 1. Bar GEMINI (Di Atas - Besar, Bold, Neon Cyan / Violet) */}
        <div className="p-3 rounded-xl bg-[#080c14] border border-[#172338] flex flex-col space-y-2 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              <span className="text-xs font-black tracking-wider text-cyan-400 font-mono">
                GEMINI 2.5 PRO / FLASH
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xl font-black text-white">{gemini5h}%</span>
              <span className="text-xs font-semibold text-slate-400">
                (Weekly: <span className="text-cyan-400">{geminiWeekly}%</span>)
              </span>
            </div>
          </div>

          {/* Large Progress Bar */}
          <div className="h-3 w-full bg-[#141b29] rounded-full overflow-hidden p-0.5 border border-[#1b273b]">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400 rounded-full transition-all duration-700 shadow-md shadow-cyan-500/20"
              style={{ width: `${gemini5h}%` }}
            />
          </div>
        </div>

        {/* 2. Bar CLAUDE & GPT (Di Bawah - Besar, Bold, Sun Amber) */}
        <div className="p-3 rounded-xl bg-[#080c14] border border-[#172338] flex flex-col space-y-2 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 shadow-sm shadow-amber-400/50" />
              <span className="text-xs font-black tracking-wider text-amber-400 font-mono">
                CLAUDE 3.7 / GPT-4O
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xl font-black text-white">{claude5h}%</span>
              <span className="text-xs font-semibold text-slate-400">
                (Weekly: <span className="text-amber-400">{claudeWeekly}%</span>)
              </span>
            </div>
          </div>

          {/* Large Progress Bar */}
          <div className="h-3 w-full bg-[#141b29] rounded-full overflow-hidden p-0.5 border border-[#1b273b]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700 shadow-md shadow-amber-500/20"
              style={{ width: `${claude5h}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer link to switch account */}
      <div className="pt-2 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Keychain Sync: Active (`gemini/antigravity`)</span>
        <a href="/agy" className="text-violet-400 font-bold hover:underline flex items-center gap-1">
          Switch Active Account &gt;
        </a>
      </div>
    </div>
  )
}
