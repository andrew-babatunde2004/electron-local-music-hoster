import { ElectronAPI } from '@electron-toolkit/preload'

interface MusicFile {
  id: string
  title: string
  artist: string
  path: string
}

interface Api {
  openFolder: () => Promise<string | null>
  getMusicFiles: (folderPath: string) => Promise<MusicFile[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
