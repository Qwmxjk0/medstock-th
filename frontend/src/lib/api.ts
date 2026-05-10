// Wails runtime bindings — all functions return promises
// These match the exported Go methods on the App struct

// We use dynamic import to avoid errors during Vite dev preview without Wails runtime
const wails = () => (window as any).go?.main?.App

async function call<T>(method: string, ...args: unknown[]): Promise<T> {
  const app = wails()
  if (!app || !app[method]) {
    throw new Error(`Wails method not available: ${method}`)
  }
  return app[method](...args)
}

// ─── Master Data ─────────────────────────────────────────────────────────────
export const api = {
  // Units
  getUnits: (activeOnly = true) => call('GetUnits', activeOnly),
  saveUnit: (u: object, adminID: number) => call('SaveUnit', u, adminID),
  deactivateUnit: (id: number, userID: number) => call('DeactivateUnit', id, userID),

  // Departments
  getDepartments: (activeOnly = true) => call('GetDepartments', activeOnly),
  saveDepartment: (d: object, adminID: number) => call('SaveDepartment', d, adminID),
  deactivateDepartment: (id: number, userID: number) => call('DeactivateDepartment', id, userID),

  // Suppliers
  getSuppliers: (activeOnly = true) => call('GetSuppliers', activeOnly),
  saveSupplier: (s: object, adminID: number) => call('SaveSupplier', s, adminID),
  deactivateSupplier: (id: number, userID: number) => call('DeactivateSupplier', id, userID),

  // Categories
  getCategories: (activeOnly = true) => call('GetCategories', activeOnly),
  saveCategory: (c: object, adminID: number) => call('SaveCategory', c, adminID),
  deactivateCategory: (id: number, userID: number) => call('DeactivateCategory', id, userID),

  // Users
  getUsers: () => call('GetUsers'),
  saveUser: (u: object, adminID: number) => call('SaveUser', u, adminID),
  deactivateUser: (id: number, adminID: number) => call('DeactivateUser', id, adminID),
  activateUser: (id: number, adminID: number) => call('ActivateUser', id, adminID),
  updateUserLastSelected: (id: number) => call('UpdateUserLastSelected', id),

  // Auth
  login: (username: string, password: string) => call('Login', username, password),
  verifyPassword: (userID: number, password: string) => call('VerifyPassword', userID, password),
  setPassword: (userID: number, oldPassword: string, newPassword: string) => call('SetPassword', userID, oldPassword, newPassword),
  resetPassword: (adminID: number, targetUserID: number, newPassword: string) => call('ResetPassword', adminID, targetUserID, newPassword),
  createUser: (adminID: number, u: object, initialPassword: string) => call('CreateUser', adminID, u, initialPassword),
  getLoginableUsers: () => call('GetLoginableUsers'),
  userMustChangePassword: (userID: number) => call('UserMustChangePassword', userID),

  // Products
  getProducts: (search = '', activeOnly = false) => call('GetProducts', search, activeOnly),
  getProductByID: (id: number) => call('GetProductByID', id),
  createProduct: (req: object, userID: number) => call('CreateProduct', req, userID),
  updateProduct: (id: number, req: object, userID: number) => call('UpdateProduct', id, req, userID),
  deactivateProduct: (id: number, userID: number) => call('DeactivateProduct', id, userID),
  checkDuplicateName: (name: string, excludeID = 0) => call('CheckDuplicateName', name, excludeID),
  getProductAliases: (productID: number) => call('GetProductAliases', productID),
  saveProductAlias: (a: object, userID: number) => call('SaveProductAlias', a, userID),

  // Documents
  getDocuments: (f: object) => call('GetDocuments', f),
  getDocumentByID: (id: number) => call('GetDocumentByID', id),
  createDraft: (req: object) => call('CreateDraft', req),
  updateDraft: (id: number, req: object) => call('UpdateDraft', id, req),
  addDocumentItem: (docID: number, item: object, userID: number) => call('AddDocumentItem', docID, item, userID),
  removeDocumentItem: (itemID: number, userID: number) => call('RemoveDocumentItem', itemID, userID),
  confirmStockIn: (docID: number, userID: number) => call('ConfirmStockIn', docID, userID),
  confirmStockOut: (docID: number, userID: number) => call('ConfirmStockOut', docID, userID),
  cancelDocument: (docID: number, reason: string, userID: number) => call('CancelDocument', docID, reason, userID),

  // FEFO / Adjustment
  getFEFOLots: (productID: number, qty: number) => call('GetFEFOLots', productID, qty),
  createAdjustment: (req: object) => call('CreateAdjustment', req),

  // Stock Lots & Card
  getStockLots: (productID: number) => call('GetStockLots', productID),
  getCurrentStock: (productID: number) => call('GetCurrentStock', productID),
  getStockCard: (productID: number, dateFrom: string, dateTo: string) => call('GetStockCard', productID, dateFrom, dateTo),

  // Dashboard
  getDashboardSummary: () => call('GetDashboardSummary'),
  getLowStockAlerts: () => call('GetLowStockAlerts'),
  getNearExpiryAlerts: (daysAhead = 30) => call('GetNearExpiryAlerts', daysAhead),
  getMovementChart: (days = 30) => call('GetMovementChart', days),

  // Startup
  initialize: () => call<void>('Initialize'),

  // Dialogs
  openFileDialog: () => call<string>('OpenFileDialog'),
  openBackupFileDialog: () => call<string>('OpenBackupFileDialog'),
  saveFileDialog: (defaultFilename: string) => call<string>('SaveFileDialog', defaultFilename),
  saveBackupFileDialog: (defaultFilename: string) => call<string>('SaveBackupFileDialog', defaultFilename),
  previewProductsImport: (filePath: string) => call<any>('PreviewProductsImport', filePath),
  importProducts: (filePath: string, partial: boolean, userID: number) =>
    call<any>('ImportProducts', filePath, partial, userID),
  previewStockImport: (filePath: string) => call<any>('PreviewStockImport', filePath),
  importOpeningStock: (filePath: string, partial: boolean, userID: number) =>
    call<any>('ImportOpeningStock', filePath, partial, userID),

  // Export
  exportInventory: (destDir = '') => call('ExportInventory', destDir),
  exportStockCard: (productID: number, productName: string, dateFrom: string, dateTo: string, destDir = '') =>
    call('ExportStockCard', productID, productName, dateFrom, dateTo, destDir),
  exportDocuments: (docType: string, dateFrom: string, dateTo: string, destDir = '') =>
    call('ExportDocuments', docType, dateFrom, dateTo, destDir),
  backupDatabase: (destPath: string, adminID: number) => call('BackupDatabase', destPath, adminID),
  restoreDatabase: (sourcePath: string, adminID: number) => call('RestoreDatabase', sourcePath, adminID),
}
