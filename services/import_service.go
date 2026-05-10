package services

import (
	"context"
	"database/sql"
	"fmt"
	"medstock/models"
	"medstock/util"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

type ImportService struct {
	db *sql.DB
}

func NewImportService(db *sql.DB) *ImportService {
	return &ImportService{db: db}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func cellStr(f *excelize.File, sheet, col string, row int) string {
	v, _ := f.GetCellValue(sheet, fmt.Sprintf("%s%d", col, row))
	return strings.TrimSpace(v)
}

func parseFloat(s string) (float64, error) {
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

// parseDate normalises various Thai Excel date formats → "YYYY-MM-DD" or ""
func parseDate(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	// Try numeric serial (Excel date float)
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		t, err := excelize.ExcelDateToTime(f, false)
		if err == nil {
			return t.Format("2006-01-02")
		}
	}
	layouts := []string{"2006-01-02", "02/01/2006", "01/02/2006", "2006/01/02", "02-01-2006"}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t.Format("2006-01-02")
		}
	}
	return s // return as-is, will fail validation downstream
}

func isValidDate(s string) bool {
	if s == "" {
		return true // optional
	}
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

// ─── Product Import ───────────────────────────────────────────────────────────

const productSheet = "1_ทะเบียนเวชภัณฑ์"

var productHeaders = []string{
	"รหัสเวชภัณฑ์*", "ชื่อเวชภัณฑ์/รายการยา*", "กลุ่มยา/ประเภทเวชภัณฑ์",
	"หน่วยนับหลัก*", "หน่วยนับรับเข้า", "หน่วยนับเบิก",
	"ขนาดบรรจุ", "จุดสั่งซื้อขั้นต่ำ", "ราคาต่อหน่วย (บาท)",
}

func (s *ImportService) PreviewProductsImport(filePath string) (*models.ProductImportPreview, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("เปิดไฟล์ไม่ได้: %w", err)
	}
	defer f.Close()

	rows, errs, total := readProductRows(f, 50)
	return &models.ProductImportPreview{
		Rows:      rows,
		Errors:    errs,
		TotalRows: total,
		CanImport: len(errs) == 0,
	}, nil
}

func (s *ImportService) ImportProducts(filePath string, partial bool, userID int64) (*models.ImportResult, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("เปิดไฟล์ไม่ได้: %w", err)
	}
	defer f.Close()

	rows, errs, _ := readProductRows(f, 0)
	if !partial && len(errs) > 0 {
		msgs := make([]string, 0, len(errs))
		for _, e := range errs {
			msgs = append(msgs, fmt.Sprintf("แถว %d [%s]: %s", e.Row, e.Column, e.Message))
		}
		return nil, fmt.Errorf("พบข้อผิดพลาด %d รายการ:\n%s", len(errs), strings.Join(msgs, "\n"))
	}

	// Build error row set for fast lookup
	errorRows := map[int]bool{}
	for _, e := range errs {
		errorRows[e.Row] = true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Load existing units and categories (name → id)
	unitMap, err := loadNameMap(tx, "units")
	if err != nil {
		return nil, err
	}
	catMap, err := loadNameMap(tx, "product_categories")
	if err != nil {
		return nil, err
	}

	success, failed := 0, 0
	for _, row := range rows {
		if errorRows[row.RowNum] {
			failed++
			continue
		}
		// Resolve / auto-create unit
		unitID, err := resolveOrCreate(tx, "units", row.UnitName, unitMap)
		if err != nil {
			failed++
			continue
		}
		// Resolve / auto-create category
		var catID *int64
		if row.CategoryName != "" {
			id, err := resolveOrCreate(tx, "product_categories", row.CategoryName, catMap)
			if err == nil {
				catID = &id
			}
		}
		// Skip duplicate codes
		var existing int64
		tx.QueryRow(`SELECT COUNT(*) FROM products WHERE code=?`, row.Code).Scan(&existing)
		if existing > 0 {
			failed++
			continue
		}
		_, err = tx.Exec(
			`INSERT INTO products(code,name,category_id,base_unit_id,package_size,reorder_level,default_price)
			 VALUES(?,?,?,?,?,?,?)`,
			row.Code, row.Name, catID, unitID,
			row.PackageSize, row.ReorderLevel, row.DefaultPrice,
		)
		if err != nil {
			failed++
			continue
		}
		success++
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	// Write audit log after commit (not inside transaction — avoids SQLite write lock conflict)
	util.WriteAuditLog(s.db, userID, "IMPORT_PRODUCTS", "products", 0, nil,
		map[string]int{"success": success, "failed": failed})

	return &models.ImportResult{
		Success: success,
		Failed:  failed,
		Message: fmt.Sprintf("นำเข้าสำเร็จ %d รายการ, ข้ามไป %d รายการ", success, failed),
	}, nil
}

func readProductRows(f *excelize.File, limit int) ([]models.ProductImportRow, []models.ImportError, int) {
	cols := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I"}
	rows := []models.ProductImportRow{}
	errs := []models.ImportError{}

	allRows, _ := f.GetRows(productSheet)
	total := len(allRows) - 1
	if total < 0 {
		total = 0
	}

	for rowNum := 2; ; rowNum++ {
		if limit > 0 && rowNum > limit+1 {
			break
		}
		code := cellStr(f, productSheet, cols[0], rowNum)
		name := cellStr(f, productSheet, cols[1], rowNum)
		if code == "" && name == "" {
			break
		}

		row := models.ProductImportRow{
			RowNum:       rowNum,
			Code:         code,
			Name:         name,
			CategoryName: cellStr(f, productSheet, cols[2], rowNum),
			UnitName:     cellStr(f, productSheet, cols[3], rowNum),
		}

		hasErr := false
		addErr := func(col, msg string) {
			errs = append(errs, models.ImportError{Row: rowNum, Column: col, Message: msg})
			hasErr = true
		}

		if code == "" {
			addErr("A", "ต้องระบุรหัสเวชภัณฑ์")
		}
		if name == "" {
			addErr("B", "ต้องระบุชื่อเวชภัณฑ์")
		}
		if row.UnitName == "" {
			addErr("D", "ต้องระบุหน่วยนับหลัก")
		}

		if v, err := parseFloat(cellStr(f, productSheet, cols[6], rowNum)); err != nil {
			addErr("G", "ขนาดบรรจุต้องเป็นตัวเลข")
		} else {
			row.PackageSize = v
			if row.PackageSize <= 0 {
				row.PackageSize = 1
			}
		}
		if v, err := parseFloat(cellStr(f, productSheet, cols[7], rowNum)); err != nil {
			addErr("H", "จุดสั่งซื้อต้องเป็นตัวเลข")
		} else {
			row.ReorderLevel = v
		}
		if v, err := parseFloat(cellStr(f, productSheet, cols[8], rowNum)); err != nil {
			addErr("I", "ราคาต่อหน่วยต้องเป็นตัวเลข")
		} else {
			row.DefaultPrice = v
		}

		row.HasError = hasErr
		rows = append(rows, row)
	}
	return rows, errs, total
}

// ─── Opening Stock Import ─────────────────────────────────────────────────────

const stockSheet = "2_ยอดยกมา(Opening)"

func (s *ImportService) PreviewStockImport(filePath string) (*models.StockImportPreview, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("เปิดไฟล์ไม่ได้: %w", err)
	}
	defer f.Close()

	// Load valid product codes for cross-reference
	productCodes, err := s.loadProductCodes()
	if err != nil {
		return nil, err
	}

	rows, errs, total := readStockRows(f, 50, productCodes)
	return &models.StockImportPreview{
		Rows:      rows,
		Errors:    errs,
		TotalRows: total,
		CanImport: len(errs) == 0,
	}, nil
}

func (s *ImportService) ImportOpeningStock(filePath string, partial bool, userID int64) (*models.ImportResult, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("เปิดไฟล์ไม่ได้: %w", err)
	}
	defer f.Close()

	productCodes, err := s.loadProductCodes()
	if err != nil {
		return nil, err
	}

	rows, errs, _ := readStockRows(f, 0, productCodes)
	if !partial && len(errs) > 0 {
		msgs := make([]string, 0, len(errs))
		for _, e := range errs {
			msgs = append(msgs, fmt.Sprintf("แถว %d [%s]: %s", e.Row, e.Column, e.Message))
		}
		return nil, fmt.Errorf("พบข้อผิดพลาด %d รายการ:\n%s", len(errs), strings.Join(msgs, "\n"))
	}

	errorRows := map[int]bool{}
	for _, e := range errs {
		errorRows[e.Row] = true
	}

	ctx2, cancel2 := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel2()
	tx, err := s.db.BeginTx(ctx2, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Create one OPENING document for the entire import
	today := time.Now().Format("2006-01-02")
	docNo := "IMPORT-OPENING-" + time.Now().Format("20060102-150405")
	res, err := tx.Exec(
		`INSERT INTO stock_documents(document_no,document_type,document_date,status,created_by,note)
		 VALUES(?,?,?,?,?,?)`,
		docNo, "OPENING", today, "Draft", userID, "นำเข้าจาก xlsx",
	)
	if err != nil {
		return nil, fmt.Errorf("สร้างเอกสารไม่ได้: %w", err)
	}
	docID, _ := res.LastInsertId()

	// Load product code → id map (must close rows before any write)
	prodMap := map[string]int64{}
	{
		prows, err := tx.Query(`SELECT id, code FROM products`)
		if err != nil {
			return nil, fmt.Errorf("โหลดรายการสินค้าไม่ได้: %w", err)
		}
		for prows.Next() {
			var id int64
			var code string
			prows.Scan(&id, &code)
			prodMap[strings.ToUpper(strings.TrimSpace(code))] = id
		}
		prows.Close()
	}

	// Supplier name → id map (must close rows before any write)
	supplierMap := map[string]int64{}
	{
		srows, err := tx.Query(`SELECT id, name FROM suppliers`)
		if err != nil {
			return nil, fmt.Errorf("โหลดรายการบริษัทไม่ได้: %w", err)
		}
		for srows.Next() {
			var id int64
			var name string
			srows.Scan(&id, &name)
			supplierMap[strings.ToUpper(strings.TrimSpace(name))] = id
		}
		srows.Close()
	}

	success, failed := 0, 0
	for _, row := range rows {
		if errorRows[row.RowNum] {
			failed++
			continue
		}

		productID, ok := prodMap[strings.ToUpper(strings.TrimSpace(row.ProductCode))]
		if !ok {
			failed++
			continue
		}

		// Resolve or create supplier
		var supplierID *int64
		if row.SupplierName != "" {
			key := strings.ToUpper(strings.TrimSpace(row.SupplierName))
			if id, exists := supplierMap[key]; exists {
				supplierID = &id
			} else {
				r, err := tx.Exec(`INSERT INTO suppliers(name) VALUES(?)`, row.SupplierName)
				if err == nil {
					id, _ := r.LastInsertId()
					supplierMap[key] = id
					supplierID = &id
				}
			}
		}

		// Insert document item
		itemRes, err := tx.Exec(
			`INSERT INTO stock_document_items(document_id,product_id,lot_no,expire_date,quantity,unit_cost)
			 VALUES(?,?,?,?,?,?)`,
			docID, productID, row.LotNo, row.ExpireDate, row.Quantity, row.UnitCost,
		)
		if err != nil {
			failed++
			continue
		}
		itemID, _ := itemRes.LastInsertId()

		// Find or create stock lot
		lotID, err := findOrCreateLotTx(tx, productID, row.LotNo, row.ExpireDate, row.UnitCost, supplierID)
		if err != nil {
			failed++
			continue
		}

		// Add quantity to lot
		_, err = tx.Exec(
			`UPDATE stock_lots SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?`,
			row.Quantity, lotID,
		)
		if err != nil {
			failed++
			continue
		}

		// Get new balances for movement record
		var lotBal, prodBal float64
		tx.QueryRow(`SELECT quantity_on_hand FROM stock_lots WHERE id=?`, lotID).Scan(&lotBal)
		tx.QueryRow(`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, productID).Scan(&prodBal)

		// Insert stock movement
		_, err = tx.Exec(
			`INSERT INTO stock_movements(document_id,document_item_id,product_id,lot_id,movement_type,
			  quantity_in,quantity_out,lot_balance_after,product_balance_after,created_by)
			 VALUES(?,?,?,?,?,?,?,?,?,?)`,
			docID, itemID, productID, lotID, "OPENING",
			row.Quantity, 0, lotBal, prodBal, userID,
		)
		if err != nil {
			failed++
			continue
		}
		success++
	}

	// Confirm the document
	tx.Exec(
		`UPDATE stock_documents SET status='Confirmed', confirmed_by=?, confirmed_at=datetime('now','localtime'),
		  updated_at=datetime('now','localtime') WHERE id=?`,
		userID, docID,
	)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	util.WriteAuditLog(s.db, userID, "IMPORT_OPENING", "stock_documents", docID, nil, nil)

	return &models.ImportResult{
		Success: success,
		Failed:  failed,
		Message: fmt.Sprintf("นำเข้ายอดยกมาสำเร็จ %d รายการ, ข้ามไป %d รายการ (เอกสาร: %s)", success, failed, docNo),
	}, nil
}

func readStockRows(f *excelize.File, limit int, productCodes map[string]bool) ([]models.StockImportRow, []models.ImportError, int) {
	cols := []string{"A", "B", "C", "D", "E", "F", "G"}
	rows := []models.StockImportRow{}
	errs := []models.ImportError{}

	allRows, _ := f.GetRows(stockSheet)
	total := len(allRows) - 1
	if total < 0 {
		total = 0
	}

	// A=รหัส, B=ชื่อ(skip), C=LotNo, D=วันหมดอายุ, E=จำนวน, F=ราคา, G=บริษัท
	for rowNum := 2; ; rowNum++ {
		if limit > 0 && rowNum > limit+1 {
			break
		}
		code := cellStr(f, stockSheet, cols[0], rowNum)
		if code == "" {
			break
		}

		rawExpire := cellStr(f, stockSheet, "D", rowNum)
		row := models.StockImportRow{
			RowNum:       rowNum,
			ProductCode:  code,
			LotNo:        cellStr(f, stockSheet, "C", rowNum),
			ExpireDate:   parseDate(rawExpire),
			SupplierName: cellStr(f, stockSheet, "G", rowNum),
		}

		hasErr := false
		addErr := func(col, msg string) {
			errs = append(errs, models.ImportError{Row: rowNum, Column: col, Message: msg})
			hasErr = true
		}

		if code == "" {
			addErr("A", "ต้องระบุรหัสเวชภัณฑ์")
		} else if productCodes != nil && !productCodes[strings.ToUpper(strings.TrimSpace(code))] {
			addErr("A", fmt.Sprintf("ไม่พบรหัสเวชภัณฑ์ '%s' ในระบบ", code))
		}

		if v, err := parseFloat(cellStr(f, stockSheet, "E", rowNum)); err != nil || v <= 0 {
			addErr("E", "จำนวนต้องเป็นตัวเลขมากกว่า 0")
		} else {
			row.Quantity = v
		}

		if v, err := parseFloat(cellStr(f, stockSheet, "F", rowNum)); err != nil {
			addErr("F", "ราคาต้นทุนต้องเป็นตัวเลข")
		} else {
			row.UnitCost = v
		}

		if row.ExpireDate != "" && !isValidDate(row.ExpireDate) {
			addErr("D", fmt.Sprintf("วันหมดอายุ '%s' ไม่ถูกต้อง (ใช้รูปแบบ YYYY-MM-DD)", rawExpire))
		}

		row.HasError = hasErr
		rows = append(rows, row)
	}
	return rows, errs, total
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

func (s *ImportService) loadProductCodes() (map[string]bool, error) {
	rows, err := s.db.Query(`SELECT code FROM products`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string]bool{}
	for rows.Next() {
		var code string
		rows.Scan(&code)
		m[strings.ToUpper(strings.TrimSpace(code))] = true
	}
	return m, nil
}

func loadNameMap(tx *sql.Tx, table string) (map[string]int64, error) {
	m := map[string]int64{}
	rows, err := tx.Query(fmt.Sprintf(`SELECT id, name FROM %s`, table))
	if err != nil {
		return m, nil // table may not match pattern, return empty
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var name string
		rows.Scan(&id, &name)
		m[strings.ToUpper(strings.TrimSpace(name))] = id
	}
	return m, nil
}

func resolveOrCreate(tx *sql.Tx, table, name string, cache map[string]int64) (int64, error) {
	key := strings.ToUpper(strings.TrimSpace(name))
	if id, ok := cache[key]; ok {
		return id, nil
	}
	res, err := tx.Exec(fmt.Sprintf(`INSERT INTO %s(name) VALUES(?)`, table), name)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	cache[key] = id
	return id, nil
}

func findOrCreateLotTx(tx *sql.Tx, productID int64, lotNo, expireDate string, unitCost float64, supplierID *int64) (int64, error) {
	var lotID int64
	err := tx.QueryRow(
		`SELECT id FROM stock_lots WHERE product_id=? AND lot_no=? AND COALESCE(expire_date,'')=COALESCE(?,'')`,
		productID, lotNo, expireDate,
	).Scan(&lotID)
	if err == nil {
		return lotID, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	var expPtr *string
	if expireDate != "" {
		expPtr = &expireDate
	}
	res, err := tx.Exec(
		`INSERT INTO stock_lots(product_id,lot_no,expire_date,quantity_on_hand,unit_cost,supplier_id)
		 VALUES(?,?,?,0,?,?)`,
		productID, lotNo, expPtr, unitCost, supplierID,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
