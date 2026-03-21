import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { 
  handleValidationErrors,
  validateSetting
} from '../utils/validation.js';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

/**
 * GET /api/settings
 * Obtener configuración de la aplicación y perfil del usuario
 */
router.get('/', settingsController.getSettings);

/**
 * PUT /api/settings
 * Actualizar configuración general de la tienda (IVA, moneda, etc)
 */
router.put(
  '/',
  handleValidationErrors,
  settingsController.updateSettings
);

/**
 * GET /api/settings/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', settingsController.getSettings);

/**
 * PUT /api/settings/profile
 * Actualizar perfil del usuario
 */
router.put('/profile', settingsController.updateProfile);

/**
 * POST /api/settings/change-password
 * Cambiar contraseña del usuario
 */
router.post('/change-password', settingsController.changePassword);

/**
 * PUT /api/settings/app
 * Actualizar configuración de la aplicación (solo admin)
 */
router.put(
  '/app',
  authorizeRole(['admin']),
  settingsController.updateAppSettings
);

/**
 * PUT /api/settings/notifications
 * Actualizar configuración de notificaciones
 */
router.put(
  '/notifications',
  settingsController.updateNotifications
);

export default router;