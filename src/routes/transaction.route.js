import express from 'express';
import { sendTransactionController, getTransactionStatus } from '../controllers/transaction.controller.js'
import { validateSendTransaction, validateGetTransactionStatus } from '../middlewares/validation.js'

const router = express.Router();

router.post('/send', validateSendTransaction, sendTransactionController);

router.get('/:id', validateGetTransactionStatus, getTransactionStatus)

export default router;