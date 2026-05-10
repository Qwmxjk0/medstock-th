package handlers

import (
	"medstock/models"
	"medstock/services"
)

type StockHandler struct {
	svc    *services.StockService
	expSvc *services.ExportService
}

func NewStockHandler(svc *services.StockService, expSvc *services.ExportService) *StockHandler {
	return &StockHandler{svc: svc, expSvc: expSvc}
}

// ─── Documents ───────────────────────────────────────────────────────────────

func (h *StockHandler) GetDocuments(f models.DocFilter) ([]models.StockDocument, error) {
	return h.svc.GetDocuments(f)
}
func (h *StockHandler) GetDocumentByID(id int64) (*models.StockDocument, error) {
	return h.svc.GetDocumentByID(id)
}
func (h *StockHandler) CreateDraft(req models.CreateDocumentRequest) (int64, error) {
	return h.svc.CreateDraft(req)
}
func (h *StockHandler) UpdateDraft(id int64, req models.CreateDocumentRequest) error {
	return h.svc.UpdateDraft(id, req)
}
func (h *StockHandler) AddDocumentItem(docID int64, item models.DocumentItemRequest) error {
	return h.svc.AddDocumentItem(docID, item)
}
func (h *StockHandler) RemoveDocumentItem(itemID int64) error {
	return h.svc.RemoveDocumentItem(itemID)
}

// ─── Confirm / Cancel ────────────────────────────────────────────────────────

func (h *StockHandler) ConfirmStockIn(docID int64, confirmedByID int64) error {
	return h.svc.ConfirmStockIn(docID, confirmedByID)
}
func (h *StockHandler) ConfirmStockOut(docID int64, confirmedByID int64) error {
	return h.svc.ConfirmStockOut(docID, confirmedByID)
}
func (h *StockHandler) CancelDocument(docID int64, reason string, userID int64) error {
	return h.svc.CancelDocument(docID, reason, userID)
}

// ─── FEFO ────────────────────────────────────────────────────────────────────

func (h *StockHandler) GetFEFOLots(productID int64, neededQty float64) ([]models.LotAllocation, error) {
	return h.svc.GetFEFOLots(productID, neededQty)
}

// ─── Adjustment ──────────────────────────────────────────────────────────────

func (h *StockHandler) CreateAdjustment(req models.AdjustmentRequest) (int64, error) {
	return h.svc.CreateAdjustment(req)
}

// ─── Stock Lots & Card ───────────────────────────────────────────────────────

func (h *StockHandler) GetStockLots(productID int64) ([]models.StockLot, error) {
	return h.svc.GetStockLots(productID)
}
func (h *StockHandler) GetCurrentStock(productID int64) (float64, error) {
	return h.svc.GetCurrentStock(productID)
}
func (h *StockHandler) GetStockCard(productID int64, dateFrom, dateTo string) ([]models.StockMovement, error) {
	return h.svc.GetStockCard(productID, dateFrom, dateTo)
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

func (h *StockHandler) GetDashboardSummary() (*models.DashboardSummary, error) {
	return h.svc.GetDashboardSummary()
}
func (h *StockHandler) GetLowStockAlerts() ([]models.LowStockItem, error) {
	return h.svc.GetLowStockAlerts()
}
func (h *StockHandler) GetNearExpiryAlerts(daysAhead int) ([]models.ExpiryAlert, error) {
	return h.svc.GetNearExpiryAlerts(daysAhead)
}

// ─── Export ───────────────────────────────────────────────────────────────────

func (h *StockHandler) ExportInventory(destDir string) (string, error) {
	return h.expSvc.ExportInventory(destDir)
}
func (h *StockHandler) ExportStockCard(productID int64, productName, dateFrom, dateTo, destDir string) (string, error) {
	return h.expSvc.ExportStockCard(productID, productName, dateFrom, dateTo, destDir)
}
func (h *StockHandler) ExportDocuments(docType, dateFrom, dateTo, destDir string) (string, error) {
	return h.expSvc.ExportDocuments(docType, dateFrom, dateTo, destDir)
}
