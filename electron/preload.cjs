const { contextBridge, ipcRenderer } = require('electron')

const viewerApi = {
  async getAppInfo() {
    return ipcRenderer.invoke('viewer:getAppInfo')
  },
  async scanAssets() {
    return ipcRenderer.invoke('viewer:scanAssets')
  },
  async loadAsset(entry) {
    return ipcRenderer.invoke('viewer:loadAsset', entry)
  },
}

contextBridge.exposeInMainWorld('viewer', viewerApi)
