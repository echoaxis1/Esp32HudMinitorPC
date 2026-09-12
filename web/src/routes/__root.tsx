/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  Outlet,
  Link,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LayoutGrid, Bot, Activity, Terminal, Settings, User, HardDrive } from 'lucide-react'
import * as React from 'react'
import appCss from '~/styles/app.css?url'
import { useTouchIdAuth } from '~/hooks/useTouchIdAuth'
import { WorkstationLockscreen } from '~/components/auth/WorkstationLockscreen'
import { WorkstationSettingsModal } from '~/components/settings/WorkstationSettingsModal'

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
  const { isAuthenticated, isLoading } = auth
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

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
            /* Lock Screen Interseptor: Menghalangi seluruh dashboard jika belum lolos autentikasi */
            <WorkstationLockscreen auth={auth} />
          ) : (
            /* Layout Workstation Utama dengan Sidebar Navigasi */
            <div className="flex h-screen w-screen overflow-hidden bg-[#07090e]">
              {/* Desktop Sidebar (hanya tampil di layar md ke atas) */}
              <aside className="hidden md:flex w-16 flex-col items-center justify-between py-4 border-r border-[#151c28] bg-[#090d15] shrink-0 z-30">
                {/* Brand Logo Workstation */}
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 font-black text-sm tracking-widest shadow-lg shadow-cyan-950/40">
                    M4
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex flex-col gap-3">
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
                      title="AI Agent Cockpit"
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
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800/40 transition-all"
                      title="Pengaturan Workstation"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">Settings</span>
                    </button>

                    <div
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-600 cursor-not-allowed"
                      title="DevTools"
                    >
                      <Terminal className="h-5 w-5" />
                      <span className="text-[9px] font-medium tracking-tight mt-0.5">DevTools</span>
                    </div>
                  </nav>
                </div>

                {/* Bottom Profile & Hardware Icon */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-black ring-2 ring-slate-800 hover:ring-cyan-400 transition-all cursor-pointer"
                    title="Pengaturan Akun & Biometrik"
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
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-indigo-400"
                  title="Pengaturan"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-[9px] mt-1 font-medium">Settings</span>
                </button>
              </nav>

              {/* Main Workstation Screen */}
              <main className="flex-1 flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-[#07090e] min-w-0">
                {children}
              </main>

              {/* Modal Pengaturan Terpadu (Biometrik Passkey & Logout) */}
              <WorkstationSettingsModal
                auth={auth}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
              />
            </div>
          )}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
