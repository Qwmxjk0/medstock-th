package util

import (
	"database/sql"
	"encoding/json"
)

// WriteAuditLog writes an audit log entry. Uses a no-op if tx/db is nil.
func WriteAuditLog(db *sql.DB, userID int64, action, tableName string, recordID int64, before, after any) error {
	var beforeJSON, afterJSON []byte
	var err error
	if before != nil {
		beforeJSON, err = json.Marshal(before)
		if err != nil {
			return err
		}
	}
	if after != nil {
		afterJSON, err = json.Marshal(after)
		if err != nil {
			return err
		}
	}
	_, err = db.Exec(
		`INSERT INTO audit_logs(user_id, action, table_name, record_id, before_json, after_json)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, action, tableName, recordID, string(beforeJSON), string(afterJSON),
	)
	return err
}

func WriteAuditLogTx(tx *sql.Tx, userID int64, action, tableName string, recordID int64, before, after any) error {
	var beforeJSON, afterJSON []byte
	var err error
	if before != nil {
		beforeJSON, err = json.Marshal(before)
		if err != nil {
			return err
		}
	}
	if after != nil {
		afterJSON, err = json.Marshal(after)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(
		`INSERT INTO audit_logs(user_id, action, table_name, record_id, before_json, after_json)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, action, tableName, recordID, string(beforeJSON), string(afterJSON),
	)
	return err
}
