import { describe, expect, it } from 'vitest'

import { buildAnimationListMarkup } from './animationListMarkup'

describe('buildAnimationListMarkup', () => {
  it('renders the old-player style animation list with each row showing its frame count', () => {
    const markup = buildAnimationListMarkup(
      [
        { name: 'stand', duration: 1, frames: 30 },
        { name: 'run', duration: 0.8, frames: 24 },
      ],
      'run',
    )

    expect(markup).toContain('data-animation-name="stand"')
    expect(markup).toContain('data-animation-name="run"')
    expect(markup).toContain('animation-row-name">stand<')
    expect(markup).toContain('animation-row-name">run<')
    expect(markup).toContain('animation-row-frames">30<')
    expect(markup).toContain('animation-row-frames">24<')
    expect(markup).toContain('animation-row is-selected')
  })

  it('falls back to an empty-state card when there are no animations', () => {
    expect(buildAnimationListMarkup([], null)).toContain('animation-empty')
  })
})
