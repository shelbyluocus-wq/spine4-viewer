import { describe, expect, it } from 'vitest'

import { getPlayerBackgroundColor } from './previewLayout'

describe('getPlayerBackgroundColor', () => {
  it('uses transparent background to avoid a visible square stage', () => {
    expect(getPlayerBackgroundColor()).toBe('00000000')
  })
})
