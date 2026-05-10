-- 002_seed.sql
-- system account (no login)
INSERT OR IGNORE INTO users(username, display_name, is_system_account)
    VALUES ('system', 'ระบบ', 1);

-- sysadmin: password = MedS@2568#Rx!
INSERT OR IGNORE INTO users(username, display_name, password_hash, is_system_account, is_active)
    VALUES ('sysadmin', 'ผู้ดูแลระบบ', '$2a$10$ffjbB3BLZ41w8JOJOu2vEOOhaykHESmK87U2CSpwKNgtZx6KzI5kS', 1, 1);

INSERT OR IGNORE INTO suppliers(name, contact)
    VALUES ('ไม่ระบุ/รอตรวจสอบ', '');

INSERT OR IGNORE INTO units(name) VALUES
    ('เม็ด'), ('ขวด'), ('ซอง'), ('กล่อง'), ('ชิ้น'), ('แผง'), ('หลอด'), ('ถุง');

INSERT OR IGNORE INTO product_categories(name) VALUES
    ('ยา'), ('เวชภัณฑ์'), ('วัสดุการแพทย์'), ('วัสดุเภสัชกรรม');
