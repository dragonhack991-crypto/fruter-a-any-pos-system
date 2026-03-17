import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Solo admin puede ver y gestionar usuarios
router.get('/', authenticateToken, authorizeRole(['admin']), userController.getAllUsers);
router.get('/:id', authenticateToken, authorizeRole(['admin']), userController.getUserById);
router.post('/', authenticateToken, authorizeRole(['admin']), userController.register);
router.put('/:id', authenticateToken, authorizeRole(['admin']), userController.updateUser);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), userController.deleteUser);
router.post('/:id/reset-password', authenticateToken, authorizeRole(['admin', 'manager']), userController.resetUserPassword);
router.put('/:id/status', authenticateToken, authorizeRole(['admin']), userController.updateUserStatus);
export default router;