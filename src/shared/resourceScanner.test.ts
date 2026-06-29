import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { detectSpineVersion, scanSpineRoot } from './resourceScanner'

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..')

describe('detectSpineVersion', () => {
  it('detects Spine 4.2 assets from the current Hero samples', async () => {
    const filePath = path.join(workspaceRoot, 'hero', 'act_1001.skel')

    await expect(detectSpineVersion(filePath)).resolves.toBe('4.2.43')
  })

  it('detects Spine 3.8 assets from the legacy viewer samples', async () => {
    const filePath = path.join(workspaceRoot, 'spine', 'spine', 'act_1002.skel')

    await expect(detectSpineVersion(filePath)).resolves.toBe('3.8.99')
  })
})

describe('scanSpineRoot', () => {
  it('classifies supported, legacy, and broken assets in one pass', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'spine-viewer-scan-'))

    try {
      await writeFile(path.join(tempRoot, 'hero_ok.skel'), Buffer.from('4.2.43'))
      await writeFile(path.join(tempRoot, 'hero_ok.atlas'), 'hero_ok.png\nsize: 32,32\n')
      await writeFile(path.join(tempRoot, 'hero_ok.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))

      await writeFile(path.join(tempRoot, 'hero_old.skel'), Buffer.from('3.8.99'))
      await writeFile(path.join(tempRoot, 'hero_old.atlas'), 'hero_old.png\nsize: 32,32\n')
      await writeFile(path.join(tempRoot, 'hero_old.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))

      await writeFile(path.join(tempRoot, 'hero_broken.skel'), Buffer.from('4.2.43'))
      await writeFile(path.join(tempRoot, 'hero_broken.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))

      const entries = await scanSpineRoot(tempRoot)
      const statuses = Object.fromEntries(entries.map((entry) => [entry.name, entry]))

      expect(entries.map((entry) => entry.name)).toEqual(['hero_broken', 'hero_ok', 'hero_old'])
      expect(statuses.hero_ok.status).toBe('supported')
      expect(statuses.hero_ok.detectedVersion).toBe('4.2.43')
      expect(statuses.hero_old.status).toBe('legacy')
      expect(statuses.hero_old.statusMessage).toContain('旧版资源')
      expect(statuses.hero_broken.status).toBe('broken')
      expect(statuses.hero_broken.statusMessage).toContain('.atlas')
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  })
})
