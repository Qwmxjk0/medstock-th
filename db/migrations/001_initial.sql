-- 001_initial.sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS product_categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS units (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS departments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS suppliers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    contact    TEXT    NOT NULL DEFAULT '',
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS users (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    username               TEXT    NOT NULL UNIQUE,
    display_name           TEXT    NOT NULL,
    password_hash          TEXT,
    must_change_password   INTEGER NOT NULL DEFAULT 0,
    is_system_account      INTEGER NOT NULL DEFAULT 0,
    is_active              INTEGER NOT NULL DEFAULT 1,
    locked_at              TEXT,
    last_selected_at       TEXT,
    last_password_reset_at TEXT,
    password_reset_by      INTEGER REFERENCES users(id),
    created_at             TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at             TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    code                     TEXT    NOT NULL UNIQUE,
    name                     TEXT    NOT NULL,
    category_id              INTEGER REFERENCES product_categories(id),
    base_unit_id             INTEGER NOT NULL REFERENCES units(id),
    default_purchase_unit_id INTEGER REFERENCES units(id),
    default_issue_unit_id    INTEGER REFERENCES units(id),
    package_size             REAL    NOT NULL DEFAULT 1,
    reorder_level            REAL    NOT NULL DEFAULT 0,
    default_price            REAL    NOT NULL DEFAULT 0,
    is_active                INTEGER NOT NULL DEFAULT 1,
    created_at               TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at               TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS product_aliases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    alias      TEXT    NOT NULL,
    alias_type TEXT    NOT NULL DEFAULT 'OTHER',
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_alias ON product_aliases(alias);

CREATE TABLE IF NOT EXISTS product_unit_conversions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    from_unit_id INTEGER NOT NULL REFERENCES units(id),
    to_unit_id   INTEGER NOT NULL REFERENCES units(id),
    factor       REAL    NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS stock_lots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    lot_no           TEXT    NOT NULL DEFAULT '',
    expire_date      TEXT,
    quantity_on_hand REAL    NOT NULL DEFAULT 0,
    unit_cost        REAL    NOT NULL DEFAULT 0,
    supplier_id      INTEGER REFERENCES suppliers(id),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(product_id, lot_no, expire_date)
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_product ON stock_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_expire  ON stock_lots(expire_date);

CREATE TABLE IF NOT EXISTS stock_documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_no   TEXT    NOT NULL UNIQUE,
    document_type TEXT    NOT NULL CHECK(document_type IN ('OPENING','IN','OUT','ADJUST')),
    document_date TEXT    NOT NULL,
    supplier_id   INTEGER REFERENCES suppliers(id),
    department_id INTEGER REFERENCES departments(id),
    status        TEXT    NOT NULL DEFAULT 'Draft'
                          CHECK(status IN ('Draft','Confirmed','Cancelled','Adjusted')),
    note          TEXT    NOT NULL DEFAULT '',
    created_by    INTEGER NOT NULL REFERENCES users(id),
    confirmed_by  INTEGER REFERENCES users(id),
    confirmed_at  TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_stock_documents_date   ON stock_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_stock_documents_type   ON stock_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_stock_documents_status ON stock_documents(status);

CREATE TABLE IF NOT EXISTS stock_document_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   INTEGER NOT NULL REFERENCES stock_documents(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(id),
    lot_id        INTEGER REFERENCES stock_lots(id),
    lot_no        TEXT    NOT NULL DEFAULT '',
    expire_date   TEXT,
    quantity      REAL    NOT NULL DEFAULT 0,
    requested_qty REAL    NOT NULL DEFAULT 0,
    approved_qty  REAL    NOT NULL DEFAULT 0,
    issued_qty    REAL    NOT NULL DEFAULT 0,
    unit_cost     REAL    NOT NULL DEFAULT 0,
    reject_reason TEXT    NOT NULL DEFAULT '',
    note          TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_doc_items_document ON stock_document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_items_product  ON stock_document_items(product_id);

CREATE TABLE IF NOT EXISTS stock_movements (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id           INTEGER NOT NULL REFERENCES stock_documents(id),
    document_item_id      INTEGER NOT NULL REFERENCES stock_document_items(id),
    product_id            INTEGER NOT NULL REFERENCES products(id),
    lot_id                INTEGER NOT NULL REFERENCES stock_lots(id),
    movement_type         TEXT    NOT NULL
                                  CHECK(movement_type IN ('OPENING','IN','OUT','ADJUST','REVERSAL')),
    quantity_in           REAL    NOT NULL DEFAULT 0,
    quantity_out          REAL    NOT NULL DEFAULT 0,
    lot_balance_after     REAL    NOT NULL,
    product_balance_after REAL    NOT NULL,
    created_by            INTEGER NOT NULL REFERENCES users(id),
    created_at            TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_lot     ON stock_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);

CREATE TABLE IF NOT EXISTS correction_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    correction_no     TEXT    NOT NULL UNIQUE,
    target_type       TEXT    NOT NULL,
    target_id         INTEGER NOT NULL,
    correction_type   TEXT    NOT NULL,
    reason            TEXT    NOT NULL,
    before_json       TEXT    NOT NULL DEFAULT '{}',
    after_json        TEXT    NOT NULL DEFAULT '{}',
    stock_impact_json TEXT,
    created_by        INTEGER NOT NULL REFERENCES users(id),
    approved_by       INTEGER REFERENCES users(id),
    created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    action      TEXT    NOT NULL,
    table_name  TEXT    NOT NULL,
    record_id   INTEGER,
    before_json TEXT,
    after_json  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table   ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
