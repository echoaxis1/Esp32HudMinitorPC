import { createServerFn } from '@tanstack/react-start'
import { execSync } from 'node:child_process'

export interface ProcessItem {
  pid: number
  user: string
  cpu: number
  mem: number
  command: string
  name: string
}

export const getSystemProcesses = createServerFn({ method: 'GET' })
  .handler(async (): Promise<ProcessItem[]> => {
    try {
      // Run ps command to get top processes
      const output = execSync('ps -A -o pid,user,%cpu,%mem,comm -r', { encoding: 'utf-8' })
      const lines = output.trim().split('\n').slice(1, 60) // Top 60 processes

      return lines.map(line => {
        const parts = line.trim().split(/\s+/)
        const pid = parseInt(parts[0], 10)
        const user = parts[1]
        const cpu = parseFloat(parts[2]) || 0
        const mem = parseFloat(parts[3]) || 0
        const command = parts.slice(4).join(' ')
        const name = command.split('/').pop() || command

        return {
          pid,
          user,
          cpu,
          mem,
          command,
          name,
        }
      })
    } catch {
      return []
    }
  })
