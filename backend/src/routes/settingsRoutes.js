import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, settingsController.getSettings);
router.put('/', authenticateToken, settingsController.updateSettings);

export default router;