export type AssetStatus = 'supported' | 'legacy' | 'broken'

export interface SpineAssetEntry {
  name: string
  directory: string
  pngPath: string | null
  atlasPath: string | null
  skelPath: string | null
  detectedVersion: string | null
  status: AssetStatus
  statusMessage: string
}

export interface ViewerState {
  selectedAsset: SpineAssetEntry | null
  selectedAnimation: string | null
  selectedSkin: string | null
  isPlaying: boolean
  isLooping: boolean
  timeScale: number
  previewScale: number
}

export interface SpinePlayerPayload {
  skeletonKey: string
  atlasKey: string
  rawDataURIs: Record<string, string>
}
