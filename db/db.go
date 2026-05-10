package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Open(dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn+"?_pragma=foreign_keys(ON)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// WAL mode supports concurrent readers + 1 writer; busy_timeout handles write contention.
	// Do NOT limit to 1 connection — that causes deadlock when a tx holds the connection
	// and another goroutine calls s.db.* concurrently (Wails runs each call in its own goroutine).
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	if err := runMigrations(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrations: %w", err)
	}
	return db, nil
}

func runMigrations(db *sql.DB) error {
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

	for _, name := range names {
		// Skip if already applied
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE name=?`, name).Scan(&count)
		if count > 0 {
			continue
		}

		data, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if _, err := db.Exec(string(data)); err != nil {
			return fmt.Errorf("exec %s: %w", name, err)
		}
		if _, err := db.Exec(`INSERT INTO schema_migrations(name) VALUES(?)`, name); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
	}
	return nil
}
