-- Migration: POS Payment Methods Enhancement
-- Run this script to update the database for the new POS payment features

USE fruter_a_any;

-- Update sales table: extend payment_method enum and add payment_details column
ALTER TABLE sales
  MODIFY COLUMN payment_method ENUM('cash', 'card', 'transfer', 'check', 'credit_card', 'debit_card') DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_details JSON DEFAULT NULL AFTER payment_method;

-- Create sales_items table (alias structure matching sale_details for new API)
CREATE TABLE IF NOT EXISTS sales_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_sale (sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
