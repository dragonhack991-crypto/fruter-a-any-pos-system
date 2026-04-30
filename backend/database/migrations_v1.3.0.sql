-- ============================================
-- MIGRACIONES v1.3.0 - Dashboard + IEPS en Compras
-- ============================================

-- 1. AGREGAR 'completed' AL ENUM DE STATUS EN PURCHASES
ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'received', 'cancelled', 'completed') DEFAULT 'pending';

-- 2. AGREGAR COLUMNAS is_ieps E ieps_rate A purchase_details
ALTER TABLE purchase_details
  ADD COLUMN IF NOT EXISTS is_ieps TINYINT(1) DEFAULT 0 COMMENT 'Indica si el ítem tiene IEPS',
  ADD COLUMN IF NOT EXISTS ieps_rate DECIMAL(5,2) DEFAULT 0 COMMENT 'Tasa IEPS del ítem';

-- 3. CREAR TABLA PARA VISITAS DE PROVEEDORES
CREATE TABLE IF NOT EXISTS provider_visits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  visit_date DATE NOT NULL,
  products_expected JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  INDEX idx_provider_visit_date (provider_id, visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- FIN MIGRACIONES v1.3.0
-- ============================================
