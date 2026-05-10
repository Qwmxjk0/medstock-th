package services

import (
	"context"
	"database/sql"
	"fmt"
	"medstock/models"
	"medstock/util"
	"time"
)

const txTimeout = 30 * time.Second

func beginTx(db *sql.DB) (*sql.Tx, context.CancelFunc, error) {
	ctx, cancel := context.WithTimeout(context.Background(), txTimeout)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	return tx, cancel, nil
}

type StockService struct {
	db *sql.DB
}

func NewStockService(db *sql.DB) *StockService {
	return &StockService{db: db}
}

// ─── Common document queries ─────────────────────────────────────────────────

func (s *StockService) GetDocuments(f models.DocFilter) ([]models.StockDocument, error) {
	q := `SELECT sd.id, sd.document_no, sd.reference_no, sd.document_type, sd.document_date,
	             sd.supplier_id, COALESCE(sup.name,''),
	             sd.department_id, COALESCE(dep.name,''),
	             sd.status, sd.note,
	             sd.created_by, COALESCE(u.display_name,''),
	             sd.confirmed_by, COALESCE(uc.display_name,''),
	             COALESCE(sd.confirmed_at,''), sd.created_at, sd.updated_at
	      FROM stock_documents sd
	      LEFT JOIN suppliers sup ON sup.id = sd.supplier_id
	      LEFT JOIN departments dep ON dep.id = sd.department_id
	      LEFT JOIN users u ON u.id = sd.created_by
	      LEFT JOIN users uc ON uc.id = sd.confirmed_by
	      WHERE 1=1`
	var args []any

	if f.DocumentType != "" {
		q += " AND sd.document_type=?"
		args = append(args, f.DocumentType)
	}
	if f.Status != "" {
		q += " AND sd.status=?"
		args = append(args, f.Status)
	}
	if f.DateFrom != "" {
		q += " AND sd.document_date >= ?"
		args = append(args, f.DateFrom)
	}
	if f.DateTo != "" {
		q += " AND sd.document_date <= ?"
		args = append(args, f.DateTo)
	}
	if f.Search != "" {
		q += " AND (sd.document_no LIKE ? OR sup.name LIKE ? OR dep.name LIKE ?)"
		like := "%" + f.Search + "%"
		args = append(args, like, like, like)
	}
	q += " ORDER BY sd.document_date DESC, sd.id DESC"

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.StockDocument{}
	for rows.Next() {
		var d models.StockDocument
		if err := rows.Scan(
			&d.ID, &d.DocumentNo, &d.ReferenceNo, &d.DocumentType, &d.DocumentDate,
			&d.SupplierID, &d.SupplierName,
			&d.DepartmentID, &d.DepartmentName,
			&d.Status, &d.Note,
			&d.CreatedBy, &d.CreatedByName,
			&d.ConfirmedBy, &d.ConfirmedByName,
			&d.ConfirmedAt, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, nil
}

func (s *StockService) GetDocumentByID(id int64) (*models.StockDocument, error) {
	d := &models.StockDocument{}
	err := s.db.QueryRow(`
		SELECT sd.id, sd.document_no, sd.reference_no, sd.document_type, sd.document_date,
		       sd.supplier_id, COALESCE(sup.name,''),
		       sd.department_id, COALESCE(dep.name,''),
		       sd.status, sd.note,
		       sd.created_by, COALESCE(u.display_name,''),
		       sd.confirmed_by, COALESCE(uc.display_name,''),
		       COALESCE(sd.confirmed_at,''), sd.created_at, sd.updated_at
		FROM stock_documents sd
		LEFT JOIN suppliers sup ON sup.id = sd.supplier_id
		LEFT JOIN departments dep ON dep.id = sd.department_id
		LEFT JOIN users u ON u.id = sd.created_by
		LEFT JOIN users uc ON uc.id = sd.confirmed_by
		WHERE sd.id=?`, id).Scan(
		&d.ID, &d.DocumentNo, &d.ReferenceNo, &d.DocumentType, &d.DocumentDate,
		&d.SupplierID, &d.SupplierName,
		&d.DepartmentID, &d.DepartmentName,
		&d.Status, &d.Note,
		&d.CreatedBy, &d.CreatedByName,
		&d.ConfirmedBy, &d.ConfirmedByName,
		&d.ConfirmedAt, &d.CreatedAt, &d.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ไม่พบเอกสาร id=%d", id)
	}
	if err != nil {
		return nil, err
	}

	items, err := s.getDocumentItems(id)
	if err != nil {
		return nil, err
	}
	d.Items = items
	for _, it := range items {
		d.TotalValue += it.UnitCost * it.Quantity
	}
	return d, nil
}

func (s *StockService) getDocumentItems(docID int64) ([]models.StockDocumentItem, error) {
	rows, err := s.db.Query(`
		SELECT i.id, i.document_id, i.product_id, COALESCE(p.code,''), COALESCE(p.name,''),
		       COALESCE(u.name,''),
		       i.lot_id, i.lot_no, COALESCE(i.expire_date,''),
		       i.quantity, i.requested_qty, i.approved_qty, i.issued_qty,
		       i.unit_cost, i.reject_reason, i.note
		FROM stock_document_items i
		LEFT JOIN products p ON p.id = i.product_id
		LEFT JOIN units u ON u.id = p.base_unit_id
		WHERE i.document_id=?
		ORDER BY i.id`, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.StockDocumentItem{}
	for rows.Next() {
		var it models.StockDocumentItem
		if err := rows.Scan(
			&it.ID, &it.DocumentID, &it.ProductID, &it.ProductCode, &it.ProductName,
			&it.UnitName,
			&it.LotID, &it.LotNo, &it.ExpireDate,
			&it.Quantity, &it.RequestedQty, &it.ApprovedQty, &it.IssuedQty,
			&it.UnitCost, &it.RejectReason, &it.Note,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, nil
}

// ─── Create / Update Draft ───────────────────────────────────────────────────

func (s *StockService) CreateDraft(req models.CreateDocumentRequest) (int64, error) {
	if req.DocumentDate == "" {
		return 0, fmt.Errorf("ต้องระบุวันที่เอกสาร")
	}
	if req.DocumentType == "IN" && req.SupplierID == nil {
		return 0, fmt.Errorf("ต้องระบุบริษัท/ผู้จำหน่าย")
	}
	if req.DocumentType == "OUT" && req.DepartmentID == nil {
		return 0, fmt.Errorf("ต้องระบุหน่วยงาน/แผนก")
	}

	docNo := req.DocumentNo
	if docNo == "" {
		date, err := time.Parse("2006-01-02", req.DocumentDate)
		if err != nil {
			date = time.Now()
		}
		docNo, err = util.GenerateDocNo(s.db, util.DocTypePrefix(req.DocumentType), date)
		if err != nil {
			return 0, err
		}
	}

	res, err := s.db.Exec(
		`INSERT INTO stock_documents(document_no, reference_no, document_type, document_date,
		  supplier_id, department_id, note, created_by, status)
		 VALUES(?,?,?,?,?,?,?,?,'Draft')`,
		docNo, req.ReferenceNo, req.DocumentType, req.DocumentDate,
		req.SupplierID, req.DepartmentID, req.Note, req.CreatedBy,
	)
	if err != nil {
		return 0, fmt.Errorf("สร้างเอกสารไม่สำเร็จ: %w", err)
	}
	return res.LastInsertId()
}

func (s *StockService) UpdateDraft(id int64, req models.CreateDocumentRequest) error {
	doc, err := s.GetDocumentByID(id)
	if err != nil {
		return err
	}
	if doc.Status != "Draft" {
		return fmt.Errorf("ไม่สามารถแก้ไขเอกสารที่ยืนยันแล้ว")
	}
	_, err = s.db.Exec(
		`UPDATE stock_documents SET document_date=?, reference_no=?, supplier_id=?, department_id=?,
		  note=?, updated_at=datetime('now','localtime') WHERE id=?`,
		req.DocumentDate, req.ReferenceNo, req.SupplierID, req.DepartmentID, req.Note, id,
	)
	return err
}

func (s *StockService) AddDocumentItem(docID int64, item models.DocumentItemRequest) error {
	doc, err := s.GetDocumentByID(docID)
	if err != nil {
		return err
	}
	if doc.Status != "Draft" {
		return fmt.Errorf("ไม่สามารถเพิ่มรายการในเอกสารที่ยืนยันแล้ว")
	}

	reqQty := item.Quantity
	approvedQty := item.ApprovedQty
	if doc.DocumentType == "OUT" {
		reqQty = item.RequestedQty
		if approvedQty == 0 {
			approvedQty = reqQty
		}
	}

	_, err = s.db.Exec(
		`INSERT INTO stock_document_items(document_id, product_id, lot_no, expire_date,
		  quantity, requested_qty, approved_qty, unit_cost, note)
		 VALUES(?,?,?,?,?,?,?,?,?)`,
		docID, item.ProductID, item.LotNo, nullStr(item.ExpireDate),
		item.Quantity, reqQty, approvedQty, item.UnitCost, item.Note,
	)
	return err
}

func (s *StockService) RemoveDocumentItem(itemID int64) error {
	_, err := s.db.Exec(`DELETE FROM stock_document_items WHERE id=?`, itemID)
	return err
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// ─── Confirm Stock In ─────────────────────────────────────────────────────────

func (s *StockService) ConfirmStockIn(docID int64, confirmedByID int64) error {
	tx, cancel, err := beginTx(s.db)
	if err != nil {
		return err
	}
	defer cancel()
	defer tx.Rollback()

	// 1. Verify document is Draft
	var status, docType string
	if err := tx.QueryRow(`SELECT status, document_type FROM stock_documents WHERE id=?`, docID).Scan(&status, &docType); err != nil {
		return fmt.Errorf("ไม่พบเอกสาร: %w", err)
	}
	if status != "Draft" {
		return fmt.Errorf("เอกสารนี้ไม่อยู่ในสถานะ Draft")
	}
	if docType != "IN" && docType != "OPENING" {
		return fmt.Errorf("เอกสารนี้ไม่ใช่เอกสารรับเข้า")
	}

	// 2. Get items
	items, err := s.getDocumentItemsTx(tx, docID)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return fmt.Errorf("ต้องมีอย่างน้อย 1 รายการ")
	}

	// 3. Validate items
	for _, it := range items {
		if it.Quantity <= 0 {
			return fmt.Errorf("สินค้า %s จำนวนต้องมากกว่า 0", it.ProductName)
		}
	}

	// 4. For each item: find/create lot, add quantity, create movement
	for _, it := range items {
		lotID, err := s.findOrCreateLot(tx, it.ProductID, it.LotNo, it.ExpireDate, it.UnitCost, nil)
		if err != nil {
			return fmt.Errorf("สร้าง lot ไม่สำเร็จ: %w", err)
		}

		// Update lot_id in item
		if _, err := tx.Exec(`UPDATE stock_document_items SET lot_id=? WHERE id=?`, lotID, it.ID); err != nil {
			return err
		}

		// Add quantity to lot
		if _, err := tx.Exec(
			`UPDATE stock_lots SET quantity_on_hand=quantity_on_hand+?,
			  updated_at=datetime('now','localtime') WHERE id=?`,
			it.Quantity, lotID,
		); err != nil {
			return err
		}

		// Calculate balances
		var lotBal, prodBal float64
		tx.QueryRow(`SELECT quantity_on_hand FROM stock_lots WHERE id=?`, lotID).Scan(&lotBal)
		tx.QueryRow(`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, it.ProductID).Scan(&prodBal)

		mvtType := "IN"
		if docType == "OPENING" {
			mvtType = "OPENING"
		}

		// Create movement
		if _, err := tx.Exec(
			`INSERT INTO stock_movements(document_id, document_item_id, product_id, lot_id,
			  movement_type, quantity_in, quantity_out, lot_balance_after, product_balance_after, created_by)
			 VALUES(?,?,?,?,?,?,0,?,?,?)`,
			docID, it.ID, it.ProductID, lotID, mvtType, it.Quantity, lotBal, prodBal, confirmedByID,
		); err != nil {
			return err
		}
	}

	// 5. Confirm document
	if _, err := tx.Exec(
		`UPDATE stock_documents SET status='Confirmed', confirmed_by=?, confirmed_at=datetime('now','localtime'),
		  updated_at=datetime('now','localtime') WHERE id=?`,
		confirmedByID, docID,
	); err != nil {
		return err
	}

	util.WriteAuditLogTx(tx, confirmedByID, "CONFIRM", "stock_documents", docID, nil, nil)
	return tx.Commit()
}

// ─── Confirm Stock Out ────────────────────────────────────────────────────────

func (s *StockService) GetFEFOLots(productID int64, neededQty float64) ([]models.LotAllocation, error) {
	rows, err := s.db.Query(
		`SELECT id, product_id, lot_no, COALESCE(expire_date,''), quantity_on_hand, unit_cost,
		        supplier_id, created_at, updated_at
		 FROM stock_lots WHERE product_id=? AND quantity_on_hand > 0
		 ORDER BY CASE WHEN expire_date IS NULL THEN '9999-99-99' ELSE expire_date END, id`,
		productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var lots []models.StockLot
	for rows.Next() {
		var l models.StockLot
		if err := rows.Scan(&l.ID, &l.ProductID, &l.LotNo, &l.ExpireDate, &l.QuantityOnHand,
			&l.UnitCost, &l.SupplierID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		lots = append(lots, l)
	}
	return util.AllocateFEFO(lots, neededQty), nil
}

func (s *StockService) ConfirmStockOut(docID int64, confirmedByID int64) error {
	tx, cancel, err := beginTx(s.db)
	if err != nil {
		return err
	}
	defer cancel()
	defer tx.Rollback()

	// 1. Verify document
	var status, docType string
	if err := tx.QueryRow(`SELECT status, document_type FROM stock_documents WHERE id=?`, docID).Scan(&status, &docType); err != nil {
		return fmt.Errorf("ไม่พบเอกสาร: %w", err)
	}
	if status != "Draft" {
		return fmt.Errorf("เอกสารนี้ไม่อยู่ในสถานะ Draft")
	}
	if docType != "OUT" {
		return fmt.Errorf("เอกสารนี้ไม่ใช่เอกสารเบิกออก")
	}

	items, err := s.getDocumentItemsTx(tx, docID)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return fmt.Errorf("ต้องมีอย่างน้อย 1 รายการ")
	}

	for _, it := range items {
		qty := it.ApprovedQty
		if qty <= 0 {
			return fmt.Errorf("สินค้า %s จำนวนอนุมัติต้องมากกว่า 0", it.ProductName)
		}

		// FEFO allocation
		allocs, err := s.getFEFOLotsTx(tx, it.ProductID, qty)
		if err != nil {
			return err
		}
		totalAvail := 0.0
		for _, a := range allocs {
			totalAvail += a.Allocate
		}
		if totalAvail < qty {
			return fmt.Errorf("สินค้า %s stock ไม่พอ (ต้องการ %.2f มีเพียง %.2f)", it.ProductName, qty, totalAvail)
		}

		totalIssued := 0.0
		for _, alloc := range allocs {
			if alloc.Allocate <= 0 {
				continue
			}
			// Deduct lot
			if _, err := tx.Exec(
				`UPDATE stock_lots SET quantity_on_hand=quantity_on_hand-?,
				  updated_at=datetime('now','localtime') WHERE id=?`,
				alloc.Allocate, alloc.LotID,
			); err != nil {
				return err
			}

			var lotBal, prodBal float64
			tx.QueryRow(`SELECT quantity_on_hand FROM stock_lots WHERE id=?`, alloc.LotID).Scan(&lotBal)
			tx.QueryRow(`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, it.ProductID).Scan(&prodBal)

			// Create movement
			if _, err := tx.Exec(
				`INSERT INTO stock_movements(document_id, document_item_id, product_id, lot_id,
				  movement_type, quantity_in, quantity_out, lot_balance_after, product_balance_after, created_by)
				 VALUES(?,?,?,?,'OUT',0,?,?,?,?)`,
				docID, it.ID, it.ProductID, alloc.LotID, alloc.Allocate, lotBal, prodBal, confirmedByID,
			); err != nil {
				return err
			}
			totalIssued += alloc.Allocate
		}

		// Update issued_qty on item
		if _, err := tx.Exec(
			`UPDATE stock_document_items SET issued_qty=? WHERE id=?`, totalIssued, it.ID,
		); err != nil {
			return err
		}
	}

	// Confirm document
	if _, err := tx.Exec(
		`UPDATE stock_documents SET status='Confirmed', confirmed_by=?,
		  confirmed_at=datetime('now','localtime'), updated_at=datetime('now','localtime')
		 WHERE id=?`,
		confirmedByID, docID,
	); err != nil {
		return err
	}

	util.WriteAuditLogTx(tx, confirmedByID, "CONFIRM", "stock_documents", docID, nil, nil)
	return tx.Commit()
}

// ─── Cancel Document ──────────────────────────────────────────────────────────

func (s *StockService) CancelDocument(docID int64, reason string, userID int64) error {
	tx, cancel, err := beginTx(s.db)
	if err != nil {
		return err
	}
	defer cancel()
	defer tx.Rollback()

	var status, docType string
	if err := tx.QueryRow(`SELECT status, document_type FROM stock_documents WHERE id=?`, docID).Scan(&status, &docType); err != nil {
		return fmt.Errorf("ไม่พบเอกสาร")
	}
	if status == "Cancelled" {
		return fmt.Errorf("เอกสารถูกยกเลิกแล้ว")
	}

	// If confirmed, create REVERSAL movements
	if status == "Confirmed" {
		mvtRows, err := tx.Query(
			`SELECT id, product_id, lot_id, document_item_id, movement_type,
			        quantity_in, quantity_out
			 FROM stock_movements WHERE document_id=?`, docID)
		if err != nil {
			return err
		}
		defer mvtRows.Close()

		type mvt struct {
			id, productID, lotID, itemID int64
			mvtType                      string
			qIn, qOut                    float64
		}
		var mvts []mvt
		for mvtRows.Next() {
			var m mvt
			if err := mvtRows.Scan(&m.id, &m.productID, &m.lotID, &m.itemID, &m.mvtType, &m.qIn, &m.qOut); err != nil {
				return err
			}
			mvts = append(mvts, m)
		}
		mvtRows.Close()

		for _, m := range mvts {
			reverseIn := m.qOut
			reverseOut := m.qIn

			if _, err := tx.Exec(
				`UPDATE stock_lots SET quantity_on_hand=quantity_on_hand+?-?,
				  updated_at=datetime('now','localtime') WHERE id=?`,
				reverseIn, reverseOut, m.lotID,
			); err != nil {
				return err
			}

			var lotBal, prodBal float64
			tx.QueryRow(`SELECT quantity_on_hand FROM stock_lots WHERE id=?`, m.lotID).Scan(&lotBal)
			tx.QueryRow(`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, m.productID).Scan(&prodBal)

			if _, err := tx.Exec(
				`INSERT INTO stock_movements(document_id, document_item_id, product_id, lot_id,
				  movement_type, quantity_in, quantity_out, lot_balance_after, product_balance_after, created_by)
				 VALUES(?,?,?,?,'REVERSAL',?,?,?,?,?)`,
				docID, m.itemID, m.productID, m.lotID,
				reverseIn, reverseOut, lotBal, prodBal, userID,
			); err != nil {
				return err
			}
		}
	}

	if _, err := tx.Exec(
		`UPDATE stock_documents SET status='Cancelled', note=note||' [ยกเลิก: '||?||']',
		  updated_at=datetime('now','localtime') WHERE id=?`,
		reason, docID,
	); err != nil {
		return err
	}

	util.WriteAuditLogTx(tx, userID, "CANCEL", "stock_documents", docID, nil, map[string]string{"reason": reason})
	return tx.Commit()
}

// ─── Adjustment ──────────────────────────────────────────────────────────────

func (s *StockService) CreateAdjustment(req models.AdjustmentRequest) (int64, error) {
	if req.Reason == "" {
		return 0, fmt.Errorf("ต้องระบุเหตุผลการปรับปรุง")
	}
	if len(req.Items) == 0 {
		return 0, fmt.Errorf("ต้องมีอย่างน้อย 1 รายการ")
	}

	tx, cancel, err := beginTx(s.db)
	if err != nil {
		return 0, err
	}
	defer cancel()
	defer tx.Rollback()

	date := req.DocumentDate
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	docNo, err := util.GenerateDocNo(s.db, "ADJ", time.Now())
	if err != nil {
		return 0, err
	}
	note := req.Note
	if note == "" {
		note = req.Reason
	}

	res, err := tx.Exec(
		`INSERT INTO stock_documents(document_no, document_type, document_date, note, created_by, status)
		 VALUES(?,'ADJUST',?,?,?,'Draft')`,
		docNo, date, note, req.CreatedBy,
	)
	if err != nil {
		return 0, err
	}
	docID, _ := res.LastInsertId()

	for _, it := range req.Items {
		itemRes, err := tx.Exec(
			`INSERT INTO stock_document_items(document_id, product_id, lot_no, expire_date,
			  quantity, note) VALUES(?,?,?,?,?,?)`,
			docID, it.ProductID, it.LotNo, nullStr(it.ExpireDate), it.Quantity, it.Note,
		)
		if err != nil {
			return 0, err
		}
		itemID, _ := itemRes.LastInsertId()

		lotID, err := s.findOrCreateLot(tx, it.ProductID, it.LotNo, it.ExpireDate, 0, nil)
		if err != nil {
			return 0, err
		}

		// Update item's lot_id
		tx.Exec(`UPDATE stock_document_items SET lot_id=? WHERE id=?`, lotID, itemID)

		// Get current qty and adjust
		var currentQty float64
		tx.QueryRow(`SELECT quantity_on_hand FROM stock_lots WHERE id=?`, lotID).Scan(&currentQty)
		diff := it.Quantity - currentQty

		if _, err := tx.Exec(
			`UPDATE stock_lots SET quantity_on_hand=?, updated_at=datetime('now','localtime') WHERE id=?`,
			it.Quantity, lotID,
		); err != nil {
			return 0, err
		}

		var prodBal float64
		tx.QueryRow(`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, it.ProductID).Scan(&prodBal)

		qIn, qOut := 0.0, 0.0
		if diff >= 0 {
			qIn = diff
		} else {
			qOut = -diff
		}

		if _, err := tx.Exec(
			`INSERT INTO stock_movements(document_id, document_item_id, product_id, lot_id,
			  movement_type, quantity_in, quantity_out, lot_balance_after, product_balance_after, created_by)
			 VALUES(?,?,?,?,'ADJUST',?,?,?,?,?)`,
			docID, itemID, it.ProductID, lotID, qIn, qOut, it.Quantity, prodBal, req.CreatedBy,
		); err != nil {
			return 0, err
		}
	}

	if _, err := tx.Exec(
		`UPDATE stock_documents SET status='Confirmed', confirmed_by=?,
		  confirmed_at=datetime('now','localtime'), updated_at=datetime('now','localtime')
		 WHERE id=?`,
		req.CreatedBy, docID,
	); err != nil {
		return 0, err
	}

	util.WriteAuditLogTx(tx, req.CreatedBy, "ADJUST", "stock_documents", docID, nil, req)
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return docID, nil
}

// ─── Stock Lots ──────────────────────────────────────────────────────────────

func (s *StockService) GetStockLots(productID int64) ([]models.StockLot, error) {
	rows, err := s.db.Query(`
		SELECT sl.id, sl.product_id, COALESCE(p.code,''), COALESCE(p.name,''),
		       sl.lot_no, COALESCE(sl.expire_date,''), sl.quantity_on_hand,
		       sl.unit_cost, sl.supplier_id, COALESCE(sup.name,''), sl.created_at, sl.updated_at
		FROM stock_lots sl
		LEFT JOIN products p ON p.id = sl.product_id
		LEFT JOIN suppliers sup ON sup.id = sl.supplier_id
		WHERE sl.product_id=?
		ORDER BY CASE WHEN sl.expire_date IS NULL THEN '9999-99-99' ELSE sl.expire_date END, sl.id`,
		productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.StockLot{}
	for rows.Next() {
		var l models.StockLot
		if err := rows.Scan(&l.ID, &l.ProductID, &l.ProductCode, &l.ProductName,
			&l.LotNo, &l.ExpireDate, &l.QuantityOnHand,
			&l.UnitCost, &l.SupplierID, &l.SupplierName, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, nil
}

func (s *StockService) GetCurrentStock(productID int64) (float64, error) {
	var stock float64
	err := s.db.QueryRow(
		`SELECT COALESCE(SUM(quantity_on_hand),0) FROM stock_lots WHERE product_id=?`, productID,
	).Scan(&stock)
	return stock, err
}

// ─── Stock Card ──────────────────────────────────────────────────────────────

func (s *StockService) GetStockCard(productID int64, dateFrom, dateTo string) ([]models.StockMovement, error) {
	q := `SELECT sm.id, sm.document_id, COALESCE(sd.document_no,''), sm.document_item_id,
	             sm.product_id, sm.lot_id,
	             COALESCE(sl.lot_no,''), COALESCE(sl.expire_date,''),
	             sm.movement_type, sm.quantity_in, sm.quantity_out,
	             sm.lot_balance_after, sm.product_balance_after,
	             sm.created_by, COALESCE(u.display_name,''), sm.created_at
	      FROM stock_movements sm
	      LEFT JOIN stock_documents sd ON sd.id = sm.document_id
	      LEFT JOIN stock_lots sl ON sl.id = sm.lot_id
	      LEFT JOIN users u ON u.id = sm.created_by
	      WHERE sm.product_id=?`
	args := []any{productID}
	if dateFrom != "" {
		q += " AND sm.created_at >= ?"
		args = append(args, dateFrom)
	}
	if dateTo != "" {
		q += " AND sm.created_at <= ?"
		args = append(args, dateTo+" 23:59:59")
	}
	q += " ORDER BY sm.id"

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.StockMovement{}
	for rows.Next() {
		var m models.StockMovement
		if err := rows.Scan(
			&m.ID, &m.DocumentID, &m.DocumentNo, &m.DocumentItemID,
			&m.ProductID, &m.LotID, &m.LotNo, &m.ExpireDate,
			&m.MovementType, &m.QuantityIn, &m.QuantityOut,
			&m.LotBalanceAfter, &m.ProductBalanceAfter,
			&m.CreatedBy, &m.CreatedByName, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

func (s *StockService) GetDashboardSummary() (*models.DashboardSummary, error) {
	sum := &models.DashboardSummary{}

	// Low stock count
	s.db.QueryRow(`
		SELECT COUNT(*) FROM (
		  SELECT product_id FROM stock_lots GROUP BY product_id
		  HAVING SUM(quantity_on_hand) > 0 AND SUM(quantity_on_hand) <= (
		    SELECT reorder_level FROM products WHERE id=product_id
		  )
		)`).Scan(&sum.LowStockCount)

	// Out of stock
	s.db.QueryRow(`
		SELECT COUNT(*) FROM products p
		WHERE p.is_active=1 AND COALESCE((
		  SELECT SUM(quantity_on_hand) FROM stock_lots WHERE product_id=p.id
		),0) = 0`).Scan(&sum.OutOfStockCount)

	// Near expiry (180 days / 6 months)
	s.db.QueryRow(`
		SELECT COUNT(*) FROM stock_lots
		WHERE expire_date IS NOT NULL
		  AND expire_date <= date('now','localtime','+180 days')
		  AND expire_date >= date('now','localtime')
		  AND quantity_on_hand > 0`).Scan(&sum.NearExpiryCount)

	// Total stock value
	s.db.QueryRow(`
		SELECT COALESCE(SUM(quantity_on_hand * unit_cost),0) FROM stock_lots`).Scan(&sum.TotalStockValue)

	// Today transactions
	today := time.Now().Format("2006-01-02")
	s.db.QueryRow(`SELECT COUNT(*) FROM stock_documents WHERE document_type='IN' AND document_date=? AND status='Confirmed'`, today).Scan(&sum.TodayInCount)
	s.db.QueryRow(`SELECT COUNT(*) FROM stock_documents WHERE document_type='OUT' AND document_date=? AND status='Confirmed'`, today).Scan(&sum.TodayOutCount)

	// Recent documents
	docs, err := s.GetDocuments(models.DocFilter{})
	if err == nil && len(docs) > 10 {
		sum.RecentDocuments = docs[:10]
	} else {
		sum.RecentDocuments = docs
	}

	return sum, nil
}

func (s *StockService) GetLowStockAlerts() ([]models.LowStockItem, error) {
	rows, err := s.db.Query(`
		SELECT p.id, p.code, p.name,
		       COALESCE(SUM(sl.quantity_on_hand),0) AS stock,
		       p.reorder_level, COALESCE(u.name,'')
		FROM products p
		LEFT JOIN stock_lots sl ON sl.product_id=p.id
		LEFT JOIN units u ON u.id=p.base_unit_id
		WHERE p.is_active=1
		GROUP BY p.id
		HAVING stock <= p.reorder_level
		ORDER BY stock ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.LowStockItem{}
	for rows.Next() {
		var it models.LowStockItem
		if err := rows.Scan(&it.ProductID, &it.ProductCode, &it.ProductName,
			&it.CurrentStock, &it.ReorderLevel, &it.UnitName); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, nil
}

func (s *StockService) GetNearExpiryAlerts(daysAhead int) ([]models.ExpiryAlert, error) {
	rows, err := s.db.Query(`
		SELECT sl.id, sl.product_id, p.code, p.name, sl.lot_no,
		       sl.expire_date, sl.quantity_on_hand, COALESCE(u.name,''),
		       CAST(julianday(sl.expire_date) - julianday('now','localtime') AS INTEGER)
		FROM stock_lots sl
		JOIN products p ON p.id=sl.product_id
		LEFT JOIN units u ON u.id=p.base_unit_id
		WHERE sl.expire_date IS NOT NULL
		  AND sl.expire_date <= date('now','localtime','+'||?||' days')
		  AND sl.quantity_on_hand > 0
		ORDER BY sl.expire_date`, daysAhead)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.ExpiryAlert{}
	for rows.Next() {
		var a models.ExpiryAlert
		if err := rows.Scan(&a.LotID, &a.ProductID, &a.ProductCode, &a.ProductName,
			&a.LotNo, &a.ExpireDate, &a.Quantity, &a.UnitName, &a.DaysLeft); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

// GetMovementChart returns daily in/out quantity totals for the last N days.
func (s *StockService) GetMovementChart(days int) ([]models.MovementChartPoint, error) {
	rows, err := s.db.Query(`
		WITH RECURSIVE dates(d) AS (
			SELECT date('now','localtime','-'||(?-1)||' days')
			UNION ALL
			SELECT date(d, '+1 day') FROM dates WHERE d < date('now','localtime')
		)
		SELECT d,
		       COALESCE(SUM(m.quantity_in),0),
		       COALESCE(SUM(m.quantity_out),0)
		FROM dates
		LEFT JOIN stock_movements m ON date(m.created_at) = d
		  AND m.movement_type IN ('IN','OPENING','OUT','ADJUST')
		GROUP BY d
		ORDER BY d`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.MovementChartPoint{}
	for rows.Next() {
		var p models.MovementChartPoint
		if err := rows.Scan(&p.Date, &p.TotalIn, &p.TotalOut); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func (s *StockService) findOrCreateLot(tx *sql.Tx, productID int64, lotNo, expireDate string, unitCost float64, supplierID *int64) (int64, error) {
	var id int64
	var err error
	if expireDate == "" {
		err = tx.QueryRow(
			`SELECT id FROM stock_lots WHERE product_id=? AND lot_no=? AND expire_date IS NULL`,
			productID, lotNo,
		).Scan(&id)
	} else {
		err = tx.QueryRow(
			`SELECT id FROM stock_lots WHERE product_id=? AND lot_no=? AND expire_date=?`,
			productID, lotNo, expireDate,
		).Scan(&id)
	}
	if err == sql.ErrNoRows {
		var res sql.Result
		res, err = tx.Exec(
			`INSERT INTO stock_lots(product_id, lot_no, expire_date, quantity_on_hand, unit_cost, supplier_id)
			 VALUES(?,?,?,0,?,?)`,
			productID, lotNo, nullStr(expireDate), unitCost, supplierID,
		)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}
	return id, err
}

func (s *StockService) getDocumentItemsTx(tx *sql.Tx, docID int64) ([]models.StockDocumentItem, error) {
	rows, err := tx.Query(`
		SELECT i.id, i.document_id, i.product_id, COALESCE(p.code,''), COALESCE(p.name,''),
		       COALESCE(u.name,''),
		       i.lot_id, i.lot_no, COALESCE(i.expire_date,''),
		       i.quantity, i.requested_qty, i.approved_qty, i.issued_qty,
		       i.unit_cost, i.reject_reason, i.note
		FROM stock_document_items i
		LEFT JOIN products p ON p.id = i.product_id
		LEFT JOIN units u ON u.id = p.base_unit_id
		WHERE i.document_id=?
		ORDER BY i.id`, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.StockDocumentItem{}
	for rows.Next() {
		var it models.StockDocumentItem
		if err := rows.Scan(
			&it.ID, &it.DocumentID, &it.ProductID, &it.ProductCode, &it.ProductName,
			&it.UnitName,
			&it.LotID, &it.LotNo, &it.ExpireDate,
			&it.Quantity, &it.RequestedQty, &it.ApprovedQty, &it.IssuedQty,
			&it.UnitCost, &it.RejectReason, &it.Note,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, nil
}

func (s *StockService) getFEFOLotsTx(tx *sql.Tx, productID int64, neededQty float64) ([]models.LotAllocation, error) {
	rows, err := tx.Query(
		`SELECT id, product_id, lot_no, COALESCE(expire_date,''), quantity_on_hand, unit_cost,
		        supplier_id, created_at, updated_at
		 FROM stock_lots WHERE product_id=? AND quantity_on_hand > 0
		 ORDER BY CASE WHEN expire_date IS NULL THEN '9999-99-99' ELSE expire_date END, id`,
		productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var lots []models.StockLot
	for rows.Next() {
		var l models.StockLot
		if err := rows.Scan(&l.ID, &l.ProductID, &l.LotNo, &l.ExpireDate, &l.QuantityOnHand,
			&l.UnitCost, &l.SupplierID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		lots = append(lots, l)
	}
	return util.AllocateFEFO(lots, neededQty), nil
}

// ─── Report helpers ───────────────────────────────────────────────────────────

func (s *StockService) GetInventoryReport() ([]models.StockLot, error) {
	rows, err := s.db.Query(`
		SELECT sl.id, sl.product_id, COALESCE(p.code,''), COALESCE(p.name,''),
		       sl.lot_no, COALESCE(sl.expire_date,''), sl.quantity_on_hand,
		       sl.unit_cost, sl.supplier_id, COALESCE(sup.name,''), sl.created_at, sl.updated_at
		FROM stock_lots sl
		JOIN products p ON p.id=sl.product_id AND p.is_active=1
		LEFT JOIN suppliers sup ON sup.id=sl.supplier_id
		WHERE sl.quantity_on_hand > 0
		ORDER BY p.code, sl.expire_date`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.StockLot{}
	for rows.Next() {
		var l models.StockLot
		if err := rows.Scan(&l.ID, &l.ProductID, &l.ProductCode, &l.ProductName,
			&l.LotNo, &l.ExpireDate, &l.QuantityOnHand,
			&l.UnitCost, &l.SupplierID, &l.SupplierName, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, nil
}
