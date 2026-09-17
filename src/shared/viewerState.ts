import type { SpineAssetEntry } from './types.js'

const ANIMATION_PRIORITIES = ['stand', 'idle', 'run']
const SKIN_PRIORITIES = ['default']

export function pickInitialAsset(entries: SpineAssetEntry[]): SpineAssetEntry | null {
  return entries.find((entry) => entry.status === 'supported') ?? entries[0] ?? null
}

export function filterAssetEntries(entries: SpineAssetEntry[], query: string): SpineAssetEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return entries
  }

  return entries.filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedQuery))
}

export function pickInitialAnimation(animationNames: string[]): string | null {
  return pickPreferredValue(animationNames, ANIMATION_PRIORITIES)
}

export function pickInitialSkin(skinNames: string[]): string | null {
  return pickPreferredValue(skinNames, SKIN_PRIORITIES)
}

export interface RetainedViewerSettings {
  timeScale: number
  previewScale: number
  panX: number
  panY: number
}

export function retainViewerSettingsOnAssetSwitch(
  current: RetainedViewerSettings,
): RetainedViewerSettings {
  return {
    timeScale: current.timeScale,
    previewScale: current.previewScale,
    panX: 0,
    panY: 0,
  }
}

function pickPreferredValue(values: string[], priorities: string[]): string | null {
  for (const priority of priorities) {
    const match = values.find((value) => value.toLowerCase().includes(priority))
    if (match) {
      return match
    }
  }

  return values[0] ?? null
}
