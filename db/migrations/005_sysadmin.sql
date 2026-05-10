-- 005_sysadmin.sql
-- Add sysadmin account with fixed password: MedS@2568#Rx!
INSERT OR IGNORE INTO users(username, display_name, password_hash, is_system_account, is_active)
    VALUES ('sysadmin', 'ผู้ดูแลระบบ',
            '$2a$10$ffjbB3BLZ41w8JOJOu2vEOOhaykHESmK87U2CSpwKNgtZx6KzI5kS',
            1, 1);
