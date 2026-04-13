import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma']

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161616',
      symbolColor: '#ffffff',
      height: 40
    },
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // Allow loading local file:// URLs for audio
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Open a native folder picker and return the selected path
  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Music Folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Scan a folder for audio files and return metadata
  ipcMain.handle('fs:get-music-files', async (_, folderPath: string) => {
    try {
      const files = readdirSync(folderPath)
      const musicFiles = files
        .filter((file) => AUDIO_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext)))
        .map((file, index) => {
          const nameWithoutExt = file.replace(/\.[^/.]+$/, '')
          let title = nameWithoutExt
          let artist = 'Unknown Artist'

          // Parse common "Artist - Title" filename pattern
          const dashIndex = nameWithoutExt.indexOf(' - ')
          if (dashIndex !== -1) {
            artist = nameWithoutExt.substring(0, dashIndex).trim()
            title = nameWithoutExt.substring(dashIndex + 3).trim()
          }

          // Normalize path separators for file:// URL usage
          const normalizedPath = join(folderPath, file).replace(/\\/g, '/')

          return { id: String(index), title, artist, path: normalizedPath }
        })
      return musicFiles
    } catch (error) {
      console.error('Error reading music files:', error)
      return []
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
