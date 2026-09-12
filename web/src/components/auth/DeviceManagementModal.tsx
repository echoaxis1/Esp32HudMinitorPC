import * as React from 'react'
import { Smartphone, Laptop, Plus, Trash2, CheckCircle2, ShieldAlert, X, Fingerprint, Sparkles } from 'lucide-react'
import { UseTouchIdAuthReturn } from '~/hooks/useTouchIdAuth'

interface DeviceManagementModalProps {
  auth: UseTouchIdAuthReturn
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal untuk mengelola perangkat autentikasi biometrik (Touch ID Mac, Face ID iPhone, Passkey).
 * Memungkinkan pengguna mendaftarkan iPhone saat ini secara instan langsung dari dashboard.
 *
 * @param auth State autentikasi dari hook useTouchIdAuth
 * @param isOpen Apakah modal sedang terbuka
 * @param onClose Callback saat modal ditutup
 */
export function DeviceManagementModal({ auth, isOpen, onClose }: DeviceManagementModalProps) {
  const { devices, registerTouchId, isSupported } = auth
  const [deviceName, setDeviceName] = React.useState('')
  const [isRegistering, setIsRegistering] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Otomatis deteksi tipe perangkat pengguna saat modal dibuka
  React.useEffect(() => {
    if (isOpen) {
      const isIphone = /iPhone/i.test(navigator.userAgent)
      const isIpad = /iPad/i.test(navigator.userAgent)
      const isMac = /Macintosh/i.test(navigator.userAgent)

      if (isIphone) setDeviceName('iPhone Face ID')
      else if (isIpad) setDeviceName('iPad Touch/Face ID')
      else if (isMac) setDeviceName('Mac mini Touch ID')
      else setDeviceName('Perangkat Passkey')
      setStatusMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  /**
   * Eksekusi pendaftaran perangkat saat ini menggunakan WebAuthn.
   */
  async function handleRegisterCurrentDevice() {
    setIsRegistering(true)
    setStatusMessage(null)
    try {
      const ok = await registerTouchId(deviceName || 'Perangkat Baru')
      if (ok) {
        setStatusMessage({
          type: 'success',
          text: `Berhasil! ${deviceName || 'Perangkat'} kini dapat digunakan untuk membuka kunci menggunakan Face ID / Touch ID.`,
        })
        await auth.refreshStatus()
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Pendaftaran dibatalkan atau tidak disetujui di perangkat Anda.',
        })
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mendaftarkan biometrik perangkat ini.',
      })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0a0f1d] border border-[#1b273b] rounded-3xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Kelola Perangkat Biometrik</h2>
            <p className="text-xs text-slate-400 font-mono">Face ID & Touch ID Passkey</p>
          </div>
        </div>

        {/* Notification Banner */}
        {statusMessage && (
          <div
            className={`mb-5 p-3.5 rounded-2xl border text-xs font-mono flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action: Daftarkan Perangkat Saat Ini */}
        <div className="p-4 rounded-2xl bg-[#0e1626] border border-[#1b283d] mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Daftarkan Perangkat Ini
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
              FIDO2
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 font-sans leading-relaxed">
            Aktifkan Face ID iPhone Anda agar dapat membuka Workstation Mission Control secara instan tanpa perlu PIN atau barcode.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Nama Perangkat (misal: iPhone 15 Pro)"
              className="flex-1 px-3 py-2 bg-[#050811] border border-[#1b273b] rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-cyan-500"
            />
            <button
              onClick={handleRegisterCurrentDevice}
              disabled={isRegistering || !isSupported}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-600/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isRegistering ? 'Memproses...' : 'Daftarkan'}</span>
            </button>
          </div>
        </div>

        {/* Daftar Perangkat Terdaftar */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">
            Perangkat Terdaftar ({devices.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {devices.map((dev) => {
              const isPhone = /iPhone|Phone/i.test(dev.name)
              return (
                <div
                  key={dev.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0e1626]/60 border border-[#162133] text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    {isPhone ? (
                      <Smartphone className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Laptop className="h-4 w-4 text-cyan-400" />
                    )}
                    <div>
                      <div className="font-bold text-slate-200">{dev.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(dev.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Aktif
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#162133] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
