package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"medstock/db"
	"medstock/models"
	"medstock/services"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the single Wails-bound struct. All frontend-callable methods live here.
type App struct {
	ctx        context.Context
	sqlDB      *sql.DB
	dbPath     string
	masterSvc  *services.MasterService
	productSvc *services.ProductService
	stockSvc   *services.StockService
	exportSvc  *services.ExportService
	importSvc  *services.ImportService
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = "."
	}
	dbDir := filepath.Join(appData, "MedStock")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("cannot create db dir: %v", err)
	}
	a.dbPath = filepath.Join(dbDir, "medstock.db")

	if err := a.openDatabase(); err != nil {
		log.Fatalf("cannot open database: %v", err)
	}
}

func (a *App) openDatabase() error {
	database, err := db.Open(a.dbPath)
	if err != nil {
		return err
	}
	a.sqlDB = database
	a.masterSvc = services.NewMasterService(database)
	a.productSvc = services.NewProductService(database)
	a.stockSvc = services.NewStockService(database)
	a.exportSvc = services.NewExportService(database)
	a.importSvc = services.NewImportService(database)
	return nil
}

func (a *App) shutdown(_ context.Context) {
	if a.sqlDB != nil {
		a.sqlDB.Close()
	}
}

// ─── Initialize ──────────────────────────────────────────────────────────────

type InitProgress struct {
	Step    int    `json:"step"`
	Total   int    `json:"total"`
	Message string `json:"message"`
}

func (a *App) Initialize() error {
	tables := []struct {
		index string
		label string
	}{
		{"products", "ดัชนีทะเบียนเวชภัณฑ์"},
		{"stock_lots", "ดัชนีสต๊อก Lot"},
		{"stock_documents", "ดัชนีเอกสาร"},
		{"stock_document_items", "ดัชนีรายการเอกสาร"},
		{"stock_movements", "ดัชนีการเคลื่อนไหว"},
		{"audit_logs", "ดัชนี Audit Log"},
	}
	total := len(tables)
	for i, t := range tables {
		wailsruntime.EventsEmit(a.ctx, "init:progress", InitProgress{
			Step:    i + 1,
			Total:   total,
			Message: t.label,
		})
		if _, err := a.sqlDB.Exec("REINDEX " + t.index); err != nil {
			return err
		}
	}
	wailsruntime.EventsEmit(a.ctx, "init:progress", InitProgress{
		Step:    total,
		Total:   total,
		Message: "พร้อมใช้งาน",
	})
	return nil
}

// ─── Master Data ──────────────────────────────────────────────────────────────

func (a *App) GetUnits(activeOnly bool) ([]models.Unit, error) {
	return a.masterSvc.GetUnits(activeOnly)
}
func (a *App) SaveUnit(u models.Unit) (int64, error) { return a.masterSvc.SaveUnit(u) }
func (a *App) DeactivateUnit(id, userID int64) error { return a.masterSvc.DeactivateUnit(id, userID) }

func (a *App) GetDepartments(activeOnly bool) ([]models.Department, error) {
	return a.masterSvc.GetDepartments(activeOnly)
}
func (a *App) SaveDepartment(d models.Department) (int64, error) {
	return a.masterSvc.SaveDepartment(d)
}
func (a *App) DeactivateDepartment(id, userID int64) error {
	return a.masterSvc.DeactivateDepartment(id, userID)
}

func (a *App) GetSuppliers(activeOnly bool) ([]models.Supplier, error) {
	return a.masterSvc.GetSuppliers(activeOnly)
}
func (a *App) SaveSupplier(s models.Supplier) (int64, error) { return a.masterSvc.SaveSupplier(s) }
func (a *App) DeactivateSupplier(id, userID int64) error {
	return a.masterSvc.DeactivateSupplier(id, userID)
}

func (a *App) GetCategories(activeOnly bool) ([]models.ProductCategory, error) {
	return a.masterSvc.GetCategories(activeOnly)
}
func (a *App) SaveCategory(c models.ProductCategory) (int64, error) {
	return a.masterSvc.SaveCategory(c)
}
func (a *App) DeactivateCategory(id, userID int64) error {
	return a.masterSvc.DeactivateCategory(id, userID)
}

func (a *App) GetUsers() ([]models.User, error)       { return a.masterSvc.GetUsers() }
func (a *App) SaveUser(u models.User) (int64, error)  { return a.masterSvc.SaveUser(u) }
func (a *App) DeactivateUser(id, adminID int64) error { return a.masterSvc.DeactivateUser(id, adminID) }
func (a *App) ActivateUser(id, adminID int64) error   { return a.masterSvc.ActivateUser(id, adminID) }
func (a *App) UpdateUserLastSelected(id int64) error  { return a.masterSvc.UpdateUserLastSelected(id) }

// ─── Auth ─────────────────────────────────────────────────────────────────────

func (a *App) Login(username, password string) (*models.User, error) {
	return a.masterSvc.Login(username, password)
}
func (a *App) VerifyPassword(userID int64, password string) error {
	return a.masterSvc.VerifyPassword(userID, password)
}
func (a *App) SetPassword(userID int64, oldPassword, newPassword string) error {
	return a.masterSvc.SetPassword(userID, oldPassword, newPassword)
}
func (a *App) ResetPassword(adminID, targetUserID int64, newPassword string) error {
	return a.masterSvc.ResetPassword(adminID, targetUserID, newPassword)
}
func (a *App) CreateUser(adminID int64, u models.User, initialPassword string) (int64, error) {
	return a.masterSvc.CreateUser(adminID, u, initialPassword)
}
func (a *App) GetLoginableUsers() ([]models.User, error) {
	return a.masterSvc.GetLoginableUsers()
}
func (a *App) UserMustChangePassword(userID int64) bool {
	return a.masterSvc.UserMustChangePassword(userID)
}

// ─── Products ─────────────────────────────────────────────────────────────────

func (a *App) GetProducts(search string, activeOnly bool) ([]models.Product, error) {
	return a.productSvc.GetProducts(search, activeOnly)
}
func (a *App) GetProductByID(id int64) (*models.Product, error) {
	return a.productSvc.GetProductByID(id)
}
func (a *App) CreateProduct(req models.CreateProductRequest, userID int64) (int64, error) {
	return a.productSvc.CreateProduct(req, userID)
}
func (a *App) UpdateProduct(id int64, req models.CreateProductRequest, userID int64) error {
	return a.productSvc.UpdateProduct(id, req, userID)
}
func (a *App) DeactivateProduct(id, userID int64) error {
	return a.productSvc.DeactivateProduct(id, userID)
}
func (a *App) CheckDuplicateName(name string, excludeID int64) ([]models.Product, error) {
	return a.productSvc.CheckDuplicateName(name, excludeID)
}
func (a *App) GetProductAliases(productID int64) ([]models.ProductAlias, error) {
	return a.productSvc.GetProductAliases(productID)
}
func (a *App) SaveProductAlias(al models.ProductAlias) error {
	return a.productSvc.SaveProductAlias(al)
}

// ─── Stock Documents ──────────────────────────────────────────────────────────

func (a *App) GetDocuments(f models.DocFilter) ([]models.StockDocument, error) {
	return a.stockSvc.GetDocuments(f)
}
func (a *App) GetDocumentByID(id int64) (*models.StockDocument, error) {
	return a.stockSvc.GetDocumentByID(id)
}
func (a *App) CreateDraft(req models.CreateDocumentRequest) (int64, error) {
	return a.stockSvc.CreateDraft(req)
}
func (a *App) UpdateDraft(id int64, req models.CreateDocumentRequest) error {
	return a.stockSvc.UpdateDraft(id, req)
}
func (a *App) AddDocumentItem(docID int64, item models.DocumentItemRequest) error {
	return a.stockSvc.AddDocumentItem(docID, item)
}
func (a *App) RemoveDocumentItem(itemID int64) error { return a.stockSvc.RemoveDocumentItem(itemID) }
func (a *App) ConfirmStockIn(docID, confirmedByID int64) error {
	return a.stockSvc.ConfirmStockIn(docID, confirmedByID)
}
func (a *App) ConfirmStockOut(docID, confirmedByID int64) error {
	return a.stockSvc.ConfirmStockOut(docID, confirmedByID)
}
func (a *App) CancelDocument(docID int64, reason string, userID int64) error {
	return a.stockSvc.CancelDocument(docID, reason, userID)
}

// ─── FEFO / Adjustment ────────────────────────────────────────────────────────

func (a *App) GetFEFOLots(productID int64, neededQty float64) ([]models.LotAllocation, error) {
	return a.stockSvc.GetFEFOLots(productID, neededQty)
}
func (a *App) CreateAdjustment(req models.AdjustmentRequest) (int64, error) {
	return a.stockSvc.CreateAdjustment(req)
}

// ─── Stock Lots & Card ────────────────────────────────────────────────────────

func (a *App) GetStockLots(productID int64) ([]models.StockLot, error) {
	return a.stockSvc.GetStockLots(productID)
}
func (a *App) GetCurrentStock(productID int64) (float64, error) {
	return a.stockSvc.GetCurrentStock(productID)
}
func (a *App) GetStockCard(productID int64, dateFrom, dateTo string) ([]models.StockMovement, error) {
	return a.stockSvc.GetStockCard(productID, dateFrom, dateTo)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

func (a *App) GetDashboardSummary() (*models.DashboardSummary, error) {
	return a.stockSvc.GetDashboardSummary()
}
func (a *App) GetLowStockAlerts() ([]models.LowStockItem, error) {
	return a.stockSvc.GetLowStockAlerts()
}
func (a *App) GetNearExpiryAlerts(daysAhead int) ([]models.ExpiryAlert, error) {
	return a.stockSvc.GetNearExpiryAlerts(daysAhead)
}
func (a *App) GetMovementChart(days int) ([]models.MovementChartPoint, error) {
	return a.stockSvc.GetMovementChart(days)
}

// ─── Export ───────────────────────────────────────────────────────────────────

func (a *App) ExportInventory(destDir string) (string, error) {
	return a.exportSvc.ExportInventory(destDir)
}
func (a *App) ExportStockCard(productID int64, productName, dateFrom, dateTo, destDir string) (string, error) {
	return a.exportSvc.ExportStockCard(productID, productName, dateFrom, dateTo, destDir)
}
func (a *App) ExportDocuments(docType, dateFrom, dateTo, destDir string) (string, error) {
	return a.exportSvc.ExportDocuments(docType, dateFrom, dateTo, destDir)
}
func (a *App) BackupDatabase(destPath string) (string, error) {
	return a.exportSvc.BackupDatabase(destPath)
}
func (a *App) RestoreDatabase(sourcePath string) (string, error) {
	if sourcePath == "" {
		return "", fmt.Errorf("กรุณาเลือกไฟล์ backup")
	}
	sourceAbs, err := filepath.Abs(sourcePath)
	if err != nil {
		return "", err
	}
	targetAbs, err := filepath.Abs(a.dbPath)
	if err != nil {
		return "", err
	}
	if sourceAbs == targetAbs {
		return "", fmt.Errorf("ไฟล์ backup ต้องไม่ใช่ไฟล์ฐานข้อมูลที่กำลังใช้งาน")
	}
	if err := validateSQLiteBackup(sourceAbs); err != nil {
		return "", err
	}

	preRestoreDir := filepath.Join(filepath.Dir(a.dbPath), "backups")
	preRestorePath := filepath.Join(preRestoreDir, fmt.Sprintf("medstock-before-restore-%s.db", time.Now().Format("20060102-150405")))
	if a.exportSvc != nil {
		if backupPath, err := a.exportSvc.BackupDatabase(preRestorePath); err == nil {
			preRestorePath = backupPath
		} else {
			return "", err
		}
	}

	if a.sqlDB != nil {
		if err := a.sqlDB.Close(); err != nil {
			return "", err
		}
		a.sqlDB = nil
	}
	for _, suffix := range []string{"", "-wal", "-shm"} {
		if err := os.Remove(a.dbPath + suffix); err != nil && !os.IsNotExist(err) {
			return "", err
		}
	}
	if err := copyFile(sourceAbs, a.dbPath); err != nil {
		return "", err
	}
	if err := a.openDatabase(); err != nil {
		return "", err
	}
	return preRestorePath, nil
}

// ─── Import ───────────────────────────────────────────────────────────────────

func (a *App) OpenFileDialog() string {
	path, _ := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "เลือกไฟล์ Excel",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	return path
}

func (a *App) OpenBackupFileDialog() string {
	path, _ := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "เลือกไฟล์ Backup",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "SQLite Backup (*.db)", Pattern: "*.db"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	return path
}

func (a *App) SaveFileDialog(defaultFilename string) string {
	path, _ := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:           "บันทึกไฟล์ Excel",
		DefaultFilename: defaultFilename,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	return path
}

func (a *App) SaveBackupFileDialog(defaultFilename string) string {
	path, _ := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:           "บันทึกไฟล์ Backup",
		DefaultFilename: defaultFilename,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "SQLite Backup (*.db)", Pattern: "*.db"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	return path
}

func (a *App) PreviewProductsImport(filePath string) (*models.ProductImportPreview, error) {
	return a.importSvc.PreviewProductsImport(filePath)
}
func (a *App) ImportProducts(filePath string, partial bool, userID int64) (*models.ImportResult, error) {
	return a.importSvc.ImportProducts(filePath, partial, userID)
}
func (a *App) PreviewStockImport(filePath string) (*models.StockImportPreview, error) {
	return a.importSvc.PreviewStockImport(filePath)
}
func (a *App) ImportOpeningStock(filePath string, partial bool, userID int64) (*models.ImportResult, error) {
	return a.importSvc.ImportOpeningStock(filePath, partial, userID)
}

func validateSQLiteBackup(path string) error {
	dbConn, err := sql.Open("sqlite", path+"?_pragma=query_only(ON)")
	if err != nil {
		return fmt.Errorf("เปิดไฟล์ backup ไม่สำเร็จ: %w", err)
	}
	defer dbConn.Close()

	var result string
	if err := dbConn.QueryRow(`PRAGMA integrity_check`).Scan(&result); err != nil {
		return fmt.Errorf("ตรวจสอบไฟล์ backup ไม่สำเร็จ: %w", err)
	}
	if result != "ok" {
		return fmt.Errorf("ไฟล์ backup ไม่สมบูรณ์: %s", result)
	}
	return nil
}

func copyFile(source, target string) error {
	src, err := os.Open(source)
	if err != nil {
		return err
	}
	defer src.Close()

	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}
	dst, err := os.Create(target)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return err
	}
	return dst.Sync()
}
