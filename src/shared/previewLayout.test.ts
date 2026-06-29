import { describe, expect, it } from 'vitest'

import { getPlayerBackgroundColor, getPreviewLayoutStyle } from './previewLayout'

describe('getPreviewLayoutStyle', () => {
  it('keeps the default preview footprint at scale 1', () => {
    expect(getPreviewLayoutStyle(1)).toEqual({
      widthPercent: 72,
      heightPercent: 84,
    })
  })

  it('grows the preview footprint without using transform scaling', () => {
    expect(getPreviewLayoutStyle(1.5)).toEqual({
      widthPercent: 100,
      heightPercent: 100,
    })
  })

  it('clamps tiny scales to a readable minimum footprint', () => {
    expect(getPreviewLayoutStyle(0.5)).toEqual({
      widthPercent: 52,
      heightPercent: 64,
    })
  })
})

describe('getPlayerBackgroundColor', () => {
  it('uses transparent background to avoid a visible square stage', () => {
    expect(getPlayerBackgroundColor()).toBe('00000000')
  })
})
