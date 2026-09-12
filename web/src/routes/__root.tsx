/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  Outlet,
  Link,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LayoutGrid, Bot, Activity, Terminal, Settings, User, HardDrive, Lock, Fingerprint, Smartphone } from 'lucide-react'
import * as React from 'react'
import appCss from '~/styles/app.css?url'
import { useTouchIdAuth } from '~/hooks/useTouchIdAuth'
import { WorkstationLockscreen } from '~/components/auth/WorkstationLockscreen'
import { DeviceManagementModal } from '~/components/auth/DeviceManagementModal'

export interface RouterContext {
  queryClient: QueryClient
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Mac mini M4 Status - Workstation Dashboard' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

/**
 * Komponen dokumen utama aplikasi (Root Document) yang menyajikan
 * layout sidebar navigasi serta perlindungan sesi biometrik Touch ID / Master PIN.
 *
 * @param props Elemen anak yang akan dirender di dalam layout
 * @returns Struktur dokumen HTML lengkap dengan sidebar dan lockscreen guard
 */
function RootDocument({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext()
  const queryClient = context?.queryClient ?? defaultQueryClient
  const auth = useTouchIdAuth()
  const { isAuthenticated, isLoading, logout, refreshStatus } = auth
  const [isDeviceModalOpen, setIsDeviceModalOpen] = React.useState(false)

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#07090e] text-slate-100 overflow-hidden font-sans antialiased select-none">
        <QueryClientProvider client={queryClient}>
          {/* Gatekeeper: Jika status autentikasi sedang dimuat, tampilkan splash loader minimalis */}
          {isLoading ? (
            <div className="flex h-screen w-screen items-center justify-center bg-[#05070d] text-cyan-400 font-mono text-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <span className="text-xs text-slate-500 tracking-wider uppercase">Memverifikasi Sesi Workstation...</span>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <WorkstationLockscreen auth={auth} onUnlock={() => refreshStatus()} />
          ) : (
            <div className="flex h-screen w-screen overflow-hidden">
              {/* Ultra-Slim Icon Sidebar: Hidden atau bottom bar pada mobile, vertical aside pada md+ */}
              <aside className="hidden md:flex w-16 border-r border-[#151c28] bg-[#090d15] flex-col justify-between items-center py-4 shrink-0 z-20">
                <div className="flex flex-col items-center gap-6 w-full">
                  {/* Traffic Lights (macOS style dots) */}
                  <div className="flex gap-1.5 pt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex flex-col items-center gap-4 w-full px-2 pt-2">
                    <Link
                      to="/"
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all [&.active]:bg-cyan-500/15 [&.active]:text-cyan-400 [&.active]:border [&.active]:border-cyan-500/30"
                      title="Overview"
                    >
                      <LayoutGrid className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">Overview</span>
                    </Link>

                    <Link
                      to="/agy"
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all [&.active]:bg-violet-500/15 [&.active]:text-violet-400 [&.active]:border [&.active]:border-violet-500/30"
                      title="AI Cockpit"
                    >
                      <Bot className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">AI Pool</span>
                    </Link>

                    <Link
                      to="/processes"
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all [&.active]:bg-cyan-500/15 [&.active]:text-cyan-400 [&.active]:border [&.active]:border-cyan-500/30"
                      title="Processes"
                    >
                      <Activity className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">Process</span>
                    </Link>

                    <button
                      onClick={() => setIsDeviceModalOpen(true)}
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40 transition-all"
                      title="Kelola Biometrik (Face ID / Touch ID)"
                    >
                      <Fingerprint className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">Devices</span>
                    </button>

                    <div
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-600 cursor-not-allowed"
                      title="DevTools"
                    >
                      <Terminal className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">DevTools</span>
                    </div>

                    <div
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-600 cursor-not-allowed"
                      title="Settings"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">Settings</span>
                    </div>
                  </nav>
                </div>

                {/* Bottom Profile, Touch ID Status & Lock Action */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={logout}
                    className="w-10 h-10 rounded-xl bg-[#111723] hover:bg-rose-500/20 border border-[#1b2536] hover:border-rose-500/40 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all"
                    title="Kunci Workstation (Lock Screen)"
                  >
                    <Lock className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setIsDeviceModalOpen(true)}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-black ring-2 ring-slate-800 hover:ring-cyan-400 transition-all cursor-pointer"
                    title="Profil & Biometrik"
                  >
                    <User className="h-4 w-4" />
                  </button>

                  <div className="w-9 h-7 rounded-lg bg-[#111723] border border-[#1b2536] flex items-center justify-center text-slate-400" title="Mac mini M4">
                    <HardDrive className="h-4 w-4 text-cyan-400" />
                  </div>
                </div>
              </aside>

              {/* Mobile Bottom Navigation Bar */}
              <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[#151c28] bg-[#090d15]/95 backdrop-blur-md flex items-center justify-around px-2 z-40">
                <Link
                  to="/"
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-white [&.active]:text-cyan-400"
                >
                  <LayoutGrid className="h-5 w-5" />
                  <span className="text-[9px] mt-1 font-medium">Overview</span>
                </Link>
                <Link
                  to="/agy"
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-white [&.active]:text-violet-400"
                >
                  <Bot className="h-5 w-5" />
                  <span className="text-[9px] mt-1 font-medium">AI Cockpit</span>
                </Link>
                <Link
                  to="/processes"
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-white [&.active]:text-cyan-400"
                >
                  <Activity className="h-5 w-5" />
                  <span className="text-[9px] mt-1 font-medium">Processes</span>
                </Link>
                <button
                  onClick={() => setIsDeviceModalOpen(true)}
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400"
                  title="Daftarkan Face ID iPhone"
                >
                  <Fingerprint className="h-5 w-5 text-emerald-400" />
                  <span className="text-[9px] mt-1 font-medium text-emerald-400">Face ID</span>
                </button>
                <button
                  onClick={logout}
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-rose-400"
                  title="Kunci"
                >
                  <Lock className="h-5 w-5" />
                  <span className="text-[9px] mt-1 font-medium">Lock</span>
                </button>
              </nav>

              {/* Main Workstation Screen */}
              <main className="flex-1 flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-[#07090e] min-w-0">
                {children}
              </main>

              {/* Modal Pengelolaan Perangkat Biometrik (Face ID iPhone & Mac Touch ID) */}
              <DeviceManagementModal
                auth={auth}
                isOpen={isDeviceModalOpen}
                onClose={() => setIsDeviceModalOpen(false)}
              />
            </div>
          )}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
