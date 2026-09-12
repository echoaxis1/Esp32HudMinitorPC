import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSystemProcesses, ProcessItem } from '~/server/processes'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useMemo } from 'react'
import { Activity, Search, RefreshCw, ArrowUpDown } from 'lucide-react'

export const Route = createFileRoute('/processes')({
  loader: async () => {
    return await getSystemProcesses()
  },
  component: ProcessesPage,
})

function ProcessesPage() {
  const initialData = Route.useLoaderData()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'cpu', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const { data = initialData, refetch, isFetching } = useQuery<ProcessItem[]>({
    queryKey: ['system-processes'],
    queryFn: () => getSystemProcesses(),
    refetchInterval: 3000,
    initialData,
  })

  const columns = useMemo<ColumnDef<ProcessItem>[]>(
    () => [
      {
        accessorKey: 'pid',
        header: 'PID',
        cell: info => <span className="font-mono text-xs text-slate-400">{info.getValue<number>()}</span>,
        size: 80,
      },
      {
        accessorKey: 'name',
        header: 'Process Name',
        cell: info => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200 text-xs truncate max-w-[240px]">
              {info.getValue<string>()}
            </span>
          </div>
        ),
        size: 260,
      },
      {
        accessorKey: 'user',
        header: 'User',
        cell: info => <span className="font-mono text-xs text-slate-400">{info.getValue<string>()}</span>,
        size: 100,
      },
      {
        accessorKey: 'cpu',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 font-mono hover:text-white"
          >
            CPU %
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: info => {
          const val = info.getValue<number>()
          return (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={`font-bold ${val > 20 ? 'text-rose-400' : val > 5 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {val.toFixed(1)}%
              </span>
            </div>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'mem',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 font-mono hover:text-white"
          >
            RAM %
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: info => {
          const val = info.getValue<number>()
          return (
            <span className="font-mono text-xs text-slate-300">
              {val.toFixed(1)}%
            </span>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'command',
        header: 'Command Path',
        cell: info => (
          <span className="font-mono text-[11px] text-slate-500 truncate block max-w-sm" title={info.getValue<string>()}>
            {info.getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const { rows } = table.getRowModel()
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* Header & Search */}
      <div className="flex items-center justify-between bg-[#0e1422]/70 backdrop-blur-md border border-slate-800/80 px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-cyan-400" />
          <div>
            <h1 className="text-base font-bold text-white">macOS Activity Monitor</h1>
            <p className="text-xs text-slate-400 font-mono">
              Powered by TanStack Table & TanStack Virtual ({rows.length} processes)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search process, pid..."
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-64"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors"
            title="Refresh Processes"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Container */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-2xl border border-slate-800/80 bg-[#0e1422]/90 backdrop-blur-md shadow-xl"
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0b101b] border-b border-slate-800 text-xs font-mono text-slate-400">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-3 font-semibold" style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            className="relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index]
              return (
                <tr
                  key={row.id}
                  className="absolute w-full flex items-center border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-3 overflow-hidden text-ellipsis" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
