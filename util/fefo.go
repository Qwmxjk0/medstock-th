package util

import (
	"medstock/models"
	"sort"
)

// AllocateFEFO allocates quantity across lots using FEFO (First Expire First Out).
// Lots with no expire date are treated as expiring last.
func AllocateFEFO(lots []models.StockLot, needed float64) []models.LotAllocation {
	sorted := make([]models.StockLot, len(lots))
	copy(sorted, lots)

	sort.Slice(sorted, func(i, j int) bool {
		a, b := sorted[i].ExpireDate, sorted[j].ExpireDate
		if a == "" && b == "" {
			return sorted[i].ID < sorted[j].ID
		}
		if a == "" {
			return false
		}
		if b == "" {
			return true
		}
		return a < b
	})

	var allocations []models.LotAllocation
	remaining := needed

	for _, lot := range sorted {
		if remaining <= 0 {
			break
		}
		if lot.QuantityOnHand <= 0 {
			continue
		}
		allocate := lot.QuantityOnHand
		if allocate > remaining {
			allocate = remaining
		}
		allocations = append(allocations, models.LotAllocation{
			LotID:      lot.ID,
			LotNo:      lot.LotNo,
			ExpireDate: lot.ExpireDate,
			Available:  lot.QuantityOnHand,
			Allocate:   allocate,
		})
		remaining -= allocate
	}

	return allocations
}
