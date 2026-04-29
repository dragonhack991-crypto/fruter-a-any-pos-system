-- ============================================
-- MIGRACIONES v1.3.0 - Logo en app_settings
-- ============================================

-- 1. AGREGAR logo_url A app_settings si no existe
-- Nota: MySQL no soporta ADD COLUMN IF NOT EXISTS (solo MariaDB).
-- Usamos INFORMATION_SCHEMA para verificar si la columna existe antes de agregarla.
SET @dbname = DATABASE();
SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME   = 'app_settings'
        AND COLUMN_NAME  = 'logo_url'
    ) > 0,
    'SELECT 1 -- logo_url ya existe, no se hace nada',
    'ALTER TABLE `app_settings` ADD COLUMN `logo_url` TEXT'
  )
);
PREPARE addColumnIfMissing FROM @preparedStatement;
EXECUTE addColumnIfMissing;
DEALLOCATE PREPARE addColumnIfMissing;

-- ============================================
-- FIN MIGRACIONES v1.3.0
-- ============================================
