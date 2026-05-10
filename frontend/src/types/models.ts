export interface Unit {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: number
  name: string
  contact: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductCategory {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  username: string
  displayName: string
  isSystemAccount: boolean
  role: 'admin' | 'staff' | 'viewer'
  isActive: boolean
  lockedAt: string
  lastSelectedAt: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  code: string
  name: string
  categoryId: number | null
  categoryName: string
  baseUnitId: number
  baseUnitName: string
  defaultPurchaseUnitId: number | null
  defaultIssueUnitId: number | null
  packageSize: number
  reorderLevel: number
  defaultPrice: number
  isActive: boolean
  currentStock: number
  hasNearExpiry: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductAlias {
  id: number
  productId: number
  alias: string
  aliasType: string
  isActive: boolean
}

export interface StockLot {
  id: number
  productId: number
  productCode: string
  productName: string
  lotNo: string
  expireDate: string
  quantityOnHand: number
  unitCost: number
  supplierId: number | null
  supplierName: string
  createdAt: string
  updatedAt: string
}

export interface StockDocumentItem {
  id: number
  documentId: number
  productId: number
  productCode: string
  productName: string
  unitName: string
  lotId: number | null
  lotNo: string
  expireDate: string
  quantity: number
  requestedQty: number
  approvedQty: number
  issuedQty: number
  unitCost: number
  rejectReason: string
  note: string
}

export interface StockDocument {
  id: number
  documentNo: string
  referenceNo: string
  documentType: 'IN' | 'OUT' | 'ADJUST' | 'OPENING'
  documentDate: string
  supplierId: number | null
  supplierName: string
  departmentId: number | null
  departmentName: string
  status: 'Draft' | 'Confirmed' | 'Cancelled' | 'Adjusted'
  note: string
  createdBy: number
  createdByName: string
  confirmedBy: number | null
  confirmedByName: string
  confirmedAt: string
  createdAt: string
  updatedAt: string
  items: StockDocumentItem[]
  totalValue: number
}

export interface StockMovement {
  id: number
  documentId: number
  documentNo: string
  documentItemId: number
  productId: number
  lotId: number
  lotNo: string
  expireDate: string
  movementType: string
  quantityIn: number
  quantityOut: number
  lotBalanceAfter: number
  productBalanceAfter: number
  createdBy: number
  createdByName: string
  createdAt: string
}

export interface DashboardSummary {
  lowStockCount: number
  outOfStockCount: number
  nearExpiryCount: number
  totalStockValue: number
  todayInCount: number
  todayOutCount: number
  recentDocuments: StockDocument[]
}

export interface LowStockItem {
  productId: number
  productCode: string
  productName: string
  currentStock: number
  reorderLevel: number
  unitName: string
}

export interface ExpiryAlert {
  lotId: number
  productId: number
  productCode: string
  productName: string
  lotNo: string
  expireDate: string
  quantity: number
  unitName: string
  daysLeft: number
}

export interface LotAllocation {
  lotId: number
  lotNo: string
  expireDate: string
  available: number
  allocate: number
}

// Request types
export interface CreateProductRequest {
  code: string
  name: string
  categoryId: number | null
  baseUnitId: number
  defaultPurchaseUnitId: number | null
  defaultIssueUnitId: number | null
  packageSize: number
  reorderLevel: number
  defaultPrice: number
}

export interface CreateDocumentRequest {
  documentType: string
  documentDate: string
  documentNo: string
  supplierId: number | null
  departmentId: number | null
  note: string
  createdBy: number
}

export interface DocumentItemRequest {
  productId: number
  lotNo: string
  expireDate: string
  quantity: number
  requestedQty: number
  approvedQty: number
  unitCost: number
  note: string
}

export interface DocFilter {
  documentType: string
  status: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface AdjustmentRequest {
  documentDate: string
  note: string
  reason: string
  createdBy: number
  items: AdjustmentItemRequest[]
}

export interface AdjustmentItemRequest {
  productId: number
  lotId: number | null
  lotNo: string
  expireDate: string
  quantity: number
  note: string
}
