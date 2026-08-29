import { Physics } from '@esotericsoftware/spine-core'
import { describe, expect, it, vi } from 'vitest'

import {
  createAnchorLockedViewport,
  createCocosLikeViewport,
  createPannableViewport,
  getPlayerCanvasSize,
  installFixedViewport,
  panByPixels,
  resetSkeletonPhysics,
  setAnimationPreservingViewport,
  zoomAtScreenPoint,
} from './playerViewport'
import type { ViewState } from './playerViewport'

const CANVAS_SIZE = { width: 800, height: 600 }

function worldPointUnderScreenPoint(view: ViewState, screenPoint: { x: number; y: number }) {
  const viewport = createPannableViewport(CANVAS_SIZE, view)
  return {
    x: viewport.x + (screenPoint.x / CANVAS_SIZE.width) * viewport.width,
    y: viewport.y + (1 - screenPoint.y / CANVAS_SIZE.height) * viewport.height,
  }
}

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

describe('createPannableViewport', () => {
  it('offsets the anchor-locked viewport by the pan without changing its size', () => {
    const base = createAnchorLockedViewport(CANVAS_SIZE, 1)
    const viewport = createPannableViewport(CANVAS_SIZE, { scale: 1, panX: 40, panY: -25 })

    expect(viewport.x).toBe(base.x + 40)
    expect(viewport.y).toBe(base.y - 25)
    expect(viewport.width).toBe(base.width)
    expect(viewport.height).toBe(base.height)
  })
})

describe('zoomAtScreenPoint', () => {
  it('keeps the world point under the screen point fixed while zooming', () => {
    const view: ViewState = { scale: 1, panX: 0, panY: 0 }
    const screenPoint = { x: 260, y: 430 }
    const worldBefore = worldPointUnderScreenPoint(view, screenPoint)

    const next = zoomAtScreenPoint(CANVAS_SIZE, view, screenPoint, 2)
    const worldAfter = worldPointUnderScreenPoint(next, screenPoint)

    expect(next.scale).toBe(2)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6)
  })

  it('clamps the resulting scale to the supported range', () => {
    const view: ViewState = { scale: 1, panX: 0, panY: 0 }
    const screenPoint = { x: 400, y: 300 }

    expect(zoomAtScreenPoint(CANVAS_SIZE, view, screenPoint, 99).scale).toBe(2.5)
    expect(zoomAtScreenPoint(CANVAS_SIZE, view, screenPoint, 0.01).scale).toBe(0.5)
  })
})

describe('panByPixels', () => {
  it('moves the viewport opposite to the drag direction so content follows the pointer', () => {
    const view: ViewState = { scale: 1, panX: 0, panY: 0 }

    const draggedRight = panByPixels(CANVAS_SIZE, view, 100, 0)
    expect(draggedRight.panX).toBeCloseTo(-100, 6)

    const draggedDown = panByPixels(CANVAS_SIZE, view, 0, 50)
    expect(draggedDown.panY).toBeCloseTo(50, 6)
  })

  it('accounts for the current zoom level when converting pixels to world units', () => {
    const view: ViewState = { scale: 2, panX: 0, panY: 0 }

    const dragged = panByPixels(CANVAS_SIZE, view, 100, 0)
    expect(dragged.panX).toBeCloseTo(-50, 6)
  })
})

describe('resetSkeletonPhysics', () => {
  it('poses the skeleton with a physics reset', () => {
    const updateWorldTransform = vi.fn()
    const player = {
      skeleton: { updateWorldTransform },
    }

    resetSkeletonPhysics(player as never)

    expect(updateWorldTransform).toHaveBeenCalledWith(Physics.reset)
  })

  it('does nothing when the skeleton is not ready yet', () => {
    expect(() => resetSkeletonPhysics({ skeleton: null } as never)).not.toThrow()
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
    const updateWorldTransform = vi.fn()
    const player = {
      skeleton: {
        data: {
          findAnimation: vi.fn().mockReturnValue(animation),
        },
        updateWorldTransform,
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
    expect(updateWorldTransform).toHaveBeenCalledWith(Physics.reset)
  })
})
