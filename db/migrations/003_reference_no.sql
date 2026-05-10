-- Add reference_no column to stock_documents for storing external doc numbers (e.g. paper requisition form number)
ALTER TABLE stock_documents ADD COLUMN reference_no TEXT NOT NULL DEFAULT '';
