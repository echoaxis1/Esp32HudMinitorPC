import { DevServerItem } from '~/server/devtools'

interface DevServersPanelProps {
  servers: DevServerItem[]
}

export function DevServersPanel({ servers }: DevServersPanelProps) {
  return (
    <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl flex-1">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-tight">Project Activity</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {servers.length} Online
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-300 mb-3">Active Dev Servers</div>

        <div className="space-y-3">
          {servers.map((srv, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#080c14] border border-[#172030] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[#111827] border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                  {srv.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{srv.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[110px]">
                    {srv.url}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {srv.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Port Watcher: Active</span>
        <span className="text-cyan-400 cursor-pointer hover:underline">+ Add Tool</span>
      </div>
    </div>
  )
}
