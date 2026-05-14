-- ===========================
-- MIGRATION 016: Dino Species Catalog
-- Description: Table for managing the dinosaur species catalog from the admin interface
-- Date: 2026-05-14
-- ===========================

CREATE TABLE IF NOT EXISTS dino_species (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    types JSON NOT NULL COMMENT 'Array of type IDs: 1=Carnivore, 2=Herbivore, 3=Aquatique, 4=Volant, 5=Epaule, 6=Boss',
    sort_order INT DEFAULT 0 COMMENT 'Order within its primary type group',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
