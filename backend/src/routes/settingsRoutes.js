import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener configuración
router.get('/', authenticateToken, settingsController.getSettings);

// Actualizar perfil
router.put('/profile', authenticateToken, settingsController.updateProfile);

// Cambiar contraseña
router.post('/change-password', authenticateToken, settingsController.changePassword);

// Actualizar configuración de la app (solo admin)
router.put('/app', authenticateToken, authorizeRole(['admin']), settingsController.updateAppSettings);

// Actualizar notificaciones
router.put('/notifications', authenticateToken, settingsController.updateNotifications);

export default router;