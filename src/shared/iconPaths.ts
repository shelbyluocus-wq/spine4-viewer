import path from 'node:path'

export interface IconPathContext {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
}

export function getWindowIconPath(context: IconPathContext): string {
  if (context.isPackaged) {
    return path.join(context.resourcesPath, 'icon.ico')
  }

  return path.resolve(context.appPath, 'build-resources', 'icon.ico')
}
