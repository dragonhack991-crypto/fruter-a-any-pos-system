-- ============================================
-- MIGRACIONES v1.1.0 - IVA/IEPS, Inventario
-- Adaptadas para: fruter_a_any
-- ============================================

-- 1. AGREGAR CAMPOS DE IMPUESTOS A PRODUCTOS
ALTER TABLE products 
ADD COLUMN is_iva BOOLEAN DEFAULT TRUE COMMENT 'Aplica IVA al producto' AFTER unit_price,
ADD COLUMN is_ieps BOOLEAN DEFAULT FALSE COMMENT 'Aplica IEPS al producto' AFTER is_iva,
ADD COLUMN ieps_rate DECIMAL(6,2) DEFAULT 0 COMMENT 'Tasa IEPS individual' AFTER is_ieps;

CREATE INDEX idx_products_taxes ON products(is_iva, is_ieps);

-- 2. AGREGAR IMPUESTOS POR LÍNEA A sales_items
ALTER TABLE sales_items 
ADD COLUMN iva_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IVA en línea' AFTER subtotal,
ADD COLUMN ieps_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IEPS en línea' AFTER iva_amount,
ADD COLUMN unit_cost DECIMAL(10,2) COMMENT 'Costo unitario al momento venta' AFTER ieps_amount,
ADD COLUMN cost_subtotal DECIMAL(10,2) COMMENT 'Total costo línea' AFTER unit_cost;

-- 3. AGREGAR IMPUESTOS POR LÍNEA A purchase_items
ALTER TABLE purchase_items 
ADD COLUMN iva_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IVA en línea' AFTER subtotal,
ADD COLUMN ieps_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto IEPS en línea' AFTER iva_amount;

-- 4. CREAR TABLA DE AJUSTES DE INVENTARIO (AUDITORÍA)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity_change DECIMAL(10,2) NOT NULL COMMENT 'Cantidad agregada/restada',
  reason ENUM('merma', 'ajuste_fisico', 'robo', 'danado', 'devolucion', 'otro') NOT NULL,
  notes TEXT COMMENT 'Notas adicionales',
  user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_product_date (product_id, created_at),
  INDEX idx_user_date (user_id, created_at),
  INDEX idx_reason (reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. CONFIGURACIÓN GLOBAL DE IMPUESTOS
CREATE TABLE IF NOT EXISTS tax_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iva_rate DECIMAL(6,2) DEFAULT 12 COMMENT 'Tasa IVA por defecto',
  ieps_rate DECIMAL(6,2) DEFAULT 0 COMMENT 'Tasa IEPS por defecto',
  apply_iva_by_default BOOLEAN DEFAULT TRUE,
  apply_ieps_by_default BOOLEAN DEFAULT FALSE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertar configuración por defecto (basada en tu app_settings)
INSERT INTO tax_settings (iva_rate, ieps_rate, apply_iva_by_default, apply_ieps_by_default) 
SELECT tax_rate, 0, TRUE, FALSE FROM app_settings LIMIT 1
ON DUPLICATE KEY UPDATE id=id;

-- 6. AGREGAR COLUMNAS DE VALOR EN inventory
ALTER TABLE inventory 
ADD COLUMN last_purchase_date DATETIME COMMENT 'Última fecha de compra' AFTER reorder_point,
ADD COLUMN last_unit_cost DECIMAL(10,2) COMMENT 'Último costo unitario' AFTER last_purchase_date;

-- 7. TABLA DE GANANCIA DIARIA (REPORTES FINANCIEROS)
CREATE TABLE IF NOT EXISTS daily_profit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_record DATE NOT NULL UNIQUE,
  total_sales DECIMAL(12,2) DEFAULT 0 COMMENT 'Total ingresos',
  total_cost DECIMAL(12,2) DEFAULT 0 COMMENT 'Costo productos vendidos',
  total_iva_collected DECIMAL(12,2) DEFAULT 0 COMMENT 'IVA total recaudado',
  total_ieps_collected DECIMAL(12,2) DEFAULT 0 COMMENT 'IEPS total recaudado',
  total_items_sold INT DEFAULT 0 COMMENT 'Total items vendidos',
  transactions_count INT DEFAULT 0 COMMENT 'Cantidad transacciones',
  net_profit DECIMAL(12,2) GENERATED ALWAYS AS (total_sales - total_cost) STORED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date_record),
  INDEX idx_profit (net_profit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. CREAR TRIGGER PARA ACTUALIZAR inventory.last_unit_cost EN COMPRAS
DELIMITER //

CREATE TRIGGER trg_update_inventory_cost_on_purchase
AFTER INSERT ON purchase_items
FOR EACH ROW
BEGIN
  UPDATE inventory 
  SET last_unit_cost = NEW.unit_cost,
      last_purchase_date = NOW()
  WHERE product_id = NEW.product_id;
END //

DELIMITER ;

-- 9. CREAR PROCEDIMIENTO PARA CALCULAR GANANCIA DIARIA
DELIMITER //

CREATE PROCEDURE calculate_daily_profit(IN p_date DATE)
BEGIN
  DECLARE v_total_sales DECIMAL(12,2);
  DECLARE v_total_cost DECIMAL(12,2);
  DECLARE v_total_iva DECIMAL(12,2);
  DECLARE v_total_ieps DECIMAL(12,2);
  DECLARE v_items_count INT;
  DECLARE v_transactions INT;

  -- Total de ventas del día
  SELECT COALESCE(SUM(total_amount), 0),
         COALESCE(SUM(tax), 0),
         COUNT(*),
         COUNT(DISTINCT s.id)
  INTO v_total_sales, v_total_iva, v_items_count, v_transactions
  FROM sales s
  WHERE DATE(s.created_at) = p_date AND s.status = 'completed';

  -- Costo de productos vendidos del día
  SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_cost, 0)), 0)
  INTO v_total_cost
  FROM sales s
  JOIN sales_items si ON s.id = si.sale_id
  WHERE DATE(s.created_at) = p_date AND s.status = 'completed';

  -- IEPS (extraer de sales_items si existe)
  SELECT COALESCE(SUM(si.ieps_amount), 0)
  INTO v_total_ieps
  FROM sales s
  JOIN sales_items si ON s.id = si.sale_id
  WHERE DATE(s.created_at) = p_date AND s.status = 'completed';

  -- Insertar o actualizar registro
  INSERT INTO daily_profit 
  (date_record, total_sales, total_cost, total_iva_collected, total_ieps_collected, total_items_sold, transactions_count)
  VALUES (p_date, v_total_sales, v_total_cost, v_total_iva, v_total_ieps, v_items_count, v_transactions)
  ON DUPLICATE KEY UPDATE
    total_sales = v_total_sales,
    total_cost = v_total_cost,
    total_iva_collected = v_total_iva,
    total_ieps_collected = v_total_ieps,
    total_items_sold = v_items_count,
    transactions_count = v_transactions,
    updated_at = NOW();
END //

DELIMITER ;

-- 10. CREAR TRIGGER PARA CREAR daily_profit DESPUÉS DE CADA VENTA
DELIMITER //

CREATE TRIGGER trg_update_daily_profit_on_sale
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
  CALL calculate_daily_profit(DATE(NEW.created_at));
END //

DELIMITER ;

-- 11. TABLA PARA HISTORIAL DE COSTOS (TRAZABILIDAD)
CREATE TABLE IF NOT EXISTS product_cost_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  old_cost DECIMAL(10,2),
  new_cost DECIMAL(10,2) NOT NULL,
  changed_by INT NOT NULL,
  change_reason VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_product_date (product_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. ÍNDICES ADICIONALES PARA PERFORMANCE
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_items_sale ON sales_items(sale_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);

-- ============================================
-- FIN MIGRACIONES v1.1.0
-- ============================================