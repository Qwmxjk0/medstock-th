package util

import (
	"database/sql"
	"fmt"
	"time"
)

// GenerateDocNo generates a document number like IN-20250110-0001
func GenerateDocNo(db *sql.DB, prefix string, date time.Time) (string, error) {
	dateStr := date.Format("20060102")
	pattern := prefix + "-" + dateStr + "-%"

	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM stock_documents WHERE document_no LIKE ?`, pattern,
	).Scan(&count)
	if err != nil {
		return "", fmt.Errorf("count doc nos: %w", err)
	}

	return fmt.Sprintf("%s-%s-%04d", prefix, dateStr, count+1), nil
}

// DocTypePrefix maps document types to their prefix
func DocTypePrefix(docType string) string {
	switch docType {
	case "IN":
		return "IN"
	case "OUT":
		return "OUT"
	case "ADJUST":
		return "ADJ"
	case "OPENING":
		return "OPN"
	default:
		return "DOC"
	}
}
