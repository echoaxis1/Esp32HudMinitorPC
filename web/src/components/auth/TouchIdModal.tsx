import * as React from 'react'
import { Fingerprint, KeyRound, ShieldAlert, X, CheckCircle2 } from 'lucide-react'

/**
 * Properti untuk dialog modal verifikasi biometrik Touch ID / PIN.
 */
export interface TouchIdModalProps {
  /** Apakah modal sedang terbuka */
  isOpen: boolean
  /** Judul aksi yang memerlukan autentikasi (misal: 'Switch Active Account') */
  actionTitle: string
  /** Deskripsi penjelasan mengapa autentikasi dibutuhkan */
  description?: string
  /** Callback saat modal ditutup atau dibatalkan */
  onClose: () => void
  /** Callback ketika verifikasi berhasil disetujui */
  onSuccess: () => void
  /** Fungsi eksekusi verifikasi Touch ID dari useTouchIdAuth */
  onVerifyTouchId: () => Promise<boolean>
  /** Fungsi eksekusi verifikasi PIN dari useTouchIdAuth */
  onVerifyPin?: (pin: string) => Promise<boolean>
  /** Apakah Touch ID didukung pada perangkat */
  isSupported?: boolean
  /** Apakah Touch ID sudah didaftarkan */
  hasPasskey?: boolean
}

/**
 * Komponen modal dialog verifikasi biometrik Touch ID dan PIN yang reusable.
 * Dapat dipanggil kapan saja sebelum mengeksekusi aksi sensitif di dashboard.
 *
 * @param props Konfigurasi modal, callback keberhasilan, dan handler verifikasi
 * @returns Elemen dialog modal futuristik
 */
export function TouchIdModal({
  isOpen,
  actionTitle,
  description,
  onClose,
  onSuccess,
  onVerifyTouchId,
  onVerifyPin,
  isSupported = true,
  hasPasskey = true,
}: TouchIdModalProps) {
  const [mode, setMode] = React.useState<'touchid' | 'pin'>('touchid')
  const [pinInput, setPinInput] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState(false)

  // Otomatis picu Touch ID saat modal dibuka jika passkey tersedia
  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setIsSuccess(false)
      setPinInput('')
      if (hasPasskey && isSupported) {
        setMode('touchid')
        handleTriggerTouchId()
      } else {
        setMode('pin')
      }
    }
  }, [isOpen, hasPasskey, isSupported])

  /**
   * Memicu dialog biometrik Touch ID macOS.
   */
  async function handleTriggerTouchId() {
    setIsProcessing(true)
    setErrorMsg(null)
    try {
      const ok = await onVerifyTouchId()
      if (ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 600)
      } else {
        setErrorMsg('Otentikasi Touch ID tidak berhasil.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verifikasi sidik jari dibatalkan.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Memproses submit verifikasi via Master PIN.
   */
  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pinInput || !onVerifyPin) return

    setIsProcessing(true)
    setErrorMsg(null)
    try {
      const ok = await onVerifyPin(pinInput)
      if (ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 600)
      } else {
        setErrorMsg('PIN yang dimasukkan salah.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memverifikasi PIN.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-md bg-[#0b0f19] border border-[#1b273b] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col items-center text-center">
        {/* Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 transition-colors"
          title="Batal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Status Icon */}
        <div className="mb-4 mt-2">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
          ) : mode === 'touchid' ? (
            <button
              onClick={handleTriggerTouchId}
              disabled={isProcessing}
              className="group relative w-20 h-20 rounded-2xl bg-[#121a29] border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Klik untuk menyentuh Touch ID"
            >
              <Fingerprint className="h-10 w-10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50 animate-ping pointer-events-none opacity-40" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#121a29] border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Modal Titles */}
        <h3 className="text-lg font-bold text-white tracking-tight font-sans">
          {isSuccess ? 'Autentikasi Terverifikasi' : actionTitle}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
          {description || 'Sentuh sensor Touch ID Mac Anda untuk mengonfirmasi operasi ini.'}
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-300 text-xs font-mono">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body based on mode */}
        {!isSuccess && mode === 'touchid' && (
          <div className="mt-6 flex flex-col items-center space-y-3 w-full">
            <button
              onClick={handleTriggerTouchId}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {isProcessing ? 'Menunggu Touch ID...' : 'Sentuh Sensor Touch ID'}
            </button>

            {onVerifyPin && (
              <button
                type="button"
                onClick={() => setMode('pin')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Gunakan Master PIN sebagai gantinya &gt;
              </button>
            )}
          </div>
        )}

        {!isSuccess && mode === 'pin' && (
          <form onSubmit={handlePinSubmit} className="mt-4 w-full space-y-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Masukkan Master PIN"
              autoFocus
              className="w-full px-3 py-2.5 bg-[#070a10] border border-[#1b273b] rounded-xl text-center text-sm font-mono tracking-widest text-white focus:outline-hidden focus:border-cyan-500"
            />

            <div className="flex gap-2">
              {hasPasskey && isSupported && (
                <button
                  type="button"
                  onClick={() => setMode('touchid')}
                  className="flex-1 py-2 rounded-xl bg-[#121a29] border border-[#1b273b] text-slate-300 hover:text-white text-xs font-mono"
                >
                  Kembali ke Touch ID
                </button>
              )}
              <button
                type="submit"
                disabled={isProcessing || !pinInput}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Memverifikasi...' : 'Konfirmasi PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
