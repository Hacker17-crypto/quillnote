import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AiEvent, QuillApi } from '@shared/api'

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
    exportQuill: (id) => call('library:exportQuill', id),
    showInFolder: (id) => ipcRenderer.send('library:showInFolder', id),
    pickImport: (parentId, mode) => call('library:pickImport', parentId, mode),
    importPaths: (paths, parentId) => call('library:importPaths', paths, parentId),
    importFolder: (parentId, hint) => call('library:importFolder', parentId, hint)
  },
  pathForFile: (file) => webUtils.getPathForFile(file),
  claude: { status: () => call('claude:status') },
  doc: {
    writeAsset: (id, name, data) => call('doc:writeAsset', id, name, data),
    pickImages: (id) => call('doc:pickImages', id),
    addImageFromPath: (id, path) => call('doc:addImageFromPath', id, path),
    pickPdf: (id) => call('doc:pickPdf', id)
  },
  export: {
    pdf: (payload) => call('export:pdf', payload),
    print: (payload) => call('export:print', payload),
    images: (title, files) => call('export:images', title, files),
    markdown: (title, text) => call('export:markdown', title, text),
    showFile: (path) => ipcRenderer.send('export:showFile', path)
  },
  ai: {
    status: () => call('claude:status'),
    ask: (req) => call('ai:ask', req),
    cancel: (id) => ipcRenderer.send('ai:cancel', id),
    onEvent: (cb) => {
      const listener = (_: unknown, e: AiEvent): void => cb(e)
      ipcRenderer.on('ai:event', listener)
      return () => ipcRenderer.removeListener('ai:event', listener)
    }
  },
  elements: {
    get: () => call('elements:get'),
    set: (cols) => call('elements:set', cols)
  },
  app: {
    version: __APP_VERSION__,
    openExternal: (url) => ipcRenderer.send('app:openExternal', url),
    onBeforeClose: (cb) => {
      ipcRenderer.on('app:beforeClose', () => {
        void cb()
          .catch(() => undefined)
          .finally(() => ipcRenderer.send('app:flushed'))
      })
    }
  }
}

contextBridge.exposeInMainWorld('quill', api)
