/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  Outlet,
  Link,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Activity, Cpu, Terminal, Sparkles, Layers } from 'lucide-react'
import * as React from 'react'
import appCss from '~/styles/app.css?url'

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
      { title: 'Mac Workstation Mission Control' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext()
  const queryClient = context?.queryClient ?? defaultQueryClient

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#080c14] text-slate-100 overflow-hidden font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen w-screen overflow-hidden">
            {/* Sidebar Nav */}
            <aside className="w-64 border-r border-slate-800/80 bg-[#0b101b]/90 backdrop-blur-md flex flex-col justify-between p-4 shrink-0">
              <div>
                <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800/60 mb-6">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-cyan-500/20">
                    M4
                  </div>
                  <div>
                    <div className="font-bold tracking-tight text-white flex items-center gap-2">
                      MISSION CONTROL
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/30">
                        HUD
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">Apple Silicon Workstation</div>
                  </div>
                </div>

                <nav className="space-y-1 font-medium text-sm">
                  <Link
                    to="/"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors [&.active]:bg-cyan-500/10 [&.active]:text-cyan-400 [&.active]:border [&.active]:border-cyan-500/30"
                  >
                    <Cpu className="h-4 w-4" />
                    <span>Overview & Telemetry</span>
                  </Link>

                  <Link
                    to="/processes"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors [&.active]:bg-cyan-500/10 [&.active]:text-cyan-400 [&.active]:border [&.active]:border-cyan-500/30"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity Monitor</span>
                  </Link>

                  <Link
                    to="/agy"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors [&.active]:bg-violet-500/10 [&.active]:text-violet-400 [&.active]:border [&.active]:border-violet-500/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Antigravity AI Pool</span>
                  </Link>

                  <div className="pt-4 pb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    Developer Tools
                  </div>

                  <div className="flex items-center gap-3 px-3 py-2 text-slate-500 cursor-not-allowed text-xs">
                    <Terminal className="h-4 w-4" />
                    <span>Port Inspector (Soon)</span>
                  </div>

                  <div className="flex items-center gap-3 px-3 py-2 text-slate-500 cursor-not-allowed text-xs">
                    <Layers className="h-4 w-4" />
                    <span>PM2 & Docker Services</span>
                  </div>
                </nav>
              </div>

              <div className="border-t border-slate-800/60 pt-4 px-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Bridge Daemon</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  PM2 ID: esp32hud (1.0s sync)
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
              {children}
            </main>
          </div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
