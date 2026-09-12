import * as React from 'react'
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { switchAgyAccount } from '~/server/agy'
import { useTouchIdAuth } from '~/hooks/useTouchIdAuth'
import { TouchIdModal } from '~/components/auth/TouchIdModal'

/**
 * Interface data akun Antigravity AI.
 */
export interface AgyAccountItem {
  id: string
  name: string
  email: string
  isCurrent: boolean
  gemini5h: number
  geminiWeekly: number
  geminiReset5h?: string
  geminiResetWeekly?: string
  claude5h: number
  claudeWeekly: number
  claudeReset5h?: string
  claudeResetWeekly?: string
}

/**
 * Properti untuk dialog pemilihan cepat akun Antigravity AI (AgyAccountSwitchDialog).
 */
export interface AgyAccountSwitchDialogProps {
  /** Apakah dialog terbuka */
  isOpen: boolean
  /** Callback saat dialog ditutup */
  onClose: () => void
  /** Nama akun yang sedang aktif */
  activeAccount: string
  /** Daftar seluruh akun yang tersedia di pool */
  accounts: AgyAccountItem[]
  /** Jumlah akun siap pakai */
  readyAccounts: number
  /** Total akun di pool */
  totalAccounts: number
}

/**
 * Komponen dialog modal reusable untuk pergantian cepat akun aktif Antigravity AI Cockpit.
 * Menyajikan daftar seluruh akun beserta kuota terkini (Gemini & Claude), indikator akun aktif,
 * dan perlindungan biometrik Touch ID saat memilih akun baru.
 *
 * @param props Konfigurasi modal, daftar akun, dan callback penutup
 * @returns Elemen dialog modal pemilihan akun
 */
export function AgyAccountSwitchDialog({
  isOpen,
  onClose,
  activeAccount,
  accounts,
  readyAccounts,
  totalAccounts,
}: AgyAccountSwitchDialogProps) {
  const queryClient = useQueryClient()
  const [switchingId, setSwitchingId] = React.useState<string | null>(null)
  const [targetAccount, setTargetAccount] = React.useState<AgyAccountItem | null>(null)
  const [feedback, setFeedback] = React.useState<{ text: string; isError: boolean } | null>(null)

  // Reusable Touch ID verification hook
  const { verifyTouchIdForAction, loginWithPin, isSupported, hasPasskey } = useTouchIdAuth()

  const switchMutation = useMutation({
    mutationFn: async (accId: string) => {
      setSwitchingId(accId)
      return await switchAgyAccount({ data: accId })
    },
    onSuccess: (res) => {
      setFeedback({ text: res.message, isError: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-telemetry'] })
      queryClient.invalidateQueries({ queryKey: ['system-telemetry'] })
      setTimeout(() => {
        setFeedback(null)
        onClose()
      }, 1200)
    },
    onError: (err: any) => {
      setFeedback({ text: err?.message || 'Gagal mengganti akun', isError: true })
    },
    onSettled: () => {
      setSwitchingId(null)
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#090d16] border border-[#1b273b] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Glow Background */}
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#162030] pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Pilih Akun Antigravity Aktif
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono">
                  {activeAccount}
                </span>
              </h2>
              <div className="text-[11px] text-slate-400 font-mono">
                Pilih akun untuk langsung dialihkan pada Keychain & Session IDE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{readyAccounts}/{totalAccounts} Siap</span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white p-1 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 transition-colors"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mt-4 px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shrink-0 ${
              feedback.isError
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            }`}
          >
            {feedback.isError ? (
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Scrollable Accounts List */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2.5 pr-1">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => {
                if (!acc.isCurrent && !switchMutation.isPending) {
                  setTargetAccount(acc)
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                acc.isCurrent
                  ? 'bg-violet-950/20 border-violet-500/50 shadow-md shadow-violet-900/20 cursor-default'
                  : 'bg-[#0b0f19] hover:bg-[#101726] border-[#182438] hover:border-violet-500/40'
              }`}
            >
              {/* Account Identity */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-mono ${
                    acc.isCurrent
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                      : 'bg-[#151e2e] text-slate-400 border border-[#22314a]'
                  }`}
                >
                  {acc.name.substring(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-sans">{acc.name}</span>
                    {acc.isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{acc.email}</div>
                </div>
              </div>

              {/* Quota Gauges Info */}
              <div className="flex items-center gap-6">
                {/* Gemini Quota */}
                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400">GEMINI</div>
                  <div className="text-xs font-bold text-cyan-400">
                    5h: {acc.gemini5h}% <span className="text-slate-500 font-normal">| Wk: {acc.geminiWeekly}%</span>
                  </div>
                </div>

                {/* Claude Quota */}
                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400">CLAUDE</div>
                  <div className="text-xs font-bold text-amber-400">
                    5h: {acc.claude5h}% <span className="text-slate-500 font-normal">| Wk: {acc.claudeWeekly}%</span>
                  </div>
                </div>

                {/* Switch Action Indicator */}
                <div className="pl-2">
                  {acc.isCurrent ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : switchingId === acc.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[#141d2d] hover:bg-violet-600/30 border border-[#1e2d45] flex items-center justify-center text-slate-400 hover:text-violet-300 transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Guidance */}
        <div className="pt-3 border-t border-[#162030] flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
          <span>Dilindungi Biometrik Touch ID &bull; Automatic Keychain Swap</span>
          <a
            href="/agy"
            onClick={onClose}
            className="text-violet-400 hover:underline font-bold"
          >
            Buka AI Cockpit Lengkap &gt;
          </a>
        </div>
      </div>

      {/* Reusable Touch ID Prompt Modal */}
      <TouchIdModal
        isOpen={!!targetAccount}
        actionTitle={`Ganti Akun ke ${targetAccount?.name || ''}`}
        description="Sentuh sensor Touch ID Mac Anda untuk mengotorisasi pergantian akun aktif Antigravity."
        onClose={() => setTargetAccount(null)}
        onSuccess={() => {
          if (targetAccount) {
            switchMutation.mutate(targetAccount.id)
            setTargetAccount(null)
          }
        }}
        onVerifyTouchId={verifyTouchIdForAction}
        onVerifyPin={loginWithPin}
        isSupported={isSupported}
        hasPasskey={hasPasskey}
      />
    </div>
  )
}
