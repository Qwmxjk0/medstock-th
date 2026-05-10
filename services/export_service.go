package services

import (
	"database/sql"
	"fmt"
	"medstock/models"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

type ExportService struct {
	db *sql.DB
}

func NewExportService(db *sql.DB) *ExportService {
	return &ExportService{db: db}
}

func (s *ExportService) BackupDatabase(destPath string) (string, error) {
	if strings.TrimSpace(destPath) == "" {
		return "", fmt.Errorf("กรุณาเลือกที่เก็บไฟล์ backup")
	}
	if filepath.Ext(destPath) == "" {
		destPath += ".db"
	}
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return "", fmt.Errorf("สร้างโฟลเดอร์ backup ไม่สำเร็จ: %w", err)
	}
	if err := os.Remove(destPath); err != nil && !os.IsNotExist(err) {
		return "", fmt.Errorf("ลบไฟล์ backup เดิมไม่สำเร็จ: %w", err)
	}

	escapedPath := strings.ReplaceAll(destPath, "'", "''")
	if _, err := s.db.Exec("VACUUM INTO '" + escapedPath + "'"); err != nil {
		return "", fmt.Errorf("backup database ไม่สำเร็จ: %w", err)
	}
	return destPath, nil
}

func (s *ExportService) ExportInventory(destPath string) (string, error) {
	f := excelize.NewFile()
	sheet := "คงคลัง"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"รหัสสินค้า", "ชื่อสินค้า", "Lot", "วันหมดอายุ", "จำนวนคงเหลือ", "ราคาต่อหน่วย", "มูลค่า", "บริษัท"}
	for i, h := range headers {
		f.SetCellValue(sheet, cellName(i+1, 1), h)
	}

	stockSvc := &StockService{db: s.db}
	lots, err := stockSvc.GetInventoryReport()
	if err != nil {
		return "", err
	}

	for row, l := range lots {
		rn := row + 2
		f.SetCellValue(sheet, cellName(1, rn), l.ProductCode)
		f.SetCellValue(sheet, cellName(2, rn), l.ProductName)
		f.SetCellValue(sheet, cellName(3, rn), l.LotNo)
		f.SetCellValue(sheet, cellName(4, rn), l.ExpireDate)
		f.SetCellValue(sheet, cellName(5, rn), l.QuantityOnHand)
		f.SetCellValue(sheet, cellName(6, rn), l.UnitCost)
		f.SetCellValue(sheet, cellName(7, rn), l.QuantityOnHand*l.UnitCost)
		f.SetCellValue(sheet, cellName(8, rn), l.SupplierName)
	}

	lastRow := len(lots) + 1
	if lastRow < 2 {
		lastRow = 2
	}
	addTable(f, sheet, 1, 1, len(headers), lastRow, "TableInventory", "TableStyleMedium2")
	autoFitColumns(f, sheet, len(headers))

	return saveFile(f, destPath, "stock-inventory")
}

func (s *ExportService) ExportStockCard(productID int64, productName, dateFrom, dateTo, destPath string) (string, error) {
	f := excelize.NewFile()
	sheet := "Stock Card"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"วันที่", "ประเภท", "เลขเอกสาร", "Lot", "วันหมดอายุ", "เข้า", "ออก", "คงเหลือ(Lot)", "คงเหลือ(รวม)", "ผู้ทำรายการ"}
	for i, h := range headers {
		f.SetCellValue(sheet, cellName(i+1, 1), h)
	}

	stockSvc := &StockService{db: s.db}
	mvts, err := stockSvc.GetStockCard(productID, dateFrom, dateTo)
	if err != nil {
		return "", err
	}

	for row, m := range mvts {
		rn := row + 2
		f.SetCellValue(sheet, cellName(1, rn), m.CreatedAt)
		f.SetCellValue(sheet, cellName(2, rn), m.MovementType)
		f.SetCellValue(sheet, cellName(3, rn), m.DocumentNo)
		f.SetCellValue(sheet, cellName(4, rn), m.LotNo)
		f.SetCellValue(sheet, cellName(5, rn), m.ExpireDate)
		f.SetCellValue(sheet, cellName(6, rn), m.QuantityIn)
		f.SetCellValue(sheet, cellName(7, rn), m.QuantityOut)
		f.SetCellValue(sheet, cellName(8, rn), m.LotBalanceAfter)
		f.SetCellValue(sheet, cellName(9, rn), m.ProductBalanceAfter)
		f.SetCellValue(sheet, cellName(10, rn), m.CreatedByName)
	}

	lastRow := len(mvts) + 1
	if lastRow < 2 {
		lastRow = 2
	}
	addTable(f, sheet, 1, 1, len(headers), lastRow, "TableStockCard", "TableStyleMedium7")
	autoFitColumns(f, sheet, len(headers))

	name := fmt.Sprintf("stock-card-%s", productName)
	return saveFile(f, destPath, name)
}

func (s *ExportService) ExportDocuments(docType, dateFrom, dateTo, destPath string) (string, error) {
	f := excelize.NewFile()
	sheet := "รายการ"
	f.SetSheetName("Sheet1", sheet)

	var headers []string
	if docType == "IN" {
		headers = []string{"เลขเอกสาร", "วันที่", "บริษัท", "รหัสสินค้า", "ชื่อสินค้า", "Lot", "วันหมดอายุ", "จำนวน", "ราคา", "มูลค่า", "ผู้ยืนยัน"}
	} else {
		headers = []string{"เลขเอกสาร", "วันที่", "หน่วยงาน", "รหัสสินค้า", "ชื่อสินค้า", "Lot", "วันหมดอายุ", "ขอ", "อนุมัติ", "จ่ายจริง", "ผู้ยืนยัน"}
	}
	for i, h := range headers {
		f.SetCellValue(sheet, cellName(i+1, 1), h)
	}

	stockSvc := &StockService{db: s.db}
	docs, err := stockSvc.GetDocuments(models.DocFilter{
		DocumentType: docType,
		Status:       "Confirmed",
		DateFrom:     dateFrom,
		DateTo:       dateTo,
	})
	if err != nil {
		return "", err
	}

	rowNum := 2
	for _, doc := range docs {
		fullDoc, err := stockSvc.GetDocumentByID(doc.ID)
		if err != nil {
			continue
		}
		for _, it := range fullDoc.Items {
			if docType == "IN" {
				f.SetCellValue(sheet, cellName(1, rowNum), fullDoc.DocumentNo)
				f.SetCellValue(sheet, cellName(2, rowNum), fullDoc.DocumentDate)
				f.SetCellValue(sheet, cellName(3, rowNum), fullDoc.SupplierName)
				f.SetCellValue(sheet, cellName(4, rowNum), it.ProductCode)
				f.SetCellValue(sheet, cellName(5, rowNum), it.ProductName)
				f.SetCellValue(sheet, cellName(6, rowNum), it.LotNo)
				f.SetCellValue(sheet, cellName(7, rowNum), it.ExpireDate)
				f.SetCellValue(sheet, cellName(8, rowNum), it.Quantity)
				f.SetCellValue(sheet, cellName(9, rowNum), it.UnitCost)
				f.SetCellValue(sheet, cellName(10, rowNum), it.Quantity*it.UnitCost)
				f.SetCellValue(sheet, cellName(11, rowNum), fullDoc.ConfirmedByName)
			} else {
				f.SetCellValue(sheet, cellName(1, rowNum), fullDoc.DocumentNo)
				f.SetCellValue(sheet, cellName(2, rowNum), fullDoc.DocumentDate)
				f.SetCellValue(sheet, cellName(3, rowNum), fullDoc.DepartmentName)
				f.SetCellValue(sheet, cellName(4, rowNum), it.ProductCode)
				f.SetCellValue(sheet, cellName(5, rowNum), it.ProductName)
				f.SetCellValue(sheet, cellName(6, rowNum), it.LotNo)
				f.SetCellValue(sheet, cellName(7, rowNum), it.ExpireDate)
				f.SetCellValue(sheet, cellName(8, rowNum), it.RequestedQty)
				f.SetCellValue(sheet, cellName(9, rowNum), it.ApprovedQty)
				f.SetCellValue(sheet, cellName(10, rowNum), it.IssuedQty)
				f.SetCellValue(sheet, cellName(11, rowNum), fullDoc.ConfirmedByName)
			}
			rowNum++
		}
	}

	lastRow := rowNum - 1
	if lastRow < 2 {
		lastRow = 2
	}
	tableName := "TableIn"
	style := "TableStyleMedium3"
	if docType == "OUT" {
		tableName = "TableOut"
		style = "TableStyleMedium6"
	}
	addTable(f, sheet, 1, 1, len(headers), lastRow, tableName, style)
	autoFitColumns(f, sheet, len(headers))

	name := fmt.Sprintf("report-%s", docType)
	return saveFile(f, destPath, name)
}

func cellName(col, row int) string {
	c, _ := excelize.CoordinatesToCellName(col, row)
	return c
}

// addTable wraps a data range in an Excel Table with filter buttons and banded rows.
func addTable(f *excelize.File, sheet string, fromCol, fromRow, toCol, toRow int, name, style string) {
	topLeft, _ := excelize.CoordinatesToCellName(fromCol, fromRow)
	botRight, _ := excelize.CoordinatesToCellName(toCol, toRow)
	f.AddTable(sheet, &excelize.Table{
		Range:             topLeft + ":" + botRight,
		Name:              name,
		StyleName:         style,
		ShowFirstColumn:   false,
		ShowLastColumn:    false,
		ShowRowStripes:    boolPtr(true),
		ShowColumnStripes: false,
	})
}

// autoFitColumns sets a reasonable column width for all columns.
func autoFitColumns(f *excelize.File, sheet string, numCols int) {
	for col := 1; col <= numCols; col++ {
		colLetter, _ := excelize.ColumnNumberToName(col)
		f.SetColWidth(sheet, colLetter, colLetter, 18)
	}
}

func boolPtr(b bool) *bool { return &b }

// saveFile saves the workbook. If destPath is a full file path (ends with .xlsx), use it directly.
// Otherwise treat destPath as a directory and auto-generate a filename.
func saveFile(f *excelize.File, destPath, defaultName string) (string, error) {
	var fullPath string
	if destPath != "" && filepath.Ext(destPath) == ".xlsx" {
		fullPath = destPath
	} else {
		dir := destPath
		if dir == "" {
			dir = os.TempDir()
		}
		ts := time.Now().Format("20060102-150405")
		fullPath = filepath.Join(dir, fmt.Sprintf("%s-%s.xlsx", defaultName, ts))
	}
	if err := f.SaveAs(fullPath); err != nil {
		return "", fmt.Errorf("บันทึกไฟล์ไม่สำเร็จ: %w", err)
	}
	return fullPath, nil
}
