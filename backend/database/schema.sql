CREATE DATABASE IF NOT EXISTS fruter_a_any;
USE fruter_a_any;

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  unit_id INT NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  is_perishable BOOLEAN DEFAULT FALSE,
  shelf_life_days INT,
  unit_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES product_categories(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  INDEX idx_name (name),
  INDEX idx_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT UNIQUE NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  reorder_point DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_quantity (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  provider_id INT,
  quantity_initial DECIMAL(10,2) NOT NULL,
  quantity_current DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  expiry_date DATE,
  maturity_status ENUM('green', 'ready', 'ripe', 'very_ripe') DEFAULT 'ready',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  batch_id INT,
  movement_type ENUM('purchase', 'sale', 'waste', 'adjustment') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  reference_id INT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_type (movement_type),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cash_boxes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cash_box_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cash_box_id INT NOT NULL,
  user_id INT NOT NULL,
  opening_balance DECIMAL(10,2) NOT NULL,
  closing_balance DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  status ENUM('open', 'closed') DEFAULT 'open',
  notes TEXT,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (cash_box_id) REFERENCES cash_boxes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  cash_box_id INT NOT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'transfer', 'check') DEFAULT 'cash',
  notes TEXT,
  status ENUM('completed', 'cancelled') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cash_box_id) REFERENCES cash_boxes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_number (sale_number),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sale_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  discount_applied DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
  INDEX idx_sale (sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE providers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  provider_id INT NOT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_number (purchase_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_ordered DECIMAL(10,2) NOT NULL,
  quantity_received DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_purchase (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE waste_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  batch_id INT,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2),
  total_value DECIMAL(10,2),
  waste_reason ENUM('expiration', 'damage', 'shrink', 'quality', 'other') NOT NULL,
  notes TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_reason (waste_reason),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  user_id INT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method ENUM('cash', 'card', 'transfer', 'check') DEFAULT 'cash',
  status ENUM('recorded', 'approved', 'rejected') DEFAULT 'recorded',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_category (category),
  INDEX idx_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Administrador del sistema'),
(2, 'manager', 'Encargado de tienda'),
(3, 'cashier', 'Cajero/Vendedor');

INSERT INTO product_categories (name, description) VALUES
('Frutas', 'Frutas frescas'),
('Verduras', 'Verduras frescas'),
('Hierbas', 'Hierbas aromáticas');

INSERT INTO units (name, symbol) VALUES
('Kilogramo', 'kg'),
('Pieza', 'pz'),
('Caja', 'caja'),
('Libra', 'lb'),
('Gramo', 'gr');

INSERT INTO cash_boxes (name, description) VALUES
('Caja 1', 'Primera caja de cobro'),
('Caja 2', 'Segunda caja de cobro');

INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES
('admin', 'admin@fruterias-any.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', 'Administrador Sistema', 1);