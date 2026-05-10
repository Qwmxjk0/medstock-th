ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff';

UPDATE users
SET role = CASE
    WHEN is_system_account = 1 THEN 'admin'
    WHEN role IS NULL OR role = '' THEN 'staff'
    ELSE role
END;
