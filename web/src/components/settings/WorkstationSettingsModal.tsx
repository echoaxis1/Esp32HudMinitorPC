import React, { useState } from 'react'
import { 
  Fingerprint, 
  Trash2, 
  Plus, 
  Smartphone, 
  Laptop, 
  AlertCircle, 
  LogOut, 
  X, 
  ShieldCheck,
  Settings as SettingsIcon
} from 'lucide-react'
import type { UseTouchIdAuthReturn } from '~/hooks/useTouchIdAuth'

/**
 * Properti untuk komponen WorkstationSettingsModal.
 * 
 * @interface WorkstationSettingsModalProps
 * @property {UseTouchIdAuthReturn} auth - Instance hook autentikasi biometrik workstation.
 * @property {boolean} isOpen - Status apakah modal pengaturan sedang dibuka.
 * @property {() => void} onClose - Callback untuk menutup modal.
 */
interface WorkstationSettingsModalProps {
  auth: UseTouchIdAuthReturn
  isOpen: boolean
  onClose: () => void
}

/**
 * Komponen modal Pengaturan Terpadu (Settings Modal) untuk Workstation Mission Control.
 * Menggabungkan manajemen perangkat biometrik (Passkey/Face ID/Touch ID) dan manajemen sesi (Logout).
 * 
 * @param {WorkstationSettingsModalProps} props - Properti komponen.
 * @returns {React.ReactElement | null} Elemen JSX modal pengaturan atau null jika tidak dibuka.
 */
export function WorkstationSettingsModal({ auth, isOpen, onClose }: WorkstationSettingsModalProps) {
  const [newDeviceName, setNewDeviceName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  /**
   * Menangani proses pendaftaran passkey perangkat baru.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeviceName.trim()) return

    setIsRegistering(true)
    setErrorMessage(null)

    try {
      const ok = await auth.registerTouchId(newDeviceName.trim())
      if (ok) {
        setNewDeviceName('')
      } else {
        setErrorMessage(auth.errorMessage || 'Gagal mendaftarkan perangkat biometrik.')
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Terjadi kesalahan sistem saat registrasi.')
    } finally {
      setIsRegistering(false)
    }
  }

  /**
   * Menangani proses penghapusan perangkat biometrik dari daftar terdaftar.
   * 
   * @param {string} deviceId - ID kredensial perangkat yang akan dihapus.
   */
  const handleDelete = async (deviceId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus izin akses biometrik untuk perangkat ini?')) {
      await auth.removeDevice(deviceId)
    }
  }

  /**
   * Menangani aksi logout dari workstation.
   */
  const handleLogout = async () => {
    onClose()
    await auth.logout()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0d121d] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#111726]/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Pengaturan Workstation</h2>
              <p className="text-xs text-zinc-400">Keamanan biometrik dan manajemen sesi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Tutup Pengaturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Section: Biometrik & Passkey */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                Kunci Biometrik (Passkey)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Gunakan Touch ID Mac atau Face ID iPhone untuk akses instan tanpa PIN.
              </p>
            </div>

            {/* Form Tambah Perangkat */}
            <form onSubmit={handleRegister} className="space-y-3 bg-[#080b12] p-3.5 rounded-xl border border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-300 block">
                Daftarkan Perangkat Ini
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Misal: iPhone 15 Pro, Mac mini M4"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  disabled={isRegistering}
                  className="flex-1 bg-[#111726] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isRegistering || !newDeviceName.trim()}
                  className="inline-flex items-center justify-center px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-medium transition-colors gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isRegistering ? 'Memproses...' : 'Daftarkan'}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>

            {/* List Perangkat Terdaftar */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400">
                Perangkat Terdaftar ({auth.devices.length})
              </span>

              {auth.devices.length === 0 ? (
                <div className="p-4 bg-[#080b12] border border-zinc-800/60 rounded-xl text-center">
                  <p className="text-xs text-zinc-500">
                    Belum ada perangkat biometrik terdaftar. Anda dapat menambahkan perangkat ini di atas.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60 bg-[#080b12] border border-zinc-800/80 rounded-xl overflow-hidden">
                  {auth.devices.map((device: { id: string; name: string; createdAt: number }) => {
                    const isMobile = /iphone|ipad|android/i.test(device.name)
                    return (
                      <div key={device.id} className="flex items-center justify-between p-3 hover:bg-zinc-800/20 transition-colors">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300 shrink-0">
                            {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-medium text-zinc-200 truncate">{device.name}</p>
                            <p className="text-[10px] text-zinc-500">
                              Didaftarkan: {new Date(device.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors ml-2"
                          title="Hapus Perangkat"
                          aria-label="Hapus Perangkat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-zinc-800/80" />

          {/* Section: Sesi & Logout */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Sesi & Autentikasi
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kunci sesi workstation untuk menghentikan akses dashboard pada browser ini.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-800/50 rounded-xl text-xs font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Workstation (Logout)
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-[#111726]/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
