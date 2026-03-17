import express from 'express';
const router = express.Router();
router.get('/', (req, res) => res.json({ message: 'CashBox endpoint' }));
export default router;