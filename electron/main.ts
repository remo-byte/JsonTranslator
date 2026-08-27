import { app, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'
import { registerIpcHandlers } from './ipc-handlers'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  const iconPath = path.join(app.getAppPath(), 'assets/icon.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0f1117',
    icon: appIcon.isEmpty() ? undefined : appIcon,
    webPreferences: {

      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'JSON Translator',
    show: false,
  })


  // Pencere hazır olunca göster (beyaz flash engellenir)
  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  registerIpcHandlers(win)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
