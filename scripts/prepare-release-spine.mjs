import { mkdir, rm, stat } from 'node:fs/promises'

const releaseRoot = new URL('../release/', import.meta.url)
const targetDirectories = [
  new URL('./spine/', releaseRoot),
  new URL('./win-unpacked/spine/', releaseRoot),
]

for (const targetDirectory of targetDirectories) {
  await ensureDirectory(targetDirectory)
}

async function ensureDirectory(targetDirectory) {
  const filePath = targetDirectory.pathname

  try {
    const existing = await stat(targetDirectory)
    if (!existing.isDirectory()) {
      await rm(targetDirectory, { force: true, recursive: true })
    }
  } catch {
    // Missing path is fine; it will be created below.
  }

  await mkdir(targetDirectory, { recursive: true })
  console.log(`Prepared release spine folder: ${filePath}`)
}
