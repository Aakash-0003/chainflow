import logger from '../config/logger.js'
import { sendTransaction } from '../services/transaction.service.js'

export function sendTransactionController(req, res, next) {
    try {
        logger.info(`INITIATED : Send transaction for request : ${req.requestId} : req : ${JSON.stringify(req.body)}`)

        const result = sendTransaction(req.body);

        const response = result
        logger.info(`COMPLETED : Send transaction for request : ${req.requestId} : res : ${JSON.stringify(response)}`)

        res.status(201).send(response);

    } catch (error) {
        next(error)
    }
}

export function getTransactionStatus(req, res, next) {
    try {
        logger.info(`INITIATED : Get transaction status for address : ${req.requestId} : req : ${JSON.stringify(req.body)}`)

        const result = sendTransaction(req.body);

        const response = result

        res.status(201).send(response);

    } catch (error) {
        next(error)
    }
}