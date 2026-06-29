import { describe, expect, it } from 'vitest'

import { pickExistingPath } from './pathResolver'

describe('pickExistingPath', () => {
  it('returns the first existing candidate path', async () => {
    const result = await pickExistingPath(
      ['E:/missing', 'E:/hero', 'E:/fallback'],
      async (candidate) => candidate === 'E:/hero' || candidate === 'E:/fallback',
    )

    expect(result).toBe('E:/hero')
  })

  it('returns null when nothing exists', async () => {
    const result = await pickExistingPath(['E:/missing'], async () => false)

    expect(result).toBeNull()
  })
})
