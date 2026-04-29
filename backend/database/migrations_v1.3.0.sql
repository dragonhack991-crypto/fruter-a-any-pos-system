-- ============================================
-- MIGRACIONES v1.3.0 - Logo en app_settings
-- ============================================

-- 1. AGREGAR logo_url A app_settings (si la tabla existe)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================
-- FIN MIGRACIONES v1.3.0
-- ============================================
