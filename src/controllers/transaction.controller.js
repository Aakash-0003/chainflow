import logger from '../config/logger.js'
import { sendTransaction, getTransactionStatusService } from '../services/transaction.service.js'
import AppError from '../errors/AppError.js';

export async function sendTransactionController(req, res, next) {
    try {
        logger.info(`INITIATED : Send transaction for request : ${req.requestId} : req : ${JSON.stringify(req.body)}`)
        const { walletId, chainId, toAddress, value, functionSignature, args } = req.body;
        const result = await sendTransaction({ walletId, chainId, toAddress, value, functionSignature, args });

        logger.info(`COMPLETED : Send transaction for request : ${req.requestId} : res : ${JSON.stringify(result)}`)
        return res.status(201).json({ success: true, result });
    } catch (error) {
        next(error)
    }
}

export async function getTransactionStatus(req, res, next) {
    try {
        const { id } = req.params;
        logger.info(`Transaction status requested for transactionId: ${id}`);

        const result = await getTransactionStatusService(id);

        logger.info(`Transaction status retrieved for transactionId: ${id} - Status: ${result.status}`);
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}