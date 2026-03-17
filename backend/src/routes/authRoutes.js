import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    console.log('📍 POST /auth/login');
    console.log('📝 Body recibido:', req.body);
    console.log('📝 Username:', req.body.username);
    console.log('📝 Password:', req.body.password);
    
    await userController.login(req, res);
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    await userController.register(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    await userController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

router.post('/refresh-token', authenticateToken, async (req, res, next) => {
  try {
    await userController.refreshToken(req, res);
  } catch (error) {
    next(error);
  }
});

router.put('/change-password', authenticateToken, async (req, res, next) => {
  try {
    await userController.changePassword(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;