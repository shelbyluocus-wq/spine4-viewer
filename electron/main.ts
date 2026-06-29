import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getWindowIconPath } from '../src/shared/iconPaths.js'
import { pickExistingPath } from '../src/shared/pathResolver.js'
import { createSpinePlayerPayload } from '../src/shared/spinePayload.js'
import { scanSpineRoot } from '../src/shared/resourceScanner.js'
import type { SpineAssetEntry } from '../src/shared/types.js'
import { getDefaultWindowSizing } from '../src/shared/windowSizing.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

async function createMainWindow(): Promise<void> {
  const { workAreaSize } = screen.getPrimaryDisplay()
  const windowSizing = getDefaultWindowSizing(workAreaSize)
  const window = new BrowserWindow({
    width: windowSizing.width,
    height: windowSizing.height,
    minWidth: windowSizing.minWidth,
    minHeight: windowSizing.minHeight,
    icon: getWindowIconPath({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
    }),
    backgroundColor: '#14070e',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDev) {
    await window.loadURL('http://127.0.0.1:5173')
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    await window.loadFile(path.resolve(__dirname, '..', '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  await createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers(): void {
  ipcMain.handle('viewer:getAppInfo', async () => {
    const root = await resolveDefaultSpineRoot()
    return {
      defaultSpineRoot: root.path,
      spineRootExists: root.exists,
      isPackaged: app.isPackaged,
    }
  })

  ipcMain.handle('viewer:scanAssets', async () => {
    const root = await resolveDefaultSpineRoot()
    if (!root.exists) {
      return {
        rootPath: root.path,
        entries: [],
        message: `未找到资源目录：${root.path}`,
      }
    }

    const entries = await scanSpineRoot(root.path)
    return {
      rootPath: root.path,
      entries,
      message: entries.length === 0 ? `目录中没有找到可识别的 Spine 资源：${root.path}` : '',
    }
  })

  ipcMain.handle('viewer:loadAsset', async (_event, entry: SpineAssetEntry) => {
    if (entry.status !== 'supported') {
      throw new Error(`资源 ${entry.name} 当前状态为 ${entry.status}，不能播放`)
    }

    return createSpinePlayerPayload(entry)
  })
}

async function resolveDefaultSpineRoot(): Promise<{ path: string; exists: boolean }> {
  const candidates = getDefaultSpineCandidates()
  const existing = await pickExistingPath(candidates, pathExists)

  if (existing) {
    return { path: existing, exists: true }
  }

  return { path: candidates[0], exists: false }
}

function getDefaultSpineCandidates(): string[] {
  if (app.isPackaged) {
    const executableDirectory = path.dirname(app.getPath('exe'))
    return [path.join(executableDirectory, 'spine')]
  }

  const appRoot = app.getAppPath()
  return [
    path.resolve(appRoot, '..', 'spine', 'spine'),
    path.resolve(appRoot, '..', 'hero'),
  ]
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}
