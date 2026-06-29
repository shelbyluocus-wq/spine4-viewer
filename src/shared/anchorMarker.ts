export interface WorldPoint {
  x: number
  y: number
}

export interface ViewportRect {
  x: number
  y: number
  width: number
  height: number
}

export interface StageRect {
  left: number
  top: number
  width: number
  height: number
}

export interface AnchorMarkerPosition {
  left: number
  top: number
  visible: boolean
}

export function projectWorldPointToStage(
  point: WorldPoint,
  viewport: ViewportRect,
  playerRect: StageRect,
  stageRect: Pick<StageRect, 'left' | 'top'>,
): AnchorMarkerPosition {
  if (
    viewport.width <= 0
    || viewport.height <= 0
    || playerRect.width <= 0
    || playerRect.height <= 0
  ) {
    return {
      left: 0,
      top: 0,
      visible: false,
    }
  }

  const normalizedX = (point.x - viewport.x) / viewport.width
  const normalizedY = (point.y - viewport.y) / viewport.height

  return {
    left: playerRect.left - stageRect.left + normalizedX * playerRect.width,
    top: playerRect.top - stageRect.top + (1 - normalizedY) * playerRect.height,
    visible: true,
  }
}
