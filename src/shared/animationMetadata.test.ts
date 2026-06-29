import { describe, expect, it } from 'vitest'

import {
  buildAnimationMetadata,
  findAnimationMetadata,
  getAnimationFrameCount,
} from './animationMetadata'

describe('getAnimationFrameCount', () => {
  it('matches the old viewer rule of duration multiplied by 30 fps and rounded', () => {
    expect(getAnimationFrameCount(0)).toBe(0)
    expect(getAnimationFrameCount(1)).toBe(30)
    expect(getAnimationFrameCount(0.333)).toBe(10)
  })
})

describe('buildAnimationMetadata', () => {
  it('keeps animation names while attaching the old-player frame count', () => {
    expect(
      buildAnimationMetadata([
        { name: 'stand', duration: 1 },
        { name: 'run', duration: 0.8 },
      ]),
    ).toEqual([
      { name: 'stand', duration: 1, frames: 30 },
      { name: 'run', duration: 0.8, frames: 24 },
    ])
  })
})

describe('findAnimationMetadata', () => {
  it('returns the selected animation metadata when the current name exists', () => {
    expect(
      findAnimationMetadata(
        [
          { name: 'stand', duration: 1, frames: 30 },
          { name: 'run', duration: 0.8, frames: 24 },
        ],
        'run',
      ),
    ).toEqual({
      name: 'run',
      duration: 0.8,
      frames: 24,
    })
  })
})
