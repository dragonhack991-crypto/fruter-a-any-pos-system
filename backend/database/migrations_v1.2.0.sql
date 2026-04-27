-- ============================================
-- MIGRACIONES v1.2.0 - Caja de Cobro + Mejoras de Productos + POS
-- Adaptadas para: fruter_a_any
-- ============================================

-- 1. AGREGAR CAMPOS DE TIPO DE VENTA Y ROTACIÓN A PRODUCTOS
ALTER TABLE products
ADD COLUMN sale_type ENUM('unidad','kilogramo','gramo','litro','ml') DEFAULT 'unidad' AFTER unit_price,
ADD COLUMN unit_cost DECIMAL(10,2) DEFAULT 0 COMMENT 'Precio de compra/costo' AFTER sale_type,
ADD COLUMN has_tax BOOLEAN DEFAULT TRUE COMMENT 'Aplica impuesto en POS' AFTER unit_cost,
ADD COLUMN rotation_score DECIMAL(10,2) DEFAULT 0 COMMENT 'Score de rotación (últimos 30 días)' AFTER has_tax;

CREATE INDEX idx_products_rotation ON products(rotation_score DESC);
CREATE INDEX idx_products_sale_type ON products(sale_type);

-- 2. CREAR TABLA DE SESIONES DE CAJA
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

-- 3. AGREGAR COLUMNA cash_box_session_id A SALES (opcional, para vincular ventas con sesión)
ALTER TABLE sales
ADD COLUMN cash_box_session_id INT NULL AFTER cash_box_id,
ADD CONSTRAINT fk_sales_cbs FOREIGN KEY (cash_box_session_id) REFERENCES cash_box_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_sales_cbs ON sales(cash_box_session_id);

-- 4. ACTUALIZAR rotation_score BASADO EN VENTAS DE LOS ÚLTIMOS 30 DÍAS
-- (Se puede ejecutar periódicamente o al consultar top products)
UPDATE products p
SET rotation_score = COALESCE((
  SELECT SUM(sd.quantity)
  FROM sale_details sd
  JOIN sales s ON sd.sale_id = s.id
  WHERE sd.product_id = p.id
    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND s.status = 'completed'
), 0);

-- ============================================
-- FIN MIGRACIONES v1.2.0
-- ============================================
