package services

import (
	"database/sql"
	"fmt"
	"medstock/models"
	"medstock/util"
)

type ProductService struct {
	db *sql.DB
}

func NewProductService(db *sql.DB) *ProductService {
	return &ProductService{db: db}
}

func (s *ProductService) GetProducts(search string, activeOnly bool) ([]models.Product, error) {
	q := `SELECT p.id, p.code, p.name,
	             p.category_id, COALESCE(c.name,''),
	             p.base_unit_id, COALESCE(u.name,''),
	             p.default_purchase_unit_id, p.default_issue_unit_id,
	             p.package_size, p.reorder_level, p.default_price, p.is_active,
	             COALESCE((SELECT SUM(sl.quantity_on_hand) FROM stock_lots sl WHERE sl.product_id=p.id),0),
	             EXISTS(SELECT 1 FROM stock_lots sl WHERE sl.product_id=p.id AND sl.quantity_on_hand>0
	                    AND sl.expire_date IS NOT NULL
	                    AND sl.expire_date <= date('now','localtime','+6 months')),
	             p.created_at, p.updated_at
	      FROM products p
	      LEFT JOIN product_categories c ON c.id = p.category_id
	      LEFT JOIN units u ON u.id = p.base_unit_id`

	var args []any
	var where []string
	if activeOnly {
		where = append(where, "p.is_active = 1")
	}
	if search != "" {
		where = append(where, "(p.code LIKE ? OR p.name LIKE ? OR EXISTS(SELECT 1 FROM product_aliases pa WHERE pa.product_id=p.id AND pa.alias LIKE ? AND pa.is_active=1))")
		like := "%" + search + "%"
		args = append(args, like, like, like)
	}
	if len(where) > 0 {
		q += " WHERE "
		for i, w := range where {
			if i > 0 {
				q += " AND "
			}
			q += w
		}
	}
	q += " ORDER BY p.code"

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.Product{}
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(
			&p.ID, &p.Code, &p.Name,
			&p.CategoryID, &p.CategoryName,
			&p.BaseUnitID, &p.BaseUnitName,
			&p.DefaultPurchaseUnitID, &p.DefaultIssueUnitID,
			&p.PackageSize, &p.ReorderLevel, &p.DefaultPrice, &p.IsActive,
			&p.CurrentStock, &p.HasNearExpiry,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (s *ProductService) GetProductByID(id int64) (*models.Product, error) {
	p := &models.Product{}
	err := s.db.QueryRow(`
		SELECT p.id, p.code, p.name,
		       p.category_id, COALESCE(c.name,''),
		       p.base_unit_id, COALESCE(u.name,''),
		       p.default_purchase_unit_id, p.default_issue_unit_id,
		       p.package_size, p.reorder_level, p.default_price, p.is_active,
		       COALESCE((SELECT SUM(sl.quantity_on_hand) FROM stock_lots sl WHERE sl.product_id=p.id),0),
		       0,
		       p.created_at, p.updated_at
		FROM products p
		LEFT JOIN product_categories c ON c.id = p.category_id
		LEFT JOIN units u ON u.id = p.base_unit_id
		WHERE p.id = ?`, id).Scan(
		&p.ID, &p.Code, &p.Name,
		&p.CategoryID, &p.CategoryName,
		&p.BaseUnitID, &p.BaseUnitName,
		&p.DefaultPurchaseUnitID, &p.DefaultIssueUnitID,
		&p.PackageSize, &p.ReorderLevel, &p.DefaultPrice, &p.IsActive,
		&p.CurrentStock, &p.HasNearExpiry,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ไม่พบสินค้า id=%d", id)
	}
	return p, err
}

func (s *ProductService) CheckDuplicateName(name string, excludeID int64) ([]models.Product, error) {
	rows, err := s.db.Query(
		`SELECT p.id, p.code, p.name,
		        p.category_id, COALESCE(c.name,''),
		        p.base_unit_id, COALESCE(u.name,''),
		        p.default_purchase_unit_id, p.default_issue_unit_id,
		        p.package_size, p.reorder_level, p.default_price, p.is_active,
		        0, 0, p.created_at, p.updated_at
		 FROM products p
		 LEFT JOIN product_categories c ON c.id = p.category_id
		 LEFT JOIN units u ON u.id = p.base_unit_id
		 WHERE p.name = ? AND p.id != ?`,
		name, excludeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Product{}
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(
			&p.ID, &p.Code, &p.Name,
			&p.CategoryID, &p.CategoryName,
			&p.BaseUnitID, &p.BaseUnitName,
			&p.DefaultPurchaseUnitID, &p.DefaultIssueUnitID,
			&p.PackageSize, &p.ReorderLevel, &p.DefaultPrice, &p.IsActive,
			&p.CurrentStock, &p.HasNearExpiry,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (s *ProductService) CreateProduct(req models.CreateProductRequest, userID int64) (int64, error) {
	if req.Code == "" || req.Name == "" {
		return 0, fmt.Errorf("รหัสและชื่อสินค้าห้ามว่าง")
	}
	if req.BaseUnitID == 0 {
		return 0, fmt.Errorf("ต้องระบุหน่วยนับหลัก")
	}
	res, err := s.db.Exec(
		`INSERT INTO products(code, name, category_id, base_unit_id,
		  default_purchase_unit_id, default_issue_unit_id,
		  package_size, reorder_level, default_price)
		 VALUES(?,?,?,?,?,?,?,?,?)`,
		req.Code, req.Name, req.CategoryID, req.BaseUnitID,
		req.DefaultPurchaseUnitID, req.DefaultIssueUnitID,
		req.PackageSize, req.ReorderLevel, req.DefaultPrice,
	)
	if err != nil {
		return 0, fmt.Errorf("บันทึกสินค้าไม่สำเร็จ: %w", err)
	}
	id, _ := res.LastInsertId()
	util.WriteAuditLog(s.db, userID, "CREATE", "products", id, nil, req)
	return id, nil
}

func (s *ProductService) UpdateProduct(id int64, req models.CreateProductRequest, userID int64) error {
	old, err := s.GetProductByID(id)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		`UPDATE products SET code=?, name=?, category_id=?, base_unit_id=?,
		  default_purchase_unit_id=?, default_issue_unit_id=?,
		  package_size=?, reorder_level=?, default_price=?,
		  updated_at=datetime('now','localtime')
		 WHERE id=?`,
		req.Code, req.Name, req.CategoryID, req.BaseUnitID,
		req.DefaultPurchaseUnitID, req.DefaultIssueUnitID,
		req.PackageSize, req.ReorderLevel, req.DefaultPrice, id,
	)
	if err != nil {
		return fmt.Errorf("แก้ไขสินค้าไม่สำเร็จ: %w", err)
	}
	util.WriteAuditLog(s.db, userID, "UPDATE", "products", id, old, req)
	return nil
}

func (s *ProductService) DeactivateProduct(id int64, userID int64) error {
	_, err := s.db.Exec(
		`UPDATE products SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, userID, "DEACTIVATE", "products", id, nil, nil)
	}
	return err
}

func (s *ProductService) GetProductAliases(productID int64) ([]models.ProductAlias, error) {
	rows, err := s.db.Query(
		`SELECT id, product_id, alias, alias_type, is_active FROM product_aliases WHERE product_id=?`,
		productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.ProductAlias{}
	for rows.Next() {
		var a models.ProductAlias
		if err := rows.Scan(&a.ID, &a.ProductID, &a.Alias, &a.AliasType, &a.IsActive); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

func (s *ProductService) SaveProductAlias(a models.ProductAlias) error {
	if a.Alias == "" {
		return fmt.Errorf("ชื่อเรียกอื่นห้ามว่าง")
	}
	if a.ID == 0 {
		_, err := s.db.Exec(
			`INSERT INTO product_aliases(product_id, alias, alias_type) VALUES(?,?,?)`,
			a.ProductID, a.Alias, a.AliasType)
		return err
	}
	_, err := s.db.Exec(
		`UPDATE product_aliases SET alias=?, alias_type=?, is_active=?,
		  updated_at=datetime('now','localtime') WHERE id=?`,
		a.Alias, a.AliasType, a.IsActive, a.ID)
	return err
}
