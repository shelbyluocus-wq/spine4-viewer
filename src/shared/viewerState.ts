import type { SpineAssetEntry } from './types.js'

const ANIMATION_PRIORITIES = ['stand', 'idle', 'run']
const SKIN_PRIORITIES = ['default']

export function pickInitialAsset(entries: SpineAssetEntry[]): SpineAssetEntry | null {
  return entries.find((entry) => entry.status === 'supported') ?? entries[0] ?? null
}

export function pickInitialAnimation(animationNames: string[]): string | null {
  return pickPreferredValue(animationNames, ANIMATION_PRIORITIES)
}

export function pickInitialSkin(skinNames: string[]): string | null {
  return pickPreferredValue(skinNames, SKIN_PRIORITIES)
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
