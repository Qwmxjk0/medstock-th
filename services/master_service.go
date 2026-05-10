package services

import (
	"database/sql"
	"fmt"
	"medstock/models"
	"medstock/util"

	"golang.org/x/crypto/bcrypt"
)

type MasterService struct {
	db *sql.DB
}

func NewMasterService(db *sql.DB) *MasterService {
	return &MasterService{db: db}
}

// ─── Units ──────────────────────────────────────────────────────────────────

func (s *MasterService) GetUnits(activeOnly bool) ([]models.Unit, error) {
	q := `SELECT id, name, is_active, created_at, updated_at FROM units`
	if activeOnly {
		q += ` WHERE is_active = 1`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	units := []models.Unit{}
	for rows.Next() {
		var u models.Unit
		if err := rows.Scan(&u.ID, &u.Name, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		units = append(units, u)
	}
	return units, nil
}

func (s *MasterService) SaveUnit(u models.Unit) (int64, error) {
	if u.Name == "" {
		return 0, fmt.Errorf("ชื่อหน่วยนับห้ามว่าง")
	}
	if u.ID == 0 {
		res, err := s.db.Exec(
			`INSERT INTO units(name) VALUES(?)`, u.Name)
		if err != nil {
			return 0, fmt.Errorf("บันทึกหน่วยนับไม่สำเร็จ: %w", err)
		}
		return res.LastInsertId()
	}
	_, err := s.db.Exec(
		`UPDATE units SET name=?, updated_at=datetime('now','localtime') WHERE id=?`,
		u.Name, u.ID)
	return u.ID, err
}

func (s *MasterService) DeactivateUnit(id int64, userID int64) error {
	_, err := s.db.Exec(
		`UPDATE units SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, userID, "DEACTIVATE", "units", id, nil, nil)
	}
	return err
}

// ─── Departments ─────────────────────────────────────────────────────────────

func (s *MasterService) GetDepartments(activeOnly bool) ([]models.Department, error) {
	q := `SELECT id, name, is_active, created_at, updated_at FROM departments`
	if activeOnly {
		q += ` WHERE is_active = 1`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Department{}
	for rows.Next() {
		var d models.Department
		if err := rows.Scan(&d.ID, &d.Name, &d.IsActive, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, nil
}

func (s *MasterService) SaveDepartment(d models.Department) (int64, error) {
	if d.Name == "" {
		return 0, fmt.Errorf("ชื่อหน่วยงานห้ามว่าง")
	}
	if d.ID == 0 {
		res, err := s.db.Exec(`INSERT INTO departments(name) VALUES(?)`, d.Name)
		if err != nil {
			return 0, fmt.Errorf("บันทึกหน่วยงานไม่สำเร็จ: %w", err)
		}
		return res.LastInsertId()
	}
	_, err := s.db.Exec(
		`UPDATE departments SET name=?, updated_at=datetime('now','localtime') WHERE id=?`,
		d.Name, d.ID)
	return d.ID, err
}

func (s *MasterService) DeactivateDepartment(id int64, userID int64) error {
	_, err := s.db.Exec(
		`UPDATE departments SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, userID, "DEACTIVATE", "departments", id, nil, nil)
	}
	return err
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

func (s *MasterService) GetSuppliers(activeOnly bool) ([]models.Supplier, error) {
	q := `SELECT id, name, contact, is_active, created_at, updated_at FROM suppliers`
	if activeOnly {
		q += ` WHERE is_active = 1`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Supplier{}
	for rows.Next() {
		var sup models.Supplier
		if err := rows.Scan(&sup.ID, &sup.Name, &sup.Contact, &sup.IsActive, &sup.CreatedAt, &sup.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, sup)
	}
	return list, nil
}

func (s *MasterService) SaveSupplier(sup models.Supplier) (int64, error) {
	if sup.Name == "" {
		return 0, fmt.Errorf("ชื่อบริษัทห้ามว่าง")
	}
	if sup.ID == 0 {
		res, err := s.db.Exec(`INSERT INTO suppliers(name, contact) VALUES(?, ?)`, sup.Name, sup.Contact)
		if err != nil {
			return 0, fmt.Errorf("บันทึกบริษัทไม่สำเร็จ: %w", err)
		}
		return res.LastInsertId()
	}
	_, err := s.db.Exec(
		`UPDATE suppliers SET name=?, contact=?, updated_at=datetime('now','localtime') WHERE id=?`,
		sup.Name, sup.Contact, sup.ID)
	return sup.ID, err
}

func (s *MasterService) DeactivateSupplier(id int64, userID int64) error {
	_, err := s.db.Exec(
		`UPDATE suppliers SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, userID, "DEACTIVATE", "suppliers", id, nil, nil)
	}
	return err
}

// ─── Categories ──────────────────────────────────────────────────────────────

func (s *MasterService) GetCategories(activeOnly bool) ([]models.ProductCategory, error) {
	q := `SELECT id, name, is_active, created_at, updated_at FROM product_categories`
	if activeOnly {
		q += ` WHERE is_active = 1`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.ProductCategory{}
	for rows.Next() {
		var c models.ProductCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *MasterService) SaveCategory(c models.ProductCategory) (int64, error) {
	if c.Name == "" {
		return 0, fmt.Errorf("ชื่อประเภทสินค้าห้ามว่าง")
	}
	if c.ID == 0 {
		res, err := s.db.Exec(`INSERT INTO product_categories(name) VALUES(?)`, c.Name)
		if err != nil {
			return 0, fmt.Errorf("บันทึกประเภทสินค้าไม่สำเร็จ: %w", err)
		}
		return res.LastInsertId()
	}
	_, err := s.db.Exec(
		`UPDATE product_categories SET name=?, updated_at=datetime('now','localtime') WHERE id=?`,
		c.Name, c.ID)
	return c.ID, err
}

func (s *MasterService) DeactivateCategory(id int64, userID int64) error {
	_, err := s.db.Exec(
		`UPDATE product_categories SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, userID, "DEACTIVATE", "product_categories", id, nil, nil)
	}
	return err
}

// ─── Users ───────────────────────────────────────────────────────────────────

func (s *MasterService) GetUsers() ([]models.User, error) {
	rows, err := s.db.Query(
		`SELECT id, username, display_name, is_system_account, is_active,
		        COALESCE(locked_at,''), COALESCE(last_selected_at,''), created_at, updated_at
		 FROM users ORDER BY display_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.IsSystemAccount,
			&u.IsActive, &u.LockedAt, &u.LastSelectedAt, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, u)
	}
	return list, nil
}

func (s *MasterService) SaveUser(u models.User) (int64, error) {
	if u.DisplayName == "" || u.Username == "" {
		return 0, fmt.Errorf("ชื่อผู้ใช้และชื่อแสดงห้ามว่าง")
	}
	if u.ID == 0 {
		res, err := s.db.Exec(
			`INSERT INTO users(username, display_name) VALUES(?, ?)`,
			u.Username, u.DisplayName)
		if err != nil {
			return 0, fmt.Errorf("บันทึกผู้ใช้ไม่สำเร็จ: %w", err)
		}
		return res.LastInsertId()
	}
	_, err := s.db.Exec(
		`UPDATE users SET display_name=?, updated_at=datetime('now','localtime') WHERE id=?`,
		u.DisplayName, u.ID)
	return u.ID, err
}

func (s *MasterService) DeactivateUser(id int64, adminUserID int64) error {
	_, err := s.db.Exec(
		`UPDATE users SET is_active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
	if err == nil {
		util.WriteAuditLog(s.db, adminUserID, "DEACTIVATE", "users", id, nil, nil)
	}
	return err
}

func (s *MasterService) UpdateUserLastSelected(id int64) error {
	_, err := s.db.Exec(
		`UPDATE users SET last_selected_at=datetime('now','localtime') WHERE id=?`, id)
	return err
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Login verifies username+password and returns the user on success.
func (s *MasterService) Login(username, password string) (*models.User, error) {
	var u models.User
	var hash sql.NullString
	err := s.db.QueryRow(
		`SELECT id, username, display_name, password_hash, is_system_account, is_active,
		        COALESCE(locked_at,''), COALESCE(last_selected_at,''), created_at, updated_at
		 FROM users WHERE username=? AND is_active=1`,
		username,
	).Scan(&u.ID, &u.Username, &u.DisplayName, &hash, &u.IsSystemAccount,
		&u.IsActive, &u.LockedAt, &u.LastSelectedAt, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ไม่พบผู้ใช้หรือถูกปิดใช้งาน")
	}
	if err != nil {
		return nil, err
	}
	if !hash.Valid || hash.String == "" {
		return nil, fmt.Errorf("ผู้ใช้นี้ยังไม่ได้ตั้งรหัสผ่าน")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash.String), []byte(password)); err != nil {
		return nil, fmt.Errorf("รหัสผ่านไม่ถูกต้อง")
	}
	_ = s.UpdateUserLastSelected(u.ID)
	return &u, nil
}

// VerifyPassword checks if the given password matches the stored hash for userID.
// sysadmin can verify against any user (pass userID=sysadmin's ID).
func (s *MasterService) VerifyPassword(userID int64, password string) error {
	var hash sql.NullString
	err := s.db.QueryRow(
		`SELECT password_hash FROM users WHERE id=? AND is_active=1`, userID,
	).Scan(&hash)
	if err == sql.ErrNoRows {
		return fmt.Errorf("ไม่พบผู้ใช้")
	}
	if err != nil {
		return err
	}
	if !hash.Valid || hash.String == "" {
		return fmt.Errorf("ยังไม่ได้ตั้งรหัสผ่าน")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash.String), []byte(password)); err != nil {
		return fmt.Errorf("รหัสผ่านไม่ถูกต้อง")
	}
	return nil
}

// SetPassword sets a new password for a user (requires current password for self-change,
// or sysadmin can reset any user's password via ResetPassword).
func (s *MasterService) SetPassword(userID int64, oldPassword, newPassword string) error {
	if len(newPassword) < 6 {
		return fmt.Errorf("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
	}
	if err := s.VerifyPassword(userID, oldPassword); err != nil {
		return fmt.Errorf("รหัสผ่านเดิมไม่ถูกต้อง")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		`UPDATE users SET password_hash=?, must_change_password=0, updated_at=datetime('now','localtime') WHERE id=?`,
		string(hash), userID)
	return err
}

// ResetPassword allows sysadmin to forcibly set a new password for any user.
func (s *MasterService) ResetPassword(adminID, targetUserID int64, newPassword string) error {
	if len(newPassword) < 6 {
		return fmt.Errorf("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
	}
	// only sysadmin can reset others
	var isSys int
	s.db.QueryRow(`SELECT is_system_account FROM users WHERE id=?`, adminID).Scan(&isSys)
	if isSys == 0 {
		return fmt.Errorf("เฉพาะผู้ดูแลระบบเท่านั้น")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		`UPDATE users SET password_hash=?, must_change_password=1, updated_at=datetime('now','localtime') WHERE id=?`,
		string(hash), targetUserID)
	if err == nil {
		util.WriteAuditLog(s.db, adminID, "RESET_PASSWORD", "users", targetUserID, nil, nil)
	}
	return err
}

// CreateUser creates a new user with an initial password (sysadmin only).
func (s *MasterService) CreateUser(adminID int64, u models.User, initialPassword string) (int64, error) {
	if u.DisplayName == "" || u.Username == "" {
		return 0, fmt.Errorf("ชื่อผู้ใช้และชื่อแสดงห้ามว่าง")
	}
	if len(initialPassword) < 6 {
		return 0, fmt.Errorf("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
	}
	var isSys int
	s.db.QueryRow(`SELECT is_system_account FROM users WHERE id=?`, adminID).Scan(&isSys)
	if isSys == 0 {
		return 0, fmt.Errorf("เฉพาะผู้ดูแลระบบเท่านั้น")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(initialPassword), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(
		`INSERT INTO users(username, display_name, password_hash, must_change_password) VALUES(?,?,?,1)`,
		u.Username, u.DisplayName, string(hash))
	if err != nil {
		return 0, fmt.Errorf("บันทึกผู้ใช้ไม่สำเร็จ: %w", err)
	}
	return res.LastInsertId()
}

// GetLoginableUsers returns active non-system users who have a password set (for login screen).
func (s *MasterService) GetLoginableUsers() ([]models.User, error) {
	rows, err := s.db.Query(
		`SELECT id, username, display_name, is_system_account, is_active,
		        COALESCE(locked_at,''), COALESCE(last_selected_at,''), created_at, updated_at
		 FROM users
		 WHERE is_active=1 AND password_hash IS NOT NULL AND password_hash != ''
		 ORDER BY last_selected_at DESC, display_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.IsSystemAccount,
			&u.IsActive, &u.LockedAt, &u.LastSelectedAt, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, u)
	}
	return list, nil
}

// UserMustChangePassword returns true if the user must change their password on next login.
func (s *MasterService) UserMustChangePassword(userID int64) bool {
	var v int
	s.db.QueryRow(`SELECT must_change_password FROM users WHERE id=?`, userID).Scan(&v)
	return v == 1
}
