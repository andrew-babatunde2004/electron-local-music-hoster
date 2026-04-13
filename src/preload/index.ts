import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-folder'),
  getMusicFiles: (
    folderPath: string
  ): Promise<{ id: string; title: string; artist: string; path: string }[]> =>
    ipcRenderer.invoke('fs:get-music-files', folderPath)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
