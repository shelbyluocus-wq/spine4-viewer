export function getPreviewLayoutStyle(scale: number): { widthPercent: number; heightPercent: number } {
  const normalizedScale = Math.max(0.5, Math.min(1.5, scale))
  const widthPercent = Math.round(clamp(72 + (normalizedScale - 1) * 56, 52, 100))
  const heightPercent = Math.round(clamp(84 + (normalizedScale - 1) * 40, 64, 100))

  return {
    widthPercent,
    heightPercent,
  }
}

export function getPlayerBackgroundColor(): string {
  return '00000000'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
