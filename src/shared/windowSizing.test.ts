import { describe, expect, it } from 'vitest'

import { getDefaultWindowSizing } from './windowSizing'

describe('getDefaultWindowSizing', () => {
  it('uses the preferred desktop size when the display has enough room', () => {
    expect(getDefaultWindowSizing({ width: 1920, height: 1080 })).toEqual({
      width: 1540,
      height: 920,
      minWidth: 1200,
      minHeight: 720,
    })
  })

  it('clamps the default size to the actual work area on smaller displays', () => {
    expect(getDefaultWindowSizing({ width: 1536, height: 824 })).toEqual({
      width: 1536,
      height: 824,
      minWidth: 1200,
      minHeight: 720,
    })
  })

  it('never asks for a minimum size larger than the available work area', () => {
    expect(getDefaultWindowSizing({ width: 1180, height: 700 })).toEqual({
      width: 1180,
      height: 700,
      minWidth: 1180,
      minHeight: 700,
    })
  })
})
