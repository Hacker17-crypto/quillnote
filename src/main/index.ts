import { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } from 'electron'
import { join, normalize, sep } from 'path'
import { pathToFileURL } from 'url'
import { createContext, registerIpc, type MainContext } from './ipc'
import { loadSettings } from './settings'
import { LibraryStorage } from './storage'

if (process.env.QN_USERDATA) app.setPath('userData', process.env.QN_USERDATA)

// quill-asset://<docId>/<file> serves files from a document's assets/ folder.
protocol.registerSchemesAsPrivileged([
  { scheme: 'quill-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: false } }
])

const isMac = process.platform === 'darwin'
let mainWindow: BrowserWindow | null = null
let ctx: MainContext

function createWindow(): void {
  const [w, h] = (process.env.QN_SIZE ?? '1280x800').split('x').map(Number)
  mainWindow = new BrowserWindow({
    width: w,
    height: h,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Quillnote',
    backgroundColor: '#1E1B1B',
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 16, y: 12 } : undefined,
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })
  const win = mainWindow
  win.once('ready-to-show', () => win.show())
  // Give the renderer a moment to flush unsaved edits before the window goes away.
  let closing = false
  win.on('close', (e) => {
    if (closing || win.webContents.isCrashed()) return
    e.preventDefault()
    closing = true
    const done = (): void => {
      clearTimeout(timer)
      ipcMain.removeListener('app:flushed', onFlushed)
      if (!win.isDestroyed()) win.destroy()
    }
    const onFlushed = (ev: Electron.IpcMainEvent): void => {
      if (ev.sender === win.webContents) done()
    }
    const timer = setTimeout(done, 4000)
    ipcMain.on('app:flushed', onFlushed)
    win.webContents.send('app:beforeClose')
  })
  win.on('maximize', () => win.webContents.send('win:maximized', true))
  win.on('unmaximize', () => win.webContents.send('win:maximized', false))
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // External links open in the OS browser; the app never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? 'about:blank')) e.preventDefault()
  })
  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools()
    })
  }

  const hash = process.env.QN_ROUTE ?? ''
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL + (hash ? `#${hash}` : ''))
  else win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
}

app.whenReady().then(async () => {
  if (!app.requestSingleInstanceLock() && !process.env.QN_USERDATA) {
    app.quit()
    return
  }
  if (!isMac) Menu.setApplicationMenu(null)

  const settings = await loadSettings()
  const storage = new LibraryStorage(settings.libraryRoot)
  await storage.init()
  ctx = createContext(storage, () => mainWindow)
  registerIpc(ctx)

  protocol.handle('quill-asset', async (req) => {
    const url = new URL(req.url)
    const id = url.hostname
    const file = decodeURIComponent(url.pathname.replace(/^\//, ''))
    try {
      const dir = normalize(ctx.storage.assetsDir(id))
      const full = normalize(join(dir, file))
      if (!full.startsWith(dir + sep)) return new Response('Forbidden', { status: 403 })
      // Readable from the renderer with fetch()/canvas (pdf.js, exports), so allow CORS.
      const res = await net.fetch(pathToFileURL(full).toString())
      const headers = new Headers(res.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      return new Response(res.body, { status: res.status, headers })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
