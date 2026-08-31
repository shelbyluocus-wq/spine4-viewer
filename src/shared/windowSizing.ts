export interface WorkAreaSize {
  width: number
  height: number
}

export interface WindowSizing {
  width: number
  height: number
  minWidth: number
  minHeight: number
}

export function getDefaultWindowSizing(workArea: WorkAreaSize): WindowSizing {
  const width = fitToWorkArea(workArea.width, 1680, 1280)
  const height = fitToWorkArea(workArea.height, 1000, 760)

  return {
    width,
    height,
    minWidth: Math.min(width, 1200),
    minHeight: Math.min(height, 720),
  }
}

function fitToWorkArea(available: number, preferred: number, minimum: number): number {
  if (available <= 0) {
    return preferred
  }

  if (available < minimum) {
    return available
  }

  return Math.min(available, preferred)
}
