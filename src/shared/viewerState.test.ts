import { describe, expect, it } from 'vitest'

import type { SpineAssetEntry } from './types'
import { pickInitialAnimation, pickInitialAsset, pickInitialSkin } from './viewerState'

const supportedEntry = (name: string): SpineAssetEntry => ({
  name,
  directory: 'E:/project/spine',
  pngPath: `${name}.png`,
  atlasPath: `${name}.atlas`,
  skelPath: `${name}.skel`,
  detectedVersion: '4.2.43',
  status: 'supported',
  statusMessage: 'ok',
})

const legacyEntry = (name: string): SpineAssetEntry => ({
  ...supportedEntry(name),
  status: 'legacy',
  statusMessage: 'legacy',
})

describe('pickInitialAsset', () => {
  it('prefers the first supported asset', () => {
    const result = pickInitialAsset([legacyEntry('old'), supportedEntry('new')])

    expect(result?.name).toBe('new')
  })

  it('falls back to the first entry if nothing is supported', () => {
    const result = pickInitialAsset([legacyEntry('old')])

    expect(result?.name).toBe('old')
  })
})

describe('pickInitialAnimation', () => {
  it('prefers idle-like animations when available', () => {
    expect(pickInitialAnimation(['attack', 'stand', 'run'])).toBe('stand')
    expect(pickInitialAnimation(['skill_01', 'idle_a'])).toBe('idle_a')
  })

  it('falls back to the first animation when no preferred one exists', () => {
    expect(pickInitialAnimation(['attack', 'skill'])).toBe('attack')
    expect(pickInitialAnimation([])).toBeNull()
  })
})

describe('pickInitialSkin', () => {
  it('uses the default skin when present', () => {
    expect(pickInitialSkin(['weapon', 'default', 'red'])).toBe('default')
  })

  it('falls back to the first skin', () => {
    expect(pickInitialSkin(['red', 'blue'])).toBe('red')
    expect(pickInitialSkin([])).toBeNull()
  })
})
