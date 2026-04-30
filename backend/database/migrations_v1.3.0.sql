-- ============================================
-- MIGRACIONES v1.3.0 - App Settings, IEPS en Compras, Logo
-- ============================================

-- 1. CREAR TABLA app_settings SI NO EXISTE
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  storeName VARCHAR(255) DEFAULT 'Frutería Any',
  currency VARCHAR(10) DEFAULT 'MXN',
  language VARCHAR(10) DEFAULT 'es',
  theme VARCHAR(20) DEFAULT 'light',
  tax_rate DECIMAL(6,2) DEFAULT 12,
  logo LONGTEXT COMMENT 'Logo en base64',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar registro por defecto si no existe
INSERT INTO app_settings (id, storeName, currency, language, theme, tax_rate)
SELECT 1, 'Frutería Any', 'MXN', 'es', 'light', 12
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- 2. AGREGAR COLUMNA logo A app_settings SI NO EXISTE
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS logo LONGTEXT COMMENT 'Logo en base64' AFTER tax_rate;

-- 3. AGREGAR COLUMNAS IEPS A purchase_details SI NO EXISTEN
ALTER TABLE purchase_details
  ADD COLUMN IF NOT EXISTS is_ieps BOOLEAN DEFAULT FALSE COMMENT 'Aplica IEPS en lugar de IVA' AFTER unit_price,
  ADD COLUMN IF NOT EXISTS ieps_rate DECIMAL(6,2) DEFAULT 0 COMMENT 'Tasa IEPS' AFTER is_ieps;

-- ============================================
-- FIN MIGRACIONES v1.3.0
-- ============================================
