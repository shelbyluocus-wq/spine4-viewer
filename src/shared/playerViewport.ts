import { Physics, Vector2 } from '@esotericsoftware/spine-core'
import type { Animation, Skeleton, TrackEntry } from '@esotericsoftware/spine-core'
import type { SpinePlayer } from '@esotericsoftware/spine-player'

export interface SkeletonBoundsRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FixedViewport {
  x: number
  y: number
  width: number
  height: number
}

const OLD_VIEWER_STAGE_WIDTH = 1440
const OLD_VIEWER_STAGE_HEIGHT = 720
const OLD_VIEWER_ANCHOR_X = 720
const OLD_VIEWER_ANCHOR_Y = 559

interface PlayerViewportConfig {
  x?: number
  y?: number
  width?: number
  height?: number
  padLeft?: string | number
  padRight?: string | number
  padTop?: string | number
  padBottom?: string | number
  debugRender?: boolean
  transitionTime?: number
  animations?: Record<string, unknown>
}

interface PlayerWithViewportInternals {
  config?: {
    animation?: string
    viewport?: PlayerViewportConfig
  }
  currentViewport?: {
    x: number
    y: number
    width: number
    height: number
    padLeft: number
    padRight: number
    padTop: number
    padBottom: number
  }
  previousViewport?: {
    x: number
    y: number
    width: number
    height: number
    padLeft: number
    padRight: number
    padTop: number
    padBottom: number
  } | null
  viewportTransitionStart?: number
}

export function measureSetupPoseBounds(skeleton: Skeleton): SkeletonBoundsRect {
  skeleton.setToSetupPose()
  skeleton.updateWorldTransform(Physics.update)

  const offset = new Vector2()
  const size = new Vector2()
  skeleton.getBounds(offset, size)

  return {
    x: offset.x,
    y: offset.y,
    width: Math.max(size.x, 1),
    height: Math.max(size.y, 1),
  }
}

export function createCocosLikeViewport(
  bounds: SkeletonBoundsRect,
  canvasSize: { width: number; height: number },
): FixedViewport {
  const width = Math.max(canvasSize.width, 1)
  const height = Math.max(canvasSize.height, 1)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

export const MIN_PREVIEW_SCALE = 0.5
export const MAX_PREVIEW_SCALE = 2.5

export interface ViewState {
  scale: number
  panX: number
  panY: number
}

export function clampPreviewScale(scale: number): number {
  return Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, scale))
}

export function createAnchorLockedViewport(
  canvasSize: { width: number; height: number },
  previewScale = 1,
): FixedViewport {
  const normalizedScale = Math.max(previewScale, 0.01)
  const width = Math.max(canvasSize.width / normalizedScale, 1)
  const height = Math.max(canvasSize.height / normalizedScale, 1)
  const anchorRatioX = OLD_VIEWER_ANCHOR_X / OLD_VIEWER_STAGE_WIDTH
  const anchorRatioY = OLD_VIEWER_ANCHOR_Y / OLD_VIEWER_STAGE_HEIGHT

  return {
    x: -width * anchorRatioX,
    y: -height * (1 - anchorRatioY),
    width,
    height,
  }
}

export function createPannableViewport(
  canvasSize: { width: number; height: number },
  view: ViewState,
): FixedViewport {
  const base = createAnchorLockedViewport(canvasSize, view.scale)

  return {
    x: base.x + view.panX,
    y: base.y + view.panY,
    width: base.width,
    height: base.height,
  }
}

export function zoomAtScreenPoint(
  canvasSize: { width: number; height: number },
  view: ViewState,
  screenPoint: { x: number; y: number },
  nextScale: number,
): ViewState {
  const scale = clampPreviewScale(nextScale)
  const canvasWidth = Math.max(canvasSize.width, 1)
  const canvasHeight = Math.max(canvasSize.height, 1)
  const normalizedX = screenPoint.x / canvasWidth
  const normalizedY = 1 - screenPoint.y / canvasHeight

  const current = createPannableViewport(canvasSize, view)
  const worldX = current.x + normalizedX * current.width
  const worldY = current.y + normalizedY * current.height

  const nextBase = createAnchorLockedViewport(canvasSize, scale)

  return {
    scale,
    panX: worldX - (nextBase.x + normalizedX * nextBase.width),
    panY: worldY - (nextBase.y + normalizedY * nextBase.height),
  }
}

export function panByPixels(
  canvasSize: { width: number; height: number },
  view: ViewState,
  dxPixels: number,
  dyPixels: number,
): ViewState {
  const viewport = createPannableViewport(canvasSize, view)
  const canvasWidth = Math.max(canvasSize.width, 1)
  const canvasHeight = Math.max(canvasSize.height, 1)

  return {
    ...view,
    panX: view.panX - (dxPixels * viewport.width) / canvasWidth,
    panY: view.panY + (dyPixels * viewport.height) / canvasHeight,
  }
}

export function resetSkeletonPhysics(player: SpinePlayer): void {
  if (!player.skeleton) {
    return
  }

  player.skeleton.updateWorldTransform(Physics.reset)
}

export function getPlayerCanvasSize(player: SpinePlayer): { width: number; height: number } {
  const canvas = player.canvas
  const host = player.dom
  const hostRect = host.getBoundingClientRect()

  if (canvas) {
    const width = Math.round(canvas.clientWidth || hostRect.width || canvas.width / getDevicePixelRatio())
    const height = Math.round(canvas.clientHeight || hostRect.height || canvas.height / getDevicePixelRatio())
    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    }
  }

  return {
    width: Math.max(Math.round(hostRect.width), 1),
    height: Math.max(Math.round(hostRect.height), 1),
  }
}

export function installFixedViewport(player: SpinePlayer, viewport: FixedViewport): void {
  const instance = player as unknown as PlayerWithViewportInternals
  const currentViewport = {
    ...viewport,
    padLeft: 0,
    padRight: 0,
    padTop: 0,
    padBottom: 0,
  }

  if (!instance.config) {
    instance.config = {}
  }

  instance.config.viewport = {
    ...(instance.config.viewport ?? {}),
    x: viewport.x,
    y: viewport.y,
    width: viewport.width,
    height: viewport.height,
    padLeft: 0,
    padRight: 0,
    padTop: 0,
    padBottom: 0,
  }
  instance.currentViewport = currentViewport
  instance.previousViewport = { ...currentViewport }
  instance.viewportTransitionStart = 0
}

export function setAnimationPreservingViewport(
  player: SpinePlayer,
  animationName: string,
  loop = true,
): TrackEntry {
  if (!player.skeleton || !player.animationState) {
    throw new Error('Spine player is not ready')
  }

  const animation = player.skeleton.data.findAnimation(animationName)
  if (!animation) {
    throw new Error(`Animation not found: ${animationName}`)
  }

  const instance = player as unknown as PlayerWithViewportInternals
  if (instance.config) {
    instance.config.animation = animation.name
  }

  const trackEntry = player.animationState.setAnimationWith(0, animation as Animation, loop)
  player.skeleton.updateWorldTransform(Physics.reset)

  return trackEntry
}

function getDevicePixelRatio(): number {
  if (typeof window !== 'undefined' && window.devicePixelRatio) {
    return window.devicePixelRatio
  }

  return 1
}
