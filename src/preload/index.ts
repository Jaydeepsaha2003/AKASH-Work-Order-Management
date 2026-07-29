import { contextBridge, ipcRenderer } from 'electron'

const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', { username, password }),
    changePassword: (username: string, oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:changePassword', { username, oldPassword, newPassword })
  },
  wo: {
    list: () => ipcRenderer.invoke('wo:list'),
    names: () => ipcRenderer.invoke('wo:names'),
    create: (values: unknown) => ipcRenderer.invoke('wo:create', values),
    update: (values: unknown) => ipcRenderer.invoke('wo:update', values),
    remove: (id: number) => ipcRenderer.invoke('wo:delete', { id }),
    importExcel: (mode: 'append' | 'replace') =>
      ipcRenderer.invoke('wo:importExcel', { mode })
  },
  wom: {
    list: () => ipcRenderer.invoke('wom:list'),
    create: (values: unknown) => ipcRenderer.invoke('wom:create', values),
    update: (values: unknown) => ipcRenderer.invoke('wom:update', values),
    remove: (id: number) => ipcRenderer.invoke('wom:delete', { id }),
    importExcel: (mode: 'append' | 'replace') => ipcRenderer.invoke('wom:importExcel', { mode })
  },
  inv: {
    save: (values: unknown) => ipcRenderer.invoke('inv:save', values),
    update: (values: unknown) => ipcRenderer.invoke('inv:update', values)
  },
  ded: {
    list: () => ipcRenderer.invoke('ded:list'),
    save: (values: unknown) => ipcRenderer.invoke('ded:save', values),
    update: (values: unknown) => ipcRenderer.invoke('ded:update', values),
    remove: (id: number) => ipcRenderer.invoke('ded:delete', { id }),
    checkDup: (fin_year: string, work_order_no: string, invoice_no: string) =>
      ipcRenderer.invoke('ded:checkDup', { fin_year, work_order_no, invoice_no }),
    outstanding: () => ipcRenderer.invoke('ded:outstanding'),
    importExcel: (mode: 'append' | 'replace') => ipcRenderer.invoke('ded:importExcel', { mode })
  },
  excel: {
    export: (req: unknown) => ipcRenderer.invoke('excel:export', req),
    import: (mode: 'append' | 'replace') => ipcRenderer.invoke('excel:import', { mode })
  },
  file: {
    save: (req: { defaultName: string; base64: string }) => ipcRenderer.invoke('file:save', req)
  },
  attach: {
    upload: () => ipcRenderer.invoke('attach:upload'),
    sync: (input: {
      scope: string
      refKey: string
      files: { filename: string; originalName: string }[]
    }) => ipcRenderer.invoke('attach:sync', input),
    list: (input: { scope: string; refKey: string }) => ipcRenderer.invoke('attach:list', input),
    listScope: (input: { scope: string }) => ipcRenderer.invoke('attach:listScope', input),
    open: (filename: string) => ipcRenderer.invoke('attach:open', { filename })
  },
  update: {
    onStatus: (cb: (data: unknown) => void) => {
      const listener = (_e: unknown, data: unknown): void => cb(data)
      ipcRenderer.on('update:status', listener)
      return () => ipcRenderer.removeListener('update:status', listener)
    },
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install')
  },
  company: {
    list: () => ipcRenderer.invoke('company:list'),
    active: () => ipcRenderer.invoke('company:active'),
    create: (values: unknown) => ipcRenderer.invoke('company:create', values),
    update: (values: unknown) => ipcRenderer.invoke('company:update', values),
    remove: (id: number) => ipcRenderer.invoke('company:delete', { id }),
    setActive: (id: number) => ipcRenderer.invoke('company:setActive', { id })
  },
  session: {
    get: () => ipcRenderer.invoke('session:get'),
    set: (username: string) => ipcRenderer.invoke('session:set', { username }),
    clear: () => ipcRenderer.invoke('session:clear')
  },
  activity: {
    list: () => ipcRenderer.invoke('activity:list'),
    clear: () => ipcRenderer.invoke('activity:clear')
  },
  app: {
    version: () => ipcRenderer.invoke('app:version')
  },
  db: {
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: () => ipcRenderer.invoke('db:restore')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
