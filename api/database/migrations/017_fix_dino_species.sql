-- ===========================
-- MIGRATION 017: Fix dino_species table
-- Add missing stats column, deduplicate entries, add unique constraint on name
-- Date: 2026-05-20
-- ===========================

-- Add stats column (error ignored on re-run via migration runner's "Duplicate column" catch)
ALTER TABLE dino_species ADD COLUMN stats JSON DEFAULT NULL COMMENT 'Array of applicable stat keys';

-- Remove duplicate entries, keeping the one with the lowest id
DELETE d1 FROM dino_species d1
INNER JOIN dino_species d2 ON d1.name = d2.name AND d1.id > d2.id;

-- Add unique constraint on name (error ignored on re-run via migration runner's "already exists" catch)
ALTER TABLE dino_species ADD UNIQUE KEY unique_name (name);
