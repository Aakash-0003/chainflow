import express from 'express';
import { sendTransactionController, getTransactionStatus } from '../controllers/transaction.controller.js'
const router = express.Router();

router.post('/send', sendTransactionController);

// router.get('/:', getWalletController);

router.patch('/:id/status', getTransactionStatus)

export default router;