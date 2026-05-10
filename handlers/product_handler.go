package handlers

import (
	"medstock/models"
	"medstock/services"
)

type ProductHandler struct {
	svc *services.ProductService
}

func NewProductHandler(svc *services.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

func (h *ProductHandler) GetProducts(search string, activeOnly bool) ([]models.Product, error) {
	return h.svc.GetProducts(search, activeOnly)
}
func (h *ProductHandler) GetProductByID(id int64) (*models.Product, error) {
	return h.svc.GetProductByID(id)
}
func (h *ProductHandler) CreateProduct(req models.CreateProductRequest, userID int64) (int64, error) {
	return h.svc.CreateProduct(req, userID)
}
func (h *ProductHandler) UpdateProduct(id int64, req models.CreateProductRequest, userID int64) error {
	return h.svc.UpdateProduct(id, req, userID)
}
func (h *ProductHandler) DeactivateProduct(id int64, userID int64) error {
	return h.svc.DeactivateProduct(id, userID)
}
func (h *ProductHandler) CheckDuplicateName(name string, excludeID int64) ([]models.Product, error) {
	return h.svc.CheckDuplicateName(name, excludeID)
}
func (h *ProductHandler) GetProductAliases(productID int64) ([]models.ProductAlias, error) {
	return h.svc.GetProductAliases(productID)
}
func (h *ProductHandler) SaveProductAlias(a models.ProductAlias) error {
	return h.svc.SaveProductAlias(a)
}
