package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Open(dsn string) (*sql.DB, error) {
	dbAlreadyExists := false
	if info, err := os.Stat(dsn); err == nil && !info.IsDir() && info.Size() > 0 {
		dbAlreadyExists = true
	}

	db, err := sql.Open("sqlite", dsn+"?_pragma=foreign_keys(ON)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// WAL mode supports concurrent readers + 1 writer; busy_timeout handles write contention.
	// Do NOT limit to 1 connection — that causes deadlock when a tx holds the connection
	// and another goroutine calls s.db.* concurrently (Wails runs each call in its own goroutine).
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	if err := runMigrations(db, dsn, dbAlreadyExists); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrations: %w", err)
	}
	return db, nil
}

func runMigrations(db *sql.DB, dbPath string, dbAlreadyExists bool) error {
	// Create migration tracking table if not exists
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		name       TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	pending := make([]string, 0, len(names))
	for _, name := range names {
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE name=?`, name).Scan(&count)
		if count == 0 {
			pending = append(pending, name)
		}
	}

	if dbAlreadyExists && len(pending) > 0 {
		if _, err := backupBeforeMigrations(db, dbPath); err != nil {
			return err
		}
	}

	for _, name := range pending {
		data, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if err := execMigration(db, name, string(data)); err != nil {
			return fmt.Errorf("exec %s: %w", name, err)
		}
		if _, err := db.Exec(`INSERT INTO schema_migrations(name) VALUES(?)`, name); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
	}
	return nil
}

func execMigration(db *sql.DB, name, sqlText string) error {
	if name == "006_user_roles.sql" && columnExists(db, "users", "role") {
		_, err := db.Exec(`UPDATE users
			SET role = CASE
				WHEN is_system_account = 1 THEN 'admin'
				WHEN role IS NULL OR role = '' THEN 'staff'
				ELSE role
			END`)
		return err
	}
	_, err := db.Exec(sqlText)
	return err
}

func columnExists(db *sql.DB, tableName, columnName string) bool {
	rows, err := db.Query("PRAGMA table_info(" + tableName + ")")
	if err != nil {
		return false
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name, typ string
		var notNull int
		var defaultValue any
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notNull, &defaultValue, &pk); err != nil {
			return false
		}
		if strings.EqualFold(name, columnName) {
			return true
		}
	}
	return false
}

func backupBeforeMigrations(db *sql.DB, dbPath string) (string, error) {
	backupDir := filepath.Join(filepath.Dir(dbPath), "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("create migration backup dir: %w", err)
	}

	ts := time.Now().Format("20060102-150405")
	backupPath := filepath.Join(backupDir, fmt.Sprintf("medstock-before-migration-%s.db", ts))
	escapedPath := strings.ReplaceAll(backupPath, "'", "''")
	if _, err := db.Exec("VACUUM INTO '" + escapedPath + "'"); err != nil {
		return "", fmt.Errorf("backup database before migrations: %w", err)
	}
	return backupPath, nil
}
