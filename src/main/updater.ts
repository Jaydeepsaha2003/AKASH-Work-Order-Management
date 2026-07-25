import { app, ipcMain, BrowserWindow } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

// Broadcasts update lifecycle to the renderer and exposes check/install IPC.
export function initUpdater(getWin: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const send = (payload: Record<string, unknown>): void => {
    getWin()?.webContents.send('update:status', payload)
  }

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => send({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ state: 'none' }))
  autoUpdater.on('error', (err) => send({ state: 'error', message: String(err?.message || err) }))
  autoUpdater.on('download-progress', (p) =>
    send({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => send({ state: 'ready', version: info.version }))

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      return { ok: false, message: 'dev' }
    }
    try {
      const res = await autoUpdater.checkForUpdates()
      const latest = res?.updateInfo?.version
      const current = app.getVersion()
      const available = !!latest && latest !== current
      return { ok: true, available, version: latest ?? current, current }
    } catch (e) {
      return { ok: false, message: String((e as Error)?.message || e) }
    }
  })

  ipcMain.handle('update:install', () => {
    // quit and install the downloaded update
    setImmediate(() => autoUpdater.quitAndInstall())
    return { ok: true }
  })

  // Auto-check a few seconds after launch (packaged builds only)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 4000)
    // and re-check every 6 hours while running
    setInterval(
      () => {
        autoUpdater.checkForUpdates().catch(() => {})
      },
      6 * 60 * 60 * 1000
    )
  }
}
