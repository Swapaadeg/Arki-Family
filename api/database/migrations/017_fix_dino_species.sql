-- ===========================
-- MIGRATION 017: Fix dino_species table
-- Add missing stats column, deduplicate entries, add unique constraint on name
-- Date: 2026-05-20
-- ===========================

ALTER TABLE dino_species ADD COLUMN stats JSON DEFAULT NULL;

DELETE d1 FROM dino_species d1
INNER JOIN dino_species d2 ON d1.name = d2.name AND d1.id > d2.id;

ALTER TABLE dino_species ADD UNIQUE KEY unique_name (name);
