import { GitBranch, GitCommit, GitPullRequest } from 'lucide-react'
import { GitRepoStatus } from '~/server/devtools'

interface GitStatusCardProps {
  git: GitRepoStatus
}

export function GitStatusCard({ git }: GitStatusCardProps) {
  return (
    <div className="bg-[#0c101a] border border-[#172030] rounded-2xl p-4 flex flex-col justify-between shadow-xl flex-1">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-cyan-400" /> Git Repo Status
          </h2>
          <GitCommit className="h-4 w-4 text-slate-500" />
        </div>

        <div className="space-y-1 font-mono text-xs my-2">
          <div className="text-slate-400">
            project: <span className="text-slate-200 font-bold">`{git.project}`</span>
          </div>
          <div className="text-slate-400">
            branch: <span className="text-cyan-400 font-semibold">`{git.branch}`</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
            <GitPullRequest className="h-3 w-3" />
            <span>Up to date with origin (Clean)</span>
          </div>
        </div>

        {/* Commit Timeline Graph from Mockup */}
        <div className="mt-4 pt-3 border-t border-[#162030]">
          <div className="text-[10px] font-mono text-slate-500 mb-2">Commit Branch Pipeline</div>
          <div className="flex items-center justify-between px-2 py-1 bg-[#080c14] rounded-xl border border-[#141c2b]">
            <span className="h-2 w-2 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
            <div className="h-0.5 flex-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-slate-700 mx-1" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <div className="h-0.5 flex-1 bg-slate-700 mx-1" />
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <div className="h-0.5 flex-1 bg-slate-700 mx-1" />
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#162030] flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span>Remote: origin/main</span>
        <span className="text-cyan-400">Synced</span>
      </div>
    </div>
  )
}
