-- ============================================
-- MIGRACIONES v1.2.0 - Caja de Cobro + Mejoras de Productos + POS
-- Adaptadas para: fruter_a_any
-- INCLUYE: Cambios de v1.1.0 (IVA/IEPS) + v1.2.0 (Caja de cobro)
-- NOTA: Usar IF NOT EXISTS para evitar errores si ya existen las columnas
-- ============================================

-- 1. AGREGAR CAMPOS DE IMPUESTOS A PRODUCTOS (de v1.1.0 si no existen)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS is_iva BOOLEAN DEFAULT TRUE COMMENT 'Aplica IVA al producto' AFTER unit_price,
  ADD COLUMN IF NOT EXISTS is_ieps BOOLEAN DEFAULT FALSE COMMENT 'Aplica IEPS al producto' AFTER is_iva,
  ADD COLUMN IF NOT EXISTS ieps_rate DECIMAL(6,2) DEFAULT 0 COMMENT 'Tasa IEPS individual' AFTER is_ieps;

-- 2. AGREGAR CAMPOS DE TIPO DE VENTA Y ROTACIÓN A PRODUCTOS
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_type ENUM('unidad','kilogramo','gramo','litro','ml') DEFAULT 'unidad' AFTER unit_price,
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0 COMMENT 'Precio de compra/costo' AFTER sale_type,
  ADD COLUMN IF NOT EXISTS has_tax BOOLEAN DEFAULT TRUE COMMENT 'Aplica impuesto en POS' AFTER unit_cost,
  ADD COLUMN IF NOT EXISTS rotation_score DECIMAL(10,2) DEFAULT 0 COMMENT 'Score de rotación (últimos 30 días)' AFTER has_tax;

CREATE INDEX IF NOT EXISTS idx_products_rotation ON products(rotation_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_sale_type ON products(sale_type);
CREATE INDEX IF NOT EXISTS idx_products_taxes ON products(is_iva, is_ieps);

-- 3. AGREGAR IMPUESTOS POR LÍNEA A sales_items (de v1.1.0 si no existen)
ALTER TABLE sales_items 
  ADD COLUMN IF NOT EXISTS iva_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IVA en línea' AFTER subtotal,
  ADD COLUMN IF NOT EXISTS ieps_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IEPS en línea' AFTER iva_amount,
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) COMMENT 'Costo unitario al momento venta' AFTER ieps_amount,
  ADD COLUMN IF NOT EXISTS cost_subtotal DECIMAL(10,2) COMMENT 'Total costo línea' AFTER unit_cost;

-- 4. CREAR TABLA DE SESIONES DE CAJA
CREATE TABLE IF NOT EXISTS cash_box_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  opening_amount DECIMAL(10,2) NOT NULL COMMENT 'Fondo de caja inicial',
  opening_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha/hora de apertura',
  closing_date DATETIME NULL COMMENT 'Fecha/hora de cierre',
  closing_amount DECIMAL(10,2) NULL COMMENT 'Monto físico al cierre',
  expected_amount DECIMAL(10,2) NULL COMMENT 'Monto esperado (apertura + ventas)',
  difference DECIMAL(10,2) NULL COMMENT 'Diferencia (closing - expected)',
  status ENUM('open','closed') DEFAULT 'open',
  notes TEXT COMMENT 'Notas del cajero al cierre',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cbs_user (user_id),
  INDEX idx_cbs_status (status),
  INDEX idx_cbs_opening_date (opening_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. AGREGAR COLUMNA cash_box_session_id A SALES (para vincular ventas con sesión)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cash_box_session_id INT NULL AFTER cash_box_id;

-- Agregar FK solo si no existe (el DROP IF EXISTS + ADD evita el error de duplicado)
ALTER TABLE sales
  DROP FOREIGN KEY IF EXISTS fk_sales_cbs;
ALTER TABLE sales
  ADD CONSTRAINT fk_sales_cbs FOREIGN KEY (cash_box_session_id) REFERENCES cash_box_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_cbs ON sales(cash_box_session_id);

-- 6. ACTUALIZAR rotation_score BASADO EN VENTAS DE LOS ÚLTIMOS 30 DÍAS
UPDATE products p
SET rotation_score = COALESCE((
  SELECT SUM(si.quantity)
  FROM sales_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE si.product_id = p.id
    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND s.status = 'completed'
), 0);

-- ============================================
-- FIN MIGRACIONES v1.2.0
-- ============================================
