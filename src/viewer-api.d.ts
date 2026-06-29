import type { SpineAssetEntry, SpinePlayerPayload } from './shared/types'

declare global {
  interface Window {
    viewer: {
      getAppInfo(): Promise<{
        defaultSpineRoot: string
        spineRootExists: boolean
        isPackaged: boolean
      }>
      scanAssets(): Promise<{
        rootPath: string
        entries: SpineAssetEntry[]
        message: string
      }>
      loadAsset(entry: SpineAssetEntry): Promise<SpinePlayerPayload>
    }
  }
}

export {}
