import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Admin and manager can view and manage users
router.get('/', authenticateToken, authorizeRole(['admin', 'manager']), userController.getAllUsers);
router.get('/:id', authenticateToken, authorizeRole(['admin', 'manager']), userController.getUserById);
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), userController.register);
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), userController.updateUser);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), userController.deleteUser);
router.post('/:id/reset-password', authenticateToken, authorizeRole(['admin', 'manager']), userController.resetUserPassword);
router.put('/:id/status', authenticateToken, authorizeRole(['admin', 'manager']), userController.updateUserStatus);
export default router;