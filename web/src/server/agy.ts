import { createServerFn } from '@tanstack/react-start'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)

export interface SwitchAccountResult {
  success: boolean
  message: string
  accountId: string
}

export interface SwitchAccountInput {
  accountId: string
  targetApp?: 'both' | 'standalone' | 'ide' | 'none'
}

export const switchAgyAccount = createServerFn({ method: 'POST' })
  .validator((input: SwitchAccountInput | string) => {
    if (typeof input === 'string') {
      return { accountId: input, targetApp: 'both' as const }
    }
    if (!input?.accountId || typeof input.accountId !== 'string') {
      throw new Error('Account ID is required')
    }
    return {
      accountId: input.accountId,
      targetApp: input.targetApp || ('both' as const),
    }
  })
  .handler(async ({ data }): Promise<SwitchAccountResult> => {
    const { accountId, targetApp } = data
    const projectRoot = path.resolve(process.cwd(), '..')
    let pythonBin = path.join(projectRoot, '.venv', 'bin', 'python3')
    if (!fs.existsSync(pythonBin)) {
      // Fallback if current working directory is already project root
      pythonBin = path.resolve(process.cwd(), '.venv', 'bin', 'python3')
    }

    const scriptPath = path.join(projectRoot, 'tools', 'switch_antigravity_account.py')
    const resolvedScript = fs.existsSync(scriptPath)
      ? scriptPath
      : path.resolve(process.cwd(), 'tools', 'switch_antigravity_account.py')

    try {
      const { stdout, stderr } = await execFileAsync(pythonBin, [resolvedScript, accountId, targetApp], {
        timeout: 15000,
      })

      console.log('[SWITCH SERVER FN]', stdout)
      if (stderr) console.error('[SWITCH SERVER FN STDERR]', stderr)

      return {
        success: true,
        message: 'Akun berhasil dialihkan ke macOS Keychain & Antigravity!',
        accountId,
      }
    } catch (err: any) {
      console.error('[SWITCH SERVER FN ERROR]', err)
      throw new Error(err.stderr || err.message || 'Gagal beralih akun')
    }
  })
