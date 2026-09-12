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

function RootDocument({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext()
  const queryClient = context?.queryClient ?? defaultQueryClient

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#07090e] text-slate-100 overflow-hidden font-sans antialiased select-none">
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen w-screen overflow-hidden">
            {/* Ultra-Slim Icon Sidebar Matching Design Mockup */}
            <aside className="w-16 border-r border-[#151c28] bg-[#090d15] flex flex-col justify-between items-center py-4 shrink-0 z-20">
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
                    <span className="text-[9px] font-medium tracking-tight mt-0.5">AI Cockpit</span>
                  </Link>

                  <Link
                    to="/processes"
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all [&.active]:bg-cyan-500/15 [&.active]:text-cyan-400 [&.active]:border [&.active]:border-cyan-500/30"
                    title="Processes"
                  >
                    <Activity className="h-5 w-5" />
                    <span className="text-[9px] font-medium tracking-tight mt-0.5">Processes</span>
                  </Link>

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

              {/* Bottom Profile / Device Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-black ring-2 ring-slate-800">
                  <User className="h-4 w-4" />
                </div>
                <div className="w-9 h-7 rounded-lg bg-[#111723] border border-[#1b2536] flex items-center justify-center text-slate-400" title="Mac mini M4">
                  <HardDrive className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
            </aside>

            {/* Main Workstation Screen */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#07090e]">
              {children}
            </main>
          </div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
