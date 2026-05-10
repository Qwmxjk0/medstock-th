package models

// ─── Master Data ────────────────────────────────────────────────────────────

type Unit struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	IsActive  bool   `json:"isActive"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Department struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	IsActive  bool   `json:"isActive"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Supplier struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Contact   string `json:"contact"`
	IsActive  bool   `json:"isActive"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ProductCategory struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	IsActive  bool   `json:"isActive"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type User struct {
	ID              int64  `json:"id"`
	Username        string `json:"username"`
	DisplayName     string `json:"displayName"`
	IsSystemAccount bool   `json:"isSystemAccount"`
	Role            string `json:"role"`
	IsActive        bool   `json:"isActive"`
	LockedAt        string `json:"lockedAt"`
	LastSelectedAt  string `json:"lastSelectedAt"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

// ─── Products ───────────────────────────────────────────────────────────────

type Product struct {
	ID                    int64   `json:"id"`
	Code                  string  `json:"code"`
	Name                  string  `json:"name"`
	CategoryID            *int64  `json:"categoryId"`
	CategoryName          string  `json:"categoryName"`
	BaseUnitID            int64   `json:"baseUnitId"`
	BaseUnitName          string  `json:"baseUnitName"`
	DefaultPurchaseUnitID *int64  `json:"defaultPurchaseUnitId"`
	DefaultIssueUnitID    *int64  `json:"defaultIssueUnitId"`
	PackageSize           float64 `json:"packageSize"`
	ReorderLevel          float64 `json:"reorderLevel"`
	DefaultPrice          float64 `json:"defaultPrice"`
	IsActive              bool    `json:"isActive"`
	CurrentStock          float64 `json:"currentStock"`
	HasNearExpiry         bool    `json:"hasNearExpiry"`
	CreatedAt             string  `json:"createdAt"`
	UpdatedAt             string  `json:"updatedAt"`
}

type ProductAlias struct {
	ID        int64  `json:"id"`
	ProductID int64  `json:"productId"`
	Alias     string `json:"alias"`
	AliasType string `json:"aliasType"`
	IsActive  bool   `json:"isActive"`
}

type ProductUnitConversion struct {
	ID           int64   `json:"id"`
	ProductID    int64   `json:"productId"`
	FromUnitID   int64   `json:"fromUnitId"`
	FromUnitName string  `json:"fromUnitName"`
	ToUnitID     int64   `json:"toUnitId"`
	ToUnitName   string  `json:"toUnitName"`
	Factor       float64 `json:"factor"`
	IsActive     bool    `json:"isActive"`
}

// ─── Stock Lots ──────────────────────────────────────────────────────────────

type StockLot struct {
	ID             int64   `json:"id"`
	ProductID      int64   `json:"productId"`
	ProductCode    string  `json:"productCode"`
	ProductName    string  `json:"productName"`
	LotNo          string  `json:"lotNo"`
	ExpireDate     string  `json:"expireDate"`
	QuantityOnHand float64 `json:"quantityOnHand"`
	UnitCost       float64 `json:"unitCost"`
	SupplierID     *int64  `json:"supplierId"`
	SupplierName   string  `json:"supplierName"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

// ─── Stock Documents ─────────────────────────────────────────────────────────

type StockDocument struct {
	ID              int64               `json:"id"`
	DocumentNo      string              `json:"documentNo"`
	ReferenceNo     string              `json:"referenceNo"`
	DocumentType    string              `json:"documentType"`
	DocumentDate    string              `json:"documentDate"`
	SupplierID      *int64              `json:"supplierId"`
	SupplierName    string              `json:"supplierName"`
	DepartmentID    *int64              `json:"departmentId"`
	DepartmentName  string              `json:"departmentName"`
	Status          string              `json:"status"`
	Note            string              `json:"note"`
	CreatedBy       int64               `json:"createdBy"`
	CreatedByName   string              `json:"createdByName"`
	ConfirmedBy     *int64              `json:"confirmedBy"`
	ConfirmedByName string              `json:"confirmedByName"`
	ConfirmedAt     string              `json:"confirmedAt"`
	CreatedAt       string              `json:"createdAt"`
	UpdatedAt       string              `json:"updatedAt"`
	Items           []StockDocumentItem `json:"items"`
	TotalValue      float64             `json:"totalValue"`
}

type StockDocumentItem struct {
	ID           int64   `json:"id"`
	DocumentID   int64   `json:"documentId"`
	ProductID    int64   `json:"productId"`
	ProductCode  string  `json:"productCode"`
	ProductName  string  `json:"productName"`
	UnitName     string  `json:"unitName"`
	LotID        *int64  `json:"lotId"`
	LotNo        string  `json:"lotNo"`
	ExpireDate   string  `json:"expireDate"`
	Quantity     float64 `json:"quantity"`
	RequestedQty float64 `json:"requestedQty"`
	ApprovedQty  float64 `json:"approvedQty"`
	IssuedQty    float64 `json:"issuedQty"`
	UnitCost     float64 `json:"unitCost"`
	RejectReason string  `json:"rejectReason"`
	Note         string  `json:"note"`
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

type StockMovement struct {
	ID                  int64   `json:"id"`
	DocumentID          int64   `json:"documentId"`
	DocumentNo          string  `json:"documentNo"`
	DocumentItemID      int64   `json:"documentItemId"`
	ProductID           int64   `json:"productId"`
	LotID               int64   `json:"lotId"`
	LotNo               string  `json:"lotNo"`
	ExpireDate          string  `json:"expireDate"`
	MovementType        string  `json:"movementType"`
	QuantityIn          float64 `json:"quantityIn"`
	QuantityOut         float64 `json:"quantityOut"`
	LotBalanceAfter     float64 `json:"lotBalanceAfter"`
	ProductBalanceAfter float64 `json:"productBalanceAfter"`
	CreatedBy           int64   `json:"createdBy"`
	CreatedByName       string  `json:"createdByName"`
	CreatedAt           string  `json:"createdAt"`
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

type DashboardSummary struct {
	LowStockCount   int             `json:"lowStockCount"`
	OutOfStockCount int             `json:"outOfStockCount"`
	NearExpiryCount int             `json:"nearExpiryCount"`
	TotalStockValue float64         `json:"totalStockValue"`
	TodayInCount    int             `json:"todayInCount"`
	TodayOutCount   int             `json:"todayOutCount"`
	RecentDocuments []StockDocument `json:"recentDocuments"`
}

type LowStockItem struct {
	ProductID    int64   `json:"productId"`
	ProductCode  string  `json:"productCode"`
	ProductName  string  `json:"productName"`
	CurrentStock float64 `json:"currentStock"`
	ReorderLevel float64 `json:"reorderLevel"`
	UnitName     string  `json:"unitName"`
}

type ExpiryAlert struct {
	LotID       int64   `json:"lotId"`
	ProductID   int64   `json:"productId"`
	ProductCode string  `json:"productCode"`
	ProductName string  `json:"productName"`
	LotNo       string  `json:"lotNo"`
	ExpireDate  string  `json:"expireDate"`
	Quantity    float64 `json:"quantity"`
	UnitName    string  `json:"unitName"`
	DaysLeft    int     `json:"daysLeft"`
}

// ─── Request types ───────────────────────────────────────────────────────────

type CreateProductRequest struct {
	Code                  string  `json:"code"`
	Name                  string  `json:"name"`
	CategoryID            *int64  `json:"categoryId"`
	BaseUnitID            int64   `json:"baseUnitId"`
	DefaultPurchaseUnitID *int64  `json:"defaultPurchaseUnitId"`
	DefaultIssueUnitID    *int64  `json:"defaultIssueUnitId"`
	PackageSize           float64 `json:"packageSize"`
	ReorderLevel          float64 `json:"reorderLevel"`
	DefaultPrice          float64 `json:"defaultPrice"`
}

type CreateDocumentRequest struct {
	DocumentType string `json:"documentType"`
	DocumentDate string `json:"documentDate"`
	DocumentNo   string `json:"documentNo"`
	ReferenceNo  string `json:"referenceNo"`
	SupplierID   *int64 `json:"supplierId"`
	DepartmentID *int64 `json:"departmentId"`
	Note         string `json:"note"`
	CreatedBy    int64  `json:"createdBy"`
}

type DocumentItemRequest struct {
	ProductID    int64   `json:"productId"`
	LotNo        string  `json:"lotNo"`
	ExpireDate   string  `json:"expireDate"`
	Quantity     float64 `json:"quantity"`
	RequestedQty float64 `json:"requestedQty"`
	ApprovedQty  float64 `json:"approvedQty"`
	UnitCost     float64 `json:"unitCost"`
	Note         string  `json:"note"`
}

type DocFilter struct {
	DocumentType string `json:"documentType"`
	Status       string `json:"status"`
	DateFrom     string `json:"dateFrom"`
	DateTo       string `json:"dateTo"`
	Search       string `json:"search"`
}

type LotAllocation struct {
	LotID      int64   `json:"lotId"`
	LotNo      string  `json:"lotNo"`
	ExpireDate string  `json:"expireDate"`
	Available  float64 `json:"available"`
	Allocate   float64 `json:"allocate"`
}

type AdjustmentRequest struct {
	DocumentDate string                  `json:"documentDate"`
	Note         string                  `json:"note"`
	Reason       string                  `json:"reason"`
	CreatedBy    int64                   `json:"createdBy"`
	Items        []AdjustmentItemRequest `json:"items"`
}

type AdjustmentItemRequest struct {
	ProductID  int64   `json:"productId"`
	LotID      *int64  `json:"lotId"`
	LotNo      string  `json:"lotNo"`
	ExpireDate string  `json:"expireDate"`
	Quantity   float64 `json:"quantity"`
	Note       string  `json:"note"`
}

type MovementChartPoint struct {
	Date     string  `json:"date"`
	TotalIn  float64 `json:"totalIn"`
	TotalOut float64 `json:"totalOut"`
}

type ReportFilter struct {
	DateFrom     string `json:"dateFrom"`
	DateTo       string `json:"dateTo"`
	SupplierID   *int64 `json:"supplierId"`
	DepartmentID *int64 `json:"departmentId"`
	ProductID    *int64 `json:"productId"`
	CategoryID   *int64 `json:"categoryId"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Column  string `json:"column"`
	Message string `json:"message"`
}

type ImportResult struct {
	Success int    `json:"success"`
	Failed  int    `json:"failed"`
	Message string `json:"message"`
}

// ─── Import rows ─────────────────────────────────────────────────────────────

type ProductImportRow struct {
	RowNum       int     `json:"rowNum"`
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	CategoryName string  `json:"categoryName"`
	UnitName     string  `json:"unitName"`
	PackageSize  float64 `json:"packageSize"`
	ReorderLevel float64 `json:"reorderLevel"`
	DefaultPrice float64 `json:"defaultPrice"`
	HasError     bool    `json:"hasError"`
}

type ProductImportPreview struct {
	Rows      []ProductImportRow `json:"rows"`
	Errors    []ImportError      `json:"errors"`
	TotalRows int                `json:"totalRows"`
	CanImport bool               `json:"canImport"`
}

type StockImportRow struct {
	RowNum       int     `json:"rowNum"`
	ProductCode  string  `json:"productCode"`
	LotNo        string  `json:"lotNo"`
	ExpireDate   string  `json:"expireDate"`
	Quantity     float64 `json:"quantity"`
	UnitCost     float64 `json:"unitCost"`
	SupplierName string  `json:"supplierName"`
	HasError     bool    `json:"hasError"`
}

type StockImportPreview struct {
	Rows      []StockImportRow `json:"rows"`
	Errors    []ImportError    `json:"errors"`
	TotalRows int              `json:"totalRows"`
	CanImport bool             `json:"canImport"`
}
