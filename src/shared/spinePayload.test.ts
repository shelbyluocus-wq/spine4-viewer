import { describe, expect, it } from 'vitest'
import path from 'node:path'

import type { SpineAssetEntry } from './types'
import { createSpinePlayerPayload } from './spinePayload'

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..')

describe('createSpinePlayerPayload', () => {
  it('turns a supported asset entry into raw data URIs for the player', async () => {
    const entry: SpineAssetEntry = {
      name: 'act_1001',
      directory: path.join(workspaceRoot, 'hero'),
      pngPath: path.join(workspaceRoot, 'hero', 'act_1001.png'),
      atlasPath: path.join(workspaceRoot, 'hero', 'act_1001.atlas'),
      skelPath: path.join(workspaceRoot, 'hero', 'act_1001.skel'),
      detectedVersion: '4.2.43',
      status: 'supported',
      statusMessage: 'Spine 4.2.43 可播放',
    }

    const payload = await createSpinePlayerPayload(entry)

    expect(payload.skeletonKey).toBe('act_1001.skel')
    expect(payload.atlasKey).toBe('act_1001.atlas')
    expect(payload.rawDataURIs['act_1001.skel']).toMatch(/^data:application\/octet-stream;base64,/)
    expect(payload.rawDataURIs['act_1001.atlas']).toMatch(/^data:text\/plain;base64,/)
    expect(payload.rawDataURIs['act_1001.png']).toMatch(/^data:image\/png;base64,/)
  })
})
