import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { QuillApi } from '@shared/api'

const call = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

const api: QuillApi = {
  platform: process.platform as QuillApi['platform'],
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggleMaximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => call('win:isMaximized'),
    onMaximizedChange: (cb) => {
      const listener = (_: unknown, v: boolean): void => cb(v)
      ipcRenderer.on('win:maximized', listener)
      return () => ipcRenderer.removeListener('win:maximized', listener)
    }
  },
  settings: {
    get: () => call('settings:get'),
    set: (patch) => call('settings:set', patch),
    pickLibraryFolder: () => call('settings:pickLibraryFolder')
  },
  library: {
    list: () => call('library:list'),
    createDoc: (opts) => call('library:createDoc', opts),
    createFolder: (title, parentId) => call('library:createFolder', title, parentId),
    rename: (id, title) => call('library:rename', id, title),
    duplicate: (ids) => call('library:duplicate', ids),
    move: (ids, parentId) => call('library:move', ids, parentId),
    trash: (ids) => call('library:trash', ids),
    restore: (ids) => call('library:restore', ids),
    deleteForever: (ids) => call('library:deleteForever', ids),
    emptyTrash: () => call('library:emptyTrash'),
    setFavorite: (ids, fav) => call('library:setFavorite', ids, fav),
    setCover: (id, cover) => call('library:setCover', id, cover),
    readDoc: (id) => call('library:readDoc', id),
    saveDoc: (doc) => call('library:saveDoc', doc),
    exportPdf: (id) => call('library:exportPdf', id),
    exportQuill: (id) => call('library:exportQuill', id),
    showInFolder: (id) => ipcRenderer.send('library:showInFolder', id),
    pickImport: (parentId, mode) => call('library:pickImport', parentId, mode),
    importPaths: (paths, parentId) => call('library:importPaths', paths, parentId),
    importFolder: (parentId, hint) => call('library:importFolder', parentId, hint)
  },
  pathForFile: (file) => webUtils.getPathForFile(file),
  claude: { status: () => call('claude:status') },
  app: {
    version: '0.2.0',
    openExternal: (url) => ipcRenderer.send('app:openExternal', url)
  }
}

contextBridge.exposeInMainWorld('quill', api)
