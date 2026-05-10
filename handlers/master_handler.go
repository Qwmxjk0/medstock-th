package handlers

import (
	"medstock/models"
	"medstock/services"
)

type MasterHandler struct {
	svc *services.MasterService
}

func NewMasterHandler(svc *services.MasterService) *MasterHandler {
	return &MasterHandler{svc: svc}
}

func (h *MasterHandler) GetUnits(activeOnly bool) ([]models.Unit, error) {
	return h.svc.GetUnits(activeOnly)
}
func (h *MasterHandler) SaveUnit(u models.Unit) (int64, error) {
	return h.svc.SaveUnit(u)
}
func (h *MasterHandler) DeactivateUnit(id int64, userID int64) error {
	return h.svc.DeactivateUnit(id, userID)
}

func (h *MasterHandler) GetDepartments(activeOnly bool) ([]models.Department, error) {
	return h.svc.GetDepartments(activeOnly)
}
func (h *MasterHandler) SaveDepartment(d models.Department) (int64, error) {
	return h.svc.SaveDepartment(d)
}
func (h *MasterHandler) DeactivateDepartment(id int64, userID int64) error {
	return h.svc.DeactivateDepartment(id, userID)
}

func (h *MasterHandler) GetSuppliers(activeOnly bool) ([]models.Supplier, error) {
	return h.svc.GetSuppliers(activeOnly)
}
func (h *MasterHandler) SaveSupplier(sup models.Supplier) (int64, error) {
	return h.svc.SaveSupplier(sup)
}
func (h *MasterHandler) DeactivateSupplier(id int64, userID int64) error {
	return h.svc.DeactivateSupplier(id, userID)
}

func (h *MasterHandler) GetCategories(activeOnly bool) ([]models.ProductCategory, error) {
	return h.svc.GetCategories(activeOnly)
}
func (h *MasterHandler) SaveCategory(c models.ProductCategory) (int64, error) {
	return h.svc.SaveCategory(c)
}
func (h *MasterHandler) DeactivateCategory(id int64, userID int64) error {
	return h.svc.DeactivateCategory(id, userID)
}

func (h *MasterHandler) GetUsers() ([]models.User, error) {
	return h.svc.GetUsers()
}
func (h *MasterHandler) SaveUser(u models.User) (int64, error) {
	return h.svc.SaveUser(u)
}
func (h *MasterHandler) DeactivateUser(id int64, adminUserID int64) error {
	return h.svc.DeactivateUser(id, adminUserID)
}
func (h *MasterHandler) UpdateUserLastSelected(id int64) error {
	return h.svc.UpdateUserLastSelected(id)
}
