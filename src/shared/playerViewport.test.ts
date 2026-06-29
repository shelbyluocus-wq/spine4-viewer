import { describe, expect, it, vi } from 'vitest'

import {
  createAnchorLockedViewport,
  createCocosLikeViewport,
  getPlayerCanvasSize,
  installFixedViewport,
  setAnimationPreservingViewport,
} from './playerViewport'

describe('createCocosLikeViewport', () => {
  it('keeps the viewport size tied to the stage size instead of auto-fitting the skeleton', () => {
    expect(
      createCocosLikeViewport(
        {
          x: -40,
          y: -20,
          width: 80,
          height: 160,
        },
        {
          width: 640,
          height: 480,
        },
      ),
    ).toEqual({
      x: -320,
      y: -180,
      width: 640,
      height: 480,
    })
  })
})

describe('createAnchorLockedViewport', () => {
  it('keeps the character origin pinned to the same old-viewer screen anchor after resize', () => {
    const viewport = createAnchorLockedViewport({
      width: 640,
      height: 480,
    })

    expect(viewport.x).toBe(-320)
    expect(viewport.y).toBeCloseTo(-107.333333, 5)
    expect(viewport.width).toBe(640)
    expect(viewport.height).toBe(480)
  })

  it('uses preview scale as a real zoom multiplier without changing the locked anchor', () => {
    const viewport = createAnchorLockedViewport(
      {
        width: 640,
        height: 480,
      },
      2,
    )

    expect(viewport.x).toBe(-160)
    expect(viewport.y).toBeCloseTo(-53.666667, 5)
    expect(viewport.width).toBe(320)
    expect(viewport.height).toBe(240)
  })
})

describe('getPlayerCanvasSize', () => {
  it('prefers the rendered canvas size in css pixels', () => {
    const player = {
      dom: {
        getBoundingClientRect: () => ({ width: 900, height: 700 }),
      },
      canvas: {
        clientWidth: 720,
        clientHeight: 540,
        width: 1440,
        height: 1080,
      },
    }

    expect(getPlayerCanvasSize(player as never)).toEqual({
      width: 720,
      height: 540,
    })
  })
})

describe('installFixedViewport', () => {
  it('writes an explicit zero-padding viewport back to the player internals', () => {
    const player = {
      config: {
        viewport: {
          debugRender: true,
          transitionTime: 0.25,
          animations: { run: { padLeft: '10%' } },
        },
      },
    }

    installFixedViewport(player as never, {
      x: -120,
      y: -220,
      width: 720,
      height: 540,
    })

    expect(player.config.viewport).toEqual({
      debugRender: true,
      transitionTime: 0.25,
      animations: { run: { padLeft: '10%' } },
      x: -120,
      y: -220,
      width: 720,
      height: 540,
      padLeft: 0,
      padRight: 0,
      padTop: 0,
      padBottom: 0,
    })
    expect(player.currentViewport).toEqual({
      x: -120,
      y: -220,
      width: 720,
      height: 540,
      padLeft: 0,
      padRight: 0,
      padTop: 0,
      padBottom: 0,
    })
  })
})

describe('setAnimationPreservingViewport', () => {
  it('switches animations through animationState without asking the player to recalculate viewport', () => {
    const animation = { name: 'run' }
    const setAnimationWith = vi.fn()
    const player = {
      skeleton: {
        data: {
          findAnimation: vi.fn().mockReturnValue(animation),
        },
      },
      animationState: {
        setAnimationWith,
      },
      setAnimation: vi.fn(),
      config: {},
    }

    setAnimationPreservingViewport(player as never, 'run', false)

    expect(player.setAnimation).not.toHaveBeenCalled()
    expect(setAnimationWith).toHaveBeenCalledWith(0, animation, false)
    expect(player.config.animation).toBe('run')
  })
})
