-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_movements_document        ON stock_movements(document_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_qty            ON stock_lots(product_id, quantity_on_hand);
CREATE INDEX IF NOT EXISTS idx_products_active           ON products(is_active, name);
CREATE INDEX IF NOT EXISTS idx_stock_lots_product_expire ON stock_lots(product_id, expire_date);
