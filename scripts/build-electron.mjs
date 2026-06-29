import { cp, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'

await rm(new URL('../dist-electron', import.meta.url), { recursive: true, force: true })
await run('npx', ['tsc', '-p', 'tsconfig.electron.json'])
await cp(
  new URL('../electron/preload.cjs', import.meta.url),
  new URL('../dist-electron/electron/preload.cjs', import.meta.url),
)

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: new URL('..', import.meta.url),
      shell: true,
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}
